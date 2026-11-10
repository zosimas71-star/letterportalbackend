import crypto from 'node:crypto';
import model from './letter.model.js';

import signatureModel from '../signature/signature.model.js';
import { AppError } from '../../common/errors/app-error.js';
import { storage } from '../../common/storage/local-storage.service.js';
import { parsePagination, parseSort, generateTrackingNumber } from '../../utils/index.js';

import {
  toId, toOptionalId, toDate, toBool, isSystemAdmin, paginate,
  asFileArray, withUploadCleanup
} from '../../shared/module-helpers.js';

// Service layer: business rules for letters and responses.
// Never touches req/res or Prisma. Callers pass `ctx = { user, ip, baseUrl }`.

const SOURCE_TYPES = ['generated', 'scanned', 'uploaded'];
const LIST_SORT_FIELDS = ['created_at', 'updated_at', 'letter_date'];
const FILE_KINDS = ['primary', 'attachment'];
const RESPONSE_TRANSITIONS = {
  send: ['seen', 'closed', 'archived'],
  seen: ['closed', 'archived'],
  closed: ['archived'],
  archived: []
};

// FIX: authenticate() only sets req.auth = { userId }, so user.role_assignments is not
// populated. Read the caller's active directories from the database instead
// (memoized per user object, i.e. once per request).
const dirIdsCache = new WeakMap();
const getDirIds = async (user) => {
  if (dirIdsCache.has(user)) return dirIdsCache.get(user);
  const rows = await model.findActiveRoleAssignmentsByUser(user.user_id);
  const ids = rows.map((r) => r.directory_id);
  dirIdsCache.set(user, ids);
  return ids;
};

const searchClause = (q) => ({
  OR: [
    { tracking_number: { contains: q } },
    { subject: { contains: q } },
    { description: { contains: q } }
  ]
});

const pushEquals = (and, query, keys) => {
  for (const key of keys) if (query[key]) and.push({ [key]: query[key] });
};

const pushIntEquals = (and, query, keys) => {
  for (const key of keys) if (query[key]) and.push({ [key]: toId(query[key], key) });
};

const buildFileUrl = (baseUrl, storageKey) =>
  storageKey ? `${baseUrl}/uploads/${storageKey.replace(/^uploads[\\/]/, '')}` : null;

// Validates (magic number) + moves every file. If one fails, already-committed files are removed.
const commitAll = async (files, folder) => {
  const saved = [];
  try {
    for (const file of files) saved.push(await storage.commit(file, folder));
    return saved;
  } catch (err) {
    await Promise.all(saved.map((s) => storage.remove(s.storage_key)));
    throw err;
  }
};

const removeCommitted = (saved) => Promise.all(saved.map((s) => storage.remove(s.storage_key)));

// `kinds` is an optional text field (one entry per file): "primary" | "attachment".
// Default: generated letters -> attachment, uploaded/scanned -> primary.
const resolveKinds = (raw, count, defaultKind) => {
  const list = raw === undefined || raw === null || raw === '' ? [] : [].concat(raw);
  if (list.length && list.length !== count) {
    const message = 'kinds must have exactly one entry per uploaded file';
    throw new AppError('VALIDATION_ERROR', { message, details: [{ field: 'kinds', message }] });
  }
  const kinds = list.length ? list : Array(count).fill(defaultKind);
  if (kinds.some((k) => !FILE_KINDS.includes(k))) {
    const message = `kinds entries must be one of: ${FILE_KINDS.join(', ')}`;
    throw new AppError('VALIDATION_ERROR', { message, details: [{ field: 'kinds', message }] });
  }
  return kinds;
};

const splitByKind = (saved, kinds) => ({
  primary: saved.filter((_, i) => kinds[i] === 'primary'),
  attachments: saved.filter((_, i) => kinds[i] === 'attachment')
});

const buildFileRecords = (saved, { userId, role, captureMethod }) =>
  saved.map((s, i) => ({
    uploaded_by: userId,
    original_filename: s.original_filename,
    storage_key: s.storage_key,
    mime_type: s.mime_type,
    file_size_bytes: BigInt(s.file_size_bytes),
    file_role: role,
    capture_method: captureMethod,
    page_number: i + 1,
    checksum_sha256: s.checksum_sha256
  }));

