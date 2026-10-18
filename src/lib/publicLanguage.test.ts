import { describe, it, expect } from 'vitest';
import { requiresDemoSignup, resolvePublicLanguage } from './publicLanguage';
describe('public entry flow', () => {
  it('keeps the selected English language on sign-in', () => { expect(resolvePublicLanguage(null, 'eng')).toBe('eng'); });
  it('defaults to Mongolian', () => { expect(resolvePublicLanguage(null, null)).toBe('mon'); });
  it('requires signup for practice from Start free', () => { expect(requiresDemoSignup('practice', 'Practice')).toBe(true); expect(requiresDemoSignup('practice', 'Speed')).toBe(true); expect(requiresDemoSignup('practice', 'attempt')).toBe(true); });
  it('keeps ordinary investor practice available', () => { expect(requiresDemoSignup(null, 'attempt')).toBe(false); expect(requiresDemoSignup('practice', 'Analytics')).toBe(false); });
});