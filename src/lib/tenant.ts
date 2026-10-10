// Resolves which course-center portal (if any) this page load belongs to.
// Production: <slug>.flowersos.co. Preview/local only: ?center=<slug> (remembered for the tab; ?center= clears it).
const ROOT_DOMAIN = 'flowersos.co';
const RESERVED = new Set(['www', 'app', 'admin', 'api']);
const KEY = 'center-portal-preview-slug';

export function resolveCenterSlug(): string | null {
  if (typeof window === 'undefined') return null;
  const host = window.location.hostname.toLowerCase();
  if (host.endsWith(`.${ROOT_DOMAIN}`)) {
    const sub = host.slice(0, -(ROOT_DOMAIN.length + 1));
    return sub && !sub.includes('.') && !RESERVED.has(sub) ? sub : null;
  }
  if (host === ROOT_DOMAIN) return null;
  // Preview & local testing only
  const param = new URLSearchParams(window.location.search).get('center');
  if (param !== null) {
    if (param) sessionStorage.setItem(KEY, param.toLowerCase());
    else sessionStorage.removeItem(KEY);
  }
  return sessionStorage.getItem(KEY);
}

export const centerPortalUrl = (slug: string) => `https://${slug}.${ROOT_DOMAIN}`;
export const phoneDigits = (v: string) => v.replace(/\D/g, '');
