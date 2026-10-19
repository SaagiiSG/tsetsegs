import { describe, it, expect } from 'vitest';
import { requiresDemoSignup, resolvePublicLanguage } from './publicLanguage';
describe('public entry flow', () => {
  it('keeps the selected English language on sign-in', () => { expect(resolvePublicLanguage(null, 'eng')).toBe('eng'); });
  it('defaults to Mongolian', () => { expect(resolvePublicLanguage(null, null)).toBe('mon'); });
  it('requires signup for actions from Start free', () => { for (const a of ['practice', 'video', 'speed', 'attempt', 'goals']) expect(requiresDemoSignup('practice', a)).toBe(true); });
  it('keeps page navigation open in Start free', () => { for (const p of ['Practice', 'Speed', 'Roadmap', 'Leaderboard']) expect(requiresDemoSignup('practice', p)).toBe(false); });
  it('keeps ordinary investor practice available', () => { expect(requiresDemoSignup(null, 'attempt')).toBe(false); expect(requiresDemoSignup('practice', 'Analytics')).toBe(false); });
});