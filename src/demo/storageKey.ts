export type DemoRole = 'student' | 'teacher' | 'admin';

export const demoRoleFromPath = (pathname: string): DemoRole | null =>
  (pathname.match(/^\/demo\/(student|teacher|admin)(\/|$)/)?.[1] as DemoRole | undefined) ?? null;

// Returns {} off demo paths: `storageKey: undefined` would make supabase-js use an empty key.
export const demoAuthOptions = (pathname: string = typeof window === 'undefined' ? '' : window.location.pathname): { storageKey?: string } => {
  const role = demoRoleFromPath(pathname);
  return role ? { storageKey: `sb-demo-${role}-auth-token` } : {};
};

// Guards real logins: the demo must never sign in on a client that lost its demo key.
export const demoKeyOk = (actual: unknown, role: DemoRole) => actual === `sb-demo-${role}-auth-token`;
