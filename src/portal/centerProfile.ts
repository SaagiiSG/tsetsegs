import type { ActivityDay, RankHistoryEntry } from '@/hooks/useStudentProfile';
import { TIER_ORDER, type TierType } from '@/data/badgeDefinitions';
import { PRACTICE_SETS } from './practiceSets';

/** Same formula as the leaderboard: level L starts at 100 * (2^(L-1) - 1) points. */
export function centerLevel(points: number): { level: number; progress: number; toNext: number } {
  let level = 1;
  while (points >= 100 * (2 ** level - 1)) level++;
  const from = 100 * (2 ** (level - 1) - 1), to = 100 * (2 ** level - 1);
  return { level, progress: Math.round(100 * (points - from) / (to - from)), toNext: to - points };
}

export type CenterBadge = { name: string; desc: string; got: boolean; prog: [number, number] };
export function centerBadges(i: { answered: number; correct: number; present: number; solved: Set<string>; setIds?: Record<string, string[]> }): CenterBadge[] {
  const { answered: n, correct: c, present, solved } = i;
  const done = (k: string) => (i.setIds?.[k] ?? []).filter(id => solved.has(id)).length;
  return [
    { name: 'First steps', desc: 'Answer 10 questions', got: n >= 10, prog: [n, 10] },
    { name: 'Centurion', desc: 'Answer 100 questions', got: n >= 100, prog: [n, 100] },
    { name: 'Marathon', desc: 'Answer 500 questions', got: n >= 500, prog: [n, 500] },
    { name: 'Sharpshooter', desc: '80% accuracy over 50+ questions', got: n >= 50 && c / n >= 0.8, prog: [n >= 50 ? Math.round(100 * c / n) : n, n >= 50 ? 80 : 50] },
    { name: 'Regular', desc: 'Attend 10 classes', got: present >= 10, prog: [present, 10] },
    ...PRACTICE_SETS.map((s): CenterBadge => {
      const total = i.setIds?.[s.key]?.length ?? 0;
      return { name: `${s.label} master`, desc: `Solve every ${s.label} question`, got: total > 0 && done(s.key) === total, prog: [done(s.key), total || 1] };
    }),
  ];
}

export type RawProfile = { name: string; class_name: string | null; joined: string; tier: string; points: number; practice_answered: number; practice_correct: number; math_correct: number; english_correct: number; speed_runs: number; best_speed: number | null; present: number; solved_ids: string[]; last_active: string | null; activity: { date: string; points: number; answers: number }[]; history: { sprint: string; tier: string; next_tier: string; position: number; points: number }[] };

const asTier = (t: string): TierType => (TIER_ORDER as readonly string[]).includes(t) ? t as TierType : 'unranked';
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function toProfileView(raw: RawProfile, today = new Date()): { activity: ActivityDay[]; activeDays: string[]; rankHistory: RankHistoryEntry[]; tier: TierType; level: ReturnType<typeof centerLevel> } {
  const byDay = new Map(raw.activity.map(a => [a.date, a]));
  const activity: ActivityDay[] = Array.from({ length: 365 }, (_, i) => {
    const date = dayKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - (364 - i)));
    const a = byDay.get(date);
    return { date, points: a?.points ?? 0, sessionsCount: a?.answers ?? 0 };
  });
  const rankHistory = raw.history.map((h, i): RankHistoryEntry => {
    const a = asTier(h.tier), b = asTier(h.next_tier);
    return { sprint: h.sprint, sprintNumber: i + 1, seasonNumber: 1, rank: TIER_ORDER.indexOf(b) > TIER_ORDER.indexOf(a) ? b : a, finalPoints: h.points, position: h.position };
  });
  return { activity, activeDays: raw.activity.filter(a => a.answers > 0).map(a => a.date), rankHistory, tier: asTier(raw.tier), level: centerLevel(raw.points) };
}
