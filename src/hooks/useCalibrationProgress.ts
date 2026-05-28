import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CalibrationProgress {
  solved: number;
  required: number;
  unlocked: boolean;
  rankUnlockedAt: string | null;
}

export const CALIBRATION_REQUIRED = 44;

/**
 * Returns how many distinct questions a student account has attempted and
 * whether they've crossed the 44-question threshold that unlocks ranks and
 * score prediction. Accepts either a student_accounts.id or a phone number
 * (looked up via student_accounts.phone_number).
 */
export function useCalibrationProgress(
  identifier: { studentAccountId?: string | null; phone?: string | null } | undefined,
) {
  const studentAccountId = identifier?.studentAccountId ?? null;
  const phone = identifier?.phone ?? null;

  return useQuery({
    queryKey: ['calibration-progress', studentAccountId, phone],
    queryFn: async (): Promise<CalibrationProgress | null> => {
      let accountId = studentAccountId;

      if (!accountId && phone) {
        const { data: acct } = await supabase
          .from('student_accounts')
          .select('id')
          .eq('phone_number', phone)
          .maybeSingle();
        accountId = acct?.id ?? null;
      }

      if (!accountId) return null;

      const { data: account } = await supabase
        .from('student_accounts')
        .select('rank_unlocked_at')
        .eq('id', accountId)
        .maybeSingle();

      const rankUnlockedAt = (account as any)?.rank_unlocked_at ?? null;

      // Count distinct questions attempted. We cap how many rows we pull to
      // 2000 because we only need to know if it's >= 44.
      const { data: attempts } = await supabase
        .from('student_attempts')
        .select('question_id')
        .eq('student_account_id', accountId)
        .limit(2000);

      const distinct = new Set((attempts ?? []).map((r: any) => r.question_id));
      const solved = distinct.size;

      return {
        solved,
        required: CALIBRATION_REQUIRED,
        unlocked: !!rankUnlockedAt || solved >= CALIBRATION_REQUIRED,
        rankUnlockedAt,
      };
    },
    enabled: !!(studentAccountId || phone),
    staleTime: 60 * 1000,
  });
}
