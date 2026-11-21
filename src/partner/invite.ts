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
  if (ref && normalizeCode(ref)) rememberInvite(normalizeCode(ref));
}
