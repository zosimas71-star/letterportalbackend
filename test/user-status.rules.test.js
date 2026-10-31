import { describe, expect, it } from 'vitest';
import { ACCOUNT_STATUSES, canTransition, statusChangeProblem } from '../src/modules/users/user-status.rules.js';
describe('account status rules', () => {
  it('approves or rejects a pending account', () => {
    expect(canTransition('pending', 'active')).toBe(true);
    expect(canTransition('pending', 'deactivated')).toBe(true);
    expect(canTransition('pending', 'suspended')).toBe(false);
  });
  it('never goes back to pending', () => {
    for (const from of ACCOUNT_STATUSES) expect(canTransition(from, 'pending')).toBe(false);
    expect(statusChangeProblem('deactivated', 'pending')).toMatch(/deactivated to pending/);
  });
  it('suspends and lifts', () => {
    expect(canTransition('active', 'suspended')).toBe(true);
    expect(canTransition('suspended', 'active')).toBe(true);
  });
  it('reinstates a deactivated user only to active', () => {
    expect(canTransition('deactivated', 'active')).toBe(true);
    expect(canTransition('deactivated', 'suspended')).toBe(false);
  });
  it('flags a no-op change', () => {
    expect(statusChangeProblem('active', 'active')).toMatch(/already active/);
    expect(statusChangeProblem('active', 'suspended')).toBeNull();
  });
});
