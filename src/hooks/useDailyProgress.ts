import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { questionEmbedFor } from '@/lib/questionTable';
import { dayStartIso } from '@/lib/ringPrizes';

export interface DailyProgress {
  speed: number;
  hard: number;
  medium: number;
}

/**
 * Counts of speed sessions completed today + distinct hard/medium questions
 * answered correctly today (local-day window).
 */
export function useDailyProgress() {
  const { student } = useStudentAuth();
  const qEmbed = questionEmbedFor(student?.cohort);
  const startIso = dayStartIso(); // in the key: a tab left open past midnight never shows yesterday's rings as today's

  return useQuery({
    queryKey: ['daily-progress', student?.id, startIso],
    enabled: !!student?.id,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<DailyProgress> => {
      if (!student?.id) return { speed: 0, hard: 0, medium: 0 };

      // Speed sessions completed today
      const { data: speedLogs } = await supabase
        .from('student_activity_logs')
        .select('id')
        .eq('student_account_id', student.id)
        .eq('activity_type', 'speed_mode_complete')
        .gte('created_at', startIso);
      const speed = speedLogs?.length ?? 0;

      // Today's correct attempts joined to question difficulty
      const { data: attempts } = await supabase
        .from('student_attempts')
        .select(`question_id, is_correct, ${qEmbed}!inner(difficulty_level)`)
        .eq('student_account_id', student.id)
        .eq('is_correct', true)
        .gte('attempted_at', startIso);

      const hardIds = new Set<string>();
      const mediumIds = new Set<string>();
      (attempts || []).forEach((a: any) => {
        const d = (a.questions?.difficulty_level || '').toString().toLowerCase();
        if (d === 'hard') hardIds.add(a.question_id);
        else if (d === 'medium') mediumIds.add(a.question_id);
      });

      return {
        speed,
        hard: hardIds.size,
        medium: mediumIds.size,
      };
    },
  });
}
