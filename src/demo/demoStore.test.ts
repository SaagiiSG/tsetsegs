import { expect, test } from 'vitest';
import { demoEntry, demoStartError, parseDemo, type DemoCopy } from './demoStore';

const sample: DemoCopy = {
  copyId: 'c1', endToken: 't', slug: 'northside', expiresAt: '', practiceOnly: false, lang: 'eng', ref: null,
  logins: { student: { email: 's@x', password: 'p' }, teacher: { email: 't@x', password: 'p' }, admin: { email: 'a@x', password: 'p' } },
};

test('entry from the educators page', () => expect(demoEntry('?role=admin&preview=educator&lang=eng&ref=websummit')).toEqual({ role: 'admin', practiceOnly: false, lang: 'eng', ref: 'websummit', autoStart: true }));
test('entry from the homepage', () => expect(demoEntry('?signup=practice&lang=mn')).toMatchObject({ role: 'student', practiceOnly: true, autoStart: true }));
test('bare /demo waits for a click', () => expect(demoEntry('')).toMatchObject({ role: 'student', autoStart: false }));
test('stored copy survives a reload until it expires', () => {
  const c = { ...sample, expiresAt: new Date(1_000_000 + 60_000).toISOString() };
  expect(parseDemo(JSON.stringify(c), 1_000_000)).toEqual(c);
  expect(parseDemo(JSON.stringify(c), 1_000_000 + 61_000)).toBeNull();
  expect(parseDemo('{"copyId":1}', 0)).toBeNull();
  expect(parseDemo(null, 0)).toBeNull();
});
test('start errors read as plain sentences', () => {
  expect(demoStartError(429)).toMatch(/Try again in a few minutes/);
  expect(demoStartError(503)).toMatch(/busy/);
  expect(demoStartError(500)).toMatch(/couldn't start/);
});
