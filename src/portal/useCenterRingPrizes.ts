import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { emitPointsEarned } from '@/components/student/PointsFlyer';
import { emitRingPrize } from '@/components/student/RingPrizeCelebration';
import { dayStartIso, ringPrizes, tzOffsetMin, type PrizeKey, type RingKey } from '@/lib/ringPrizes';
import { useCenter } from './centerContext';
import type { Ring } from './studentStats';

const RINGS: RingKey[] = ['speed', 'hard', 'medium'];

/** What to ask the server for now: each closed, unpaid ring once, then the bonus when all three are paid. Goal 0 never pays. */
export function ringsToClaim(progress: Ring, goals: Ring, paid: ReadonlySet<PrizeKey>, asked: ReadonlySet<PrizeKey>): PrizeKey[] {
  const open = (k: PrizeKey) => !paid.has(k) && !asked.has(k);
  const out: PrizeKey[] = RINGS.filter(k => goals[k] > 0 && progress[k] >= goals[k] && open(k));
  if (RINGS.every(k => goals[k] > 0 && paid.has(k)) && open('all')) out.push('all');
  return out;
}

type Row = { ring: PrizeKey; points: number; created_at: string };

function useRows(studentId: string) {
  return useQuery({
    queryKey: ['center-ring-prizes', studentId],
    enabled: !!studentId,
    retry: false, // 0121 may not be live: stay quiet
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase.from('tenant_ring_prizes').select('ring, points, created_at').eq('student_id', studentId).gte('created_at', dayStartIso());
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

/** Today's paid prizes, and what each ring would pay at these goals. */
export function useCenterRingPrizes(studentId: string, goals: Ring) {
  const rows = useRows(studentId).data ?? [];
  return { paid: new Set(rows.map(r => r.ring)), prizes: ringPrizes(goals), rows };
}

/** Asks the server to pay each closed ring once, then shows and celebrates what it paid. */
export function useCenterRingPrizeClaimer(studentId: string, progress: Ring, goals: Ring, ready: boolean): void {
  const { center } = useCenter();
  const qc = useQueryClient();
  const read = useRows(studentId);
  const paid = new Set((read.data ?? []).map(r => r.ring));
  const asked = useRef(new Set<PrizeKey>());
  const loaded = !read.isPending;
  useEffect(() => {
    if (!ready || !loaded) return;
    const todo = ringsToClaim(progress, goals, paid, asked.current);
    todo.forEach(k => asked.current.add(k));
    todo.forEach(async ring => {
      try {
        const { data, error } = await supabase.rpc('tenant_claim_ring_prize', { _institution: center.id, _ring: ring, _tz_offset_min: tzOffsetMin() });
        const points = Number(data) || 0;
        if (error || points <= 0) return;
        emitPointsEarned(points);
        emitRingPrize({ ring, points });
        for (const key of [['center-ring-prizes', studentId], ['center-board', center.id], ['center-all-time', center.id], ['center-sprint-points', center.id]]) qc.invalidateQueries({ queryKey: key });
      } catch { /* nothing to celebrate */ }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, loaded, progress.speed, progress.hard, progress.medium, goals.speed, goals.hard, goals.medium, read.data]);
}