const audit = (tx, ctx, action, entityType, entityId, details) =>
  model.createAuditLog(
    {
      user_id: ctx.user.user_id,
      action,
      entity_type: entityType,
      entity_id: String(entityId),
      details,
      ip_address: ctx.ip
    },
    tx
  );

class LetterService {
  // =====================================================================
  // Letters: formatting & access rules
  // =====================================================================
  formatLetter(letter, baseUrl) {
    if (!letter) return null;

    const files = (letter.files || []).map((f) => ({
      file_id: f.file_id,
      original_filename: f.original_filename,
      mime_type: f.mime_type,
      file_size_bytes: f.file_size_bytes ? Number(f.file_size_bytes) : 0,
      file_role: f.file_role,
      capture_method: f.capture_method,
      page_number: f.page_number,
      checksum_sha256: f.checksum_sha256,
      uploaded_by: f.uploaded_by,
      uploaded_at: f.uploaded_at,
      url: buildFileUrl(baseUrl, f.storage_key)
    }));

    return {
      letter_id: letter.letter_id,
      tracking_number: letter.tracking_number,
      subject: letter.subject,
      description: letter.description,
      letter_content: letter.letter_content,
      source_type: letter.source_type,
      letter_type: letter.letter_type,
      letter_condition: letter.letter_condition,
      template_id: letter.template_id,
      created_by: letter.created_by,
      received_by: letter.received_by,
      owning_directory_id: letter.owning_directory_id,
      received_directory_id: letter.received_directory_id,
      stamp_id: letter.stamp_id,
      signature_id: letter.signature_id,
      status: letter.status,
      letter_date: letter.letter_date ? letter.letter_date.toISOString().split('T')[0] : null,
      response_due_at: letter.response_due_at ? letter.response_due_at.toISOString() : null,
      created_at: letter.created_at ? letter.created_at.toISOString() : null,
      updated_at: letter.updated_at ? letter.updated_at.toISOString() : null,
      archived_at: letter.archived_at ? letter.archived_at.toISOString() : null,
      files
    };
  }

  // Visible = creator, receiver, or a user with an active role in the owning/receiving directory
  async canView(letter, user) {
    if (isSystemAdmin(user)) return true;
    if (letter.created_by === user.user_id || letter.received_by === user.user_id) return true;
    const dirIds = await getDirIds(user);
    return dirIds.includes(letter.owning_directory_id) || dirIds.includes(letter.received_directory_id);
  }

  async loadVisibleLetter(rawId, user, include = {}) {
    const letter = await model.findLetterById(toId(rawId, 'letter_id'), include);
    if (!letter || !(await this.canView(letter, user))) {
      throw new AppError('NOT_FOUND', { message: 'Letter does not exist or is not visible to the caller' });
    }
    return letter;
  }

  assertCreator(letter, user) {
    if (letter.created_by !== user.user_id && !isSystemAdmin(user)) {
      throw new AppError('NOT_LETTER_OWNER', { message: 'Only the creator of the letter can do this.' });
    }
  }

  async isRecipient(letter, user) {
    if (letter.received_by === user.user_id) return true;
    return (await getDirIds(user)).includes(letter.received_directory_id);
  }

  // FIX: DB-backed check replaces dirIdsOf(user).includes(...)
  async assertOwnDirectory(user, directoryId, field) {
    const assignment = await model.findActiveRoleAssignment(user.user_id, directoryId);
    if (!assignment) {
      throw new AppError('DIRECTORY_ACCESS_DENIED', {
        message: `${field} is not one of the caller's active role-assignment directories`
      });
    }
  }

  async assertRecipientInDirectory(receivedBy, receivedDirId) {
    const assignment = await model.findActiveRoleAssignment(receivedBy, receivedDirId);
    if (!assignment) {
      throw new AppError('VALIDATION_ERROR', {
        message: 'received_by has no active role in received_directory_id',
        details: [{ field: 'received_by', message: 'Recipient is not active in target directory' }]
      });
    }
  }

  // Signature lookup lives in the signature module
  async assertOwnSignature(signatureId, user) {
    const signature = await signatureModel.findActiveSignature(signatureId, user.user_id);
    if (!signature) {
      throw new AppError('SIGNATURE_NOT_FOUND', {
        message: 'signature_id not found, inactive or not owned by the caller'
      });
    }
  }

