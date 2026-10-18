import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TierLadder } from './TierLadder';

/** Main-app rank ladder: loads every tier the student has held across sprints. */
export function MyTierLadder({ studentId, currentTier, standing }: { studentId?: string; currentTier?: string; standing?: number | null }) {
  const q = useQuery({
    queryKey: ['unlocked-tiers', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase.from('student_sprint_rankings')
        .select('current_tier, reserved_next_tier, created_at, updated_at')
        .eq('student_account_id', studentId!).order('created_at');
      if (error) throw error;
      const unlocked: Record<string, string> = {};
      for (const r of data ?? []) {
        if (r.current_tier && !unlocked[r.current_tier]) unlocked[r.current_tier] = r.created_at;
        if (r.reserved_next_tier && !unlocked[r.reserved_next_tier]) unlocked[r.reserved_next_tier] = r.updated_at;
      }
      const last = data?.[data.length - 1];
      return { unlocked, latest: last?.reserved_next_tier ?? last?.current_tier ?? null };
    },
  });
  if (!studentId || !q.data) return null;
  const tier = currentTier ?? q.data.latest;
  if (!tier) return null;
  return <TierLadder currentTier={tier} unlockedAt={q.data.unlocked} standing={standing} />;
}
