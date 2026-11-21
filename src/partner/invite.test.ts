import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { attachInvite, captureRefParam, normalizeCode, rememberInvite, storedInvite } from './invite';

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

it('attachInvite clears the code on a clean answer, keeps it on { error } or a throw', async () => {
  rememberInvite('BRODY');
  await attachInvite(async () => ({ error: { message: 'x' } })); expect(storedInvite()).toBe('BRODY');
  await attachInvite(async () => { throw new Error('net'); }); expect(storedInvite()).toBe('BRODY');
  const rpc = vi.fn(async () => ({ error: null }));
  await attachInvite(rpc); expect(rpc).toHaveBeenCalledWith('solo_use_invite', { _code: 'BRODY' }); expect(storedInvite()).toBeNull();
  await attachInvite(rpc); expect(rpc).toHaveBeenCalledTimes(1);
});

it('stores only a well-formed ref code, so ?ref=websummit-2026 tags nothing', () => {
  captureRefParam('?ref=websummit-2026'); expect(storedInvite()).toBeNull();
  captureRefParam('?ref=ab'); expect(storedInvite()).toBeNull();
  captureRefParam('?ref=websummit'); expect(storedInvite()).toBe('WEBSUMMIT');
});
