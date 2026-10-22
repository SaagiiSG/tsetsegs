import { useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, animate, motion, useReducedMotion } from 'framer-motion';
import {
  Award, Bird, Calendar, Clock, Crown, Diamond, Flame, Flower, Flower2, Gem, Hourglass, Link, Medal,
  Mountain, Package, Snowflake, Sparkles, Star, Sword, Target, Timer, TrendingUp, Trophy, Zap, type LucideIcon,
} from 'lucide-react';
import { Dialog, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RARITY_COLORS, type BadgeRarity } from '@/data/badgeDefinitions';

export interface UnlockedBadge {
  id: string;
  name: string;
  description: string;
  rarity: BadgeRarity;
  iconName: string;
  pointValue: number;
}

const ICONS: Record<string, LucideIcon> = {
  Award, Bird, Calendar, Clock, Crown, Diamond, Flame, Flower, Flower2, Gem, Hourglass, Link, Medal,
  Mountain, Package, Snowflake, Sparkles, Star, Sword, Target, Timer, TrendingUp, Trophy, Zap,
};

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const IMPACT = 0.3; // seconds until the medallion lands; the burst fires here
const SPARKS = 14;

interface Props {
  badge: UnlockedBadge | null;
  /** Badges still waiting after this one. */
  remaining: number;
  onCollect: () => void;
  onCollectAll: () => void;
}

