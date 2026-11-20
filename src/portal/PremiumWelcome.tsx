import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, animate, motion, useReducedMotion, type PanInfo } from 'framer-motion';
import { ArrowRight, BookOpenCheck, Check, ClipboardList, Infinity as InfinityIcon, Lock, LockOpen, Map as MapIcon, Mountain, Play, Star, Zap } from 'lucide-react';
import { Dialog, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PREMIUM_PLAN } from '@/solo/plans';
import { HairlineFigure } from './HairlineFigure';
import { Chest } from './topicArt';
import { HL } from './hairline/kernel.js';
import padlock from './hairline/padlock.js';
import { topicFigures } from './topicFigures';

// Calm, short ease-outs; no springs or loops (Saagii, 20 Nov: the sparkle medal read as "AI slop").
const EASE_OUT = [0.23, 1, 0.32, 1] as const;
// The portal's own sky: .sky-tile-blue's ink (4.7:1 on white) and its lighter dark-mode partner.
const INK = 'text-[#1470E7] dark:text-[#73AEF8]';

/**
 * What Premium opens, shown once right after a student pays (Saagii, 19–20 Nov): a deck of light sky cards, the
 * welcome first (the free plan's lock opening), then one per Premium perk with a small scene. SoloPremium sends them to
 * /student with `premiumWelcome` in the route state; closing clears it, so a reload or Back never shows it again.
 */
