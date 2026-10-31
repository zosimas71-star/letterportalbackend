import { forbidden } from '../errors/app-error.js';
/**
 * Anti-escalation rule: nobody can hand out a permission they do not hold themselves.
 * Without it, anyone with role.update / role_assignment.create could grant themselves everything.
 */
export function assertCanGrant(held, codes) {
  const missing = [...new Set(codes)].filter((c) => !held.has(c));
  if (missing.length > 0) {
    throw forbidden('You cannot grant permissions that you do not hold yourself.', {
      permissions: missing.sort(),
    });
  }
}
