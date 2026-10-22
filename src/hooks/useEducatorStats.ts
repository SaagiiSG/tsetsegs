import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type EducatorStats = { mathExplanations: number | null; videos: number | null; answers: number | null };
const staleTime = 10 * 60_000;

/** Live numbers for the educator page. Each is null while loading or on error, so the page falls back to wording without a number. */
export function useEducatorStats(): EducatorStats {
  // Same filter the center portal uses for practice, math only: the English explanations are College Board's, not the teachers'.
  const mathExplanations = useQuery({
    queryKey: ['educator-math-explanations'], staleTime,
    queryFn: async () => {
      const { count, error } = await supabase.from('intl_questions').select('id', { count: 'exact', head: true })
        .eq('is_active', true).eq('hide_from_practice', false).in('subject', ['math', 'Math']).not('rationale', 'is', null).neq('rationale', '');
      if (error) throw error;
      return count;
    },
  });
  const videos = useQuery({
    queryKey: ['educator-videos'], staleTime,
    queryFn: async () => {
      const { count, error } = await supabase.from('concept_videos').select('id', { count: 'exact', head: true }).eq('is_published', true);
      if (error) throw error;
      return count;
    },
  });
  const answers = useQuery({
    queryKey: ['educator-answers'], staleTime,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('landing_public_stats' as never);
      if (error) throw error;
      return (data as unknown as { answers?: number } | null)?.answers ?? null;
    },
  });
  return { mathExplanations: mathExplanations.data ?? null, videos: videos.data ?? null, answers: answers.data ?? null };
}