export function PremiumWelcome() {
  const location = useLocation();
  const navigate = useNavigate();
  const open = !!(location.state as { premiumWelcome?: boolean } | null)?.premiumWelcome;
  const close = () => navigate(location.pathname + location.search, { replace: true, state: null });
  const next = useRef<HTMLButtonElement>(null);
  const reduce = !!useReducedMotion();
  return (
    <Dialog open={open} onOpenChange={o => !o && close()}>
      <DialogPortal>
        <DialogOverlay className="z-[100] bg-slate-900/40 backdrop-blur-sm" />
        {/* m-auto on the deck, not items-center, so a short phone scrolls from the top; focus without scrolling. */}
        <DialogPrimitive.Content className="fixed inset-0 z-[100] flex overflow-y-auto p-5 outline-none"
          onOpenAutoFocus={e => { e.preventDefault(); next.current?.focus({ preventScroll: true }); }}>
          <DialogTitle className="sr-only">Welcome to Premium</DialogTitle>
          <DialogDescription className="sr-only">The cards show what Premium opens.</DialogDescription>
          {open && <PerkCards onDone={close} nextRef={next} reduce={reduce} />}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

type Card = { title: string; body: string; Scene: (p: { reduce: boolean }) => ReactNode };
// One perk card per PREMIUM_PLAN line, same order. Counts are Saagii's numbers from that list and the landing page's
// Free plan (30 Math questions, 10 speed runs a day, 1 full practice test). Short lines get their own body.
const PERKS: Card[] = [
  { title: 'Every explanation', body: PREMIUM_PLAN[0], Scene: ExplainScene },
  { title: 'Every Math question', body: PREMIUM_PLAN[1], Scene: QuestionsScene },
  { title: 'Unlimited speed mode', body: 'No more 10 runs a day. Race the clock as often as you like.', Scene: SpeedScene },
  { title: 'Every practice test', body: 'Every full practice test is open, not just the first one.', Scene: TestsScene },
  { title: 'Every video lesson', body: PREMIUM_PLAN[4], Scene: MapScene },
];
const PERK_ICONS = [BookOpenCheck, Mountain, Zap, ClipboardList, MapIcon];
const COUNT = PERKS.length + 1; // the welcome, then the perks

/** The deck: one tall card, Next (inside it) or a swipe moves on, the dots jump, the last button closes. */
export function PerkCards({ onDone, nextRef, reduce }: { onDone: () => void; nextRef?: RefObject<HTMLButtonElement>; reduce: boolean }) {
  const [[at, dir], setAt] = useState<[number, number]>([0, 1]);
  const go = (to: number) => { if (to >= 0 && to < COUNT && to !== at) setAt([to, to > at ? 1 : -1]); };
  const last = at === COUNT - 1;
  const swipe = (_: unknown, info: PanInfo) => { if (info.offset.x < -50) go(at + 1); else if (info.offset.x > 50) go(at - 1); };
  return (
    <div className="m-auto flex h-[min(620px,calc(100dvh-2.5rem))] min-h-[540px] w-full max-w-sm flex-col rounded-[28px] border border-slate-200/80 bg-white p-5 text-slate-900 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-[#1A1F2E] dark:text-slate-50"
      onKeyDown={e => { if (e.key === 'ArrowRight') go(at + 1); if (e.key === 'ArrowLeft') go(at - 1); }}>
      <div className="-mr-1 -mt-1 flex justify-end">
        {/* Kept (hidden) on the last card so nothing moves. */}
        <button type="button" onClick={onDone} tabIndex={last ? -1 : undefined} aria-hidden={last || undefined}
          className={`rounded-full px-2 py-1 text-sm text-slate-500 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1470E7] dark:text-slate-400 dark:hover:text-white ${last ? 'invisible' : ''}`}>Skip</button>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <AnimatePresence initial={false} mode="popLayout" custom={dir}>
          <motion.div
            key={at} custom={dir} className="flex h-full w-full touch-pan-y flex-col"
            variants={{
              enter: (d: number) => ({ opacity: 0, transform: reduce ? 'none' : `translateX(${d * 24}px)` }),
              center: { opacity: 1, transform: 'translateX(0px)' },
              exit: (d: number) => ({ opacity: 0, transform: reduce ? 'none' : `translateX(${d * -24}px)` }),
            }}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: reduce ? 0.15 : 0.28, ease: EASE_OUT }}
            drag={reduce ? false : 'x'} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2} onDragEnd={swipe}
          >
            {at === 0 ? <WelcomeCard reduce={reduce} /> : <PerkCard i={at - 1} reduce={reduce} />}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5" role="group" aria-label="Premium cards">
          {Array.from({ length: COUNT }, (_, i) => (
            <button key={i} type="button" onClick={() => go(i)} aria-label={`Card ${i + 1} of ${COUNT}`} aria-current={i === at}
              className={`h-2 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1470E7] ${i === at ? 'w-5 bg-slate-900 dark:bg-white' : 'w-2 bg-slate-900/20 dark:bg-white/25'}`} />
          ))}
        </div>
        <Button ref={nextRef} size="sm" onClick={() => (last ? onDone() : go(at + 1))}
          className="rounded-full bg-[#1470E7] px-4 font-semibold text-white transition-transform duration-150 hover:bg-[#0F5FC7] active:scale-[0.97] dark:bg-[#73AEF8] dark:text-slate-950 dark:hover:bg-[#93C2FA]">
          {last ? 'Start practicing' : 'Next'}<ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// The end transform matches the start's kind: framer reads 'scale(0.92)' → 'none' as a collapse to zero.
const REST = (from: string) => (from.startsWith('scale') ? 'scale(1)' : from.startsWith('translateX') ? 'translateX(0px)' : 'translateY(0px)');
const fade = (reduce: boolean, delay: number, from = 'translateY(6px)') => ({
  initial: { opacity: 0, transform: reduce ? REST(from) : from },
  animate: { opacity: 1, transform: REST(from) },
  transition: { delay: reduce ? 0 : delay, duration: 0.45, ease: EASE_OUT },
});

/**
 * The hairline padlock the concept videos map puts on locked lessons, opening once: an unseen pointer glides in to its
 * middle, the shackle springs up and swings open, and it stays open (the real pointer can't reach it).
 */
function OpeningLock({ reduce, at = 0.45 }: { reduce: boolean; at?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const stage = ref.current;
    if (!stage) return;
    HL.inject(document);
    const svg = HL.mk('svg', { viewBox: '0 0 400 320', 'aria-hidden': 'true' }, stage);
    const handle = padlock.mount({ stage, svg, read: { textContent: null } }, padlock.range[1]);
    // In viewBox units, as the figure reads its pointer: from below the lock up to its middle.
    const move = (x: number, y: number) => {
      const r = stage.getBoundingClientRect();
      stage.dispatchEvent(new PointerEvent('pointermove', { clientX: r.left + (x / 400) * r.width, clientY: r.top + (y / 320) * r.height, pointerType: 'mouse' }));
    };
    let raf = 0;
    const start = window.setTimeout(() => {
      navigator.vibrate?.(14);
      if (reduce) return move(200, 175);
      const t0 = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / 650), e = 1 - (1 - k) ** 3;
        move(200, 320 - 145 * e);
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, reduce ? 0 : at * 1000);
    return () => { clearTimeout(start); cancelAnimationFrame(raf); handle.destroy(); svg.remove(); };
  }, [reduce, at]);
  return (
    <div ref={ref} data-hairline="padlock" aria-hidden
      className="pointer-events-none w-44 [--hairline-edge:#94A3B8] [--hairline-hi:#1470E7] [--hairline-lo:#E2E8F0] [--hairline-mid:#CBD5E1] [--hairline-plate:#F3F8FE] [--hairline-stroke:1.3] dark:[--hairline-edge:#64748B] dark:[--hairline-hi:#73AEF8] dark:[--hairline-lo:#334155] dark:[--hairline-mid:#475569] dark:[--hairline-plate:#232A3D]" />
  );
}

