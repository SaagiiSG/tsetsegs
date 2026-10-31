import { describe, expect, it } from 'vitest';
import { withLock } from './examLock';

describe('withLock', () => {
  it('stays locked while any caller holds it, in any release order', () => {
    const both = withLock(withLock(new Set(), 'a', true), 'b', true);
    expect(withLock(both, 'a', false).size).toBe(1);
    expect(withLock(withLock(both, 'b', false), 'a', false).size).toBe(0);
  });
  it('ignores a release nobody asked for and a repeat acquire', () => {
    const none = new Set<string>();
    expect(withLock(none, 'a', false)).toBe(none);
    const one = withLock(none, 'a', true);
    expect(withLock(one, 'a', true)).toBe(one);
  });
});
