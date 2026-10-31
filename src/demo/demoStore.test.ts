import { expect, test } from 'vitest';
import { demoEntry, demoStartError, endedUrl, ownsStorage, parseDemo, resumeStored, storedRole, type DemoCopy } from './demoStore';

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

test('lang: the URL wins, then the visitor preference, then Mongolian', () => {
  expect(demoEntry('?lang=mon', 'eng').lang).toBe('mon');
  expect(demoEntry('', 'eng').lang).toBe('eng');
  expect(demoEntry('', null).lang).toBe('mon');
});
test('the ended URL keeps ref, lang, role and practice-only', () => {
  expect(endedUrl({ ...sample, ref: 'websummit' }, 'teacher')).toBe('/demo?ended=1&lang=eng&ref=websummit&role=teacher');
  expect(endedUrl({ ...sample, practiceOnly: true }, 'student')).toBe('/demo?ended=1&lang=eng&signup=practice');
  expect(endedUrl(null)).toBe('/demo?ended=1');
});
test('a demo only clears storage that is empty or its own', () => {
  expect(ownsStorage(null, sample)).toBe(true);
  expect(ownsStorage(sample, sample)).toBe(true);
  expect(ownsStorage({ ...sample, copyId: 'newer' }, sample)).toBe(false);
});
test('a stored copy sends practice visitors to student and others to the asked role', () => {
  expect(storedRole({ ...sample, practiceOnly: true }, '?role=admin')).toBe('student');
  expect(storedRole(sample, '?role=admin')).toBe('admin');
  expect(storedRole(sample, '')).toBe('student');
});
test('a practice copy plus an educators role link upgrades to a full copy', () => {
  const practice = { ...sample, practiceOnly: true };
  expect(resumeStored(practice, '?role=admin&preview=educator')).toEqual({ copy: sample, role: 'admin' });
  expect(resumeStored(practice, '?role=admin').role).toBe('student');
  expect(resumeStored(practice, '?preview=educator').copy.practiceOnly).toBe(true);
  expect(resumeStored(sample, '?role=admin').copy).toBe(sample);
});