/**
 * Card one. Its single moment is the lock a free student met on every locked lesson opening (the map's hairline
 * padlock). Then the welcome, and the five perks as quiet tiles.
 */
function WelcomeCard({ reduce }: { reduce: boolean }) {
  const after = 0.9;
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <motion.div {...fade(reduce, 0.05, 'scale(0.96)')}><OpeningLock reduce={reduce} /></motion.div>
      <motion.p {...fade(reduce, after - 0.2)} className={`mt-2 text-xs font-semibold uppercase tracking-[0.2em] ${INK}`}>Premium unlocked</motion.p>
      <motion.p {...fade(reduce, after - 0.12)} className="mt-2 font-chillax text-[28px] font-semibold leading-tight tracking-tight">Welcome to Premium</motion.p>
      <motion.p {...fade(reduce, after + 0.15)} className="mt-8 text-[15px] text-slate-500 dark:text-slate-400">Here's what you get</motion.p>
      <div className="mt-3 flex gap-2">
        {PERK_ICONS.map((Icon, i) => (
          <motion.span key={i} className="sky-tile sky-tile-blue !h-10 !w-10 !rounded-xl [&_svg]:!h-[18px] [&_svg]:!w-[18px]" {...fade(reduce, after + 0.3 + i * 0.06)}>
            <Icon />
          </motion.span>
        ))}
      </div>
    </div>
  );
}

function PerkCard({ i, reduce }: { i: number; reduce: boolean }) {
  const { title, body, Scene } = PERKS[i];
  return (
    <div className="flex h-full flex-col text-left">
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-[20px] border border-slate-200/70 bg-gradient-to-b from-[#F3FAFF] to-[#E8F4FE] dark:border-white/10 dark:from-white/[0.06] dark:to-white/[0.03]">
        <Scene reduce={reduce} />
      </div>
      <p className={`mt-5 text-xs font-semibold uppercase tracking-[0.2em] ${INK}`}>{i + 1} of {PERKS.length}</p>
      <p className="mt-1.5 font-chillax text-xl font-semibold tracking-tight">{title}</p>
      <p className="mt-1 min-h-[2.75rem] text-[15px] leading-snug text-slate-500 dark:text-slate-400">{body}</p>
    </div>
  );
}

/* ------------------------------ scenes ------------------------------ */

/** Counts from `from` to `to` after `delay`; reduced motion shows `to` straight away. */
function useCount(from: number, to: number, delay: number, reduce: boolean, duration = 1.1) {
  const [v, setV] = useState(reduce ? to : from);
  useEffect(() => {
    if (reduce) return;
    const c = animate(from, to, { delay, duration, ease: EASE_OUT, onUpdate: n => setV(Math.round(n)) });
    return () => c.stop();
  }, [from, to, delay, reduce, duration]);
  return v;
}

/** Shows `b` after `delay` (a lock that opens); reduced motion starts with `b`. */
function useAfter(delay: number, reduce: boolean) {
  const [on, setOn] = useState(reduce);
  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => setOn(true), delay * 1000);
    return () => clearTimeout(t);
  }, [delay, reduce]);
  return on;
}

