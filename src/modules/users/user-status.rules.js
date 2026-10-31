export const ACCOUNT_STATUSES = ['pending', 'active', 'suspended', 'deactivated'];
/**
 *  pending      -> active (approve) | deactivated (reject)
 *  active       -> suspended | deactivated
 *  suspended    -> active (lift)    | deactivated
 *  deactivated  -> active (reinstate)
 *  Nothing ever goes back to `pending`.
 */
export const ALLOWED_TRANSITIONS = {
  pending: ['active', 'deactivated'],
  active: ['suspended', 'deactivated'],
  suspended: ['active', 'deactivated'],
  deactivated: ['active'],
};
export const canTransition = (from, to) => ALLOWED_TRANSITIONS[from].includes(to);
/** Returns an error message when the change is not allowed, otherwise null. */
export function statusChangeProblem(from, to) {
  if (from === to) return `User is already ${to}.`;
  if (!canTransition(from, to)) return `Cannot change account status from ${from} to ${to}.`;
  return null;
}
