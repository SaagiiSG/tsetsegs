import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type EducatorStats = { mathExplanations: number | null; answers: number | null; club800: number | null };
const staleTime = 10 * 60_000;

/** Live numbers for the educator page. Each is null while loading or on error, so the page falls back to wording without a number. */
export function useEducatorStats(): EducatorStats {
  // Signed-out visitors can't read the questions themselves, so every count comes from the public stats function.
  // math_explanations uses the center portal's practice filter, math only: the English explanations are College Board's.
  const stats = useQuery({
    queryKey: ['educator-landing-stats'], staleTime,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('landing_public_stats' as never);
      if (error) throw error;
      return data as unknown as { answers?: number; math_explanations?: number; club800?: number } | null;
    },
  });
  return { mathExplanations: stats.data?.math_explanations ?? null, answers: stats.data?.answers ?? null, club800: stats.data?.club800 ?? null };
}