  // =====================================================================
  // Letters: lists
  // =====================================================================
  async runList(and, query, ctx) {
    const { page, limit, skip, sort, q } = parsePagination(query);
    if (q) and.push(searchClause(q));

    const where = { AND: and };
    const orderBy = parseSort(sort, LIST_SORT_FIELDS);

    const [total, letters] = await Promise.all([
      model.countLetters(where),
      model.findLetters({ where, skip, take: limit, orderBy })
    ]);

    return {
      letters: letters.map((l) => this.formatLetter(l, ctx.baseUrl)),
      pagination: paginate(page, limit, total)
    };
  }

  async getAll(query, ctx) {
    const { user } = ctx;
    const dirIds = await getDirIds(user);

    const and = [
      {
        OR: [
          { created_by: user.user_id },
          { received_by: user.user_id },
          { owning_directory_id: { in: dirIds } },
          { received_directory_id: { in: dirIds } }
        ]
      }
    ];

    pushEquals(and, query, ['status', 'letter_type', 'letter_condition', 'source_type']);
    pushIntEquals(and, query, ['owning_directory_id', 'received_directory_id', 'received_by', 'created_by']);

    if (query.date_from) and.push({ letter_date: { gte: toDate(query.date_from, 'date_from') } });
    if (query.date_to) and.push({ letter_date: { lte: toDate(query.date_to, 'date_to') } });

    if (toBool(query.overdue)) {
      and.push({
        response_due_at: { lt: new Date() },
        status: { notIn: ['responded', 'closed', 'archived'] }
      });
    }

    if (query.archived !== undefined) {
      and.push(toBool(query.archived) ? { status: 'archived' } : { status: { not: 'archived' } });
    }

    return this.runList(and, query, ctx);
  }

  async getInbox(query, ctx, letterType = null) {
    const { user } = ctx;
    const dirIds = await getDirIds(user);
    const and = [
      {
        OR: [
          { received_by: user.user_id },
          user.active_directory_id
            ? { received_directory_id: user.active_directory_id }
            : { received_directory_id: { in: dirIds } }
        ]
      }
    ];

    if (letterType) and.push({ letter_type: letterType });
    if (toBool(query.assigned_to_me)) and.push({ received_by: user.user_id });
    pushEquals(and, query, ['status', 'letter_condition', 'source_type']);

    return this.runList(and, query, ctx);
  }

  async getOutbox(query, ctx, letterType = null) {
    const { user } = ctx;
    const dirIds = await getDirIds(user);
    const and = [
      {
        OR: [
          { created_by: user.user_id },
          user.active_directory_id
            ? { owning_directory_id: user.active_directory_id }
            : { owning_directory_id: { in: dirIds } }
        ]
      }
    ];

    if (letterType) and.push({ letter_type: letterType });
    pushEquals(and, query, ['status', 'letter_condition', 'source_type']);

    return this.runList(and, query, ctx);
  }

  // =====================================================================
  // Letters: read
  // =====================================================================
  async getLetterById(rawId, ctx) {
    const letter = await this.loadVisibleLetter(rawId, ctx.user);
    return this.formatLetter(letter, ctx.baseUrl);
  }

  async getByTrackingNumber(trackingNumber, ctx) {
    const letter = await model.findLetterByTracking(trackingNumber);
    if (!letter || !(await this.canView(letter, ctx.user))) {
      throw new AppError('NOT_FOUND', {
        message: 'Tracking number does not exist or is not visible to the caller'
      });
    }
    return {
      letter: this.formatLetter(letter, ctx.baseUrl),
      events: await this.getEventsForLetter(letter.letter_id)
    };
  }

  async getTimeline(rawId, ctx) {
    const letter = await this.loadVisibleLetter(rawId, ctx.user);
    return {
      letter: this.formatLetter(letter, ctx.baseUrl),
      events: await this.getEventsForLetter(letter.letter_id)
    };
  }

  async getEventsForLetter(letterId) {
    const [auditLogs, responses] = await Promise.all([
      model.findAuditLogsForLetter(letterId),
      model.findResponsesByLetter(letterId, 'asc')
    ]);

    const events = [
      ...auditLogs.map((log) => ({
        type: log.action.replace('letter.', ''),
        at: log.created_at.toISOString(),
        actor_user_id: log.user_id,
        detail: log.details || `Letter ${log.action}`
      })),
      ...responses.map((resp) => ({
        type: 'response_sent',
        at: resp.created_at.toISOString(),
        actor_user_id: resp.responded_by,
        detail: `Response letter ${resp.response_letter_id} submitted with status ${resp.response_status}`
      }))
    ];

    return events.sort((a, b) => new Date(a.at) - new Date(b.at));
  }

