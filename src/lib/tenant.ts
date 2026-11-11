// Resolves which course-center portal (if any) this page load belongs to.
// Production: <slug>.flowersos.co. Preview/local only: ?center=<slug> (remembered for the tab; ?center= clears it).
const ROOT_DOMAIN = 'flowersos.co';
// 'solo' is the built-in solo center (0125): it lives at flowersos.co/solo, never on its own subdomain.
const RESERVED = new Set(['www', 'app', 'admin', 'api', 'solo']);
const KEY = 'center-portal-preview-slug';

// The center a production host belongs to; undefined off flowersos.co, where the preview ?center= decides.
export function centerSlugForHost(hostname: string): string | null | undefined {
  const host = hostname.toLowerCase();
  if (host.endsWith(`.${ROOT_DOMAIN}`)) {
    const sub = host.slice(0, -(ROOT_DOMAIN.length + 1));
    return sub && !sub.includes('.') && !RESERVED.has(sub) ? sub : null;
  }
  if (host === ROOT_DOMAIN) return null;
  return undefined;
}

// solo.flowersos.co, and ?center=solo on a preview host, would open the solo center as a plain center portal.
export const soloHostRedirect = (hostname: string, search = '') =>
  (hostname.toLowerCase() === `solo.${ROOT_DOMAIN}`
    || (centerSlugForHost(hostname) === undefined && new URLSearchParams(search).get('center')?.toLowerCase() === 'solo'))
    ? `https://${ROOT_DOMAIN}/solo` : null;

export function resolveCenterSlug(): string | null {
  if (typeof window === 'undefined') return null;
  const slug = centerSlugForHost(window.location.hostname);
  if (slug !== undefined) return slug;
  // Preview & local testing only
  const param = new URLSearchParams(window.location.search).get('center');
  if (param !== null) {
    if (param) sessionStorage.setItem(KEY, param.toLowerCase());
    else sessionStorage.removeItem(KEY);
  }
  const remembered = sessionStorage.getItem(KEY);
  // A tab that remembered ?center=solo before redirecting must not mount the solo center later.
  return remembered === 'solo' ? null : remembered;
}

export const centerPortalUrl = (slug: string) => `https://${slug}.${ROOT_DOMAIN}`;
export const phoneDigits = (v: string) => v.replace(/\D/g, '');
