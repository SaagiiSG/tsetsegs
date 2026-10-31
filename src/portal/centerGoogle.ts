import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';

export type PendingGoogle = { kind: 'join'; code: string } | { kind: 'claim'; phone: string } | { kind: 'link'; token: string };

const KEY = 'center-google-pending';

// Google sign-in redirects the whole page, so the step the student started is parked in sessionStorage.
export function savePending(p: PendingGoogle): void {
  try { sessionStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage blocked: the step is lost */ }
}

// Returns and removes the pending step only if its kind is in `kinds` (no filter = any kind).
export function takePending(kinds?: PendingGoogle['kind'][]): PendingGoogle | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingGoogle;
    if (kinds && !kinds.includes(p.kind)) return null;
    sessionStorage.removeItem(KEY);
    return p;
  } catch { return null; }
}

export async function startGoogle(p: PendingGoogle | null, returnPath: string): Promise<string | null> {
  if (p) savePending(p);
  const res = await lovable.auth.signInWithOAuth('google', { redirect_uri: window.location.origin + returnPath });
  return res.error ? (res.error as Error).message ?? 'Google sign-in failed' : null;
}

// Finishes a claim/link step after the Google redirect; join is finished by the join page.
export async function finishPendingGoogle(center: { id: string; slug: string }): Promise<string | null> {
  const p = takePending(['claim', 'link']);
  if (!p) return null;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  const { error } = p.kind === 'claim'
    ? await supabase.rpc('tenant_claim_with_google' as any, { _slug: center.slug, _phone: p.phone })
    : await supabase.rpc('tenant_google_link_finish' as any, { _token: (p as { token: string }).token });
  return error?.message ?? null;
}
