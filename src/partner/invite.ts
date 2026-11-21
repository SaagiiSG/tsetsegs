const KEY = 'partner-invite';

export const normalizeCode = (raw: string) => raw.replace(/\s+/g, '').toUpperCase();

// localStorage so the code survives the Google/Apple/Microsoft round trip; blocked storage just means no code.
export function rememberInvite(code: string | null) {
  try { if (code) localStorage.setItem(KEY, code); else localStorage.removeItem(KEY); } catch { /* no storage */ }
}
export function storedInvite(): string | null {
  try { return localStorage.getItem(KEY) || null; } catch { return null; }
}
export function captureRefParam(search: string) {
  const ref = new URLSearchParams(search).get('ref');
  // Other pages use ?ref=websummit-2026 style tags; only a well-formed code is ours.
  if (ref && /^[A-Z0-9]{3,20}$/.test(normalizeCode(ref))) rememberInvite(normalizeCode(ref));
}

type RpcResult = { error?: unknown } | null | undefined;

/** Tie the stored code to the new student. The client resolves failures as { error }, so only a clean answer clears it. */
export async function attachInvite(rpc: (fn: string, args: object) => PromiseLike<RpcResult>): Promise<void> {
  const _code = storedInvite();
  if (!_code) return;
  try { if (!(await rpc('solo_use_invite', { _code }))?.error) rememberInvite(null); } catch { /* keep the code */ }
}