  // =====================================================================
  // Letters: write
  // =====================================================================
  // `files` = req.files (array, field "files"). Optional text field `kinds` (one per file).
  async createLetter(data = {}, files = [], ctx) {
    const uploads = asFileArray(files);

    return withUploadCleanup(uploads, async () => {
      const { user, ip, baseUrl } = ctx;

      const problems = [];
      if (typeof data.subject !== 'string' || data.subject.trim().length < 3) {
        problems.push({ field: 'subject', message: 'Subject must be at least 3 characters' });
      }
      if (!data.letter_type) problems.push({ field: 'letter_type', message: 'Letter type is required' });
      if (problems.length) {
        throw new AppError('VALIDATION_ERROR', { message: 'Invalid letter data', details: problems });
      }

      const sourceType = data.source_type || 'generated';
      if (!SOURCE_TYPES.includes(sourceType)) {
        const message = `source_type must be one of: ${SOURCE_TYPES.join(', ')}`;
        throw new AppError('VALIDATION_ERROR', { message, details: [{ field: 'source_type', message }] });
      }

      const owningDirId = toId(data.owning_directory_id, 'owning_directory_id');
      const receivedDirId = toId(data.received_directory_id, 'received_directory_id');
      const receivedBy = toId(data.received_by, 'received_by');
      const signatureId = toId(data.signature_id, 'signature_id');
      const stampId = toOptionalId(data.stamp_id, 'stamp_id');
      const templateId = toOptionalId(data.template_id, 'template_id');

      await this.assertOwnDirectory(user, owningDirId, 'owning_directory_id');
      await this.assertRecipientInDirectory(receivedBy, receivedDirId);
      await this.assertOwnSignature(signatureId, user);

      const kinds = resolveKinds(data.kinds, uploads.length, sourceType === 'generated' ? 'attachment' : 'primary');
      const primaryCount = kinds.filter((k) => k === 'primary').length;

      if (sourceType !== 'generated' && primaryCount === 0) {
        const message = 'Uploaded/scanned letters need at least one primary file';
        throw new AppError('VALIDATION_ERROR', { message, details: [{ field: 'files', message }] });
      }
      if (sourceType === 'generated' && primaryCount > 0) {
        const message = 'Generated letters must have no primary files';
        throw new AppError('VALIDATION_ERROR', { message, details: [{ field: 'files', message }] });
      }

      // Validate + move files to permanent storage BEFORE the DB transaction
      const saved = await commitAll(uploads, 'letters');
      const { primary, attachments } = splitByKind(saved, kinds);

      const primaryRecords = buildFileRecords(primary, {
        userId: user.user_id,
        role: sourceType === 'scanned' ? 'scan' : 'original',
        captureMethod: data.capture_method || (sourceType === 'scanned' ? 'scanner' : 'upload')
      });
      const attachmentRecords = buildFileRecords(attachments, {
        userId: user.user_id,
        role: 'attachment',
        captureMethod: 'upload'
      });

      try {
        const letter = await model.transaction(async (tx) => {
          const created = await model.createLetter(
            {
              tracking_number: `PENDING-${crypto.randomUUID()}`, // replaced below once we have the id
              subject: data.subject,
              description: data.description || null,
              letter_content: data.letter_content || null,
              source_type: sourceType,
              letter_type: data.letter_type,
              letter_condition: data.letter_condition || 'initial',
              template_id: templateId,
              created_by: user.user_id,
              received_by: receivedBy,
              owning_directory_id: owningDirId,
              received_directory_id: receivedDirId,
              stamp_id: stampId,
              signature_id: signatureId,
              status: 'send',
              letter_date: data.letter_date ? toDate(data.letter_date, 'letter_date') : null,
              response_due_at: data.response_due_at ? toDate(data.response_due_at, 'response_due_at') : null
            },
            tx
          );

          for (const rec of [...primaryRecords, ...attachmentRecords]) {
            await model.createLetterFile({ ...rec, letter_id: created.letter_id }, tx);
          }

          const trackingNumber = generateTrackingNumber(created.letter_id);
          const full = await model.updateLetter(created.letter_id, { tracking_number: trackingNumber }, tx);

          await model.createNotification(
            {
              user_id: receivedBy,
              notification_type: 'letter_sent',
              title: 'New Official Letter Received',
              message: `Letter "${data.subject}" with tracking number ${trackingNumber} has been sent to you.`,
              related_letter_id: created.letter_id,
              is_read: false
            },
            tx
          );

          await audit(tx, { user, ip }, 'letter.create', 'Letter', created.letter_id,
            `Letter created and sent to directory ${receivedDirId}`);

          return full;
        });

        return this.formatLetter(letter, baseUrl);
      } catch (err) {
        await removeCommitted(saved); // DB failed -> don't leave orphan files
        throw err;
      }
    });
  }

