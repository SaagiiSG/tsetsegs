import { describe, it, expect } from 'vitest';
import { figureSlots, topicFigures } from './topicFigures';
import { TOPICS } from './videoTopics';

const s = (side: 'left' | 'right', anchor: number | 'end') => ({ side, anchor });
describe('figureSlots', () => {
  it('one figure per bend, alternating from the left', () => {
    expect(figureSlots(10)).toEqual([s('left', 1), s('right', 5), s('left', 9)]);
    expect(figureSlots(17)).toEqual([s('left', 1), s('right', 5), s('left', 9), s('right', 13)]);
    expect(figureSlots(6)).toEqual([s('left', 1), s('right', 5)]);
  });
  it('at least two; a missing bend becomes its own row after the chest', () => {
    expect(figureSlots(4)).toEqual([s('left', 1), s('right', 'end')]);
    expect(figureSlots(2)).toEqual([s('left', 1), s('right', 'end')]);
    expect(figureSlots(1)).toEqual([s('left', 'end'), s('right', 'end')]);
  });
});
describe('topicFigures', () => {
  it("shows a topic's own figures first", () => {
    const first = (n: number) => topicFigures(n, TOPICS.find(t => t.n === n)!.area)[0].name;
    expect([1, 3, 13, 16, 21, 24, 25].map(first)).toEqual(['cubes', 'balance', 'beams', 'parabola', 'unitcircle', 'jar', 'scatter']);
  });
  it('Advanced Math topics show their own figures, in slot order', () => {
    const names = (n: number) => topicFigures(n, 'Advanced Math').map(f => f.name);
    expect(names(1).slice(0, 3)).toEqual(['cubes', 'pegs', 'fold']);
    expect(names(2).slice(0, 4)).toEqual(['areatray', 'bins', 'foil', 'factor']);
    expect(names(5).slice(0, 2)).toEqual(['machine', 'vending']);
    expect(names(9).slice(0, 2)).toEqual(['stacks', 'cells']);
    expect(names(12).slice(0, 2)).toEqual(['complete', 'throw']);
    expect(names(15).slice(0, 2)).toEqual(['shift', 'mirror']);
    expect(names(16).slice(0, 3)).toEqual(['parabola', 'fountain', 'halfpipe']);
  });
  it('never repeats a figure within a topic, and fills at least two slots', () => {
    for (const t of TOPICS) {
      const names = topicFigures(t.n, t.area).map(f => f.name);
      expect(new Set(names).size).toBe(names.length);
      expect(names.length).toBeGreaterThanOrEqual(2);
    }
  });
  it('gives More videos no figures', () => expect(topicFigures(null, null)).toEqual([]));
});
