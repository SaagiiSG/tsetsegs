import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type { DemoSession } from './demoData';

const STORAGE_KEY = 'flowersos-investor-demo-v1';
function newToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
}
export function useDemoSession() {
  const [session, setSession] = useState<DemoSession | null>(null);
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(STORAGE_KEY));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const accept = useCallback((data: unknown) => setSession(data as DemoSession), []);
  useEffect(() => {
    let cancelled = false;
    if (!token) { setLoading(false); return; }
    supabase.rpc('investor_demo_state', { _token: token }).then(({ data, error: failure }) => {
      if (cancelled) return;
      // A stale token from an earlier visit is dropped quietly so this visitor gets a fresh start, not the end screen.
      if (failure) { if (failure.message.includes('expired')) { sessionStorage.removeItem(STORAGE_KEY); setToken(null); } else setError(failure.message); }
      else accept(data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [token, accept]);
  const end = useCallback(async () => {
    if (token) await supabase.rpc('investor_demo_end', { _token: token });
    sessionStorage.removeItem(STORAGE_KEY);
    setSession(null); setToken(null); setExpired(true);
  }, [token]);
  useEffect(() => {
    if (session && Date.parse(session.expiresAt) <= now) {
      setSession(null); setExpired(true); void end();
    }
  }, [session, now, end]);
  const start = async () => {
    setBusy(true); setError('');
    const next = newToken();
    const { data, error: failure } = await supabase.rpc('investor_demo_start', { _token: next });
    if (failure) setError(failure.message);
    else { sessionStorage.setItem(STORAGE_KEY, next); setToken(next); accept(data); setExpired(false); }
    setBusy(false);
  };
  const action = async (kind: string, payload: Record<string, Json | undefined>) => {
    if (!token || busy) return false;
    setBusy(true); setError('');
    const { data, error: failure } = await supabase.rpc('investor_demo_action', { _token: token, _action: kind, _payload: payload });
    if (failure) { setError(failure.message); if (failure.message.includes('expired')) void end(); }
    else accept(data);
    setBusy(false); return !failure;
  };
  return { session, loading, busy, error, expired, start, end, action, remaining: session ? Math.min(900, Math.max(0, Math.ceil((Date.parse(session.expiresAt) - now) / 1000))) : 0 };
}