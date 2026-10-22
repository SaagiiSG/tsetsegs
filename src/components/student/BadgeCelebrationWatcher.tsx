import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { BadgeUnlockCelebration, type UnlockedBadge } from './badges/BadgeUnlockCelebration';
import type { BadgeRarity } from '@/data/badgeDefinitions';

/**
 * Celebrates every badge the student has earned but not yet seen, one at a
 * time, and marks each seen on the server as it is collected — so it never
 * replays on a new phone, and badges given by the server (sprint wins etc.)
 * still get one.
 */
export function BadgeCelebrationWatcher() {
  const { student } = useStudentAuth();
  const qc = useQueryClient();
  const [collected, setCollected] = useState<Set<string>>(new Set());
  const { data } = useQuery({
    queryKey: ['badge-celebrations', student?.id],
    enabled: !!student?.id,
    refetchInterval: 60_000,
    queryFn: async (): Promise<UnlockedBadge[]> => {
      const { data } = await supabase
        .from('student_badges')
        .select('badge_id, badges(name, description, rarity, icon_name, point_value)')
        .eq('student_account_id', student!.id)
        .eq('is_unlocked', true)
        .is('celebrated_at', null)
        .order('unlocked_at')
        .limit(10);
      return (data ?? []).map(row => ({
        id: row.badge_id,
        name: row.badges?.name ?? 'New badge',
        description: row.badges?.description ?? '',
        rarity: (row.badges?.rarity ?? 'common') as BadgeRarity,
        iconName: row.badges?.icon_name ?? 'Award',
        pointValue: row.badges?.point_value ?? 0,
      }));
    },
  });

  const queue = (data ?? []).filter(b => !collected.has(b.id));

  const collect = (badges: UnlockedBadge[]) => {
    if (badges.length === 0) return;
    const ids = badges.map(b => b.id);
    setCollected(prev => new Set([...prev, ...ids]));
    supabase.rpc('student_mark_badges_celebrated', { p_badge_ids: ids }).then(() => {
      qc.invalidateQueries({ queryKey: ['student-badges'] });
    });
  };

  return (
    <BadgeUnlockCelebration
      badge={queue[0] ?? null}
      remaining={Math.max(queue.length - 1, 0)}
      onCollect={() => collect(queue.slice(0, 1))}
      onCollectAll={() => collect(queue)}
    />
  );
}
