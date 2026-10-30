import type { HairlineSpec } from './HairlineFigure';
import type { Area } from './videoTopics';
import parabola from './hairline/parabola.js';
import balance from './hairline/balance.js';
import unitcircle from './hairline/unitcircle.js';
import scatter from './hairline/scatter.js';

/** Where a figure sits: beside the video row it starts at (it leans away from the path), or in its own row after the chest. */
export type FigureSlot = { side: 'left' | 'right'; anchor: number | 'end' };

/** One figure per bend of the path (every 4 videos), at least two, alternating from the left. */
export function figureSlots(videos: number): FigureSlot[] {
  const count = Math.max(2, Math.ceil((videos - 1) / 4));
  return Array.from({ length: count }, (_, k) => ({ side: k % 2 ? 'right' : 'left', anchor: 4 * k + 1 < videos ? 4 * k + 1 : 'end' }));
}

// The area's own figure first. Project 2 replaces this with each topic's own list.
const BY_AREA: Record<Area, HairlineSpec[]> = {
  'Advanced Math': [parabola, balance, unitcircle, scatter],
  Algebra: [balance, scatter, parabola, unitcircle],
  'Geometry & Trig': [unitcircle, parabola, scatter, balance],
  'Problem Solving & Data': [scatter, unitcircle, balance, parabola],
};

/** The figures a topic's map shows, in slot order; none for "More videos". */
export function topicFigures(_n: number | null, area: Area | null): HairlineSpec[] {
  return area ? BY_AREA[area] : [];
}
