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
  expect(html).toContain('Tick the box below to continue.');
});

it('creating an account asks for email and password, not a name', () => {
  const html = renderToStaticMarkup(<SoloSignIn />);
  expect(html).toContain('id="solo-email"');
  expect(html).toMatch(/<input[^>]*type="password"[^>]*id="solo-password"|<input[^>]*id="solo-password"[^>]*type="password"/);
  expect(html).toContain('autoComplete="new-password"');
  expect(html).not.toContain('solo-name');
  expect(html).toContain('Create account');
  expect(html).toContain('Already have an account?');
});

it('signing in offers the password, a forgot link and a code instead', () => {
  const html = renderToStaticMarkup(<SoloSignIn start="signin" />);
  expect(html).toContain('Welcome back');
  expect(html).toContain('Forgot password?');
  expect(html).toContain('Email me a sign-in code instead');
  expect(html).toContain('New here?');
  expect(html).not.toContain('Create account<');
});
