import { describe, it, expect } from 'vitest';
import { resolvePublicLanguage } from './publicLanguage';
describe('public entry flow', () => {
  it('keeps the selected English language on sign-in', () => { expect(resolvePublicLanguage(null, 'eng')).toBe('eng'); });
  it('defaults to Mongolian', () => { expect(resolvePublicLanguage(null, null)).toBe('mon'); });
  it('opens a page in its default language when there is no query', () => { expect(resolvePublicLanguage(null, 'mon', 'eng')).toBe('eng'); expect(resolvePublicLanguage(null, null, 'eng')).toBe('eng'); });
  it('lets the query override the page default', () => { expect(resolvePublicLanguage('mon', 'eng', 'eng')).toBe('mon'); });
});