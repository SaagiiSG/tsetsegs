import { useEffect, useState } from 'react';
import { motion, useMotionValueEvent, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import cloudsFar from '@/assets/landing/05-clouds-far.svg';
import cloudsMid from '@/assets/landing/06-clouds-mid.svg';
import cloudsNear from '@/assets/landing/07-clouds-near.svg';

/* The onboarding sky: drifting cloud layers, a flower that blooms with the student's answers, and numbers that roll. */

// Back and front rings of petals, as signed angles from straight up. Each list is drawn sides first, so the top petal ends up in front.
const BACK = [180, -120, 120, -60, 60, 0];
const FRONT = [-150, 150, -90, 90, -30, 30];
const petal = (l: number) => { const w = l * 0.5; return `M0 0C${w} ${-l * 0.2} ${w} ${-l * 0.75} 0 ${-l}C${-w} ${-l * 0.75} ${-w} ${-l * 0.2} 0 0Z`; };
const BACK_PETAL = petal(48), FRONT_PETAL = petal(34);
const tint = (pct: number) => `color-mix(in srgb, hsl(var(--primary)) ${pct}%, white)`;

/** How far one petal has opened at bloom `b`: the lower petals start first (`lag` 0) and every petal is fully open at 1. */
const opened = (b: number, lag: number) => Math.max(0, (b - lag) / (1 - lag));

/** A flat flower in the portal's primary colour. `bloom` 0 is a closed bud, 1 full bloom; it springs between values.
 *  `nod` pulses the head once each time it changes, so a pick that lands on the same value still answers. */
export function Flower({ bloom, nod = 0, stem = true, className }: { bloom: number; nod?: number; stem?: boolean; className?: string }) {
  const reduce = useReducedMotion();
  const spring = useSpring(bloom, { stiffness: 170, damping: 19 });
  const [b, setB] = useState(bloom);
  useMotionValueEvent(spring, 'change', setB);
  useEffect(() => { if (reduce) { spring.jump(bloom); setB(bloom); } else spring.set(bloom); }, [bloom, reduce, spring]);

  const ring = (angles: number[], d: string, fill: string, lag: number) => angles.map(a => {
    const e = opened(b, lag + 0.14 * (1 - Math.abs(a) / 180));
    // The bottom petal can't fan to one side without tilting the flower, so it grows down from behind instead.
    const t = a === 180 ? `rotate(180) scale(${Math.min(opened(b, 0.45), 1.1)})` : `rotate(${a * (0.02 + 0.98 * e)}) scale(${0.7 + 0.3 * Math.min(e, 1.1)})`;
    return <path key={a} d={d} fill={fill} transform={t} />;
  });
  const centre = Math.min(1, opened(b, 0.55));
  return (
    <svg viewBox={stem ? '-62 -62 124 212' : '-58 -58 116 116'} className={`onb-flower ${className ?? ''}`} aria-hidden>
      {stem && <g fill={tint(55)}>
        <path d="M0 4C7 44-6 96 2 150" fill="none" stroke={tint(70)} strokeWidth={6} strokeLinecap="round" />
        <path d="M2 70C16 50 40 46 52 52C42 68 20 76 2 70Z" />
        <path d="M0 100C-14 82-38 78-50 84C-40 100-18 108 0 100Z" fill={tint(42)} />
      </g>}
      {/* Keyed by nod: remounting the head replays its one-off .onb-nod pulse. */}
      <g key={nod} className={nod ? 'onb-nod' : undefined}>
        {ring(BACK, BACK_PETAL, tint(48), 0)}
        {ring(FRONT, FRONT_PETAL, 'hsl(var(--primary))', 0.08)}
        <circle r={9 * centre} fill={tint(24)} />
      </g>
    </svg>
  );
}

/** An integer that springs to each new value, so 1300 rolls to 1450 instead of snapping. `duration` (s) slows it into a count. */
export function RollingNumber({ value, from, duration }: { value: number; from?: number; duration?: number }) {
  const reduce = useReducedMotion();
  const spring = useSpring(reduce ? value : from ?? value, duration ? { visualDuration: duration, bounce: 0 } : { stiffness: 120, damping: 22 });
  useEffect(() => { if (reduce) spring.jump(value); else spring.set(value); }, [value, reduce, spring]);
  const text = useTransform(spring, v => String(Math.round(v)));
  return <motion.span className="tabular-nums">{text}</motion.span>;
}

// Far to near: the nearer a layer, the faster it drifts and the further it slides per step (parallax).
const LAYERS = [['far', cloudsFar, 0.4], ['mid', cloudsMid, 0.8], ['near', cloudsNear, 0.9]] as const;
export const PART = { duration: 0.75, ease: [0.32, 0.72, 0, 1] } as const;
// The halves slide the whole time and only fade near the end, so the clouds read as parting, not vanishing.
const PART_HALF = { ...PART, opacity: { duration: 0.3, delay: 0.45 } } as const;

/** Cloud layers for the sky. `step` slides them a little per step; `parting` slides each layer's two halves apart for
 *  the finish. Layers sit at z 0/10/30 so a flower at z 20 grows out of the clouds. */
export function SkyClouds({ step, parting }: { step: number; parting: boolean }) {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden className="onb-clouds">
      {LAYERS.map(([name, src, depth]) => (
        <motion.div key={name} className={`onb-cloud is-${name}`} initial={false} animate={{ x: reduce ? '0%' : `${-(step - 1) * depth}%` }}
          transition={{ type: 'spring', stiffness: 40, damping: 16 }}>
          <div className="onb-drift">
            {['l', 'r'].map(half => (
              <motion.img key={half} src={src} alt="" className={`is-${half}`} initial={false} transition={PART_HALF}
                animate={parting && !reduce ? { x: half === 'l' ? '-55%' : '55%', opacity: 0 } : { x: '0%', opacity: 1 }} />
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