  async updateLetter(rawId, data = {}, files = [], ctx) {
    const uploads = asFileArray(files);

    return withUploadCleanup(uploads, async () => {
      const { user, baseUrl } = ctx;

      const letter = await this.loadVisibleLetter(rawId, user);
      this.assertCreator(letter, user);
      if (letter.status !== 'send') {
        throw new AppError('LETTER_NOT_EDITABLE', { message: 'Letter can no longer be edited.' });
      }

      const updateData = {};
      if (data.subject !== undefined) {
        if (typeof data.subject !== 'string' || data.subject.trim().length < 3) {
          const message = 'Subject must be at least 3 characters';
          throw new AppError('VALIDATION_ERROR', { message, details: [{ field: 'subject', message }] });
        }
        updateData.subject = data.subject;
      }
      if (data.description !== undefined) updateData.description = data.description;
      if (data.letter_content !== undefined) updateData.letter_content = data.letter_content;
      if (data.letter_type !== undefined) updateData.letter_type = data.letter_type;
      if (data.template_id !== undefined) updateData.template_id = toOptionalId(data.template_id, 'template_id');
      if (data.stamp_id !== undefined) updateData.stamp_id = toOptionalId(data.stamp_id, 'stamp_id');
      if (data.received_directory_id !== undefined) {
        updateData.received_directory_id = toId(data.received_directory_id, 'received_directory_id');
      }
      if (data.received_by !== undefined) updateData.received_by = toId(data.received_by, 'received_by');
      if (data.signature_id !== undefined) updateData.signature_id = toId(data.signature_id, 'signature_id');
      if (data.letter_date !== undefined) {
        updateData.letter_date = data.letter_date ? toDate(data.letter_date, 'letter_date') : null;
      }
      if (data.response_due_at !== undefined) {
        updateData.response_due_at = data.response_due_at ? toDate(data.response_due_at, 'response_due_at') : null;
      }

      // Re-validate the recipient whenever the recipient or their directory changes
      if (updateData.received_by !== undefined || updateData.received_directory_id !== undefined) {
        await this.assertRecipientInDirectory(
          updateData.received_by ?? letter.received_by,
          updateData.received_directory_id ?? letter.received_directory_id
        );
      }
      if (updateData.signature_id) await this.assertOwnSignature(updateData.signature_id, user);

      const isGenerated = letter.source_type === 'generated';
      const kinds = resolveKinds(data.kinds, uploads.length, isGenerated ? 'attachment' : 'primary');
      if (isGenerated && kinds.includes('primary')) {
        const message = 'Generated letters must have no primary files';
        throw new AppError('VALIDATION_ERROR', { message, details: [{ field: 'files', message }] });
      }

      const saved = await commitAll(uploads, 'letters');
      const { primary, attachments } = splitByKind(saved, kinds);
      const primaryRole = letter.source_type === 'scanned' ? 'scan' : 'original';

      const primaryRecords = buildFileRecords(primary, { userId: user.user_id, role: primaryRole, captureMethod: 'upload' });
      const attachmentRecords = buildFileRecords(attachments, { userId: user.user_id, role: 'attachment', captureMethod: 'upload' });

      // Primary files being replaced: remember their keys so we can delete them from disk afterwards
      const replacedKeys =
        primary.length > 0
          ? letter.files.filter((f) => ['original', 'scan'].includes(f.file_role)).map((f) => f.storage_key)
          : [];

      let updated;
      try {
        updated = await model.transaction(async (tx) => {
          if (primary.length > 0) await model.deleteLetterFilesByRole(letter.letter_id, ['original', 'scan'], tx);

          for (const rec of [...primaryRecords, ...attachmentRecords]) {
            await model.createLetterFile({ ...rec, letter_id: letter.letter_id }, tx);
          }

          const result = await model.updateLetter(letter.letter_id, updateData, tx);
          await audit(tx, ctx, 'letter.update', 'Letter', letter.letter_id, 'Letter details updated');
          return result;
        });
      } catch (err) {
        await removeCommitted(saved);
        throw err;
      }

      await Promise.all(replacedKeys.map((key) => storage.remove(key)));
      return this.formatLetter(updated, baseUrl);
    });
  }

