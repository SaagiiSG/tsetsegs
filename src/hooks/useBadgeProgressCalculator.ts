import { supabase } from '@/integrations/supabase/client';
import { badgeDefinitions, BadgeDefinition, BadgeRequirement } from '@/data/badgeDefinitions';
import { differenceInCalendarDays, parseISO, format } from 'date-fns';

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
 * Helper: Get seasonal event date range by badge_id
 */
async function getSeasonalEventDates(badgeId: string): Promise<{ start: string; end: string } | null> {
  const { data } = await supabase
    .from('seasonal_events')
    .select('start_date, end_date')
    .eq('badge_id', badgeId)
    .eq('is_active', true)
    .maybeSingle();

  if (!data) return null;
  return { start: data.start_date, end: data.end_date };
}

/**
 * Calculate progress for a single requirement type
 */
async function calculateRequirementProgress(
  studentAccountId: string,
  req: BadgeRequirement,
  studentId?: string,
  badgeName?: string
): Promise<{ current: number; target: number; percentage: number }> {
  const target = req.target;
  let current = 0;

  switch (req.type) {
    case 'first_try_correct': {
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
        if (metadata?.session_summary && metadata?.accuracy === 100) {
          currentStreak++;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else if (metadata?.session_summary) {
          currentStreak = 0;
        }
      });

      current = maxStreak;
      break;
    }

    case 'speed_session_combo': {
      // Distinguish Lightning Strike vs Speedster by badge name context
      const isLightning = badgeName?.includes('Lightning');
      const isSpeedster = badgeName?.includes('Speedster');

      // Thresholds per badge
      const minQuestions = isSpeedster ? 20 : 10;
      const minAccuracy = isSpeedster ? 90 : 80;
      const maxTimeSeconds = 300; // 5 minutes for both

      // Query speed session summary transactions
      const { data: speedSummaries } = await supabase
        .from('point_transactions')
        .select('metadata')
        .eq('student_account_id', studentAccountId)
        .eq('category', 'speed')
        .order('created_at', { ascending: false })
        .limit(100);

      if (speedSummaries && speedSummaries.length > 0) {
        for (const tx of speedSummaries) {
          const meta = tx.metadata as Record<string, any> | null;
          if (!meta?.session_summary) continue;
          const q = meta.totalQuestions || 0;
          const acc = meta.accuracy || 0;
          const time = meta.totalTimeSeconds || meta.time_seconds || 0;

          if (q >= minQuestions && acc >= minAccuracy && time < maxTimeSeconds) {
            current = 1;
            break;
          }
        }
      }
      break;
    }

    case 'all_english_questions': {
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

    case 'sprint_top_1': {
      // Check if the specific sprint championship badge is unlocked
      // The badge name tells us which tier (e.g., "Bronze Novice", "Silver Challenger")
      if (badgeName) {
        const { data: badge } = await supabase
          .from('badges')
          .select('id')
          .eq('name', badgeName)
          .maybeSingle();

        if (badge) {
          const { data: studentBadge } = await supabase
            .from('student_badges')
            .select('is_unlocked')
            .eq('student_account_id', studentAccountId)
            .eq('badge_id', badge.id)
            .eq('is_unlocked', true)
            .maybeSingle();

          current = studentBadge ? 1 : 0;
        }
      }
      break;
    }

    case 'top_1_weeks': {
      // Count max consecutive sprints where student held Top 1
      const { data: rankings } = await supabase
        .from('student_sprint_rankings')
        .select('is_top_1, sprint_id, created_at')
        .eq('student_account_id', studentAccountId)
        .order('created_at', { ascending: true });

      if (rankings && rankings.length > 0) {
        let maxConsecutive = 0;
        let currentConsecutive = 0;

        for (const r of rankings) {
          if (r.is_top_1) {
            currentConsecutive++;
            maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
          } else {
            currentConsecutive = 0;
          }
        }
        current = maxConsecutive;
      }
      break;
    }

    case 'streak_days': {
      const { data: streakData } = await supabase
        .from('student_streaks')
        .select('current_streak, longest_streak')
        .eq('student_account_id', studentAccountId)
        .maybeSingle();

      current = Math.max(streakData?.longest_streak || 0, streakData?.current_streak || 0);
      break;
    }

    case 'ruby_weeks': {
      // FIX: Count CONSECUTIVE sprints at Ruby tier (ordered by time)
      const { data: rankings } = await supabase
        .from('student_sprint_rankings')
        .select('current_tier, created_at')
        .eq('student_account_id', studentAccountId)
        .order('created_at', { ascending: true });

      if (rankings && rankings.length > 0) {
        let maxConsecutive = 0;
        let currentConsecutive = 0;

        for (const r of rankings) {
          if (r.current_tier === 'ruby') {
            currentConsecutive++;
            maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
          } else {
            currentConsecutive = 0;
          }
        }
        current = maxConsecutive;
      }
      break;
    }

    case 'penguin_badge': {
      const { data: penguinBadge } = await supabase
        .from('badges')
        .select('id')
        .eq('name', 'The Penguin')
        .maybeSingle();

      if (penguinBadge) {
        const { data: studentPenguin } = await supabase
          .from('student_badges')
          .select('is_unlocked')
          .eq('student_account_id', studentAccountId)
          .eq('badge_id', penguinBadge.id)
          .maybeSingle();

        current = studentPenguin?.is_unlocked ? 1 : 0;
      }
      break;
    }

    case 'all_english_bank': {
      // FIX: Filter attempts by English subject via question join
      const { data: englishQuestions } = await supabase
        .from('questions')
        .select('id')
        .ilike('subject', 'english')
        .eq('is_active', true);

      const englishIds = englishQuestions?.map(q => q.id) || [];
      if (englishIds.length === 0) break;

      const { data: correctAttempts } = await supabase
        .from('student_attempts')
        .select('question_id')
        .eq('student_account_id', studentAccountId)
        .eq('is_correct', true)
        .in('question_id', englishIds);

      const uniqueCorrect = new Set(correctAttempts?.map(a => a.question_id) || []).size;
      current = uniqueCorrect >= englishIds.length ? 1 : 0;
      break;
    }

    case 'module_under_time': {
      // Blitz: Complete a bluebook module in under target minutes with all correct
      const { data: modules } = await supabase
        .from('bluebook_modules')
        .select('id, section, module_number');

      if (!modules || modules.length === 0) break;

      // Check each module the student attempted
      for (const mod of modules) {
        const { data: answers } = await supabase
          .from('bluebook_answers')
          .select('is_correct, time_spent_seconds')
          .eq('module_id', mod.id)
          .eq('attempt_id', studentAccountId); // attempt_id links to the student's attempt

        // Actually, we need to find attempts by this student for any module
        // bluebook_answers -> attempt_id -> bluebook_attempts -> student_account_id
        break; // We'll use a different approach below
      }

      // Better approach: get all student's bluebook attempts, then check module answers
      const { data: attempts } = await supabase
        .from('bluebook_attempts')
        .select('id')
        .eq('student_account_id', studentAccountId)
        .eq('status', 'completed');

      if (!attempts || attempts.length === 0) break;

      for (const attempt of attempts) {
        // Get answers grouped by module for this attempt
        const { data: answers } = await supabase
          .from('bluebook_answers')
          .select('module_id, is_correct, time_spent_seconds')
          .eq('attempt_id', attempt.id);

        if (!answers || answers.length === 0) continue;

        // Group by module
        const moduleAnswers: Record<string, typeof answers> = {};
        answers.forEach(a => {
          if (!a.module_id) return;
          if (!moduleAnswers[a.module_id]) moduleAnswers[a.module_id] = [];
          moduleAnswers[a.module_id].push(a);
        });

        // Check if any module was completed under target minutes with all correct
        for (const [, modAnswers] of Object.entries(moduleAnswers)) {
          const totalSeconds = modAnswers.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0);
          const allCorrect = modAnswers.every(a => a.is_correct === true);
          const totalMinutes = totalSeconds / 60;

          if (allCorrect && totalMinutes < target) {
            current = 1;
            break;
          }
        }
        if (current > 0) break;
      }
      break;
    }

    case 'consecutive_correct_under_time': {
      // Sniper (target=10, 8min) / Rush Delivery (target=20, 12min)
      // Parse time limit from the label
      const timeLimitMinutes = target === 10 ? 8 : target === 20 ? 12 : 10;
      const timeLimitSeconds = timeLimitMinutes * 60;

      const { data: attempts } = await supabase
        .from('student_attempts')
        .select('is_correct, time_spent_seconds, attempted_at')
        .eq('student_account_id', studentAccountId)
        .order('attempted_at', { ascending: true });

      if (!attempts || attempts.length === 0) break;

      // Sliding window: find longest consecutive correct run where cumulative time < limit
      let bestRun = 0;

      for (let i = 0; i < attempts.length; i++) {
        if (!attempts[i].is_correct) continue;

        let runLength = 0;
        let cumulativeTime = 0;

        for (let j = i; j < attempts.length; j++) {
          if (!attempts[j].is_correct) break;
          cumulativeTime += attempts[j].time_spent_seconds || 0;
          if (cumulativeTime > timeLimitSeconds) break;
          runLength++;
        }

        bestRun = Math.max(bestRun, runLength);
      }

      current = bestRun;
      break;
    }

    case 'questions_under_time_high_accuracy': {
      // Time Lord: 50 questions in under 17 min with 90%+ accuracy (from speed sessions)
      const { data: speedSessions } = await supabase
        .from('point_transactions')
        .select('metadata')
        .eq('student_account_id', studentAccountId)
        .eq('category', 'speed');

      if (speedSessions) {
        for (const session of speedSessions) {
          const metadata = session.metadata as any;
          if (!metadata?.session_summary) continue;

          const totalQuestions = metadata.total_questions || 0;
          const accuracy = metadata.accuracy || 0;
          const totalTimeSeconds = metadata.total_time_seconds || metadata.time_seconds || 0;
          const totalTimeMinutes = totalTimeSeconds / 60;

          if (totalQuestions >= 50 && totalTimeMinutes < 17 && accuracy >= 90) {
            current = 1;
            break;
          }
        }
      }
      break;
    }

    case 'perfect_test_under_time': {
      // Flawless Execution: Perfect bluebook test under target minutes
      const { data: attempts } = await supabase
        .from('bluebook_attempts')
        .select('id')
        .eq('student_account_id', studentAccountId)
        .eq('status', 'completed');

      if (!attempts || attempts.length === 0) break;

      for (const attempt of attempts) {
        const { data: answers } = await supabase
          .from('bluebook_answers')
          .select('is_correct, time_spent_seconds')
          .eq('attempt_id', attempt.id);

        if (!answers || answers.length === 0) continue;

        const allCorrect = answers.every(a => a.is_correct === true);
        const totalSeconds = answers.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0);
        const totalMinutes = totalSeconds / 60;

        if (allCorrect && totalMinutes < target) {
          current = 1;
          break;
        }
      }
      break;
    }

    // Seasonal badges
    case 'seasonal_questions': {
      // Count student_attempts during the seasonal event period
      const badgeDef = badgeDefinitions.find(b => b.name === badgeName);
      const dates = badgeDef ? await getSeasonalEventDates(badgeDef.id) : null;
      if (!dates) break;

      const { count } = await supabase
        .from('student_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('student_account_id', studentAccountId)
        .gte('attempted_at', dates.start)
        .lte('attempted_at', dates.end);

      current = count || 0;
      break;
    }

    case 'seasonal_accuracy': {
      const badgeDef = badgeDefinitions.find(b => b.name === badgeName);
      const dates = badgeDef ? await getSeasonalEventDates(badgeDef.id) : null;
      if (!dates) break;

      const { data: attempts } = await supabase
        .from('student_attempts')
        .select('is_correct')
        .eq('student_account_id', studentAccountId)
        .gte('attempted_at', dates.start)
        .lte('attempted_at', dates.end);

      if (attempts && attempts.length > 0) {
        const correctCount = attempts.filter(a => a.is_correct).length;
        current = Math.round((correctCount / attempts.length) * 100);
      }
      break;
    }

    case 'seasonal_improvement': {
      const badgeDef = badgeDefinitions.find(b => b.name === badgeName);
      const dates = badgeDef ? await getSeasonalEventDates(badgeDef.id) : null;
      if (!dates) break;

      const { data: tests } = await supabase
        .from('bluebook_attempts')
        .select('total_score, completed_at')
        .eq('student_account_id', studentAccountId)
        .eq('status', 'completed')
        .not('total_score', 'is', null)
        .gte('completed_at', dates.start)
        .lte('completed_at', dates.end)
        .order('completed_at', { ascending: true });

      if (tests && tests.length >= 2) {
        const firstScore = tests[0].total_score || 0;
        const lastScore = tests[tests.length - 1].total_score || 0;
        current = Math.max(0, lastScore - firstScore);
      }
      break;
    }

    case 'seasonal_tests': {
      const badgeDef = badgeDefinitions.find(b => b.name === badgeName);
      const dates = badgeDef ? await getSeasonalEventDates(badgeDef.id) : null;
      if (!dates) break;

      const { count } = await supabase
        .from('bluebook_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('student_account_id', studentAccountId)
        .eq('status', 'completed')
        .gte('completed_at', dates.start)
        .lte('completed_at', dates.end);

      current = count || 0;
      break;
    }

    case 'seasonal_streak': {
      const badgeDef = badgeDefinitions.find(b => b.name === badgeName);
      const dates = badgeDef ? await getSeasonalEventDates(badgeDef.id) : null;
      if (!dates) break;

      // Count distinct practice days from attempts + transactions during the period
      const { data: attempts } = await supabase
        .from('student_attempts')
        .select('attempted_at')
        .eq('student_account_id', studentAccountId)
        .gte('attempted_at', dates.start)
        .lte('attempted_at', dates.end);

      const { data: transactions } = await supabase
        .from('point_transactions')
        .select('created_at')
        .eq('student_account_id', studentAccountId)
        .gte('created_at', dates.start)
        .lte('created_at', dates.end);

      const allDates = new Set<string>();
      attempts?.forEach(a => allDates.add(format(parseISO(a.attempted_at), 'yyyy-MM-dd')));
      transactions?.forEach(t => allDates.add(format(parseISO(t.created_at), 'yyyy-MM-dd')));

      current = allDates.size;
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

  const dateActivities: Record<string, Set<string>> = {};
  transactions.forEach(t => {
    const date = format(parseISO(t.created_at), 'yyyy-MM-dd');
    if (!dateActivities[date]) dateActivities[date] = new Set();
    dateActivities[date].add(t.category);
  });

  const daysWithBoth = Object.entries(dateActivities)
    .filter(([_, activities]) => activities.has('speed') && activities.has('practice'))
    .map(([date]) => date)
    .sort();

  if (daysWithBoth.length === 0) return 0;

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
        const progress = await calculateRequirementProgress(studentAccountId, req, studentId, badge.name);
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
      const progress = await calculateRequirementProgress(studentAccountId, req, studentId, badge.name);
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