export function BadgeUnlockCelebration({ badge, remaining, onCollect, onCollectAll }: Props) {
  return (
    <Dialog open={!!badge} onOpenChange={open => !open && onCollect()}>
      <DialogPortal>
        <DialogOverlay className="z-[100] bg-slate-950/75 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 outline-none"
        >
          <AnimatePresence mode="wait">
            {badge && <Celebration key={badge.id} badge={badge} remaining={remaining} onCollect={onCollect} onCollectAll={onCollectAll} />}
          </AnimatePresence>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

function Celebration({ badge, remaining, onCollect, onCollectAll }: { badge: UnlockedBadge } & Omit<Props, 'badge'>) {
  const reduce = useReducedMotion();
  const colors = RARITY_COLORS[badge.rarity] ?? RARITY_COLORS.common;
  const Icon = ICONS[badge.iconName] ?? Award;
  const points = usePointsCountUp(badge.pointValue, reduce ? 0 : IMPACT + 0.25);

  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => navigator.vibrate?.([12, 40, 18]), IMPACT * 1000);
    return () => clearTimeout(t);
  }, [reduce]);

  const rise = (delay: number) => ({
    initial: { opacity: 0, transform: reduce ? 'none' : 'translateY(10px)' },
    animate: { opacity: 1, transform: 'translateY(0px)' },
    transition: { delay: reduce ? 0 : delay, duration: 0.4, ease: EASE_OUT },
  });

  return (
    <motion.div
      className="flex w-full max-w-sm flex-col items-center text-center"
      exit={{ opacity: 0, transform: reduce ? 'none' : 'scale(0.96)' }}
      transition={{ duration: 0.16, ease: EASE_OUT }}
    >
      <div className="relative grid h-60 w-60 place-items-center">
        {/* soft light behind the medallion */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: `radial-gradient(circle, ${colors.glow}55 0%, ${colors.glow}14 45%, transparent 70%)` }}
          initial={{ opacity: 0, transform: 'scale(0.6)' }}
          animate={{ opacity: 1, transform: 'scale(1)' }}
          transition={{ delay: reduce ? 0 : IMPACT - 0.05, duration: 0.9, ease: EASE_OUT }}
        />

        {!reduce && (
          <>
            {/* shockwave when it lands */}
            <motion.div
              className="absolute h-36 w-36 rounded-full border-2"
              style={{ borderColor: colors.glow }}
              initial={{ opacity: 0, transform: 'scale(0.8)' }}
              animate={{ opacity: [0.9, 0], transform: 'scale(2.1)' }}
              transition={{ delay: IMPACT, duration: 0.8, ease: EASE_OUT }}
            />
            {/* sparks flying out from the edge */}
            {Array.from({ length: SPARKS }, (_, i) => {
              const angle = (i * 360) / SPARKS + (i % 2 ? 9 : -9);
              const reach = i % 2 ? 100 : 122;
              return (
                <motion.span
                  key={i}
                  className="absolute h-3 w-1 rounded-full"
                  style={{ background: i % 3 ? colors.glow : '#fff' }}
                  initial={{ opacity: 0, transform: `rotate(${angle}deg) translateY(-60px) scaleY(0.3)` }}
                  animate={{ opacity: [0, 1, 0], transform: `rotate(${angle}deg) translateY(-${reach}px) scaleY(1)` }}
                  transition={{ delay: IMPACT, duration: 0.7, ease: EASE_OUT, opacity: { delay: IMPACT, duration: 0.7, times: [0, 0.15, 1] } }}
                />
              );
            })}
          </>
        )}

        {/* the badge itself: drops in with a little bounce, then a light sweep */}
        <motion.div
          className="relative grid h-36 w-36 place-items-center overflow-hidden rounded-full border-4"
          style={{
            borderColor: colors.glow,
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
            boxShadow: `0 0 0 8px ${colors.glow}22, 0 24px 60px -12px ${colors.glow}aa`,
          }}
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.45, rotate: -16 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={reduce ? { duration: 0.2 } : { type: 'spring', bounce: 0.45, duration: 0.7, delay: 0.05 }}
        >
          <Icon className="h-16 w-16 text-white drop-shadow-md" strokeWidth={1.75} />
          {!reduce && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 w-1/2"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)' }}
              initial={{ transform: 'translateX(-120%) skewX(-16deg)' }}
              animate={{ transform: 'translateX(320%) skewX(-16deg)' }}
              transition={{ delay: IMPACT + 0.2, duration: 0.85, ease: [0.77, 0, 0.175, 1] }}
            />
          )}
        </motion.div>
      </div>

      <motion.p
        {...rise(IMPACT + 0.05)}
        className="mt-2 text-xs font-semibold uppercase tracking-[0.25em]"
        style={{ color: colors.glow }}
      >
        Badge unlocked · {badge.rarity}
      </motion.p>
      <motion.div {...rise(IMPACT + 0.12)}>
        <DialogTitle className="mt-2 text-3xl font-bold tracking-tight text-white">{badge.name}</DialogTitle>
      </motion.div>
      <motion.div {...rise(IMPACT + 0.18)}>
        <DialogDescription className="mt-2 max-w-xs text-sm text-white/70">
          {badge.description}
        </DialogDescription>
      </motion.div>
      {badge.pointValue > 0 && (
        <motion.div
          {...rise(IMPACT + 0.24)}
          className="mt-5 rounded-full border px-4 py-1.5 font-mono text-lg font-semibold tabular-nums text-white"
          style={{ borderColor: `${colors.glow}66`, background: `${colors.glow}22` }}
        >
          +{points.toLocaleString()} pts
        </motion.div>
      )}

      <motion.div {...rise(IMPACT + 0.35)} className="mt-8 w-full max-w-[16rem]">
        <Button
          size="lg"
          autoFocus
          onClick={onCollect}
          className="w-full rounded-full text-base font-semibold transition-transform duration-150 active:scale-[0.97]"
        >
          {remaining > 0 ? 'Next badge' : 'Collect'}
        </Button>
        {remaining > 0 && (
          <button type="button" onClick={onCollectAll} className="mt-3 text-xs text-white/60 underline-offset-4 hover:text-white hover:underline">
            {remaining} more waiting · Collect all
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}

/** Counts the points up once the badge has landed. */
function usePointsCountUp(target: number, delay: number) {
  const [value, setValue] = useState(delay ? 0 : target);
  useEffect(() => {
    if (!delay) return;
    const controls = animate(0, target, {
      delay,
      duration: 0.8,
      ease: EASE_OUT,
      onUpdate: v => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [target, delay]);
  return value;
}
