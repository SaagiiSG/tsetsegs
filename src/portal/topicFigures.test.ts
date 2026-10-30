import { describe, it, expect } from 'vitest';
import { figureSlots, topicFigures } from './topicFigures';

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
  it("puts the area's own figure first", () => {
    expect(topicFigures(1, 'Advanced Math')[0].name).toBe('parabola');
    expect(topicFigures(3, 'Algebra')[0].name).toBe('balance');
    expect(topicFigures(17, 'Geometry & Trig')[0].name).toBe('unitcircle');
    expect(topicFigures(8, 'Problem Solving & Data')[0].name).toBe('scatter');
  });
  it('gives four different figures for an area, and none for More videos', () => {
    expect(new Set(topicFigures(1, 'Advanced Math').map(f => f.name)).size).toBe(4);
    expect(topicFigures(null, null)).toEqual([]);
  });
});
