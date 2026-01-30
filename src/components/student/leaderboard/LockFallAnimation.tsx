import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

interface LockFallAnimationProps {
  isShaking: boolean;
  isFalling: boolean;
  color: string;
}

export function LockFallAnimation({ isShaking, isFalling, color }: LockFallAnimationProps) {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
      initial={{ opacity: 1 }}
      animate={
        isFalling
          ? {
              y: [0, 20, 80, 200, 400],
              rotate: [0, 5, 15, 30, 45],
              opacity: [1, 1, 0.8, 0.4, 0],
            }
          : isShaking
          ? { x: [-3, 3, -3, 3, -2, 2, 0] }
          : { y: [0, -3, 0, -3, 0] }
      }
      transition={
        isFalling
          ? {
              duration: 0.8,
              ease: [0.45, 0, 0.55, 1], // Custom easing for gravity feel
            }
          : isShaking
          ? { duration: 0.4, ease: 'easeInOut' }
          : { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
      }
    >
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          boxShadow: `0 0 30px ${color}40`,
        }}
      >
        <Lock className="w-10 h-10" style={{ color }} />
      </div>
    </motion.div>
  );
}
