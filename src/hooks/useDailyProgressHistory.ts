import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';

export interface DailyProgressDay {
  date: string; // yyyy-MM-dd (local)
  speed: number;
  hard: number;
  medium: number;
}

function localDayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Per-day counts (local time) of speed sessions + distinct hard/medium
 * correct questions for the last `days` days (inclusive of today).
 */
export function useDailyProgressHistory(days: number = 30) {
  const { student } = useStudentAuth();

  return useQuery({
    queryKey: ['daily-progress-history', student?.id, days],
    enabled: !!student?.id,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<DailyProgressDay[]> => {
      if (!student?.id) return [];

      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - (days - 1));
      const startIso = start.toISOString();

      const [{ data: speedLogs }, { data: attempts }] = await Promise.all([
        supabase
          .from('student_activity_logs')
          .select('created_at')
          .eq('student_account_id', student.id)
          .eq('activity_type', 'speed_mode_complete')
          .gte('created_at', startIso),
        supabase
          .from('student_attempts')
          .select('question_id, attempted_at, is_correct, questions!inner(difficulty_level)')
          .eq('student_account_id', student.id)
          .eq('is_correct', true)
          .gte('attempted_at', startIso),
      ]);

      // Build empty buckets for each day
      const buckets: Record<string, { speed: number; hard: Set<string>; medium: Set<string> }> = {};
      for (let i = 0; i < days; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        buckets[localDayKey(d)] = { speed: 0, hard: new Set(), medium: new Set() };
      }

      (speedLogs || []).forEach((r: any) => {
        const k = localDayKey(new Date(r.created_at));
        if (buckets[k]) buckets[k].speed += 1;
      });

      (attempts || []).forEach((a: any) => {
        const k = localDayKey(new Date(a.attempted_at));
        if (!buckets[k]) return;
        const d = (a.questions?.difficulty_level || '').toString().toLowerCase();
        if (d === 'hard') buckets[k].hard.add(a.question_id);
        else if (d === 'medium') buckets[k].medium.add(a.question_id);
      });

      return Object.entries(buckets)
        .map(([date, v]) => ({ date, speed: v.speed, hard: v.hard.size, medium: v.medium.size }))
        .sort((a, b) => (a.date < b.date ? 1 : -1)); // newest first
    },
  });
}
