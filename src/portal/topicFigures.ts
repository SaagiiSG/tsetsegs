import type { HairlineSpec } from './HairlineFigure';
import type { Area } from './videoTopics';
import parabola from './hairline/parabola.js';
import balance from './hairline/balance.js';
import unitcircle from './hairline/unitcircle.js';
import scatter from './hairline/scatter.js';
import cubes from './hairline/cubes.js';
import beams from './hairline/beams.js';
import jar from './hairline/jar.js';
import pegs from './hairline/pegs.js';
import fold from './hairline/fold.js';
import areatray from './hairline/areatray.js';
import bins from './hairline/bins.js';
import foil from './hairline/foil.js';
import factor from './hairline/factor.js';
import machine from './hairline/machine.js';
import vending from './hairline/vending.js';
import stacks from './hairline/stacks.js';
import cells from './hairline/cells.js';
import complete from './hairline/complete.js';
import throwBall from './hairline/throw.js';
import shift from './hairline/shift.js';
import mirror from './hairline/mirror.js';
import fountain from './hairline/fountain.js';
import halfpipe from './hairline/halfpipe.js';
import crates from './hairline/crates.js';
import vrail from './hairline/vrail.js';
import rulers from './hairline/rulers.js';
import ramp from './hairline/ramp.js';
import stairs from './hairline/stairs.js';
import lifts from './hairline/lifts.js';
import numrail from './hairline/numrail.js';
import fence from './hairline/fence.js';
import fan from './hairline/fan.js';
import scissors from './hairline/scissors.js';
import truss from './hairline/truss.js';
import tents from './hairline/tents.js';
import wheel from './hairline/wheel.js';
import sector from './hairline/sector.js';
import stringFig from './hairline/string.js';
import dial from './hairline/dial.js';
import ladder from './hairline/ladder.js';
import boxnet from './hairline/boxnet.js';
import pen from './hairline/pen.js';
import hundred from './hairline/hundred.js';
import coins from './hairline/coins.js';
import gears from './hairline/gears.js';
import cups from './hairline/cups.js';
import trains from './hairline/trains.js';
import tank from './hairline/tank.js';
import spinner from './hairline/spinner.js';
import tokens from './hairline/tokens.js';
import scoop from './hairline/scoop.js';
import bracket from './hairline/bracket.js';

/** Where a figure sits: beside the video row it starts at (it leans away from the path), or in its own row after the chest. */
export type FigureSlot = { side: 'left' | 'right'; anchor: number | 'end' };

/** One figure per bend of the path (every 4 videos), at least two, alternating from the left. */
export function figureSlots(videos: number): FigureSlot[] {
  const count = Math.max(2, Math.ceil((videos - 1) / 4));
  return Array.from({ length: count }, (_, k) => ({ side: k % 2 ? 'right' : 'left', anchor: 4 * k + 1 < videos ? 4 * k + 1 : 'end' }));
}

// Each topic's own figures, in slot order (the topic-figures design, 30 Oct); all 52 approved by Saagii, 31 Oct.
const OWN: Partial<Record<number, HairlineSpec[]>> = {
  // Advanced Math (approved 31 Oct)
  1: [cubes, pegs, fold], 2: [areatray, bins, foil, factor], 5: [machine, vending], 9: [stacks, cells],
  12: [complete, throwBall], 15: [shift, mirror], 16: [parabola, fountain, halfpipe],
  // Algebra (approved 31 Oct)
  3: [balance, crates], 4: [vrail, rulers], 6: [ramp, stairs], 13: [beams, lifts], 14: [numrail, fence],
  // Geometry & Trig (approved 31 Oct)
  17: [fan, scissors], 18: [truss, tents], 19: [wheel, sector], 20: [stringFig, dial], 21: [unitcircle, ladder], 22: [boxnet, pen],
  // Problem Solving & Data (approved 31 Oct)
  8: [hundred, coins], 10: [gears, cups], 11: [trains, tank], 24: [jar, spinner], 25: [scatter, tokens], 26: [scoop, bracket],
};

// shortcut: topics 7 and 23 have no videos (30 Oct), so no figures of their own; they borrow their area's set. Draw theirs if they get videos.
// shortcut: the English areas have no figures yet (7 Nov), so their maps show none; add each area's set once Saagii approves it.
const BY_AREA: Partial<Record<Area, HairlineSpec[]>> = {
  'Advanced Math': [parabola, balance, unitcircle, scatter],
  Algebra: [balance, scatter, parabola, unitcircle],
  'Geometry & Trig': [unitcircle, parabola, scatter, balance],
  'Problem Solving & Data': [scatter, unitcircle, balance, parabola],
};

/** The figures a topic's map shows, in slot order: its own (repeated if it gains slots), else its area's; none for "More videos". */
export function topicFigures(n: number | null, area: Area | null): HairlineSpec[] {
  if (!area) return [];
  const own = (n !== null && OWN[n]) || [];
  return own.length ? own : BY_AREA[area] ?? [];
}
