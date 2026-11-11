import { expect, it } from 'vitest';
import { centerSlugForHost, soloHostRedirect } from './tenant';

it('solo.flowersos.co is no center portal; it goes to flowersos.co/solo', () => {
  expect(centerSlugForHost('solo.flowersos.co')).toBeNull();
  expect(centerSlugForHost('SOLO.flowersos.co')).toBeNull();
  expect(soloHostRedirect('solo.flowersos.co')).toBe('https://flowersos.co/solo');
  expect(soloHostRedirect('Solo.FlowersOS.co')).toBe('https://flowersos.co/solo');
});

it('?center=solo on a preview host goes to flowersos.co/solo too', () => {
  for (const h of ['tsetsegs.lovable.app', 'localhost', 'id-preview--x.lovable.app'])
    expect(soloHostRedirect(h, '?center=solo')).toBe('https://flowersos.co/solo');
  expect(soloHostRedirect('localhost', '?foo=1&center=SOLO')).toBe('https://flowersos.co/solo');
  // Other preview slugs, and ?center= on production hosts (which ignore it), don't redirect.
  for (const q of ['?center=sky', '?center=', '?center=solo-prep', '', '?solo=1']) expect(soloHostRedirect('tsetsegs.lovable.app', q)).toBeNull();
  for (const h of ['flowersos.co', 'www.flowersos.co', 'sky.flowersos.co']) expect(soloHostRedirect(h, '?center=solo')).toBeNull();
});

it('every other host resolves as before, and never redirects', () => {
  expect(centerSlugForHost('sky.flowersos.co')).toBe('sky');
  expect(centerSlugForHost('Sky.FlowersOS.co')).toBe('sky');
  expect(centerSlugForHost('solo-prep.flowersos.co')).toBe('solo-prep');
  for (const h of ['www.flowersos.co', 'app.flowersos.co', 'admin.flowersos.co', 'api.flowersos.co', 'flowersos.co', 'a.b.flowersos.co'])
    expect(centerSlugForHost(h)).toBeNull();
  // Off flowersos.co the preview ?center= decides.
  for (const h of ['localhost', 'tsetsegs.lovable.app', 'notflowersos.co']) expect(centerSlugForHost(h)).toBeUndefined();
  for (const h of ['sky.flowersos.co', 'flowersos.co', 'www.flowersos.co', 'solo-prep.flowersos.co', 'localhost', 'solo.example.com'])
    expect(soloHostRedirect(h)).toBeNull();
});
