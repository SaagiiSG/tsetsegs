import { supabase } from '@/integrations/supabase/client';

/**
 * Student cohorts.
 * - 'mn'   → Mongolian students (default, everything as it always was)
 * - 'intl' → International students (separate leaderboard / sprints / challenges)
 *
 * A student's cohort is derived from their batch (`batches.is_international`)
 * and cached on `student_accounts.cohort` by a database trigger.
 */
export type Cohort = 'mn' | 'intl';

export const DEFAULT_COHORT: Cohort = 'mn';

export function normalizeCohort(value: string | null | undefined): Cohort {
  return value === 'intl' ? 'intl' : 'mn';
}

/**
 * Returns the id of the currently active sprint for a cohort.
 * Each cohort runs its own sprint cycle, so callers must always scope by cohort.
 */
export async function fetchActiveSprintId(cohort: Cohort = DEFAULT_COHORT): Promise<string | null> {
  const { data } = await supabase
    .from('sprints')
    .select('id')
    .eq('is_active', true)
    .eq('cohort', cohort)
    .maybeSingle();

  return data?.id ?? null;
}
