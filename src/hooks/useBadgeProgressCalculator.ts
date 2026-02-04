import { supabase } from '@/integrations/supabase/client';
import { badgeDefinitions, BadgeDefinition, BadgeRequirement } from '@/data/badgeDefinitions';
import { differenceInCalendarDays, parseISO, subDays, format } from 'date-fns';

export interface BadgeProgressResult {
  badgeId: string;
  badgeName: string;
  requirements: {
    type: string;
    current: number;
    target: number;
    percentage: number;
  }[];
  overallProgress: number;
  isComplete: boolean;
}

/**
 * Calculate progress for a single requirement type
 */
async function calculateRequirementProgress(
  studentAccountId: string,
  req: BadgeRequirement,
  studentId?: string
): Promise<{ current: number; target: number; percentage: number }> {
  const target = req.target;
  let current = 0;

  switch (req.type) {
    case 'first_try_correct': {
      // Count questions answered correctly on first attempt
      const { count } = await supabase
        .from('student_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('student_account_id', studentAccountId)
        .eq('attempt_number', 1)
        .eq('is_correct', true);
      current = count || 0;
      break;
    }

    case 'consecutive_days_speed': {
      // Find longest streak of consecutive days with speed sessions
      const { data: speedTransactions } = await supabase
        .from('point_transactions')
        .select('created_at')
        .eq('student_account_id', studentAccountId)
        .eq('category', 'speed')
        .order('created_at', { ascending: true });

      current = calculateConsecutiveDayStreak(speedTransactions?.map(t => t.created_at) || []);
      break;
    }

    case 'consecutive_days_both': {
      // Days with both speed AND practice activity
      const { data: allTransactions } = await supabase
        .from('point_transactions')
        .select('created_at, category')
        .eq('student_account_id', studentAccountId)
        .in('category', ['speed', 'practice'])
        .order('created_at', { ascending: true });

      current = calculateConsecutiveDaysBoth(allTransactions || []);
      break;
    }

    case 'all_68_questions': {
      // Count of unique 68 questions answered correctly
      const { data: questions68 } = await supabase
        .from('questions')
        .select('id')
        .eq('question_set', '68')
        .eq('is_active', true);

      const questionIds = questions68?.map(q => q.id) || [];
      if (questionIds.length === 0) break;

      const { data: correctAttempts } = await supabase
        .from('student_attempts')
        .select('question_id')
        .eq('student_account_id', studentAccountId)
        .eq('is_correct', true)
        .in('question_id', questionIds);

      current = new Set(correctAttempts?.map(a => a.question_id) || []).size;
      break;
    }

    case 'all_cb_problems': {
      // Count of unique CollegeBoard questions answered correctly
      const { data: cbQuestions } = await supabase
        .from('questions')
        .select('id')
        .eq('question_set', 'CollegeBoard')
        .eq('is_active', true);

      const questionIds = cbQuestions?.map(q => q.id) || [];
      if (questionIds.length === 0) break;

      const { data: correctAttempts } = await supabase
        .from('student_attempts')
        .select('question_id')
        .eq('student_account_id', studentAccountId)
        .eq('is_correct', true)
        .in('question_id', questionIds);

      current = new Set(correctAttempts?.map(a => a.question_id) || []).size;
      break;
    }

    case 'vocabulary_completion': {
      // Percentage of vocabulary words mastered
      const { count: totalWords } = await supabase
        .from('vocabulary_words')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);

      const { count: masteredWords } = await supabase
        .from('student_vocabulary_progress')
        .select('id', { count: 'exact', head: true })
        .eq('student_account_id', studentAccountId)
        .gte('confidence_level', 3);

      const total = totalWords || 0;
      const mastered = masteredWords || 0;
      current = total > 0 ? Math.round((mastered / total) * 100) : 0;
      break;
    }

    case 'practice_test_avg': {
      // Average score from bluebook tests
      if (!studentId) break;

      const { data: completedTests } = await supabase
        .from('bluebook_attempts')
        .select('total_score')
        .eq('student_account_id', studentAccountId)
        .eq('status', 'completed')
        .not('total_score', 'is', null);

      if (completedTests && completedTests.length > 0) {
        current = Math.round(
          completedTests.reduce((sum, t) => sum + (t.total_score || 0), 0) / completedTests.length
        );
      }
      break;
    }

    case 'speed_sessions_high_accuracy': {
      // Count speed sessions with 95%+ accuracy
      const { data: speedTransactions } = await supabase
        .from('point_transactions')
        .select('metadata')
        .eq('student_account_id', studentAccountId)
        .eq('category', 'speed');

      current = speedTransactions?.filter(t => {
        const metadata = t.metadata as any;
        return metadata?.accuracy >= 95;
      }).length || 0;
      break;
    }

    case 'consecutive_perfect_drills': {
      // Find max consecutive perfect (100%) speed drills
      const { data: speedTransactions } = await supabase
        .from('point_transactions')
        .select('metadata, created_at')
        .eq('student_account_id', studentAccountId)
        .eq('category', 'speed')
        .order('created_at', { ascending: true });

      let maxStreak = 0;
      let currentStreak = 0;

      speedTransactions?.forEach(t => {
        const metadata = t.metadata as any;
        if (metadata?.accuracy === 100) {
          currentStreak++;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      });

      current = maxStreak;
      break;
    }

    case 'speed_session_combo': {
      // Check if any session meets the combo requirements (handled by useSpeedBadgeProgress)
      // This is validated at session completion, just check if badge is unlocked
      const { data: badges } = await supabase
        .from('badges')
        .select('id, name')
        .in('name', ['Lightning Strike', 'Speedster']);

      if (badges && badges.length > 0) {
        const { data: studentBadge } = await supabase
          .from('student_badges')
          .select('is_unlocked')
          .eq('student_account_id', studentAccountId)
          .in('badge_id', badges.map(b => b.id))
          .eq('is_unlocked', true)
          .limit(1);

        current = studentBadge && studentBadge.length > 0 ? 1 : 0;
      }
      break;
    }

    case 'all_english_questions': {
      // Count of unique English questions answered correctly
      const { data: englishQuestions } = await supabase
        .from('questions')
        .select('id')
        .ilike('subject', 'english')
        .eq('is_active', true);

      const questionIds = englishQuestions?.map(q => q.id) || [];
      if (questionIds.length === 0) break;

      const { data: correctAttempts } = await supabase
        .from('student_attempts')
        .select('question_id')
        .eq('student_account_id', studentAccountId)
        .eq('is_correct', true)
        .in('question_id', questionIds);

      current = new Set(correctAttempts?.map(a => a.question_id) || []).size;
      break;
    }

    // Sprint/Championship badges - these are awarded automatically by finalize-sprint
    case 'sprint_top_1':
    case 'top_1_weeks': {
      // Check if already awarded
      current = 0; // Will be set by sprint finalization
      break;
    }

    // Time-based achievements
    case 'module_under_time':
    case 'consecutive_correct_under_time':
    case 'questions_under_time_high_accuracy':
    case 'perfect_test_under_time': {
      // These require session-specific tracking
      // Check if badge is already unlocked
      current = 0;
      break;
    }

    default:
      console.warn(`Unknown requirement type: ${req.type}`);
  }

  const percentage = Math.min(100, Math.round((current / target) * 100));
  return { current, target, percentage };
}

/**
 * Calculate consecutive day streak from a list of timestamps
 */
function calculateConsecutiveDayStreak(timestamps: string[]): number {
  if (timestamps.length === 0) return 0;

  const uniqueDays = [...new Set(
    timestamps.map(ts => format(parseISO(ts), 'yyyy-MM-dd'))
  )].sort();

  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = parseISO(uniqueDays[i - 1]);
    const curr = parseISO(uniqueDays[i]);
    const diff = differenceInCalendarDays(curr, prev);

    if (diff === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return maxStreak;
}

/**
 * Calculate consecutive days with BOTH speed and practice activity
 */
function calculateConsecutiveDaysBoth(
  transactions: { created_at: string; category: string }[]
): number {
  if (transactions.length === 0) return 0;

  // Group by date
  const dateActivities: Record<string, Set<string>> = {};
  transactions.forEach(t => {
    const date = format(parseISO(t.created_at), 'yyyy-MM-dd');
    if (!dateActivities[date]) dateActivities[date] = new Set();
    dateActivities[date].add(t.category);
  });

  // Find days with both activities
  const daysWithBoth = Object.entries(dateActivities)
    .filter(([_, activities]) => activities.has('speed') && activities.has('practice'))
    .map(([date]) => date)
    .sort();

  if (daysWithBoth.length === 0) return 0;

  // Calculate streak
  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < daysWithBoth.length; i++) {
    const prev = parseISO(daysWithBoth[i - 1]);
    const curr = parseISO(daysWithBoth[i]);
    const diff = differenceInCalendarDays(curr, prev);

    if (diff === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return maxStreak;
}

/**
 * Calculate progress for all badges for a student
 */
export async function calculateAllBadgeProgress(
  studentAccountId: string,
  studentId?: string
): Promise<BadgeProgressResult[]> {
  const results: BadgeProgressResult[] = [];

  for (const badge of badgeDefinitions) {
    const requirementsProgress = await Promise.all(
      badge.requirements.map(async req => {
        const progress = await calculateRequirementProgress(studentAccountId, req, studentId);
        return {
          type: req.type,
          ...progress
        };
      })
    );

    // Overall progress is average of all requirements
    const overallProgress = requirementsProgress.length > 0
      ? Math.round(
          requirementsProgress.reduce((sum, r) => sum + r.percentage, 0) / requirementsProgress.length
        )
      : 0;

    const isComplete = requirementsProgress.every(r => r.percentage >= 100);

    results.push({
      badgeId: badge.id,
      badgeName: badge.name,
      requirements: requirementsProgress,
      overallProgress,
      isComplete
    });
  }

  return results;
}

/**
 * Calculate progress for a single badge
 */
export async function calculateBadgeProgress(
  studentAccountId: string,
  badge: BadgeDefinition,
  studentId?: string
): Promise<BadgeProgressResult> {
  const requirementsProgress = await Promise.all(
    badge.requirements.map(async req => {
      const progress = await calculateRequirementProgress(studentAccountId, req, studentId);
      return {
        type: req.type,
        ...progress
      };
    })
  );

  const overallProgress = requirementsProgress.length > 0
    ? Math.round(
        requirementsProgress.reduce((sum, r) => sum + r.percentage, 0) / requirementsProgress.length
      )
    : 0;

  const isComplete = requirementsProgress.every(r => r.percentage >= 100);

  return {
    badgeId: badge.id,
    badgeName: badge.name,
    requirements: requirementsProgress,
    overallProgress,
    isComplete
  };
}
