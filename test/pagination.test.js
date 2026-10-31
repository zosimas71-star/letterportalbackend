import { describe, expect, it } from 'vitest';
import { AppError } from '../src/common/errors/app-error.js';
import { buildMeta, listQuerySchema, pageArgs, parseSort, searchOr } from '../src/common/validation/pagination.js';
const ALLOWED = ['user_id', 'created_at', 'email'];
describe('parseSort', () => {
  it('parses asc/desc and multiple fields', () => {
    expect(parseSort('-created_at,email', ALLOWED, 'user_id')).toEqual([{ created_at: 'desc' }, { email: 'asc' }]);
  });
  it('uses the fallback', () => {
    expect(parseSort(undefined, ALLOWED, '-created_at')).toEqual([{ created_at: 'desc' }]);
  });
  it('rejects fields outside the whitelist', () => {
    expect(() => parseSort('password_hash', ALLOWED, 'user_id')).toThrowError(AppError);
    try {
      parseSort('-password_hash', ALLOWED, 'user_id');
    } catch (e) {
      expect(e.code).toBe('INVALID_QUERY_PARAMETER');
      expect(e.status).toBe(400);
    }
  });
  it('limits to 3 fields', () => {
    expect(() => parseSort('user_id,email,created_at,-user_id', ALLOWED, 'user_id')).toThrow();
  });
});
describe('listQuerySchema / meta', () => {
  it('applies defaults and coerces', () => {
    const q = listQuerySchema.parse({ page: '2', limit: '50' });
    expect(q).toMatchObject({ page: 2, limit: 50 });
    expect(listQuerySchema.parse({})).toMatchObject({ page: 1, limit: 20 });
  });
  it('enforces limit 1..100', () => {
    expect(listQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
    expect(listQuerySchema.safeParse({ limit: '0' }).success).toBe(false);
    expect(listQuerySchema.safeParse({ page: '0' }).success).toBe(false);
  });
  it('computes skip/take and total_pages', () => {
    expect(pageArgs({ page: 3, limit: 20 })).toEqual({ skip: 40, take: 20 });
    expect(buildMeta(1, 20, 0).total_pages).toBe(1);
    expect(buildMeta(1, 20, 41)).toEqual({ page: 1, limit: 20, total: 41, total_pages: 3 });
  });
  it('builds an OR search only when q is present', () => {
    expect(searchOr(undefined, ['email'])).toBeUndefined();
    expect(searchOr('abe', ['email', 'first_name'])).toEqual([
      { email: { contains: 'abe' } },
      { first_name: { contains: 'abe' } },
    ]);
  });
});
