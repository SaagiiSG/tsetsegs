import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Confetti from 'react-confetti';
import { useReducedMotion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { BadgeUnlockCelebration } from '@/components/student/badges/BadgeUnlockCelebration';
import { RARITY_COLORS, type BadgeRarity } from '@/data/badgeDefinitions';
import { useCenter } from './centerContext';
import { badgesToCelebrate } from './badgeQueue';
import type { CenterBadge } from './centerProfile';
import { usePopupTurn } from './popupGate';

const PIECES: Partial<Record<BadgeRarity, number>> = { common: 120, uncommon: 180, rare: 240, epic: 320, legendary: 420 };
// Generated types don't know 0092's table yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const celebrations = () => supabase.from('tenant_badge_celebrations' as any);

/** Shows each earned badge once per student (on any device), one at a time, when no live game or other dialog is up. */
export function CenterBadgeWatcher({ studentId, badges, liveUp = false }: { studentId: string; badges: CenterBadge[] | null; liveUp?: boolean }) {
  const { center } = useCenter();
  const qc = useQueryClient();
  const reduce = useReducedMotion();
  // Collected this visit, so a failed insert can't bring the same pop-up straight back.
  const [collected, setCollected] = useState<Set<string>>(new Set());
  // A failed read celebrates nothing, rather than every badge again.
  const seenKey = ['center-badge-celebrations', studentId];
  const seen = useQuery({
    queryKey: seenKey,
    queryFn: async () => {
      const { data, error } = await celebrations().select('badge_key').eq('student_id', studentId);
      if (error) throw error;
      return new Set(((data ?? []) as unknown as { badge_key: string }[]).map(r => r.badge_key));
    },
  });
  const queue = badges && seen.data ? badgesToCelebrate(badges, seen.data).filter(b => !collected.has(b.key)) : [];
  // A live game takes the screen back from an open pop-up; the badge isn't collected, so it returns after the game.
  const turn = usePopupTurn('badges', queue.length > 0 && !liveUp);
  const current = turn ? queue[0] : undefined;

  const collect = (list: CenterBadge[]) => {
    if (list.length === 0) return;
    const keys = list.map(b => b.key);
    // The cache too, so a remount before the next read doesn't flash it again; `collected` still covers a refetch after a failed write.
    setCollected(prev => new Set([...prev, ...keys]));
    qc.setQueryData<Set<string>>(seenKey, old => new Set([...(old ?? []), ...keys]));
    celebrations()
      .upsert(keys.map(badge_key => ({ student_id: studentId, institution_id: center.id, badge_key })), { onConflict: 'student_id,badge_key', ignoreDuplicates: true })
      .then(({ error }) => { if (error) console.warn('badge celebration not saved', error); });
  };

  const colors = current && (RARITY_COLORS[current.rarity] ?? RARITY_COLORS.common);
  return (
    <>
      <BadgeUnlockCelebration
        badge={current ? { id: current.key, name: current.name, description: current.desc, rarity: current.rarity, iconName: current.icon, pointValue: 0 } : null}
        remaining={Math.max(queue.length - 1, 0)}
        onCollect={() => collect(queue.slice(0, 1))}
        onCollectAll={() => collect(queue)}
      />
      {/* Center-only burst over main's pop-up (its overlay is z-[100]); no sound, students are in class. */}
      {current && colors && !reduce && createPortal(
        <Confetti
          key={current.key}
          width={window.innerWidth}
          height={window.innerHeight}
          numberOfPieces={PIECES[current.rarity] ?? 120}
          colors={[colors.primary, colors.secondary, colors.glow]}
          recycle={false}
          className="pointer-events-none"
          style={{ position: 'fixed', zIndex: 101 }}
        />,
        document.body,
      )}
    </>
  );
}
