import { describe, expect, it } from 'vitest';
import { awayStep, countsAsFocusLoss } from './proctorFocus';

describe('countsAsFocusLoss', () => {
  it('counts a hidden tab', () => expect(countsAsFocusLoss('hidden', 'BODY')).toBe(true));
  it('ignores a blur into the Desmos iframe', () => expect(countsAsFocusLoss('blur', 'IFRAME')).toBe(false));
  it('counts a blur from an input', () => expect(countsAsFocusLoss('blur', 'INPUT')).toBe(true));
});

describe('awayStep', () => {
  it('counts blur then hidden once', () => {
    const a = awayStep(false, 'blur', 'BODY'); const b = awayStep(a.away, 'hidden', 'BODY');
    expect([a.counted, b.counted]).toEqual([true, false]);
  });
  it('counts again after coming back', () => {
    expect(awayStep(awayStep(true, 'back', undefined).away, 'blur', 'BODY').counted).toBe(true);
  });
  it('ignores the calculator iframe', () => expect(awayStep(false, 'blur', 'IFRAME')).toEqual({ away: false, counted: false }));
});
