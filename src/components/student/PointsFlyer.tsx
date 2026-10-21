import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

/** Fire after the server paid points; the header chip animates them in. */
export function emitPointsEarned(points: number) {
  if (points > 0) window.dispatchEvent(new CustomEvent('student-points-earned', { detail: { points } }));
}

interface Flyer { id: number; points: number; from: { x: number; y: number }; to: { x: number; y: number } }

/** Renders "+N" bubbles flying from the last tap to `targetRef`, then calls onArrive. */
export function PointsFlyer({ targetRef, onLaunch, onArrive }: { targetRef: React.RefObject<HTMLElement>; onLaunch: () => void; onArrive: (points: number) => void }) {
  const [flyers, setFlyers] = useState<Flyer[]>([]);
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

  return createPortal(
    <AnimatePresence>
      {flyers.map(f => (
        <motion.div
          key={f.id}
          className="pointer-events-none fixed left-0 top-0 z-[100] rounded-full bg-emerald-500 px-2.5 py-1 font-mono text-sm font-bold text-primary-foreground shadow-lg"
          initial={{ x: f.from.x - 20, y: f.from.y - 14, scale: 0.4, opacity: 0 }}
          animate={{
            x: [f.from.x - 20, f.from.x - 20, f.to.x - 20],
            y: [f.from.y - 14, f.from.y - 60, f.to.y - 14],
            scale: [0.4, 1.25, 0.6],
            opacity: [0, 1, 1],
          }}
          exit={{ opacity: 0, scale: 0.2 }}
          transition={{ duration: 0.75, times: [0, 0.3, 1], ease: [0.22, 1, 0.36, 1] }}
          onAnimationComplete={() => { setFlyers(list => list.filter(x => x.id !== f.id)); onArrive(f.points); }}
        >
          +{f.points}
        </motion.div>
      ))}
    </AnimatePresence>,
    document.body,
  );
}
