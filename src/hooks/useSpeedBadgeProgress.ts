import { supabase } from '@/integrations/supabase/client';

interface SpeedSessionResult {
  totalQuestions: number;
  correctCount: number;
  totalTimeSeconds: number;
  accuracy: number;
}

/**
 * Check and update badge progress after a speed session completes.
 * 
 * Badge requirements:
 * - Lightning Strike: 10+ questions in <5 min (300s) with 80%+ accuracy
 * - Speedster: 20+ questions in <5 min (300s) with 90%+ accuracy
 */
export async function checkSpeedBadgeProgress(
  studentAccountId: string,
  sessionResult: SpeedSessionResult
): Promise<{ badgesUnlocked: string[] }> {
  const { totalQuestions, correctCount, totalTimeSeconds, accuracy } = sessionResult;
  const badgesUnlocked: string[] = [];

  // Get badge IDs from database
  const { data: badges } = await supabase
    .from('badges')
    .select('id, name')
    .in('name', ['Lightning Strike', 'Speedster']);

  if (!badges || badges.length === 0) return { badgesUnlocked };

  const lightningStrike = badges.find(b => b.name === 'Lightning Strike');
  const speedster = badges.find(b => b.name === 'Speedster');

  // Check Lightning Strike: 10+ questions, <5 min (300s), 80%+ accuracy
  if (lightningStrike) {
    const meetsLightning = totalQuestions >= 10 && totalTimeSeconds < 300 && accuracy >= 80;
    
    if (meetsLightning) {
      // Check if already unlocked
      const { data: existing } = await supabase
        .from('student_badges')
        .select('id, is_unlocked')
        .eq('student_account_id', studentAccountId)
        .eq('badge_id', lightningStrike.id)
        .maybeSingle();

      if (!existing?.is_unlocked) {
        // Upsert badge progress - unlock it
        await supabase
          .from('student_badges')
          .upsert({
            student_account_id: studentAccountId,
            badge_id: lightningStrike.id,
            progress: 100,
            is_unlocked: true,
            unlocked_at: new Date().toISOString(),
            requirements_progress: {
              questions: totalQuestions,
              time_seconds: totalTimeSeconds,
              accuracy
            }
          }, {
            onConflict: 'student_account_id,badge_id'
          });
        
        badgesUnlocked.push('Lightning Strike');
      }
    }
  }

  // Check Speedster: 20+ questions, <5 min (300s), 90%+ accuracy
  if (speedster) {
    const meetsSpeedster = totalQuestions >= 20 && totalTimeSeconds < 300 && accuracy >= 90;
    
    if (meetsSpeedster) {
      // Check if already unlocked
      const { data: existing } = await supabase
        .from('student_badges')
        .select('id, is_unlocked')
        .eq('student_account_id', studentAccountId)
        .eq('badge_id', speedster.id)
        .maybeSingle();

      if (!existing?.is_unlocked) {
        // Upsert badge progress - unlock it
        await supabase
          .from('student_badges')
          .upsert({
            student_account_id: studentAccountId,
            badge_id: speedster.id,
            progress: 100,
            is_unlocked: true,
            unlocked_at: new Date().toISOString(),
            requirements_progress: {
              questions: totalQuestions,
              time_seconds: totalTimeSeconds,
              accuracy
            }
          }, {
            onConflict: 'student_account_id,badge_id'
          });
        
        badgesUnlocked.push('Speedster');
      }
    }
  }

  return { badgesUnlocked };
}
