import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { emitPointsEarned } from '@/components/student/PointsFlyer';
import { emitRingPrize } from '@/components/student/RingPrizeCelebration';
import { dayStartIso, ringPrizes, tzOffsetMin, type PrizeKey } from '@/lib/ringPrizes';
import { askedOn, ringsToClaim } from '@/portal/useCenterRingPrizes';
import { useDailyGoals } from './useDailyGoals';
import { useDailyProgress } from './useDailyProgress';
import { useLeaderboard } from './useLeaderboard';

type Row = { metadata: { ring?: string } | null; points: number };
const KEYS: PrizeKey[] = ['speed', 'hard', 'medium', 'all'];

/** Rings paid today: a row with points and a known ring. */
export function paidFromRows(rows: Row[]): Set<PrizeKey> {
  return new Set(rows.filter(r => r.points > 0 && KEYS.includes(r.metadata?.ring as PrizeKey)).map(r => r.metadata!.ring as PrizeKey));
}

function useRows() {
  const { student } = useStudentAuth();
  const day = dayStartIso(); // in the key: a tab left open past midnight reads the new day
  return useQuery({
    queryKey: ['ring-prizes', student?.id, day],
    enabled: !!student?.id,
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase.from('point_transactions').select('points, metadata').eq('student_account_id', student!.id).eq('category', 'ring_prize').gte('created_at', day);
      return error ? [] : (data ?? []) as Row[]; // fail soft: show nothing paid
    },
  });
}

/** Today's paid ring prizes (and the points each really paid), plus what each ring would pay at today's goals. */
export function useRingPrizes() {
  const { goals } = useDailyGoals();
  const rows = useRows().data ?? [];
  const paid = paidFromRows(rows);
  const paidPoints: Partial<Record<PrizeKey, number>> = {};
  rows.forEach(r => { const k = r.metadata?.ring as PrizeKey; if (paid.has(k) && r.points > 0) paidPoints[k] = r.points; });
  return { paid, prizes: ringPrizes(goals), paidPoints };
}

/** Asks the server to pay each closed ring once, then shows and celebrates what it paid. */
export function useRingPrizeClaimer(enabled = true): void {
  const { student } = useStudentAuth();
  const qc = useQueryClient();
  const { goals, isLoading: goalsLoading } = useDailyGoals();
  const { data: progress } = useDailyProgress();
  const { activeSprint, isLoading: boardLoading } = useLeaderboard(); // wait for the sprint: a too-early claim would carry sprint_id null
  const read = useRows();
  const paid = paidFromRows(read.data ?? []);
  const asked = useRef({ day: '', rings: new Set<PrizeKey>() });
  const day = dayStartIso();
  const ready = enabled && !!student?.id && !!progress && !goalsLoading && !read.isPending && !boardLoading;
  useEffect(() => {
    if (!ready) return;
    const today = askedOn(asked.current, day);
    const todo = ringsToClaim(progress!, goals, paid, today);
    todo.forEach(k => today.add(k));
    todo.forEach(async ring => {
      try {
        const { data, error } = await supabase.from('point_transactions').insert({
          student_account_id: student!.id,
          category: 'ring_prize',
          points: ringPrizes(goals)[ring],
          metadata: { ring, tz_offset_min: tzOffsetMin() },
          sprint_id: activeSprint?.id ?? null,
        }).select('points');
        const points = data?.[0]?.points ?? 0;
        if (error || points <= 0) return; // refused (or 0125 not live): nothing to celebrate
        emitPointsEarned(points);
        emitRingPrize({ ring, points });
        for (const key of ['ring-prizes', 'today-points', 'sprint-leaderboard', 'all-time-leaderboard']) qc.invalidateQueries({ queryKey: [key] });
      } catch { /* nothing to celebrate */ }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, day, progress?.speed, progress?.hard, progress?.medium, goals.speed, goals.hard, goals.medium, paid.size]);
}
