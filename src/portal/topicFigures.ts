import type { HairlineSpec } from './HairlineFigure';
import type { Area } from './videoTopics';
import parabola from './hairline/parabola.js';
import balance from './hairline/balance.js';
import unitcircle from './hairline/unitcircle.js';
import scatter from './hairline/scatter.js';
import cubes from './hairline/cubes.js';
import beams from './hairline/beams.js';
import jar from './hairline/jar.js';

/** Where a figure sits: beside the video row it starts at (it leans away from the path), or in its own row after the chest. */
export type FigureSlot = { side: 'left' | 'right'; anchor: number | 'end' };

/** One figure per bend of the path (every 4 videos), at least two, alternating from the left. */
export function figureSlots(videos: number): FigureSlot[] {
  const count = Math.max(2, Math.ceil((videos - 1) / 4));
  return Array.from({ length: count }, (_, k) => ({ side: k % 2 ? 'right' : 'left', anchor: 4 * k + 1 < videos ? 4 * k + 1 : 'end' }));
}

// Each topic's own figures, in slot order (the topic-figures design, 30 Oct). Approved so far: the pilot and the four
// that moved to their best topic. More are added area by area once Saagii approves each sheet.
const OWN: Partial<Record<number, HairlineSpec[]>> = {
  1: [cubes], 3: [balance], 13: [beams], 16: [parabola], 21: [unitcircle], 24: [jar], 25: [scatter],
};

// shortcut: until every topic has its own figures, the rest of its slots borrow its area's set; drop once all 52 are in.
const BY_AREA: Record<Area, HairlineSpec[]> = {
  'Advanced Math': [parabola, balance, unitcircle, scatter],
  Algebra: [balance, scatter, parabola, unitcircle],
  'Geometry & Trig': [unitcircle, parabola, scatter, balance],
  'Problem Solving & Data': [scatter, unitcircle, balance, parabola],
};

/** The figures a topic's map shows, in slot order: its own first, then its area's; none for "More videos". */
export function topicFigures(n: number | null, area: Area | null): HairlineSpec[] {
  if (!area) return [];
  const own = (n !== null && OWN[n]) || [];
  return [...own, ...BY_AREA[area].filter(f => !own.includes(f))];
}
