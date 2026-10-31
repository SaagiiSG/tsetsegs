import { describe, expect, it } from 'vitest';
import { isLateJoin, rosterState } from './proctorModel';

const base = { code_verified_at: null, oath_accepted_at: null, status: 'in_progress' };

describe('rosterState', () => {
  it('walks joined -> unlocked -> oath -> testing -> done', () => {
    expect(rosterState(base)).toBe('joined');
    expect(rosterState({ ...base, code_verified_at: 'x' })).toBe('unlocked');
    expect(rosterState({ ...base, code_verified_at: 'x', oath_accepted_at: 'x' })).toBe('oath');
    expect(rosterState({ ...base, code_verified_at: 'x', oath_accepted_at: 'x' }, true)).toBe('testing');
    expect(rosterState({ ...base, status: 'completed' })).toBe('done');
  });
});

describe('isLateJoin', () => {
  const s = '2026-10-30T10:00:00Z';
  it('flags joins over 2 minutes after start', () => expect(isLateJoin('2026-10-30T10:02:01Z', s)).toBe(true));
  it('allows joins within 2 minutes', () => expect(isLateJoin('2026-10-30T10:01:59Z', s)).toBe(false));
  it('is false before the session starts', () => expect(isLateJoin('2026-10-30T10:05:00Z', null)).toBe(false));
});
