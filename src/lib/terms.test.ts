import { describe, expect, it } from 'vitest';
import { tickIsFresh } from './terms';

describe('tickIsFresh', () => {
  const now = 1_800_000_000_000;
  it('counts a tick from the last hour', () => expect(tickIsFresh(now - 59 * 60_000, now)).toBe(true));
  it('drops a tick an hour old or older', () => expect(tickIsFresh(now - 60 * 60_000, now)).toBe(false));
  it('drops a missing tick', () => expect(tickIsFresh(0, now)).toBe(false));
});
