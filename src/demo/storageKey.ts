export type DemoRole = 'student' | 'teacher' | 'admin';

export const demoRoleFromPath = (pathname: string): DemoRole | null =>
  (pathname.match(/^\/demo\/(student|teacher|admin)(\/|$)/)?.[1] as DemoRole | undefined) ?? null;

// Returns {} off demo paths: `storageKey: undefined` would make supabase-js use an empty key.
export const demoAuthOptions = (pathname: string): { storageKey?: string } => {
  const role = demoRoleFromPath(pathname);
  return role ? { storageKey: `sb-demo-${role}-auth-token` } : {};
};
