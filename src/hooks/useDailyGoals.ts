import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';

export type GoalIntensity = 'intense' | 'gradual' | 'with_the_flow';

export interface DailyGoals {
  speed: number;
  hard: number;
  medium: number;
  intensity: GoalIntensity | null;
  setAt: string | null;
}

export const DEFAULT_GOALS: DailyGoals = {
  speed: 2,
  hard: 5,
  medium: 10,
  intensity: null,
  setAt: null,
};

/**
 * Compute suggested daily goals from intensity + days until SAT.
 * Closer to SAT date → +25%; far away (>120 days) → -25%.
 */
export function computeGoals(intensity: GoalIntensity, daysUntilSAT: number | null): Omit<DailyGoals, 'intensity' | 'setAt'> {
  const base: Record<GoalIntensity, { speed: number; hard: number; medium: number }> = {
    intense: { speed: 3, hard: 8, medium: 15 },
    gradual: { speed: 2, hard: 5, medium: 10 },
    with_the_flow: { speed: 1, hard: 3, medium: 6 },
  };
  const b = base[intensity];
  let mult = 1;
  if (daysUntilSAT !== null) {
    if (daysUntilSAT < 30) mult = 1.25;
    else if (daysUntilSAT > 120) mult = 0.75;
  }
  return {
    speed: Math.max(1, Math.round(b.speed * mult)),
    hard: Math.max(1, Math.round(b.hard * mult)),
    medium: Math.max(1, Math.round(b.medium * mult)),
  };
}

export function useDailyGoals() {
  const { student } = useStudentAuth();
  const qc = useQueryClient();

  const { data: goals, isLoading } = useQuery({
    queryKey: ['daily-goals', student?.id],
    enabled: !!student?.id,
    queryFn: async (): Promise<DailyGoals> => {
      const { data, error } = await supabase
        .from('student_accounts')
        .select('daily_goal_speed, daily_goal_hard, daily_goal_medium, goal_intensity, daily_goal_set_at' as any)
        .eq('id', student!.id)
        .maybeSingle();
      if (error) {
        console.error('useDailyGoals fetch error', error);
        return DEFAULT_GOALS;
      }
      const row = (data || {}) as any;
      return {
        speed: row.daily_goal_speed ?? DEFAULT_GOALS.speed,
        hard: row.daily_goal_hard ?? DEFAULT_GOALS.hard,
        medium: row.daily_goal_medium ?? DEFAULT_GOALS.medium,
        intensity: (row.goal_intensity as GoalIntensity) ?? null,
        setAt: row.daily_goal_set_at ?? null,
      };
    },
  });

  const updateGoals = useMutation({
    mutationFn: async (next: { speed: number; hard: number; medium: number; intensity: GoalIntensity }) => {
      if (!student?.id) throw new Error('not signed in');
      const { error } = await supabase
        .from('student_accounts')
        .update({
          daily_goal_speed: next.speed,
          daily_goal_hard: next.hard,
          daily_goal_medium: next.medium,
          goal_intensity: next.intensity,
          daily_goal_set_at: new Date().toISOString(),
        } as any)
        .eq('id', student.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-goals', student?.id] });
    },
  });

  return {
    goals: goals ?? DEFAULT_GOALS,
    isLoading,
    isSet: !!goals?.setAt,
    updateGoals,
  };
}
