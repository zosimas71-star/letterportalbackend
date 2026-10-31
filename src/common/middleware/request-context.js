export function reqCtx(req) {
  return {
    userId: req.auth?.userId ?? null,
    directoryId: req.directoryId ?? null,
    directoryIds: req.access?.directoryIds ?? [],
    permissions: req.access?.permissions ?? new Set(),
    ip: req.ip,
  };
}
