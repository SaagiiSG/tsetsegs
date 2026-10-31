import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.hoisted(() => vi.fn());
const getSession = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc, auth: { getSession } } }));
vi.mock('@/integrations/lovable', () => ({ lovable: { auth: { signInWithOAuth: vi.fn() } } }));

import { finishPendingGoogle, savePending, takePending } from './centerGoogle';

const stub = (broken = false) => {
  const m = new Map<string, string>();
  (globalThis as any).sessionStorage = {
    getItem: (k: string) => { if (broken) throw new Error('blocked'); return m.get(k) ?? null; },
    setItem: (k: string, v: string) => { m.set(k, v); },
    removeItem: (k: string) => { m.delete(k); },
  };
};

describe('centerGoogle pending step', () => {
  beforeEach(() => { stub(); rpc.mockReset(); getSession.mockReset(); getSession.mockResolvedValue({ data: { session: { user: { id: 'u' } } } }); });

  it('returns a saved step once, then null', () => {
    savePending({ kind: 'claim', phone: '99' });
    expect(takePending()).toEqual({ kind: 'claim', phone: '99' });
    expect(takePending()).toBeNull();
  });
  it('broken storage gives null without throwing', () => {
    stub(true);
    expect(takePending()).toBeNull();
  });
  it('kinds filter leaves other kinds stored', () => {
    savePending({ kind: 'join', code: 'ABC' });
    expect(takePending(['claim', 'link'])).toBeNull();
    expect(takePending(['join'])).toEqual({ kind: 'join', code: 'ABC' });
  });
  it('finish with nothing pending makes no RPC call', async () => {
    expect(await finishPendingGoogle({ id: 'i', slug: 's' })).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });
  it('finish runs claim and link RPCs and returns the error message', async () => {
    rpc.mockResolvedValue({ error: { message: 'nope' } });
    savePending({ kind: 'claim', phone: '99' });
    expect(await finishPendingGoogle({ id: 'i', slug: 's' })).toBe('nope');
    expect(rpc).toHaveBeenCalledWith('tenant_claim_with_google', { _slug: 's', _phone: '99' });
    rpc.mockResolvedValue({ error: null });
    savePending({ kind: 'link', token: 't' });
    expect(await finishPendingGoogle({ id: 'i', slug: 's' })).toBeNull();
    expect(rpc).toHaveBeenLastCalledWith('tenant_google_link_finish', { _token: 't' });
  });
  it('with no session the step stays stored and no RPC is called', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    savePending({ kind: 'claim', phone: '99' });
    expect(await finishPendingGoogle({ id: 'i', slug: 's' })).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
    expect(takePending()).toEqual({ kind: 'claim', phone: '99' });
  });
  it('resolves to a message instead of throwing when the RPC rejects', async () => {
    rpc.mockRejectedValue(new Error('network down'));
    savePending({ kind: 'link', token: 't' });
    expect(await finishPendingGoogle({ id: 'i', slug: 's' })).toBe('network down');
  });
});
