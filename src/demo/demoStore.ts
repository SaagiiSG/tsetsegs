import { supabase } from '@/integrations/supabase/client';
import { demoRole } from '@/lib/educatorApplications';
import { sourceFromSearch } from '@/lib/educatorLanding';
import { PUBLIC_LANGUAGE_KEY } from '@/lib/publicLanguage';
import type { DemoRole } from './storageKey';

export type DemoCopy = {
  copyId: string; endToken: string; slug: string; expiresAt: string; practiceOnly: boolean; lang: string; ref: string | null;
  logins: Record<DemoRole, { email: string; password: string }>;
};

const COPY_KEY = 'flowersos-demo-v2';
const VISITOR_KEY = 'flowersos-demo-visitor';

export const demoEntry = (search: string) => {
  const p = new URLSearchParams(search);
  const practiceOnly = p.get('signup') === 'practice';
  return {
    role: demoRole(p.get('role')),
    practiceOnly,
    lang: p.get('lang') === 'eng' ? 'eng' : 'mon',
    ref: sourceFromSearch(search),
    autoStart: practiceOnly || p.get('preview') === 'educator',
  };
};

export const parseDemo = (raw: string | null, now: number): DemoCopy | null => {
  try {
    const c = JSON.parse(raw ?? 'null');
    const login = (l: unknown) => typeof (l as { email?: unknown })?.email === 'string' && typeof (l as { password?: unknown }).password === 'string';
    const ok = c && ['copyId', 'endToken', 'slug', 'expiresAt', 'lang'].every(k => typeof c[k] === 'string')
      && typeof c.practiceOnly === 'boolean' && (c.ref === null || typeof c.ref === 'string')
      && login(c.logins?.student) && login(c.logins?.teacher) && login(c.logins?.admin);
    return ok && Date.parse(c.expiresAt) > now ? c : null;
  } catch { return null; }
};

export const demoStartError = (status: number) =>
  status === 429 ? "You've started several demos in a row. Try again in a few minutes."
    : status === 503 ? 'The demo is busy right now. Try again in a minute.'
      : "The demo couldn't start. Please try again.";

export const loadDemo = () => parseDemo(localStorage.getItem(COPY_KEY), Date.now());
export const saveDemo = (c: DemoCopy) => localStorage.setItem(COPY_KEY, JSON.stringify(c));
export const clearDemo = () => {
  localStorage.removeItem(COPY_KEY);
  Object.keys(localStorage).filter(k => k.startsWith('sb-demo-')).forEach(k => localStorage.removeItem(k));
};

export const visitorId = () => {
  let v = localStorage.getItem(VISITOR_KEY);
  if (!v || !/^[0-9a-f]{32}$/.test(v)) {
    v = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(VISITOR_KEY, v);
  }
  return v;
};

export const startDemo = async (e: ReturnType<typeof demoEntry>): Promise<DemoCopy> => {
  const { data, error } = await supabase.functions.invoke('demo', { body: { action: 'start', visitor: visitorId() } });
  if (error || !data?.copyId) {
    const status = (error as { context?: Response } | null)?.context?.status ?? 0;
    throw new Error(demoStartError(status));
  }
  return { ...data, practiceOnly: e.practiceOnly, lang: e.lang, ref: e.ref };
};

export const endDemo = async (c: DemoCopy) => {
  try { await supabase.functions.invoke('demo', { body: { action: 'end', copyId: c.copyId, endToken: c.endToken } }); }
  catch { /* the expiry cleanup removes it anyway */ }
};

// Ends the copy, forgets it, and leaves for the ended screen, keeping the lead source and language.
export const finishDemo = async (c: DemoCopy | null) => {
  const q = new URLSearchParams({ ended: '1' });
  if (c) { q.set('lang', c.lang); if (c.ref) q.set('ref', c.ref); }
  clearDemo();
  if (c) await endDemo(c);
  window.location.replace(`/demo?${q}`);
};

export const setPortalLanguage = (lang: string) => localStorage.setItem(PUBLIC_LANGUAGE_KEY, lang);