  async deleteLetter(rawId, ctx) {
    const { user } = ctx;
    const letter = await this.loadVisibleLetter(rawId, user, { responses: true });
    this.assertCreator(letter, user);

    if (letter.status !== 'send' || letter.responses.length > 0) {
      throw new AppError('LETTER_ALREADY_RECEIVED', {
        message: 'Letter was already received and can no longer be deleted.'
      });
    }

    await model.transaction(async (tx) => {
      await model.deleteNotificationsForLetter(letter.letter_id, tx); // they reference the letter
      await model.deleteAllLetterFiles(letter.letter_id, tx);
      await model.deleteLetter(letter.letter_id, tx);
      await audit(tx, ctx, 'letter.delete', 'Letter', letter.letter_id, 'Letter deleted permanently');
    });

    await Promise.all(letter.files.map((f) => storage.remove(f.storage_key)));
    return { message: 'Letter deleted successfully.' };
  }

  async receiveLetter(rawId, ctx) {
    const { user, baseUrl } = ctx;
    const letter = await this.loadVisibleLetter(rawId, user);

    if (letter.status !== 'send') {
      throw new AppError('INVALID_STATE', { message: 'Transition is not allowed.' });
    }
    if (!(await this.isRecipient(letter, user))) {
      throw new AppError('NOT_LETTER_RECIPIENT', { message: 'You are not the recipient of this letter.' });
    }

    const updated = await model.transaction(async (tx) => {
      const result = await model.updateLetter(letter.letter_id, { status: 'received', received_by: user.user_id }, tx);

      await model.createNotification(
        {
          user_id: letter.created_by,
          notification_type: 'letter_received',
          title: 'Letter Acknowledged',
          message: `Your letter "${letter.subject}" has been marked received.`,
          related_letter_id: letter.letter_id
        },
        tx
      );

      await audit(tx, ctx, 'letter.receive', 'Letter', letter.letter_id, 'Letter marked received by recipient');
      return result;
    });

    return this.formatLetter(updated, baseUrl);
  }

  async closeLetter(rawId, reason, ctx) {
    const letter = await this.loadVisibleLetter(rawId, ctx.user);
    if (letter.status !== 'received' && letter.status !== 'responded') {
      throw new AppError('INVALID_STATE', { message: 'status is not received or responded' });
    }

    const updated = await model.transaction(async (tx) => {
      const result = await model.updateLetter(letter.letter_id, { status: 'closed' }, tx);
      await audit(tx, ctx, 'letter.close', 'Letter', letter.letter_id, reason || 'Letter closed');
      return result;
    });

    return this.formatLetter(updated, ctx.baseUrl);
  }

  async archiveLetter(rawId, ctx) {
    const letter = await this.loadVisibleLetter(rawId, ctx.user);
    if (letter.status !== 'closed') {
      throw new AppError('INVALID_STATE', { message: 'status is not closed' });
    }

    const updated = await model.transaction(async (tx) => {
      const result = await model.updateLetter(letter.letter_id, { status: 'archived', archived_at: new Date() }, tx);
      await audit(tx, ctx, 'letter.archive', 'Letter', letter.letter_id, 'Letter moved to archive');
      return result;
    });

    return this.formatLetter(updated, ctx.baseUrl);
  }

  async unarchiveLetter(rawId, ctx) {
    const letter = await this.loadVisibleLetter(rawId, ctx.user);
    if (letter.status !== 'archived') {
      throw new AppError('INVALID_STATE', { message: 'status is not archived' });
    }

    const updated = await model.transaction(async (tx) => {
      const result = await model.updateLetter(letter.letter_id, { status: 'closed', archived_at: null }, tx);
      await audit(tx, ctx, 'letter.unarchive', 'Letter', letter.letter_id, 'Letter restored from archive');
      return result;
    });

    return this.formatLetter(updated, ctx.baseUrl);
  }

