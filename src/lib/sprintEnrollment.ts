import { supabase } from '@/integrations/supabase/client';

const MAX_GROUP_SIZE = 40;

export interface EnsureEnrollmentResult {
  ranking: {
    id: string;
    sprint_id: string;
    student_account_id: string;
    current_tier: string;
    group_number: number;
    total_points: number;
  } | null;
  wasNewlyEnrolled: boolean;
}

/**
 * Ensures the student has a student_sprint_rankings row for the given sprint.
 * If missing, inserts one — inheriting tier from the most recent sprint
 * (reserved_next_tier > current_tier > 'unranked') and assigning a group that
 * still has space (less than MAX_GROUP_SIZE).
 *
 * Returns { ranking, wasNewlyEnrolled }. wasNewlyEnrolled = true only when
 * this call inserted the row.
 */
export async function ensureSprintEnrollment(
  studentAccountId: string,
  sprintId: string
): Promise<EnsureEnrollmentResult> {
  // Already enrolled?
  const { data: existing } = await supabase
    .from('student_sprint_rankings')
    .select('id, sprint_id, student_account_id, current_tier, group_number, total_points')
    .eq('sprint_id', sprintId)
    .eq('student_account_id', studentAccountId)
    .maybeSingle();

  if (existing) {
    return { ranking: existing as any, wasNewlyEnrolled: false };
  }

  // Calibration gate: students don't appear on the leaderboard / get a tier
  // until they've cleared the 44-question calibration. Tracked by the
  // rank_unlocked_at column on student_accounts (auto-set by DB trigger).
  const { data: account } = await supabase
    .from('student_accounts')
    .select('rank_unlocked_at')
    .eq('id', studentAccountId)
    .maybeSingle();

  if (!account || !(account as any).rank_unlocked_at) {
    return { ranking: null, wasNewlyEnrolled: false };
  }

  // Inherit tier from most recent previous sprint
  const { data: previousRanking } = await supabase
    .from('student_sprint_rankings')
    .select('current_tier, reserved_next_tier')
    .eq('student_account_id', studentAccountId)
    .neq('sprint_id', sprintId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // First-ever enrollment after calibration → start at Bronze (they earned a
  // rank by completing 44 questions). Returning students inherit their
  // reserved/previous tier.
  const startingTier =
    (previousRanking as any)?.reserved_next_tier ||
    (previousRanking as any)?.current_tier ||
    'bronze';

  // Assign group with available space
  const { data: groupCounts } = await supabase
    .from('student_sprint_rankings')
    .select('group_number')
    .eq('sprint_id', sprintId)
    .eq('current_tier', startingTier);

  let assignedGroup = 1;
  if (groupCounts && groupCounts.length > 0) {
    const groupMap: Record<number, number> = {};
    groupCounts.forEach((r: any) => {
      const g = r.group_number || 1;
      groupMap[g] = (groupMap[g] || 0) + 1;
    });
    const maxGroup = Math.max(...Object.keys(groupMap).map(Number));
    let foundGroup = false;
    for (let i = 1; i <= maxGroup; i++) {
      if ((groupMap[i] || 0) < MAX_GROUP_SIZE) {
        assignedGroup = i;
        foundGroup = true;
        break;
      }
    }
    if (!foundGroup) assignedGroup = maxGroup + 1;
  }

  const { data: newRanking, error } = await supabase
    .from('student_sprint_rankings')
    .insert({
      sprint_id: sprintId,
      student_account_id: studentAccountId,
      current_tier: startingTier,
      total_points: 0,
      is_top_1: false,
      group_number: assignedGroup,
    })
    .select('id, sprint_id, student_account_id, current_tier, group_number, total_points')
    .single();

  if (error) {
    // Race condition: another request may have inserted simultaneously — re-fetch.
    const { data: refetched } = await supabase
      .from('student_sprint_rankings')
      .select('id, sprint_id, student_account_id, current_tier, group_number, total_points')
      .eq('sprint_id', sprintId)
      .eq('student_account_id', studentAccountId)
      .maybeSingle();
    return { ranking: (refetched as any) || null, wasNewlyEnrolled: false };
  }

  return { ranking: newRanking as any, wasNewlyEnrolled: true };
}

export interface SprintEnrollmentSnapshot {
  sprintNumber: number;
  seasonNumber: number;
  tier: string;
  groupNumber: number;
  totalPoints: number;
  rank: number;
  groupSize: number;
}

/**
 * Computes the student's current rank within their tier+group for the sprint,
 * plus the sprint identifiers needed to show the enrollment celebration popup.
 */
export async function getSprintEnrollmentSnapshot(
  studentAccountId: string,
  sprintId: string
): Promise<SprintEnrollmentSnapshot | null> {
  const { data: sprint } = await supabase
    .from('sprints')
    .select('sprint_number, season_number')
    .eq('id', sprintId)
    .maybeSingle();

  const { data: me } = await supabase
    .from('student_sprint_rankings')
    .select('current_tier, group_number, total_points')
    .eq('sprint_id', sprintId)
    .eq('student_account_id', studentAccountId)
    .maybeSingle();

  if (!sprint || !me) return null;

  const { data: peers } = await supabase
    .from('student_sprint_rankings')
    .select('student_account_id, total_points')
    .eq('sprint_id', sprintId)
    .eq('current_tier', (me as any).current_tier)
    .eq('group_number', (me as any).group_number)
    .order('total_points', { ascending: false });

  const list = peers || [];
  const rank = Math.max(1, list.findIndex((p: any) => p.student_account_id === studentAccountId) + 1);

  return {
    sprintNumber: (sprint as any).sprint_number,
    seasonNumber: (sprint as any).season_number,
    tier: (me as any).current_tier,
    groupNumber: (me as any).group_number,
    totalPoints: (me as any).total_points || 0,
    rank,
    groupSize: list.length,
  };
}
