import { describe, expect, it } from 'vitest';
import { AppError } from '../src/common/errors/app-error.js';
import { assertCanGrant } from '../src/common/security/privilege.js';
describe('assertCanGrant (anti privilege-escalation)', () => {
  const held = new Set(['letter.read', 'role.update']);
  it('allows granting a subset of what the caller holds', () => {
    expect(() => assertCanGrant(held, ['letter.read'])).not.toThrow();
  });
  it('refuses granting anything the caller lacks and lists it', () => {
    try {
      assertCanGrant(held, ['letter.read', 'user.reset_password', 'audit.read']);
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect(e.code).toBe('FORBIDDEN');
      expect(e.details).toEqual({ permissions: ['audit.read', 'user.reset_password'] });
    }
  });
});
