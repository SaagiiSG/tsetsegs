import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { calculateAllBadgeProgress } from './useBadgeProgressCalculator';
import { questionTableFor, type QuestionTable } from '@/lib/questionTable';

/**
 * Hook to sync badge progress to the database
 *
 * Usage:
 * const { syncBadgeProgress } = useSyncBadgeProgress();
 *
 * // Trigger sync on mount or after key activities
 * useEffect(() => {
 *   syncBadgeProgress();
 * }, []);
 */
export function useSyncBadgeProgress() {
  const { student } = useStudentAuth();
  const isSyncingRef = useRef(false);
  const lastSyncRef = useRef<number>(0);

  const syncBadgeProgress = useCallback(async (force = false): Promise<string[]> => {
    if (!student?.id) return [];

    // Debounce: don't sync more than once every 30 seconds unless forced
    const now = Date.now();
    if (!force && now - lastSyncRef.current < 30000) {
      return [];
    }

    // Prevent concurrent syncs
    if (isSyncingRef.current) return [];
    isSyncingRef.current = true;
    lastSyncRef.current = now;

    try {
      return await syncBadgeProgressForStudent(
        student.id,
        student.linked_student_id || undefined,
        questionTableFor(student.cohort)
      );
    } finally {
      isSyncingRef.current = false;
    }
  }, [student?.id, student?.linked_student_id, student?.cohort]);

  return {
    syncBadgeProgress,
    isSyncing: isSyncingRef.current
  };
}

/**
 * Unlocks every badge the server says is earned, then saves the progress bars.
 * Only the server unlocks badges (student_claim_badges); the numbers worked out
 * here are for display. Returns the ids of badges unlocked by this call.
 */
export async function syncBadgeProgressForStudent(
  studentAccountId: string,
  linkedStudentId?: string,
  qTable: QuestionTable = 'questions'
): Promise<string[]> {
  const { data: claimed, error: claimError } = await supabase.rpc('student_claim_badges');
  if (claimError) console.error('Error claiming badges:', claimError);

  try {
    const [{ data: dbBadges }, { data: unlockedRows }] = await Promise.all([
      supabase.from('badges').select('id, name'),
      supabase
        .from('student_badges')
        .select('badge_id')
        .eq('student_account_id', studentAccountId)
        .eq('is_unlocked', true),
    ]);
    if (!dbBadges || dbBadges.length === 0) return claimed ?? [];

    const unlocked = new Set(unlockedRows?.map(r => r.badge_id));
    const unlockedNames = new Set(dbBadges.filter(b => unlocked.has(b.id)).map(b => b.name));
    const badgeNameToId = new Map(dbBadges.map(b => [b.name, b.id]));

    const progressResults = await calculateAllBadgeProgress(studentAccountId, linkedStudentId, qTable, unlockedNames);
    const rows = progressResults.flatMap(result => {
      const badgeId = badgeNameToId.get(result.badgeName);
      if (!badgeId) return [];
      return [{
        student_account_id: studentAccountId,
        badge_id: badgeId,
        progress: result.overallProgress,
        requirements_progress: Object.fromEntries(
          result.requirements.map(({ type, current, target, percentage }) => [type, { current, target, percentage }])
        ),
        updated_at: new Date().toISOString()
      }];
    });

    if (rows.length > 0) {
      const { error } = await supabase
        .from('student_badges')
        .upsert(rows, { onConflict: 'student_account_id,badge_id' });
      if (error) console.error('Error saving badge progress:', error);
    }
  } catch (error) {
    console.error('Error syncing badge progress:', error);
  }

  return claimed ?? [];
}
