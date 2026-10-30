import { describe, expect, it } from 'vitest';
import { brandPrimary, hexToHslToken } from './centerContext';

describe('brandPrimary', () => {
  it('lifts a near-black brand only in dark mode', () => {
    const black = hexToHslToken('#171717')!;
    expect(brandPrimary(black, false)).toBe(black);
    expect(brandPrimary(black, true)).toBe('0 0% 70%');
  });
  it('keeps a brand that already reads on the dark background', () => {
    const rose = hexToHslToken('#e11d48')!;
    expect(brandPrimary(rose, true)).toBe(rose);
  });
});
