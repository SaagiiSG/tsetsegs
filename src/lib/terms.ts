import { supabase } from '@/integrations/supabase/client';

// The date /terms and /privacy last changed in a way that matters. Bump it with them: the next agreement is kept as a new row (0129).
export const TERMS_VERSION = '2026-11-12';
// Absolute: center portals live on their own subdomain, which has no /terms route.
export const TERMS_URL = 'https://flowersos.co/terms';
export const PRIVACY_URL = 'https://flowersos.co/privacy';

// The tick waits in this browser through the Google/Apple/Microsoft round trip until there is a signed-in user to save it for.
const KEY = 'terms-ticked';
// An older tick belongs to an abandoned sign-up, maybe on a shared device, so it never counts for whoever signs in next.
export const tickIsFresh = (at: number, now: number) => at > 0 && now - at < 60 * 60_000;

export function rememberTick(on: boolean) {
  try { if (on) localStorage.setItem(KEY, String(Date.now())); else localStorage.removeItem(KEY); }
  catch { /* Storage blocked: email sign-ups still carry TERMS_VERSION in their account metadata. */ }
}

/** Saves a fresh tick for the signed-in user. On failure the tick stays for the next try. */
export async function recordTick() {
  let at = 0;
  try { at = Number(localStorage.getItem(KEY)); } catch { return; }
  if (!at) return;
  if (!tickIsFresh(at, Date.now())) { rememberTick(false); return; }
  const { error } = await supabase.rpc('accept_terms' as never, { p_version: TERMS_VERSION } as never);
  if (!error) rememberTick(false);
}
