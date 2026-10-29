import { describe, it, expect } from 'vitest';
import { moduleSecondsLeft } from './testTimer';
const start = '2026-10-29T10:00:00Z';
describe('test timer', () => {
  it('moduleSecondsLeft counts down', () => {
    expect(moduleSecondsLeft(start, 35, Date.parse('2026-10-29T10:34:00Z'))).toBe(60);
  });
  it('moduleSecondsLeft is 0 after the deadline', () => {
    expect(moduleSecondsLeft(start, 35, Date.parse('2026-10-29T11:00:00Z'))).toBe(0);
  });
});