const ANSWER = 'bg-[#DCFCE7] text-[#166534] dark:bg-[#14532D] dark:text-[#BBF7D0]';

/** The landing page's worked example, written out one step at a time. */
function ExplainScene({ reduce }: { reduce: boolean }) {
  const steps = ['y = 2x + b', '5 = 2(1) + b'];
  return (
    <div className="flex h-full flex-col justify-center gap-3 px-5 text-left">
      <motion.p {...fade(reduce, 0.1)} className="text-[15px] leading-snug">A line with slope 2 passes through (1, 5). Where does it cross the y-axis?</motion.p>
      <ol className="space-y-1.5 font-mono text-sm text-slate-500 dark:text-slate-400">
        {steps.map((s, i) => <motion.li key={s} {...fade(reduce, 0.5 + i * 0.35, 'translateX(-6px)')}>{i + 1}. {s}</motion.li>)}
        <motion.li {...fade(reduce, 1.25)} className={`inline-block rounded-full px-2.5 font-semibold ${ANSWER}`}>3. b = 3</motion.li>
      </ol>
    </div>
  );
}

/** Free's 30 Math questions running up to all 1,425, then the 800 tag. */
function QuestionsScene({ reduce }: { reduce: boolean }) {
  const n = useCount(30, 1425, 0.2, reduce, 1.2);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <p className="font-chillax text-6xl font-semibold tabular-nums tracking-tight">{n.toLocaleString('en-US')}</p>
      <div className="w-3/4 space-y-2">
        {['Easy', 'Medium', 'Hard'].map((l, i) => (
          <div key={l} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="w-14 text-left">{l}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10">
              <motion.div className="h-full origin-left rounded-full bg-[#1470E7] dark:bg-[#73AEF8]"
                initial={{ transform: reduce ? 'scaleX(1)' : 'scaleX(0.05)' }} animate={{ transform: 'scaleX(1)' }}
                transition={{ delay: reduce ? 0 : 0.3 + i * 0.12, duration: 0.9, ease: EASE_OUT }} />
            </div>
          </div>
        ))}
      </div>
      <motion.span {...fade(reduce, 1.35)} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-400/15 dark:text-amber-300">Built for 800</motion.span>
    </div>
  );
}

/** Free's "10 runs a day" is struck through and becomes infinity; the three speed stars follow. */
function SpeedScene({ reduce }: { reduce: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <div className="relative text-base text-slate-500 dark:text-slate-400">
        10 runs a day
        <motion.span aria-hidden className="absolute left-0 right-0 top-1/2 h-px origin-left bg-slate-500 dark:bg-slate-400"
          initial={{ transform: reduce ? 'scaleX(1)' : 'scaleX(0)' }} animate={{ transform: 'scaleX(1)' }}
          transition={{ delay: reduce ? 0 : 0.4, duration: 0.35, ease: EASE_OUT }} />
      </div>
      <motion.div className={INK} {...fade(reduce, 0.8, 'scale(0.92)')}>
        <InfinityIcon className="h-20 w-20" strokeWidth={2} />
      </motion.div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => <motion.span key={i} {...fade(reduce, 1.15 + i * 0.1)}><Star className="h-5 w-5 fill-amber-400 text-amber-400" /></motion.span>)}
      </div>
    </div>
  );
}

