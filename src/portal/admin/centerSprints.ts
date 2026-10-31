import { TIER_ORDER, type TierType } from '@/data/badgeDefinitions';

export type CenterSprint = {
  id: string; name: string; starts_on: string; ends_on: string; status: string;
  season_number?: number | null; sprint_number?: number | null; auto_next?: boolean;
};
type BoardRow = { student_id: string; name: string; class_name: string | null; tier: string | null; points: number; answered: number };

export const SPRINTS_PER_SEASON = 3;

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Days from start to end, both counted. */
export const sprintDays = (s: { starts_on: string; ends_on: string }) => Math.round((new Date(`${s.ends_on}T00:00`).getTime() - new Date(`${s.starts_on}T00:00`).getTime()) / 864e5) + 1;

export type Slot = { n: number; state: 'done' | 'now' | 'paused' | 'planned' | 'off'; starts_on?: string; ends_on?: string; sprint?: CenterSprint };

/** The 3 sprints of one season: the ones that exist, then the dates the cycle will use for the rest. */
export function seasonSlots(seasonSprints: CenterSprint[]): Slot[] {
  const slots: Slot[] = [];
  let prev: { ends_on: string; days: number; goesOn: boolean } | null = null;
  for (let n = 1; n <= SPRINTS_PER_SEASON; n++) {
    const s = seasonSprints.find(x => x.sprint_number === n);
    if (s) {
      slots.push({ n, state: s.status === 'finished' ? 'done' : s.status === 'paused' ? 'paused' : 'now', starts_on: s.starts_on, ends_on: s.ends_on, sprint: s });
      prev = { ends_on: s.ends_on, days: sprintDays(s), goesOn: !!s.auto_next };
    } else if (prev?.goesOn) {
      const starts_on = addDays(prev.ends_on, 1), ends_on = addDays(prev.ends_on, prev.days);
      slots.push({ n, state: 'planned', starts_on, ends_on });
      prev = { ...prev, ends_on };
    } else slots.push({ n, state: 'off' });
  }
  return slots;
}

/** Places that move up when a sprint finishes, per tier (the tenant_snapshot_ranks trigger, 0013). */
const CUTOFF: Record<TierType, number> = { unranked: 20, bronze: 20, silver: 15, gold: 10, platinum: 5, diamond: 1, ruby: 1 };

export type Move = 'up' | 'stay' | 'down';
function move(tier: TierType, place: number, points: number): Move {
  const bottom = tier === 'unranked', top = tier === 'ruby';
  if (points === 0) return bottom ? 'stay' : 'down';
  if (top && place === 1) return 'stay';
  if (place <= CUTOFF[tier]) return top ? 'stay' : 'up';
  return bottom ? 'stay' : 'down';
}

/** The board split by tier, highest first, ranked inside each tier the way ranks are decided. */
export function tierBoards<R extends BoardRow>(board: R[]) {
  const tierOf = (r: R): TierType => (TIER_ORDER as string[]).includes(r.tier ?? '') ? r.tier as TierType : 'unranked';
  return [...TIER_ORDER].reverse().map(tier => ({
    tier,
    rows: board.filter(r => tierOf(r) === tier)
      .sort((a, b) => b.points - a.points || b.answered - a.answered || a.name.localeCompare(b.name) || a.student_id.localeCompare(b.student_id))
      .map((r, i) => ({ ...r, place: i + 1, move: move(tier, i + 1, r.points) })),
  })).filter(t => t.rows.length);
}
