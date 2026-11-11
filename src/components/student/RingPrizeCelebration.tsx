import { useEffect, useState } from 'react';
import Confetti from 'react-confetti';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { usePopupTurn } from '@/portal/popupGate';
import type { PrizeKey } from '@/lib/ringPrizes';

type Prize = { ring: PrizeKey; points: number };

/** Fire after the server paid a ring prize; the listener below celebrates it. */
export function emitRingPrize(e: Prize) {
  if (e.points > 0) window.dispatchEvent(new CustomEvent('student-ring-prize', { detail: e }));
}

// Same colours as DailyRing's defaults.
const LOOK: Record<PrizeKey, { label: string; colors: string[]; pieces: number }> = {
  speed: { label: 'Speed ring closed', colors: ['hsl(45, 95%, 55%)'], pieces: 120 },
  hard: { label: 'Hard ring closed', colors: ['hsl(0, 84%, 60%)'], pieces: 120 },
  medium: { label: 'Medium ring closed', colors: ['hsl(180, 85%, 45%)'], pieces: 120 },
  all: { label: 'All rings closed', colors: ['hsl(45, 95%, 55%)', 'hsl(0, 84%, 60%)', 'hsl(180, 85%, 45%)'], pieces: 300 },
};

export function RingPrizeCelebration() {
  const reduce = useReducedMotion();
  const [queue, setQueue] = useState<Prize[]>([]);
  const head = queue[0];
  // The big card waits for a clear screen; a small ring toast never covers anything.
  const turn = usePopupTurn('ring-prize-all', head?.ring === 'all');
  const shown = head && (head.ring !== 'all' || turn) ? head : undefined;

  useEffect(() => {
    const on = (e: Event) => setQueue(q => [...q, (e as CustomEvent<Prize>).detail]);
    window.addEventListener('student-ring-prize', on);
    return () => window.removeEventListener('student-ring-prize', on);
  }, []);
  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => setQueue(q => q.slice(1)), 2500);
    return () => clearTimeout(t);
  }, [shown]);

  const look = shown && LOOK[shown.ring];
  const big = shown?.ring === 'all';
  return (
    <>
      {shown && look && !reduce && <Confetti className="!fixed !z-[100] pointer-events-none" width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={look.pieces} colors={look.colors} />}
      <AnimatePresence>
        {shown && look && (
          <div key={queue.length + shown.ring} className={`pointer-events-none fixed inset-x-0 z-[100] flex justify-center ${big ? 'inset-y-0 items-center' : 'top-20'}`}>
            <motion.div
              role="status"
              className={`text-center rounded-2xl border bg-card text-card-foreground shadow-lg ${big ? 'px-10 py-8' : 'px-5 py-3'}`}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: -8 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className={big ? 'text-lg font-semibold' : 'text-sm font-medium text-muted-foreground'}>{look.label}</div>
              <div className={`font-mono font-bold ${big ? 'text-4xl' : 'text-2xl'}`}>{big ? `+${shown.points} bonus` : `+${shown.points}`}</div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
