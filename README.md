# Letter API - COMMON + AUTH + USR

Node 20+ · plain JavaScript (ES modules) · Express 5 · Prisma (MySQL) · Zod · JWT · bcrypt

Implements `api-design.md` sections **AUTH-01…06** and **USR-01…27** on top of the shared COMMON layer.

## Quick start

```bash
cp .env.example .env            # set DATABASE_URL and the 3 secrets
npm install
npx prisma migrate dev --name init   # creates the tables (first time)
npm run db:seed                 # permissions, roles, HQ directory, first admin
npm run dev                     # node --watch, http://localhost:3000/api/v1
npm start                       # production
npm test                        # unit tests (no DB needed)
```

Seeded admin: `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (dev default `ChangeMe#12345` - change it).

## Folder structure

```
prisma/
  schema.prisma            users, roles, permissions, role_permissions, role_assignments,
                           directories*, letters*, letter_files*, audit_logs   (*minimal, extended later)
  seed.js                  idempotent seed
src/
  server.js  app.js  routes.js        bootstrap · middleware pipeline · /api/v1 router
  config/env.js                       zod-validated env (fails fast)
  common/                             ── 1) COMMON ──
    database/prisma.js                1.1 client + DbClient (root | transaction)
    security/jwt.js password.js       1.2 access/refresh JWT (separate secrets, typ claim), bcrypt
    security/access.js privilege.js   1.3 effective permissions per directory · anti-escalation rule
    middleware/authenticate.js        1.2 Bearer check + live account_status check
    middleware/directory-context.js   1.3 X-Directory-Id parsing
    middleware/require-permission.js  1.3 permission guard
    middleware/validate.js            1.4 zod → 422 (body) / 400 (query)
    middleware/error-handler.js       1.4 AppError · Prisma · multer · body-parser → uniform error JSON
    errors/ error-codes.js app-error  1.4 the error catalog as code
    http/response.js                  1.4 { success, data, meta } helpers
    validation/pagination.js          1.5 page/limit/sort(whitelist)/q helpers
    audit/audit.service.js            1.6 writes audit_logs (inside the caller's transaction)
    storage/                          1.7 local ./uploads, magic-number check, SHA-256, HMAC signed URLs
  modules/                            one folder per feature: routes → controller → service (+ schemas)
    auth/            AUTH-01…06
    users/           USR-01…08  (+ user-status.rules.js state machine)
    roles/           USR-09…17
    permissions/     USR-18…22
    role-assignments/ USR-23…27
    files/           GET /files/download (signed link)
test/                pagination, status rules, privilege
```

Layering rule: **routes** declare `authenticate → requirePermission → validate → controller`;
**controllers** only read validated input and shape the response; **services** hold all rules and
database access and never see `req` (they get a `RequestContext`).

## Request pipeline

`helmet → cors → rate-limit → json → /api/v1 → directoryContext → (auth routes | authenticate) → requirePermission(code) → validate(schema) → controller → service → errorHandler`

## Decisions worth knowing

* **Status is live.** `authenticate` re-reads `account_status`; suspending a user blocks them on their very next request (tokens are stateless, so this is the only revocation mechanism).
* **`X-Directory-Id`** scopes permissions to that directory; a directory where the caller has no active role → `403 DIRECTORY_ACCESS_DENIED`. Without it, permissions are the union of all active assignments.
* **Login** does one bcrypt compare even for unknown emails and reveals `ACCOUNT_NOT_ACTIVE` only after a correct password.
* **Status machine** (USR-05, also enforced when `account_status` is sent to USR-04, which then additionally needs `user.manage_status`):
  `pending→active|deactivated · active→suspended|deactivated · suspended→active|deactivated · deactivated→active`; nothing returns to `pending`; you cannot change your own status.
* **No privilege escalation.** You can only grant permissions you hold (role permission edits, role assignments, initial assignments on user create), and you cannot edit your own role assignments.
* **Delete rules.** Role: blocked while assigned (`RESOURCE_IN_USE`), its permission links cascade. Permission: blocked while used by a role. Users are never deleted.
* **Audit rows commit with the change** (same transaction). Secrets in `details` are redacted.
* **USR-08** only returns letters in directories the caller can act in.
* **Plain JS, no build step.** ES modules (`"type": "module"`), so relative imports end in `.js`. Input shapes are defined once as Zod schemas in each module's `*.schemas.js`; `validate()` parses and `getValid(req)` returns `{ params, query, body }`.
* Created users (USR-02) and registrations (AUTH-01) are `pending`, as in the design.

## Next modules

Add `src/modules/<name>/` with the same 5 files and mount it in `src/routes.js`. Reuse
`uploadFiles()` + `storage.commit()` for letter files, `auditService.write(…, tx)` for the trail,
and `parseSort/pageArgs/buildMeta` for lists.
