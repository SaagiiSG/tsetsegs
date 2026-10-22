import { questionTableFor, type QuestionTable } from '@/lib/questionTable';
import { supabase } from '@/integrations/supabase/client';
import { badgeDefinitions, BadgeRequirement } from '@/data/badgeDefinitions';
import { parseISO, format } from 'date-fns';
import {
  type AttemptRow, type SpeedSessionRow, ubDay, longestDayRun, bestCorrectRun, hasAccurateWindow,
  countAccurateSessions, longestPerfectRun, hasQualifyingSession, percentOf,
} from '@/lib/badgeRules';

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

// PostgREST sends at most 1,000 rows per request, so read whole histories page by page.
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

// One sync reads a student's answers and speed sessions once, shared by every badge.
// shortcut: this downloads the student's whole answer history each sync; move these counts
// into a server function if the heaviest students find the badges page slow.
let cache: { student: string; attempts?: Promise<(AttemptRow & { question_id: string })[]>; sessions?: Promise<SpeedSessionRow[]> } = { student: '' };
const forStudent = (id: string) => (cache.student === id ? cache : (cache = { student: id }));

const loadAttempts = (id: string) => (forStudent(id).attempts ??= fetchAll((from, to) => supabase
  .from('student_attempts')
  .select('question_id, is_correct, time_spent_seconds, attempted_at')
  .eq('student_account_id', id)
  .order('attempted_at')
  .order('id')
  .range(from, to)));

const loadSessions = (id: string) => (forStudent(id).sessions ??= fetchAll((from, to) => supabase
  .from('speed_sessions')
  .select('total_questions, correct_count, duration_seconds, created_at')
  .eq('student_account_id', id)
  .order('created_at')
  .order('id')
  .range(from, to)));

async function solvedIn(studentAccountId: string, questions: Promise<{ id: string }[]>) {
  const [qs, attempts] = await Promise.all([questions, loadAttempts(studentAccountId)]);
  const solved = new Set(attempts.filter(a => a.is_correct).map(a => a.question_id));
  return { total: qs.length, solved: qs.filter(q => solved.has(q.id)).length };
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
  badgeName?: string,
  qTable: QuestionTable = 'questions'
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
      const [sessions, paid] = await Promise.all([
        loadSessions(studentAccountId),
        fetchAll<{ created_at: string }>((from, to) => supabase
          .from('point_transactions')
          .select('created_at')
          .eq('student_account_id', studentAccountId)
          .eq('category', 'speed_session')
          .gt('points', 0)
          .order('created_at')
          .order('id')
          .range(from, to)),
      ]);
      current = longestDayRun([...sessions.filter(s => s.total_questions > 0), ...paid].map(r => ubDay(r.created_at)));
      break;
    }

    case 'consecutive_days_both': {
      const [sessions, attempts] = await Promise.all([loadSessions(studentAccountId), loadAttempts(studentAccountId)]);
      const practised = new Set(attempts.map(a => ubDay(a.attempted_at)));
      current = longestDayRun(sessions.map(s => ubDay(s.created_at)).filter(d => practised.has(d)));
      break;
    }

    case 'all_68_questions':
    case 'all_cb_problems': {
      const set = req.type === 'all_68_questions' ? '68' : 'CollegeBoard';
      current = (await solvedIn(studentAccountId, fetchAll<{ id: string }>((from, to) => supabase
        .from(qTable)
        .select('id')
        .eq('question_set', set)
        .eq('is_active', true)
        .order('id')
        .range(from, to)))).solved;
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

    case 'speed_sessions_high_accuracy':
      current = countAccurateSessions(await loadSessions(studentAccountId), 5, 95);
      break;

    case 'consecutive_perfect_drills':
      current = longestPerfectRun(await loadSessions(studentAccountId));
      break;

    case 'speed_session_combo': {
      // Lightning Strike: 10+ questions, 80%+ / Speedster: 20+ questions, 90%+; both in a session of 5 min or less
      const isSpeedster = badgeName?.includes('Speedster');
      current = hasQualifyingSession(await loadSessions(studentAccountId), {
        minQuestions: isSpeedster ? 20 : 10,
        maxSeconds: 300,
        minAccuracy: isSpeedster ? 90 : 80,
      }) ? 1 : 0;
      break;
    }

    case 'all_english_questions': {
      const { data: englishQuestions } = await supabase
        .from(qTable)
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
      const { total, solved } = await solvedIn(studentAccountId, fetchAll<{ id: string }>((from, to) => supabase
        .from(qTable)
        .select('id')
        .ilike('subject', 'english')
        .eq('is_active', true)
        .order('id')
        .range(from, to)));
      current = total > 0 && solved >= total ? 1 : 0;
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

    case 'consecutive_correct_under_time':
      // Sniper: 10 in 8 min / Rush Delivery: 20 in 12 min
      current = bestCorrectRun(await loadAttempts(studentAccountId), (target === 10 ? 8 : target === 20 ? 12 : 10) * 60);
      break;

    case 'questions_under_time_high_accuracy':
      // Time Lord: any 50 answers in a row, 17 min or less, 90%+ right
      current = hasAccurateWindow(await loadAttempts(studentAccountId), target, 17 * 60, 90) ? target : 0;
      break;

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

  const percentage = percentOf(current, target);
  return { current, target, percentage };
}

/**
 * Calculate progress for all badges for a student
 */
export async function calculateAllBadgeProgress(
  studentAccountId: string,
  studentId?: string,
  qTable: QuestionTable = 'questions',
  skipBadgeNames: Set<string> = new Set()
): Promise<BadgeProgressResult[]> {
  const results: BadgeProgressResult[] = [];
  cache = { student: '' };

  for (const badge of badgeDefinitions) {
    if (skipBadgeNames.has(badge.name)) continue;
    const requirementsProgress = await Promise.all(
      badge.requirements.map(async req => {
        const progress = await calculateRequirementProgress(studentAccountId, req, studentId, badge.name, qTable);
        return {
          type: req.type,
          ...progress
        };
      })
    );

    const overallProgress = requirementsProgress.length > 0
      ? Math.floor(
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
