import { useEffect, useState } from 'react';
import Confetti from 'react-confetti';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { usePopupTurn } from '@/portal/popupGate';
import type { PrizeKey, RingKey } from '@/lib/ringPrizes';

type Prize = { ring: PrizeKey; points: number };
type Colors = { speed: string; hard: string; medium: string };
type PrizeEvent = Prize & { id: number };

let nextId = 0;
/** Fire after the server paid a ring prize; the listener below celebrates it. */
export function emitRingPrize(e: Prize) {
  if (e.points > 0) window.dispatchEvent(new CustomEvent('student-ring-prize', { detail: { ...e, id: ++nextId } }));
}

const DEFAULT_COLORS: Colors = { speed: 'hsl(45, 95%, 55%)', hard: 'hsl(0, 84%, 60%)', medium: 'hsl(180, 85%, 45%)' };
const LABEL: Record<PrizeKey, string> = { speed: 'Speed ring closed', hard: 'Hard ring closed', medium: 'Medium ring closed', all: 'All rings closed' };

/** `colors` are the portal's ring colours; the bonus uses all three. */
export function RingPrizeCelebration({ colors = DEFAULT_COLORS }: { colors?: Colors }) {
  const reduce = useReducedMotion();
  const [queue, setQueue] = useState<PrizeEvent[]>([]);
  const head = queue[0];
  // Every prize waits for a clear screen, so neither the toast nor its confetti lands on a timed run or a dialog.
  const turn = usePopupTurn('ring-prize', !!head);
  const shown = turn ? head : undefined;

  useEffect(() => {
    const on = (e: Event) => setQueue(q => [...q, (e as CustomEvent<PrizeEvent>).detail]);
    window.addEventListener('student-ring-prize', on);
    return () => window.removeEventListener('student-ring-prize', on);
  }, []);
  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => setQueue(q => q.slice(1)), 2500);
    return () => clearTimeout(t);
  }, [shown]);

  const big = shown?.ring === 'all';
  const tint = shown ? (big ? [colors.speed, colors.hard, colors.medium] : [colors[shown.ring as RingKey]]) : [];
  const accent = tint[0];
  return (
    <>
      <AnimatePresence>
        {big && <motion.div key={`scrim-${shown.id}`} className="pointer-events-none fixed inset-0 z-[100] bg-background/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} />}
      </AnimatePresence>
      {shown && !reduce && <Confetti key={shown.id} className="!fixed !z-[100] pointer-events-none" width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={big ? 300 : 120} colors={tint} />}
      <AnimatePresence>
        {shown && (
          <div key={shown.id} className={`pointer-events-none fixed inset-x-0 z-[100] flex justify-center ${big ? 'inset-y-0 items-center' : 'top-20'}`}>
            <motion.div
              role="status"
              className={`text-center rounded-2xl border bg-card text-card-foreground ${big ? 'px-10 py-8' : 'px-5 py-3'}`}
              style={{ boxShadow: `0 0 ${big ? 56 : 32}px ${big ? 6 : 2}px color-mix(in srgb, ${accent} 45%, transparent)`, borderColor: `color-mix(in srgb, ${accent} 60%, transparent)` }}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6, y: -12 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={reduce ? { duration: 0.25 } : { type: 'spring', stiffness: 380, damping: 14 }}
            >
              <div className={big ? 'text-lg font-semibold' : 'text-sm font-medium text-muted-foreground'}>{LABEL[shown.ring]}</div>
              <div className={`font-mono font-bold ${big ? 'text-4xl' : 'text-2xl'}`} style={big ? { backgroundImage: `linear-gradient(90deg, ${tint.join(', ')})`, WebkitBackgroundClip: 'text', color: 'transparent' } : { color: accent }}>{big ? `+${shown.points} bonus` : `+${shown.points}`}</div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
