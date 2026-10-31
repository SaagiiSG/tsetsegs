import { describe, expect, it } from 'vitest';
import { googleStatus, hasGoogleColumns } from './studentGoogle';

describe('googleStatus', () => {
  it('connected with Google', () => expect(googleStatus({ user_id: 'a', google_email: 'x@y.z', google_user_id: 'a' })).toBe('Connected'));
  it('connected but signs in with phone', () => {
    expect(googleStatus({ user_id: null, google_email: 'x@y.z', google_user_id: 'a' })).toBe('Phone sign-in');
    expect(googleStatus({ user_id: 'b', google_email: 'x@y.z', google_user_id: 'a' })).toBe('Phone sign-in');
  });
  it('due date', () => expect(googleStatus({ user_id: null, google_due_on: '2026-11-06' })).toBe('Due Nov 6'));
  it('detects missing columns', () => {
    expect(hasGoogleColumns([{ id: 1 }])).toBe(false);
    expect(hasGoogleColumns([{ id: 1, google_due_on: null }])).toBe(true);
  });
});
