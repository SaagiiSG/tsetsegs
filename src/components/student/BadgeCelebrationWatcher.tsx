import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';

/**
 * Shows a celebration for every badge the student has earned but not yet
 * seen, then marks them seen on the server — so it never replays on a new
 * phone, and badges given by the server (sprint wins etc.) still get one.
 */
export function BadgeCelebrationWatcher() {
  const { student } = useStudentAuth();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['badge-celebrations', student?.id],
    enabled: !!student?.id,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('student_badges')
        .select('badge_id, badges(name, point_value)')
        .eq('student_account_id', student!.id)
        .eq('is_unlocked', true)
        .is('celebrated_at', null)
        .limit(10);
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!data || data.length === 0) return;
    data.forEach((row: any) => {
      toast.success(`🏆 Badge unlocked: ${row.badges?.name ?? 'New badge'}`, {
        description: row.badges?.point_value ? `+${row.badges.point_value} league points` : 'Check your badges page!',
        duration: 6000,
      });
    });
    supabase
      .rpc('student_mark_badges_celebrated', { p_badge_ids: data.map((r: any) => r.badge_id) })
      .then(() => {
        qc.invalidateQueries({ queryKey: ['badge-celebrations', student?.id] });
        qc.invalidateQueries({ queryKey: ['student-badges'] });
      });
  }, [data]);

  return null;
}
