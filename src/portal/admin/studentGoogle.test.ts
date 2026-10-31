import { describe, expect, it } from 'vitest';
import { googleStatus, hasGoogleColumns } from './studentGoogle';

describe('googleStatus', () => {
  it('connected with Google', () => expect(googleStatus({ user_id: 'a', google_email: 'x@y.z', google_user_id: 'a' })).toBe('Connected'));
  it('connected but signs in with phone', () => {
    expect(googleStatus({ user_id: null, google_email: 'x@y.z', google_user_id: 'a' })).toBe('Phone sign-in');
    expect(googleStatus({ user_id: 'b', google_email: 'x@y.z', google_user_id: 'a' })).toBe('Phone sign-in');
  });
  it('due date', () => expect(googleStatus({ user_id: null, google_due_on: '2026-11-06' }, '2026-10-31')).toBe('Due Nov 6'));
  it('due today still shows the date', () => expect(googleStatus({ user_id: null, google_due_on: '2026-11-06' }, '2026-11-06')).toBe('Due Nov 6'));
  it('past due falls back', () => expect(googleStatus({ user_id: null, google_due_on: '2026-11-06' }, '2026-11-07')).toBe('Not connected'));
  it('verified email', () => expect(googleStatus({ user_id: 'a', email_verified_at: '2026-10-31T00:00:00Z', google_due_on: '2026-11-06' })).toBe('Email verified'));
  it('detects missing columns', () => {
    expect(hasGoogleColumns([{ id: 1 }])).toBe(false);
    expect(hasGoogleColumns([{ id: 1, google_due_on: null }])).toBe(true);
  });
});
