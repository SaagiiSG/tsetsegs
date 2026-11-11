import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import SoloSignIn, { SoloBlocked } from './SoloSignIn';

it('the join-refused block screen has a sign-out and no account link', () => {
  const html = renderToStaticMarkup(<SoloBlocked onSignOut={() => {}} />);
  expect(html).toContain('Sign out');
  expect(html).not.toContain('I already have a solo account');
});

it('the block screen explains itself, links to the Flowers course and offers no sign-in', () => {
  const html = renderToStaticMarkup(<SoloBlocked onHaveAccount={() => {}} />);
  // Mongolian first: the heading, then the rest of the Mongolian copy, then the English.
  expect(html).toMatch(/<h1[^>]*>Solo бүртгэл зөвхөн Монголоос гадна байгаа сурагчдад зориулагдсан\.<\/h1>\s*<p[^>]*>Монголд flowersos нь Flowers-ийн SAT сургалттай хамт ирдэг\.<\/p>\s*<p[^>]*>Solo accounts are for students outside Mongolia\. In Mongolia, flowersos comes with the Flowers SAT course\.<\/p>/);
  expect(html).toContain('href="/?lang=mon"');
  expect(html).toContain('I already have a solo account');
  expect(html).not.toContain('Continue with Google');
});

it('the sign-in page sits on the cloud sky and offers Google, Apple and Microsoft with their marks', () => {
  const html = renderToStaticMarkup(<SoloSignIn />);
  expect(html).toContain('auth-sky');
  for (const p of ['Google', 'Apple', 'Microsoft']) expect(html).toContain(`Continue with ${p}`);
  expect(html.match(/<button[^>]*>\s*<svg/g)?.length).toBe(3);
  expect(html).toContain('Email me a code');
});
