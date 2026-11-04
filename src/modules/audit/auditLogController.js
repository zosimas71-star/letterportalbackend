import * as auditLogService from './auditLogService.js';

// Controller layer: HTTP in, HTTP out. Errors go to the central errorHandler via next(err).

export const listAuditLogs = async (req, res, next) => {
  try {
    const { data, meta } = await auditLogService.listAuditLogs(req.query);
    res.json({ success: true, data, meta });
  } catch (err) {
    next(err);
  }
};

export const getAuditLog = async (req, res, next) => {
  try {
    const data = await auditLogService.getAuditLog(req.params.audit_log_id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};