import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { StreakExtendedToast } from './StreakExtendedToast';

export const STREAK_EXTENDED_EVENT = 'streak:extended';

export interface StreakExtendedDetail {
  newStreak: number;
  isNew: boolean;
}

export function StreakCelebrationListener() {
  const [active, setActive] = useState<StreakExtendedDetail | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<StreakExtendedDetail>).detail;
      if (!detail) return;
      queryClient.invalidateQueries({ queryKey: ['student-streak'] });
      queryClient.invalidateQueries({ queryKey: ['student-activity-days'] });
      setActive(detail);
    };
    window.addEventListener(STREAK_EXTENDED_EVENT, handler);
    return () => window.removeEventListener(STREAK_EXTENDED_EVENT, handler);
  }, [queryClient]);

  if (!active) return null;
  return (
    <StreakExtendedToast
      open={!!active}
      streak={active.newStreak}
      isNew={active.isNew}
      onClose={() => setActive(null)}
    />
  );
}
