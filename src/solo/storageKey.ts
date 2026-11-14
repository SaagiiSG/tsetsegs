import { resolveCenterSlug } from '@/lib/tenant';

// Only the main domain mounts /solo; on a center host, /solo is that center's own route (and keeps the main key).
export const onSoloPage = (pathname: string, centerSlug: string | null) =>
  !centerSlug && (pathname === '/solo' || pathname.startsWith('/solo/'));

// Returns {} off solo paths: `storageKey: undefined` would make supabase-js use an empty key.
export const soloAuthOptions = (
  pathname: string = typeof window === 'undefined' ? '' : window.location.pathname,
  centerSlug: string | null = resolveCenterSlug(),
): { storageKey?: string } => onSoloPage(pathname, centerSlug) ? { storageKey: 'sb-solo-auth-token' } : {};
