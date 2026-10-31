import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { demoAuthOptions, demoKeyOk, demoRoleFromPath } from './storageKey';

test('demo role paths get their own key', () => {
  expect(demoAuthOptions('/demo/student/student/home')).toEqual({ storageKey: 'sb-demo-student-auth-token' });
  expect(demoAuthOptions('/demo/teacher')).toEqual({ storageKey: 'sb-demo-teacher-auth-token' });
  expect(demoAuthOptions('/demo/admin/admin/dashboard')).toEqual({ storageKey: 'sb-demo-admin-auth-token' });
});
test('everything else keeps the default key', () => {
  for (const p of ['/', '/demo', '/demo/', '/demo/studentx', '/admin', '/student/home']) expect(demoAuthOptions(p)).toEqual({});
  expect(demoRoleFromPath('/demo')).toBeNull();
});
test('client.ts still uses the demo key (fails if Lovable regenerates the file)', () => {
  const src = readFileSync('src/integrations/supabase/client.ts', 'utf8');
  expect(src).toContain('...demoAuthOptions()');
});
test('demoKeyOk only accepts the role's own demo key', () => {
  expect(demoKeyOk('sb-demo-admin-auth-token', 'admin')).toBe(true);
  expect(demoKeyOk('sb-demo-admin-auth-token', 'student')).toBe(false);
  expect(demoKeyOk('sb-xyz-auth-token', 'student')).toBe(false);
  expect(demoKeyOk(undefined, 'student')).toBe(false);
});
