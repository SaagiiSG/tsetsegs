import { useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { HairlineFigure, type HairlineSpec } from '@/portal/HairlineFigure';
import { ALL_FIGURES } from '@/portal/topicFigures';

export const LOADER_MIN_MS = 1500;
export const MODULE_OVER_MS = 5000;
export const SWITCHING_MIN_MS = 1500;
export const IRIS_MS = 600;

export const pickFigure = (rand: () => number = Math.random): HairlineSpec =>
  ALL_FIGURES[Math.min(ALL_FIGURES.length - 1, Math.floor(rand() * ALL_FIGURES.length))];

/** "Just a loading screen": one hairline figure walking its tour on Bluebook's loading grey. Fades out on exit. */
export function StartLoader({ figure }: { figure: HairlineSpec }) {
  return (
    <motion.div
      className="bluebook bb-loader fixed inset-0 z-[60] grid place-items-center"
      exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
      role="status" aria-label="Loading your test"
    >
      <HairlineFigure figure={figure} play className="w-[min(70vw,420px)]" />
    </motion.div>
  );
}

/**
 * A black layer with a round hole: closing shrinks the hole to nothing, opening grows it back.
 * Drawn as an overlay (not a clip on the children) so it also covers the results pop-up, which lives in a portal.
 */
export function IrisTransition({ phase, onDone, children }: { phase: 'closing' | 'opening'; onDone(): void; children: ReactNode }) {
  const reduce = useReducedMotion();
  const [gone, setGone] = useState(false);
  const closing = phase === 'closing';
  const finish = () => { if (!closing) setGone(true); onDone(); };
  const open = '150vmax', shut = '0vmax';
  return (
    <>
      {children}
      {!gone && (reduce ? (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[200] bg-[#111]"
          initial={{ opacity: closing ? 0 : 1 }} animate={{ opacity: closing ? 1 : 0 }}
          transition={{ duration: 0.2 }} onAnimationComplete={finish}
        />
      ) : (
        <div className="pointer-events-none fixed inset-0 z-[200] overflow-hidden">
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_200vmax_#111]"
            initial={{ width: closing ? open : shut, height: closing ? open : shut }}
            animate={{ width: closing ? shut : open, height: closing ? shut : open }}
            transition={{ duration: IRIS_MS / 1000, ease: closing ? 'easeIn' : 'easeOut' }}
            onAnimationComplete={finish}
          />
        </div>
      ))}
    </>
  );
}
