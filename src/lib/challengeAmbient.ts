import { supabase } from '@/integrations/supabase/client';
import { calculatePoints, type Difficulty } from './challengeScoring';

interface AmbientArgs {
  studentId: string;
  subject: 'math' | 'english';
  questionId: string;
  isCorrect: boolean;
  timeMs: number;
  difficulty?: Difficulty;
}

/**
 * If the student has an active ambient-tracked challenge (first_to_points,
 * first_to_correct, time_sprint) matching this subject, record a
 * challenge_attempts row. The DB trigger process_challenge_attempt handles
 * score aggregation and finishing the race.
 *
 * Fire-and-forget: never throws.
 */
export async function recordAmbientChallengeAttempt(args: AmbientArgs): Promise<void> {
  try {
    const { studentId, subject, questionId, isCorrect, timeMs, difficulty } = args;
    if (!studentId || !questionId) return;

    // Find an active, ambient-tracked challenge for this student + subject
    const { data: parts } = await supabase
      .from('challenge_participants')
      .select('challenge_id, challenges!inner(id, status, format, subject)')
      .eq('student_account_id', studentId)
      .eq('challenges.status', 'active')
      .eq('challenges.subject', subject)
      .in('challenges.format', ['first_to_points', 'first_to_correct', 'time_sprint'])
      .limit(1);

    const row: any = parts?.[0];
    if (!row) return;
    const challengeId: string = row.challenge_id;

    // Dedupe: don't double-count if the student re-attempts the same question
    const { data: existing } = await supabase
      .from('challenge_attempts')
      .select('id')
      .eq('challenge_id', challengeId)
      .eq('student_account_id', studentId)
      .eq('question_id', questionId)
      .limit(1);
    if (existing && existing.length > 0) return;

    const points = calculatePoints(isCorrect, difficulty ?? 'medium', timeMs);

    await supabase.from('challenge_attempts').insert({
      challenge_id: challengeId,
      student_account_id: studentId,
      question_id: questionId,
      is_correct: isCorrect,
      time_ms: timeMs,
      points_awarded: points,
    });

    // Nudge the HUD to refresh immediately
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('challenge:attempt-recorded', { detail: { challengeId } }));
    }
  } catch {
    // swallow — ambient tracking must never block practice
  }
}
