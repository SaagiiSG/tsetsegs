import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { calculateAllBadgeProgress, BadgeProgressResult } from './useBadgeProgressCalculator';
import { badgeDefinitions } from '@/data/badgeDefinitions';

/**
 * Hook to sync badge progress to the database
 * 
 * Usage:
 * const { syncBadgeProgress, isSyncing } = useSyncBadgeProgress();
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
      // Calculate progress for all badges
      const progressResults = await calculateAllBadgeProgress(
        student.id,
        student.linked_student_id || undefined
      );

      // Get badge name to ID mapping from database
      const { data: dbBadges } = await supabase
        .from('badges')
        .select('id, name');

      if (!dbBadges || dbBadges.length === 0) {
        console.warn('No badges found in database');
        return [];
      }

      const badgeNameToId = new Map(dbBadges.map(b => [b.name, b.id]));
      const newlyUnlockedBadges: string[] = [];

      // Process each badge result
      for (const result of progressResults) {
        const dbBadgeId = badgeNameToId.get(result.badgeName);
        if (!dbBadgeId) continue;

        // Check if badge is already unlocked
        const { data: existingBadge } = await supabase
          .from('student_badges')
          .select('id, is_unlocked, progress')
          .eq('student_account_id', student.id)
          .eq('badge_id', dbBadgeId)
          .maybeSingle();

        // Skip if already unlocked
        if (existingBadge?.is_unlocked) continue;

        // Build requirements progress object
        const requirementsProgress: Record<string, { current: number; target: number; percentage: number }> = {};
        result.requirements.forEach(r => {
          requirementsProgress[r.type] = {
            current: r.current,
            target: r.target,
            percentage: r.percentage
          };
        });

        // Determine if should unlock
        const shouldUnlock = result.isComplete;

        if (shouldUnlock) {
          newlyUnlockedBadges.push(result.badgeName);
        }

        // Upsert badge progress
        const { error } = await supabase
          .from('student_badges')
          .upsert({
            student_account_id: student.id,
            badge_id: dbBadgeId,
            progress: result.overallProgress,
            is_unlocked: shouldUnlock,
            unlocked_at: shouldUnlock ? new Date().toISOString() : null,
            requirements_progress: requirementsProgress,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'student_account_id,badge_id'
          });

        if (error) {
          console.error(`Error upserting badge ${result.badgeName}:`, error);
        }
      }

      return newlyUnlockedBadges;
    } catch (error) {
      console.error('Error syncing badge progress:', error);
      return [];
    } finally {
      isSyncingRef.current = false;
    }
  }, [student?.id, student?.linked_student_id]);

  /**
   * Sync progress for a specific badge type (more efficient for single updates)
   */
  const syncSingleBadgeProgress = useCallback(async (badgeName: string): Promise<boolean> => {
    if (!student?.id) return false;

    try {
      const badge = badgeDefinitions.find(b => b.name === badgeName);
      if (!badge) return false;

      const { calculateBadgeProgress } = await import('./useBadgeProgressCalculator');
      const result = await calculateBadgeProgress(
        student.id,
        badge,
        student.linked_student_id || undefined
      );

      // Get badge ID from database
      const { data: dbBadge } = await supabase
        .from('badges')
        .select('id')
        .eq('name', badgeName)
        .single();

      if (!dbBadge) return false;

      // Build requirements progress
      const requirementsProgress: Record<string, any> = {};
      result.requirements.forEach(r => {
        requirementsProgress[r.type] = {
          current: r.current,
          target: r.target,
          percentage: r.percentage
        };
      });

      // Upsert
      const { error } = await supabase
        .from('student_badges')
        .upsert({
          student_account_id: student.id,
          badge_id: dbBadge.id,
          progress: result.overallProgress,
          is_unlocked: result.isComplete,
          unlocked_at: result.isComplete ? new Date().toISOString() : null,
          requirements_progress: requirementsProgress,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'student_account_id,badge_id'
        });

      return !error;
    } catch (error) {
      console.error(`Error syncing badge ${badgeName}:`, error);
      return false;
    }
  }, [student?.id, student?.linked_student_id]);

  return {
    syncBadgeProgress,
    syncSingleBadgeProgress,
    isSyncing: isSyncingRef.current
  };
}

/**
 * Standalone function to sync badge progress (for use outside of React components)
 */
export async function syncBadgeProgressForStudent(
  studentAccountId: string,
  linkedStudentId?: string
): Promise<string[]> {
  try {
    const progressResults = await calculateAllBadgeProgress(
      studentAccountId,
      linkedStudentId
    );

    const { data: dbBadges } = await supabase
      .from('badges')
      .select('id, name');

    if (!dbBadges || dbBadges.length === 0) return [];

    const badgeNameToId = new Map(dbBadges.map(b => [b.name, b.id]));
    const newlyUnlockedBadges: string[] = [];

    for (const result of progressResults) {
      const dbBadgeId = badgeNameToId.get(result.badgeName);
      if (!dbBadgeId) continue;

      const { data: existingBadge } = await supabase
        .from('student_badges')
        .select('id, is_unlocked')
        .eq('student_account_id', studentAccountId)
        .eq('badge_id', dbBadgeId)
        .maybeSingle();

      if (existingBadge?.is_unlocked) continue;

      const requirementsProgress: Record<string, any> = {};
      result.requirements.forEach(r => {
        requirementsProgress[r.type] = {
          current: r.current,
          target: r.target,
          percentage: r.percentage
        };
      });

      const shouldUnlock = result.isComplete;
      if (shouldUnlock) {
        newlyUnlockedBadges.push(result.badgeName);
      }

      await supabase
        .from('student_badges')
        .upsert({
          student_account_id: studentAccountId,
          badge_id: dbBadgeId,
          progress: result.overallProgress,
          is_unlocked: shouldUnlock,
          unlocked_at: shouldUnlock ? new Date().toISOString() : null,
          requirements_progress: requirementsProgress,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'student_account_id,badge_id'
        });
    }

    return newlyUnlockedBadges;
  } catch (error) {
    console.error('Error syncing badge progress:', error);
    return [];
  }
}
