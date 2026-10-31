import { describe, expect, it } from 'vitest';
import { countsAsFocusLoss } from './proctorFocus';

describe('countsAsFocusLoss', () => {
  it('counts a hidden tab', () => expect(countsAsFocusLoss('hidden', 'BODY')).toBe(true));
  it('ignores a blur into the Desmos iframe', () => expect(countsAsFocusLoss('blur', 'IFRAME')).toBe(false));
  it('counts a blur from an input', () => expect(countsAsFocusLoss('blur', 'INPUT')).toBe(true));
});
