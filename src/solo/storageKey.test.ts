import { expect, it } from 'vitest';
import clientSrc from '../integrations/supabase/client.ts?raw';
import { onSoloPage, soloAuthOptions } from './storageKey';

it('uses its own storage key on /solo paths only', () => {
  expect(soloAuthOptions('/solo')).toEqual({ storageKey: 'sb-solo-auth-token' });
  expect(soloAuthOptions('/solo/student/speed')).toEqual({ storageKey: 'sb-solo-auth-token' });
  for (const p of ['/practice', '/', '/soloist', '/demo/student']) expect(soloAuthOptions(p)).toEqual({});
});

it('a center host keeps /solo for its own routing, with the normal key', () => {
  expect(onSoloPage('/solo', null)).toBe(true);
  expect(onSoloPage('/solo', 'sky')).toBe(false);
  expect(onSoloPage('/solo/student', 'sky')).toBe(false);
  expect(soloAuthOptions('/solo', 'sky')).toEqual({});
});

it('is spread into the supabase client', () => {
  expect(clientSrc).toContain('...soloAuthOptions()');
});
