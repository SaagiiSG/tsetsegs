import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { soloAuthOptions } from './storageKey';

it('uses its own storage key on /solo paths only', () => {
  expect(soloAuthOptions('/solo')).toEqual({ storageKey: 'sb-solo-auth-token' });
  expect(soloAuthOptions('/solo/student/speed')).toEqual({ storageKey: 'sb-solo-auth-token' });
  for (const p of ['/practice', '/', '/soloist', '/demo/student']) expect(soloAuthOptions(p)).toEqual({});
});

it('is spread into the supabase client', () => {
  expect(readFileSync('src/integrations/supabase/client.ts', 'utf8')).toContain('...soloAuthOptions()');
});
