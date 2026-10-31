import { describe, expect, it } from 'vitest';
import { daysLeft, gateState } from './googleGate';

const row = (google_email: string | null, google_due_on = '2026-11-06') => ({ google_email, google_due_on });

describe('gateState', () => {
  it('is off with no row or a connected email', () => {
    expect(gateState(null, '2026-10-30', false)).toBe('off');
    expect(gateState(row('a@b.co'), '2026-12-01', false)).toBe('off');
  });
  it('is off with a verified email', () => {
    expect(gateState({ ...row(null), email_verified_at: '2026-10-31T10:00:00Z' }, '2026-12-01', false)).toBe('off');
  });
  it('asks before the due date, off after Later', () => {
    expect(gateState(row(null), '2026-10-30', false)).toBe('ask');
    expect(gateState(row(null), '2026-10-30', true)).toBe('off');
  });
  it('is required on the due date and after, even after Later', () => {
    expect(gateState(row(null), '2026-11-06', false)).toBe('required');
    expect(gateState(row(null), '2026-11-07', true)).toBe('required');
  });
});

describe('daysLeft', () => {
  it('counts days', () => { expect(daysLeft('2026-11-06', '2026-10-30')).toBe(7); });
});
