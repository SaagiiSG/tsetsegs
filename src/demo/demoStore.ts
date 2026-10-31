import { supabase } from '@/integrations/supabase/client';
import { demoRole } from '@/lib/educatorApplications';
import { sourceFromSearch } from '@/lib/educatorLanding';
import { PUBLIC_LANGUAGE_KEY } from '@/lib/publicLanguage';
import type { DemoRole } from './storageKey';

export type DemoCopy = {
  copyId: string; endToken: string; slug: string; expiresAt: string; practiceOnly: boolean; lang: string; ref: string | null;
  logins: Record<DemoRole, { email: string; password: string }>;
};

// Blocked storage (private mode, site data off) reads as "nothing stored".
const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  remove: (k: string) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
  keys: () => { try { return Object.keys(localStorage); } catch { return [] as string[]; } },
};

const COPY_KEY = 'flowersos-demo-v2';
const VISITOR_KEY = 'flowersos-demo-visitor';

export const demoEntry = (search: string, storedLang: string | null = store.get(PUBLIC_LANGUAGE_KEY)) => {
  const p = new URLSearchParams(search);
  const practiceOnly = p.get('signup') === 'practice';
  return {
    role: demoRole(p.get('role')),
    practiceOnly,
    lang: (p.has('lang') ? p.get('lang') : storedLang) === 'eng' ? 'eng' : 'mon',
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

export const loadDemo = () => parseDemo(store.get(COPY_KEY), Date.now());
export const saveDemo = (c: DemoCopy) => store.set(COPY_KEY, JSON.stringify(c));
export const clearDemo = () => {
  store.remove(COPY_KEY);
  store.keys().filter(k => k.startsWith('sb-demo-')).forEach(store.remove);
};

export const visitorId = () => {
  let v = store.get(VISITOR_KEY);
  if (!v || !/^[0-9a-f]{32}$/.test(v)) {
    v = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
    store.set(VISITOR_KEY, v);
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

// A stored copy is only ever cleared by the demo that owns it, so an old tab can't wipe a newer copy.
export const ownsStorage = (stored: DemoCopy | null, c: DemoCopy) => !stored || stored.copyId === c.copyId;

// Where a stored copy sends the visitor: a practice copy is student-only; otherwise the URL may ask for a role.
export const storedRole = (c: DemoCopy, search: string): DemoRole =>
  c.practiceOnly || !new URLSearchParams(search).has('role') ? 'student' : demoRole(new URLSearchParams(search).get('role'));

// A practice copy opened from the /educators page (preview=educator + a role) becomes a full copy.
export const resumeStored = (c: DemoCopy, search: string): { copy: DemoCopy; role: DemoRole } => {
  const p = new URLSearchParams(search);
  const copy = c.practiceOnly && p.get('preview') === 'educator' && p.has('role') ? { ...c, practiceOnly: false } : c;
  return { copy, role: storedRole(copy, search) };
};

// The ended screen keeps the lead source, language, role and practice-only mode, so "Start a new demo" restarts the same demo.
export const endedUrl = (c: DemoCopy | null, role?: DemoRole) => {
  const q = new URLSearchParams({ ended: '1' });
  if (c) {
    q.set('lang', c.lang);
    if (c.ref) q.set('ref', c.ref);
    if (c.practiceOnly) q.set('signup', 'practice');
    else if (role) q.set('role', role);
  }
  return `/demo?${q}`;
};

// Ends the copy, forgets it, and leaves for the ended screen.
export const finishDemo = async (c: DemoCopy | null, role?: DemoRole) => {
  if (!c || ownsStorage(loadDemo(), c)) clearDemo();
  if (c) await endDemo(c);
  window.location.replace(endedUrl(c, role));
};

// The visitor's own language choice wins; a URL lang only fills it in, or replaces it when force is set.
export const setPortalLanguage = (lang: string, force = false) => {
  if (force || !store.get(PUBLIC_LANGUAGE_KEY)) store.set(PUBLIC_LANGUAGE_KEY, lang);
};
