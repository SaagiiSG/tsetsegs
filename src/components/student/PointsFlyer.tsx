import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

/** Fire after the server paid points; the header chip animates them in. */
export function emitPointsEarned(points: number) {
  if (points > 0) window.dispatchEvent(new CustomEvent('student-points-earned', { detail: { points } }));
}

type Pt = { x: number; y: number };
interface Flyer { id: number; points: number; from: Pt; to: Pt }
interface Burst { id: number; at: Pt }

const FLIGHT = 0.42;
const POP = 0.12;

/** Arc path: pop at the tap, then accelerate along a curve into the target. */
function arc(from: Pt, to: Pt) {
  const ctrl = { x: from.x + (to.x - from.x) * 0.2 - 60, y: Math.min(from.y, to.y) - 80 };
  const pts: Pt[] = [from, from];
  for (const t of [0.25, 0.5, 0.75, 1]) {
    const u = 1 - t;
    pts.push({ x: u * u * from.x + 2 * u * t * ctrl.x + t * t * to.x, y: u * u * from.y + 2 * u * t * ctrl.y + t * t * to.y });
  }
  return pts;
}

const TIMES = [0, POP / FLIGHT, 0.5, 0.72, 0.88, 1];

function Bubble({ f, delay, ghost, onDone }: { f: Flyer; delay: number; ghost?: number; onDone?: () => void }) {
  const p = arc(f.from, f.to);
  return (
    <motion.div
      className="pointer-events-none fixed left-0 top-0 z-[100] -translate-x-1/2 -translate-y-1/2 rounded-full bg-success px-2.5 py-1 font-mono text-sm font-bold text-primary-foreground shadow-lg"
      style={{ opacity: ghost ? 0.35 / ghost : 1 }}
      initial={{ x: f.from.x, y: f.from.y, scale: 0 }}
      animate={{
        x: p.map(q => q.x),
        y: p.map(q => q.y),
        scale: ghost ? [0, 1, 0.8, 0.6, 0.45, 0.3] : [0, 1.3, 1.05, 0.9, 0.75, 0.55],
        scaleX: ghost ? undefined : [1, 1, 1, 1, 1, 1.5],
      }}
      transition={{ duration: FLIGHT, delay, times: TIMES, ease: [0.55, 0, 0.9, 0.4] }}
      onAnimationComplete={onDone}
    >
      +{f.points}
    </motion.div>
  );
}

/** Renders "+N" bubbles flying from the last tap to `targetRef`, then calls onArrive. */
export function PointsFlyer({ targetRef, onLaunch, onArrive }: { targetRef: React.RefObject<HTMLElement>; onLaunch: () => void; onArrive: (points: number) => void }) {
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const lastTap = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const reduce = useReducedMotion();

  useEffect(() => {
    const onDown = (e: PointerEvent) => { lastTap.current = { x: e.clientX, y: e.clientY }; };
    const onEarn = (e: Event) => {
      const points = (e as CustomEvent).detail?.points ?? 0;
      const el = targetRef.current;
      if (!el || points <= 0) return;
      const r = el.getBoundingClientRect();
      onLaunch();
      if (reduce) { onArrive(points); return; }
      setFlyers(f => [...f, { id: Date.now() + Math.random(), points, from: lastTap.current, to: { x: r.left + r.width / 2, y: r.top + r.height / 2 } }]);
    };
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('student-points-earned', onEarn);
    return () => {
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('student-points-earned', onEarn);
    };
  }, [targetRef, onLaunch, onArrive, reduce]);

  const land = (f: Flyer) => {
    setFlyers(list => list.filter(x => x.id !== f.id));
    setBursts(b => [...b, { id: f.id, at: f.to }]);
    window.setTimeout(() => setBursts(b => b.filter(x => x.id !== f.id)), 500);
    onArrive(f.points);
  };

  return createPortal(
    <>
      <AnimatePresence>
        {flyers.map(f => (
          <div key={f.id}>
            {[3, 2, 1].map(g => <Bubble key={g} f={f} ghost={g} delay={g * 0.03} />)}
            <Bubble f={f} delay={0} onDone={() => land(f)} />
          </div>
        ))}
      </AnimatePresence>
      {bursts.map(b => (
        <div key={b.id}>
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return (
              <motion.span
                key={i}
                className="pointer-events-none fixed left-0 top-0 z-[100] h-1.5 w-1.5 rounded-full bg-success"
                initial={{ x: b.at.x, y: b.at.y, scale: 1, opacity: 1 }}
                animate={{ x: b.at.x + Math.cos(a) * 28, y: b.at.y + Math.sin(a) * 28, scale: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            );
          })}
        </div>
      ))}
    </>,
    document.body,
  );
}
