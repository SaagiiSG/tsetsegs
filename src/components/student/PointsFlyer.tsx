import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

/** Fire after the server paid points; the header chip animates them in. */
export function emitPointsEarned(points: number) {
  if (points > 0) window.dispatchEvent(new CustomEvent('student-points-earned', { detail: { points } }));
}

type Pt = { x: number; y: number };
interface Flyer { id: number; points: number; from: Pt; hover: Pt; to: Pt }
interface Burst { id: number; at: Pt }

const RISE = 0.25, HOLD = 0.15, FLY = 0.35;
const TOTAL = RISE + HOLD + FLY;

/** Pop out of the Check button, hover above it, then accelerate along a curve into the chip. */
function path(from: Pt, hover: Pt, to: Pt) {
  const ctrl = { x: hover.x + (to.x - hover.x) * 0.2 - 60, y: Math.min(hover.y, to.y) - 60 };
  const pts: Pt[] = [from, hover, hover];
  const times = [0, RISE / TOTAL, (RISE + HOLD) / TOTAL];
  for (const t of [0.25, 0.5, 0.75, 1]) {
    const u = 1 - t;
    pts.push({ x: u * u * hover.x + 2 * u * t * ctrl.x + t * t * to.x, y: u * u * hover.y + 2 * u * t * ctrl.y + t * t * to.y });
    times.push((RISE + HOLD + Math.sqrt(t) * FLY) / TOTAL); // accelerates into the chip
  }
  return { pts, times };
}

function Bubble({ f, delay, ghost, onDone }: { f: Flyer; delay: number; ghost?: number; onDone?: () => void }) {
  const { pts, times } = path(f.from, f.hover, f.to);
  const o = ghost ? 0.35 / ghost : 1;
  return (
    <motion.div
      className="pointer-events-none fixed left-0 top-0 z-[100] -translate-x-1/2 -translate-y-1/2 rounded-full bg-success px-3 py-1 font-mono text-base font-bold text-primary-foreground shadow-lg"
      initial={{ x: f.from.x, y: f.from.y, scale: 0.3, opacity: 0 }}
      animate={{
        x: pts.map(q => q.x),
        y: pts.map(q => q.y),
        scale: [0.3, 1.15, 1.15, 0.95, 0.8, 0.65, 0.5],
        opacity: ghost ? [0, 0, 0, o, o, o, o] : [0, 1, 1, 1, 1, 1, 1],
      }}
      transition={{ duration: TOTAL, delay, times, ease: ['easeOut', 'linear', 'linear', 'linear', 'linear', 'linear'] }}
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
  const lastTap = useRef<{ from: Pt; hover: Pt }>({ from: { x: window.innerWidth / 2, y: window.innerHeight / 2 }, hover: { x: window.innerWidth / 2, y: window.innerHeight / 2 - 40 } });
  const reduce = useReducedMotion();

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      // Launch from the pressed button's centre and hover just above it.
      const btn = (e.target as Element | null)?.closest?.('button');
      if (btn) {
        const b = btn.getBoundingClientRect();
        const cx = b.left + b.width / 2;
        lastTap.current = { from: { x: cx, y: b.top + b.height / 2 }, hover: { x: cx, y: b.top - 24 } };
      } else {
        lastTap.current = { from: { x: e.clientX, y: e.clientY }, hover: { x: e.clientX, y: e.clientY - 48 } };
      }
    };
    const onEarn = (e: Event) => {
      const points = (e as CustomEvent).detail?.points ?? 0;
      const el = targetRef.current;
      if (!el || points <= 0) return;
      const r = el.getBoundingClientRect();
      // Skip when the chip is hidden (e.g. its bar is display:none at this width).
      if (r.width === 0 || r.height === 0) return;
      onLaunch();
      if (reduce) { onArrive(points); return; }
      setFlyers(f => [...f, { id: Date.now() + Math.random(), points, ...lastTap.current, to: { x: r.left + r.width / 2, y: r.top + r.height / 2 } }]);
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
