import { describe, it, expect } from 'vitest';
import { deviceLanguage, resolvePublicLanguage } from './publicLanguage';
describe('public entry flow', () => {
  it('keeps the selected English language on sign-in', () => { expect(resolvePublicLanguage(null, 'eng')).toBe('eng'); });
  it('keeps a saved Mongolian choice, even on an English device', () => { expect(resolvePublicLanguage(null, 'mon', undefined, 'eng')).toBe('mon'); });
  it('with nothing saved, follows the device', () => {
    expect(resolvePublicLanguage(null, null, undefined, 'eng')).toBe('eng');
    expect(resolvePublicLanguage(null, null, undefined, 'mon')).toBe('mon');
  });
  it('opens a page in its default language when there is no query', () => { expect(resolvePublicLanguage(null, 'mon', 'eng')).toBe('eng'); expect(resolvePublicLanguage(null, null, 'eng')).toBe('eng'); });
  it('lets the query override the page default', () => { expect(resolvePublicLanguage('mon', 'eng', 'eng')).toBe('mon'); });
});
describe('deviceLanguage', () => {
  it('is English anywhere in the world', () => {
    expect(deviceLanguage(['en-US'], 'America/Edmonton')).toBe('eng');
    expect(deviceLanguage(['pt-PT'], 'Europe/Lisbon')).toBe('eng');
    expect(deviceLanguage([], '')).toBe('eng');
  });
  it('is Mongolian for a Mongolian-language device or Mongolia time', () => {
    expect(deviceLanguage(['mn-MN', 'en'], 'America/Edmonton')).toBe('mon');
    expect(deviceLanguage(['en-US'], 'Asia/Ulaanbaatar')).toBe('mon');
    expect(deviceLanguage(['en-US'], 'Asia/Hovd')).toBe('mon');
  });
  it('does not mistake Manipuri (mni) for Mongolian', () => { expect(deviceLanguage(['mni-IN'], 'Asia/Kolkata')).toBe('eng'); });
});