  async applySignature(rawId, rawSignatureId, ctx) {
    const { user } = ctx;
    const signatureId = toId(rawSignatureId, 'signature_id');

    const letter = await this.loadVisibleLetter(rawId, user);
    this.assertCreator(letter, user);
    if (letter.status !== 'send') {
      throw new AppError('LETTER_NOT_EDITABLE', { message: 'status is not send' });
    }

    await this.assertOwnSignature(signatureId, user);

    const updated = await model.transaction(async (tx) => {
      const result = await model.updateLetter(letter.letter_id, { signature_id: signatureId }, tx);
      await audit(tx, ctx, 'letter.apply_signature', 'Letter', letter.letter_id, `Signature ${signatureId} applied`);
      return result;
    });

    return this.formatLetter(updated, ctx.baseUrl);
  }

  // =====================================================================
  // Responses
  // =====================================================================
  async getResponsesByLetter(rawLetterId, ctx) {
    const letter = await this.loadVisibleLetter(rawLetterId, ctx.user);
    return model.findResponsesByLetter(letter.letter_id, 'desc');
  }

  async getResponseById(rawId, ctx) {
    const notVisible = () =>
      new AppError('NOT_FOUND', { message: 'Response does not exist or is not visible to the caller' });

    const response = await model.findResponseById(toId(rawId, 'response_id'));
    if (!response) throw notVisible();

    // Visible only to people who can see the letter that was answered
    await this.loadVisibleLetter(response.letter_id, ctx.user).catch(() => {
      throw notVisible();
    });
    return response;
  }

  async sendLetterResponse(rawLetterId, data = {}, ctx) {
    const { user } = ctx;
    const answered = await this.loadVisibleLetter(rawLetterId, user);

    if (answered.status !== 'received' && answered.status !== 'responded') {
      throw new AppError('LETTER_NOT_RESPONDABLE', { message: 'Only received letters can be responded to.' });
    }
    if (!(await this.isRecipient(answered, user))) {
      throw new AppError('NOT_LETTER_RECIPIENT', { message: 'You are not the recipient of this letter.' });
    }

    const responseLetterId = toId(data.response_letter_id, 'response_letter_id');
    const respondingDirId = toId(data.responding_directory_id, 'responding_directory_id');

    await this.assertOwnDirectory(user, respondingDirId, 'responding_directory_id');

    const responseLetter = await model.findLetterById(responseLetterId);
    if (!responseLetter || responseLetter.created_by !== user.user_id || responseLetter.letter_condition !== 'response') {
      const message = 'response_letter_id must be your own letter with letter_condition=response.';
      throw new AppError('VALIDATION_ERROR', { message, details: [{ field: 'response_letter_id', message }] });
    }

    return model.transaction(async (tx) => {
      const response = await model.createResponse(
        {
          letter_id: answered.letter_id,
          response_letter_id: responseLetterId,
          responded_by: user.user_id,
          responding_directory_id: respondingDirId,
          response_status: 'send',
          responded_at: new Date()
        },
        tx
      );

      await model.updateLetter(answered.letter_id, { status: 'responded' }, tx);

      await model.createNotification(
        {
          user_id: answered.created_by,
          notification_type: 'letter_response_sent',
          title: 'Response Received',
          message: `A formal response has been submitted for letter ${answered.tracking_number}.`,
          related_letter_id: answered.letter_id
        },
        tx
      );

      await audit(tx, ctx, 'letter.response_send', 'Letter', answered.letter_id,
        `Formal response letter ${responseLetterId} sent`);

      return response;
    });
  }

  async updateResponseStatus(rawId, status, ctx) {
    if (!status) {
      const message = 'response_status is required';
      throw new AppError('VALIDATION_ERROR', { message, details: [{ field: 'response_status', message }] });
    }

    const response = await this.getResponseById(rawId, ctx);

    if (!RESPONSE_TRANSITIONS[response.response_status]?.includes(status)) {
      throw new AppError('INVALID_STATE', { message: 'Transition is not allowed.' });
    }

    return model.transaction(async (tx) => {
      const updated = await model.updateResponse(response.response_id, { response_status: status }, tx);
      await audit(tx, ctx, 'response.status_update', 'LetterResponse', response.response_id,
        `Response status changed to ${status}`);
      return updated;
    });
  }
}

export default new LetterService();