/** A fan of test papers; their locks open one after another. */
function TestsScene({ reduce }: { reduce: boolean }) {
  const tilt = [-9, -3, 3, 9];
  return (
    <div className="flex h-full items-center justify-center">
      {tilt.map((r, i) => (
        <motion.div key={r} className="-mx-3 flex h-36 w-24 flex-col rounded-xl border border-slate-200 bg-white p-2.5 shadow-[0_10px_24px_-14px_rgba(15,23,42,0.4)] dark:border-white/10 dark:bg-[#232A3D]"
          initial={{ opacity: 0, transform: reduce ? `rotate(${r}deg)` : 'translateY(16px) rotate(0deg)' }}
          animate={{ opacity: 1, transform: `rotate(${r}deg)` }}
          transition={{ delay: reduce ? 0 : 0.1 + i * 0.08, duration: 0.45, ease: EASE_OUT }}>
          <div className="h-1.5 w-12 rounded-full bg-slate-300 dark:bg-white/25" />
          <div className="mt-1.5 h-1.5 w-14 rounded-full bg-slate-200 dark:bg-white/15" />
          <div className="mt-1 h-1.5 w-9 rounded-full bg-slate-200 dark:bg-white/15" />
          <div className="mt-1 h-1.5 w-12 rounded-full bg-slate-200 dark:bg-white/15" />
          <div className="mt-auto grid place-items-center"><Unlock reduce={reduce} delay={0.75 + i * 0.2} /></div>
        </motion.div>
      ))}
    </div>
  );
}

/** A lock that opens at `delay`, crossfading grey to green. */
function Unlock({ reduce, delay, size = 'h-8 w-8' }: { reduce: boolean; delay: number; size?: string }) {
  const open = useAfter(delay, reduce);
  return (
    <span className={`grid ${size} place-items-center rounded-full transition-colors duration-300 ${open ? ANSWER : 'bg-slate-100 text-slate-400 dark:bg-white/10 dark:text-slate-500'}`}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={open ? 'o' : 's'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          {open ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/**
 * A small piece of the concept videos map (TopicMap): a winding path of lessons in the map's node style, the first
 * watched, the next to start, the rest unlocking, the chest at the end, and the topic's own line figure beside it.
 */
function MapScene({ reduce }: { reduce: boolean }) {
  const figure = topicFigures(1, 'Algebra')[0];
  const lean = [0, 1.6, 2.2, 1.6]; // the map's zig-zag, smaller
  return (
    <div className="sky-unit relative flex h-full items-center justify-center gap-3 px-3" style={{ '--unit-light': '#3B8DF5' } as React.CSSProperties}>
      <div className="flex flex-col items-center gap-2.5">
        {/* The lean sits on a plain wrapper: the motion below animates transform and would wipe it. */}
        {lean.map((x, i) => (
          <div key={i} style={{ transform: `translateX(${x - 1.1}rem)` }}>
            <motion.div className="relative" {...fade(reduce, 0.1 + i * 0.1)}>
              {i === 1 && (
                <motion.span {...fade(reduce, 0.6)} className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#3B8DF5] bg-white px-2 text-[11px] font-semibold text-slate-900">Start</motion.span>
              )}
              {i < 2
                ? <span className="sky-node grid h-11 w-11 place-items-center rounded-full">{i === 0 ? <Check className="h-5 w-5" strokeWidth={3} /> : <Play className="h-5 w-5 translate-x-0.5 fill-current" />}</span>
                : <Unlock reduce={reduce} delay={0.8 + (i - 2) * 0.3} size="h-11 w-11" />}
            </motion.div>
          </div>
        ))}
        <div style={{ transform: 'translateX(-1.1rem)' }}>
          <motion.div {...fade(reduce, 1.4)}><Chest open className="h-9 w-10 text-[color:var(--unit)]" /></motion.div>
        </div>
      </div>
      {figure && (
        <motion.div {...fade(reduce, 0.45, 'translateX(8px)')}>
          <HairlineFigure figure={figure} play className="sky-hairline w-36 rounded-2xl" />
        </motion.div>
      )}
    </div>
  );
}
