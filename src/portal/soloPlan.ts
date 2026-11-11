import { useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CenterContext } from './centerContext';

type PlanRow = { plan: string; premium_until: string | null };

/** solo_has_premium (0034) on the client: the premium plan with no end date, or one still ahead. */
export const isPremium = (row: PlanRow | null, now = new Date()) =>
  row?.plan === 'premium' && (row.premium_until == null || new Date(row.premium_until) > now);

/**
 * The signed-in solo student's plan. Every other center counts as premium and reads nothing, so it keeps today's
 * screens. Callers show their loading state until `ready`. A failed read counts as free: the server already limits a
 * free account, so locks are the honest fallback.
 */
export function useSoloPlan(): { isSolo: boolean; premium: boolean; ready: boolean } {
  const ctx = useContext(CenterContext);
  const isSolo = !!ctx?.isSolo;
  const row = useQuery({
    queryKey: ['solo-plan', ctx?.userId], enabled: isSolo && !!ctx?.userId, staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('solo_students').select('plan, premium_until').eq('user_id', ctx!.userId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  return isSolo ? { isSolo, premium: isPremium(row.data ?? null), ready: !row.isPending } : { isSolo, premium: true, ready: true };
}

/** The free slice's question ids (0126). A free user's practice lists, counts and progress use only these. */
export async function freeQuestionIds() {
  const { data, error } = await supabase.from('solo_free_slice').select('item_id').eq('kind', 'question');
  if (error) throw error;
  return data.map(r => r.item_id);
}

/** The rows in the free slice; `slice` null (anyone not free) keeps every row. */
export function onlyFree<R extends { id: string }>(rows: R[], slice: string[] | null) {
  if (!slice) return rows;
  const ids = new Set(slice);
  return rows.filter(r => ids.has(r.id));
}

/**
 * Narrows a question draw (random practice, speed, onboarding) to the free slice for a free user, so the free test's
 * readable copies never come up; anyone else's draw is unchanged. A slice that can't be read draws nothing.
 */
export async function freeDraw(premium: boolean) {
  const slice = premium ? null : await freeQuestionIds().catch(() => [] as string[]);
  // Typed loosely: checking a supabase builder against an `in` constraint is too deep for tsc (TS2589).
  return <B,>(b: B): B => (slice ? (b as { in(column: 'id', values: readonly string[]): B }).in('id', slice) : b);
}

/** Every free question in the subject solved: right at least once, the same "done" the practice list counts. */
export function freeSectionDone(rows: { id: string; sub: 'math' | 'english' }[], attempts: { question_id: string; is_correct: boolean }[], subject: 'math' | 'english') {
  const solved = new Set(attempts.filter(a => a.is_correct).map(a => a.question_id));
  const inSubject = rows.filter(r => r.sub === subject);
  return inSubject.length > 0 && inSubject.every(r => solved.has(r.id));
}

/** A free user's next speed run waits while the count is out of date (`busy`) and stops at 0 left. */
export const speedRunBlocked = (free: boolean, runsLeft: number | null | undefined, busy: boolean) => free && (runsLeft === 0 || busy);
