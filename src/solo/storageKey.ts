// Returns {} off solo paths: `storageKey: undefined` would make supabase-js use an empty key.
export const soloAuthOptions = (pathname: string = typeof window === 'undefined' ? '' : window.location.pathname): { storageKey?: string } =>
  pathname === '/solo' || pathname.startsWith('/solo/') ? { storageKey: 'sb-solo-auth-token' } : {};
