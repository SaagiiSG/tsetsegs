import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { captureRefParam, normalizeCode, rememberInvite, storedInvite } from './invite';

// The test environment is node, so give it an in-memory localStorage.
const stubStorage = (over: Partial<Storage> = {}) => {
  const m = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    ...over,
  });
};
beforeEach(() => stubStorage());
afterEach(() => vi.unstubAllGlobals());

it('normalizes, captures ?ref=, keeps the code on other params, clears', () => {
  expect(normalizeCode(' bro dy ')).toBe('BRODY');
  captureRefParam('?ref=brody'); expect(storedInvite()).toBe('BRODY');
  captureRefParam('?utm=x'); expect(storedInvite()).toBe('BRODY');
  rememberInvite(null); expect(storedInvite()).toBeNull();
});

it('blocked storage means no code and no crash', () => {
  const blocked = () => { throw new Error('blocked'); };
  stubStorage({ getItem: blocked, setItem: blocked, removeItem: blocked });
  expect(storedInvite()).toBeNull();
  expect(() => rememberInvite('BRODY')).not.toThrow();
  expect(() => rememberInvite(null)).not.toThrow();
  expect(() => captureRefParam('?ref=x')).not.toThrow();
});
