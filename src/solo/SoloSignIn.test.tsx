import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { SoloBlocked } from './SoloSignIn';

it('the join-refused block screen has a sign-out and no account link', () => {
  const html = renderToStaticMarkup(<SoloBlocked onSignOut={() => {}} />);
  expect(html).toContain('Sign out');
  expect(html).not.toContain('I already have a solo account');
});

it('the block screen explains itself, links to the Flowers course and offers no sign-in', () => {
  const html = renderToStaticMarkup(<SoloBlocked onHaveAccount={() => {}} />);
  expect(html).toContain('outside Mongolia');
  expect(html).toContain('href="/?lang=mon"');
  expect(html).toContain('I already have a solo account');
  expect(html).not.toContain('Continue with Google');
});
