import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Flame, Sparkles, Snowflake, Zap, Award } from 'lucide-react';

interface StreakExtendedToastProps {
  open: boolean;
  streak: number;
  isNew?: boolean;
  xpEarned?: number;
  freezerEarned?: boolean;
  freezerUsed?: boolean;
  milestonesUnlocked?: { days: number; badgeName: string; awardsFreezer: boolean }[];
  onClose: () => void;
}

export function StreakExtendedToast({
  open, streak, isNew, xpEarned = 0, freezerEarned, freezerUsed, milestonesUnlocked = [], onClose,
}: StreakExtendedToastProps) {
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    setVisible(open);
    if (!open) return;
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 3400);
    return () => clearTimeout(t);
  }, [open, onClose]);

  const handleClick = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClick}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-sm cursor-pointer"
        >
          <motion.div
            initial={{ scale: 0.6, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            className="relative rounded-3xl bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 p-8 md:p-10 text-center shadow-2xl shadow-orange-500/40 max-w-sm mx-4"
          >
            {[...Array(8)].map((_, i) => {
              const angle = (i / 8) * Math.PI * 2;
              const radius = 110;
              return (
                <motion.div
                  key={i}
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                  animate={{
                    x: Math.cos(angle) * radius,
                    y: Math.sin(angle) * radius,
                    opacity: [0, 1, 0],
                    scale: [0, 1.2, 0],
                  }}
                  transition={{ duration: 1.6, delay: 0.2 + i * 0.05, repeat: Infinity, repeatDelay: 0.8 }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                >
                  <Sparkles className="w-4 h-4 text-yellow-200 drop-shadow" />
                </motion.div>
              );
            })}

            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.15 }}
              className="mx-auto mb-3 w-24 h-24 rounded-full bg-white/15 backdrop-blur flex items-center justify-center"
            >
              <motion.div
                animate={{ scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Flame className="w-14 h-14 text-white drop-shadow-lg" strokeWidth={2.5} />
              </motion.div>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="text-2xl md:text-3xl font-extrabold text-white tracking-tight"
            >
              {isNew ? 'Streak started!' : 'Streak extended!'}
            </motion.h2>

            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45, type: 'spring', stiffness: 300 }}
              className="mt-2 text-5xl md:text-6xl font-black text-white font-mono"
            >
              {streak}
            </motion.div>
            <p className="text-white/90 text-sm font-medium uppercase tracking-widest">
              {streak === 1 ? 'day' : 'days'} in a row
            </p>

            {/* Rewards stack */}
            <div className="mt-4 space-y-1.5">
              {xpEarned > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur text-white font-bold font-mono text-sm"
                >
                  <Zap className="w-4 h-4 fill-yellow-300 text-yellow-300" />
                  +{xpEarned} XP
                </motion.div>
              )}
              {freezerUsed && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="flex items-center justify-center gap-1.5 text-white text-xs font-semibold"
                >
                  <Snowflake className="w-3.5 h-3.5" />
                  Freezer used — yesterday covered
                </motion.div>
              )}
              {freezerEarned && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-400/30 border border-sky-200/40 text-white font-bold text-xs"
                >
                  <Snowflake className="w-3.5 h-3.5" />
                  +1 Streak Freezer
                </motion.div>
              )}
              {milestonesUnlocked.map((m, idx) => (
                <motion.div
                  key={m.days}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 + idx * 0.1 }}
                  className="flex items-center justify-center gap-1.5 text-white text-xs font-semibold"
                >
                  <Award className="w-3.5 h-3.5 text-yellow-200" />
                  Badge unlocked: {m.badgeName}
                </motion.div>
              ))}
            </div>

            {milestonesUnlocked.length === 0 && !freezerEarned && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="mt-3 text-white/80 text-xs"
              >
                Come back tomorrow to keep it going.
              </motion.p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
