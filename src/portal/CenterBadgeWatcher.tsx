import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
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
export function CenterBadgeWatcher({ studentId, badges }: { studentId: string; badges: CenterBadge[] | null }) {
  const { center } = useCenter();
  const reduce = useReducedMotion();
  // Collected this visit, so a failed insert can't bring the same pop-up straight back.
  const [collected, setCollected] = useState<Set<string>>(new Set());
  // A failed read celebrates nothing, rather than every badge again.
  const seen = useQuery({
    queryKey: ['center-badge-celebrations', studentId],
    queryFn: async () => {
      const { data, error } = await celebrations().select('badge_key').eq('student_id', studentId);
      if (error) throw error;
      return new Set(((data ?? []) as unknown as { badge_key: string }[]).map(r => r.badge_key));
    },
  });
  const queue = badges && seen.data ? badgesToCelebrate(badges, seen.data).filter(b => !collected.has(b.key)) : [];
  const turn = usePopupTurn('badges', queue.length > 0);
  const current = turn ? queue[0] : undefined;

  const collect = (list: CenterBadge[]) => {
    if (list.length === 0) return;
    setCollected(prev => new Set([...prev, ...list.map(b => b.key)]));
    celebrations()
      .upsert(list.map(b => ({ student_id: studentId, institution_id: center.id, badge_key: b.key })), { onConflict: 'student_id,badge_key', ignoreDuplicates: true })
      .then(() => {});
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
