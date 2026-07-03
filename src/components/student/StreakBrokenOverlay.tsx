import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { STREAK_BROKEN_EVENT, type StreakBrokenDetail } from '@/hooks/useStudentStreak';

const SHARDS = [
  { x: -140, y: -110, r: -60 },
  { x: 130, y: -120, r: 55 },
  { x: -170, y: 40, r: -30 },
  { x: 160, y: 60, r: 45 },
  { x: -60, y: 160, r: -20 },
  { x: 70, y: 170, r: 25 },
  { x: 0, y: -180, r: 0 },
  { x: 0, y: 200, r: 10 },
];

export function StreakBrokenOverlay() {
  const [detail, setDetail] = useState<StreakBrokenDetail | null>(null);
  const [phase, setPhase] = useState<'idle' | 'shutter' | 'shatter' | 'message'>('idle');
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent<StreakBrokenDetail>).detail;
      if (!d || d.lostStreak < 2) return;
      setDetail(d);
      setPhase('shutter');
      try {
        (navigator as any).vibrate?.([80, 40, 200]);
      } catch {
        /* noop */
      }
    };
    window.addEventListener(STREAK_BROKEN_EVENT, handler);
    return () => window.removeEventListener(STREAK_BROKEN_EVENT, handler);
  }, []);

  // Sequence timer
  useEffect(() => {
    if (phase === 'idle') return;
    if (reduced) {
      setPhase('message');
      return;
    }
    const timers: number[] = [];
    if (phase === 'shutter') {
      timers.push(window.setTimeout(() => setPhase('shatter'), 700));
    }
    if (phase === 'shatter') {
      timers.push(window.setTimeout(() => setPhase('message'), 1200));
    }
    return () => timers.forEach(clearTimeout);
  }, [phase, reduced]);

  // Body desaturation during the effect
  useEffect(() => {
    if (phase === 'idle' || reduced) return;
    const prev = document.body.style.filter;
    document.body.style.filter = 'grayscale(0.35) contrast(1.05)';
    document.body.style.transition = 'filter 400ms ease';
    return () => {
      document.body.style.filter = prev;
    };
  }, [phase, reduced]);

  const close = () => {
    setDetail(null);
    setPhase('idle');
  };

  if (!detail || phase === 'idle') return null;

  return (
    <AnimatePresence>
      <motion.div
        key="streak-broken"
        className="fixed inset-0 z-[80] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={phase === 'message' ? close : undefined}
      >
        {/* Vignette + backdrop */}
        <motion.div
          className="absolute inset-0"
          initial={{ backgroundColor: 'rgba(0,0,0,0)' }}
          animate={{ backgroundColor: 'rgba(8,4,6,0.94)' }}
          transition={{ duration: 0.5 }}
          style={{
            backgroundImage:
              'radial-gradient(circle at center, rgba(120,20,30,0.35) 0%, rgba(0,0,0,0.95) 70%)',
          }}
        />

        {/* Shutter bars (frame going out) */}
        {!reduced && (
          <>
            <motion.div
              className="absolute left-0 right-0 top-0 h-1/2 bg-black"
              initial={{ y: '-100%' }}
              animate={{ y: phase === 'shutter' ? '-72%' : '-82%' }}
              transition={{ duration: 0.55, ease: [0.7, 0, 0.3, 1] }}
            />
            <motion.div
              className="absolute left-0 right-0 bottom-0 h-1/2 bg-black"
              initial={{ y: '100%' }}
              animate={{ y: phase === 'shutter' ? '72%' : '82%' }}
              transition={{ duration: 0.55, ease: [0.7, 0, 0.3, 1] }}
            />
            <motion.div
              className="absolute top-0 bottom-0 left-0 w-1/2 bg-black"
              initial={{ x: '-100%' }}
              animate={{ x: phase === 'shutter' ? '-78%' : '-88%' }}
              transition={{ duration: 0.55, ease: [0.7, 0, 0.3, 1] }}
            />
            <motion.div
              className="absolute top-0 bottom-0 right-0 w-1/2 bg-black"
              initial={{ x: '100%' }}
              animate={{ x: phase === 'shutter' ? '78%' : '88%' }}
              transition={{ duration: 0.55, ease: [0.7, 0, 0.3, 1] }}
            />
          </>
        )}

        {/* Center content wrapper (shakes) */}
        <motion.div
          className="relative flex flex-col items-center justify-center px-6 text-center"
          animate={
            reduced
              ? undefined
              : phase === 'shutter'
              ? { x: [0, -8, 9, -6, 7, -4, 0], y: [0, 4, -5, 3, -2, 0] }
              : { x: 0, y: 0 }
          }
          transition={{ duration: 0.6 }}
        >
          {/* Flame */}
          <div className="relative w-40 h-40 mb-6">
            {/* Ignition */}
            <AnimatePresence>
              {phase === 'shutter' && (
                <motion.div
                  key="ignition"
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1.1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                >
                  <Flame
                    className="w-32 h-32 drop-shadow-[0_0_40px_rgba(255,120,40,0.85)]"
                    style={{ color: '#ff7a2b', fill: 'rgba(255,120,40,0.35)' }}
                    strokeWidth={1.8}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Grey flame that shatters */}
            <AnimatePresence>
              {(phase === 'shatter' || phase === 'message') && (
                <motion.div
                  key="grey-flame"
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ scale: 1.1, opacity: 1 }}
                  animate={{ opacity: phase === 'message' ? 0 : 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Flame
                    className="w-32 h-32"
                    style={{ color: '#5a5a5f', fill: 'rgba(90,90,95,0.25)' }}
                    strokeWidth={1.8}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Shards flying outward */}
            {phase === 'shatter' &&
              !reduced &&
              SHARDS.map((s, i) => (
                <motion.span
                  key={i}
                  className="absolute left-1/2 top-1/2 block w-4 h-4"
                  style={{
                    background:
                      'linear-gradient(135deg, #6a6a70 0%, #303035 100%)',
                    clipPath:
                      i % 2 === 0
                        ? 'polygon(0 0, 100% 20%, 80% 100%, 10% 70%)'
                        : 'polygon(20% 0, 100% 40%, 60% 100%, 0 60%)',
                    marginLeft: -8,
                    marginTop: -8,
                  }}
                  initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                  animate={{
                    x: s.x,
                    y: s.y + 60,
                    rotate: s.r * 3,
                    opacity: 0,
                  }}
                  transition={{ duration: 1.1, ease: [0.2, 0.6, 0.4, 1] }}
                />
              ))}

            {/* Ember fallout */}
            {phase === 'shatter' &&
              !reduced &&
              Array.from({ length: 10 }).map((_, i) => (
                <motion.span
                  key={`ember-${i}`}
                  className="absolute left-1/2 top-1/2 w-1 h-1 rounded-full bg-neutral-500"
                  initial={{ x: (Math.random() - 0.5) * 40, y: 0, opacity: 0.8 }}
                  animate={{
                    x: (Math.random() - 0.5) * 200,
                    y: 220 + Math.random() * 80,
                    opacity: 0,
                  }}
                  transition={{
                    duration: 1.2 + Math.random() * 0.4,
                    ease: 'easeIn',
                    delay: Math.random() * 0.2,
                  }}
                />
              ))}
          </div>

          {/* Message */}
          <AnimatePresence>
            {phase === 'message' && (
              <motion.div
                key="msg"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="max-w-sm"
              >
                <div className="text-[11px] uppercase tracking-[0.3em] text-red-400/80 mb-3">
                  Streak broken
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  You lost your{' '}
                  <span className="text-red-400">{detail.lostStreak}-day</span>{' '}
                  streak
                </h2>
                <p className="text-sm text-neutral-400 mb-6">
                  The flame went out. Start again today and build it back stronger.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      close();
                    }}
                    className="px-4 py-2 rounded-full text-sm text-neutral-300 hover:text-white transition-colors"
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      close();
                      navigate('/practice');
                    }}
                    className="px-5 py-2.5 rounded-full text-sm font-semibold bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-red-500/30 hover:scale-[1.03] active:scale-95 transition-transform"
                  >
                    Start over
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
