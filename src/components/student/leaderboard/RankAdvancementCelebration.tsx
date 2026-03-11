import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronRight, Gift } from 'lucide-react';
import CountUp from 'react-countup';
import { Button } from '@/components/ui/button';
import { TierType, TIER_COLORS, TIER_DISPLAY_NAMES, BadgeDefinition } from '@/data/badgeDefinitions';
import { LockFallAnimation } from './LockFallAnimation';
import * as LucideIcons from 'lucide-react';

type CelebrationPhase = 
  | 'darkening'
  | 'rank-reveal'
  | 'waiting-next'
  | 'badge-locked'
  | 'lock-shaking'
  | 'lock-falling'
  | 'unlocked';

interface RankAdvancementCelebrationProps {
  isOpen: boolean;
  onComplete: () => void;
  previousTier: TierType;
  newTier: TierType;
  pointsEarned: number;
  sprintNumber: number;
  seasonNumber: number;
  badge: BadgeDefinition | null;
}

// Particle burst component
function ParticleBurst({ color, isActive }: { color: string; isActive: boolean }) {
  if (!isActive) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      {[...Array(30)].map((_, i) => {
        const angle = (i / 30) * 360;
        const distance = 100 + Math.random() * 100;
        const x = Math.cos((angle * Math.PI) / 180) * distance;
        const y = Math.sin((angle * Math.PI) / 180) * distance;
        
        return (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full"
            style={{ backgroundColor: color }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x, y, opacity: 0, scale: 0 }}
            transition={{ duration: 0.8, delay: i * 0.02, ease: 'easeOut' }}
          />
        );
      })}
    </div>
  );
}

export function RankAdvancementCelebration({
  isOpen,
  onComplete,
  previousTier,
  newTier,
  pointsEarned,
  sprintNumber,
  seasonNumber,
  badge,
}: RankAdvancementCelebrationProps) {
  const [phase, setPhase] = useState<CelebrationPhase>('darkening');
  const [showParticles, setShowParticles] = useState(false);
  
  const tierColor = TIER_COLORS[newTier];
  const tierName = TIER_DISPLAY_NAMES[newTier];

  // Get badge icon component
  const getBadgeIcon = useCallback(() => {
    if (!badge) return null;
    const IconComponent = (LucideIcons as any)[badge.iconName];
    return IconComponent ? <IconComponent className="w-16 h-16" style={{ color: tierColor }} /> : null;
  }, [badge, tierColor]);

  // Reset phase when opened
  useEffect(() => {
    if (isOpen) {
      setPhase('darkening');
      setShowParticles(false);
    }
  }, [isOpen]);

  // Phase transitions
  useEffect(() => {
    if (!isOpen) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    if (phase === 'darkening') {
      timers.push(setTimeout(() => setPhase('rank-reveal'), 600));
    } else if (phase === 'rank-reveal') {
      timers.push(setTimeout(() => setPhase('waiting-next'), 2500));
    } else if (phase === 'badge-locked') {
      timers.push(setTimeout(() => setPhase('lock-shaking'), 2000));
    } else if (phase === 'lock-shaking') {
      timers.push(setTimeout(() => setPhase('lock-falling'), 400));
    } else if (phase === 'lock-falling') {
      timers.push(setTimeout(() => {
        setShowParticles(true);
        setPhase('unlocked');
      }, 800));
    }

    return () => timers.forEach(clearTimeout);
  }, [isOpen, phase]);

  const handleNext = useCallback(() => {
    if (badge) {
      setPhase('badge-locked');
    } else {
      onComplete();
    }
  }, [badge, onComplete]);

  const hasBadge = badge !== null;
  const showBadgePhases = ['badge-locked', 'lock-shaking', 'lock-falling', 'unlocked'].includes(phase);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ backgroundColor: 'rgba(0, 0, 0, 0)' }}
          animate={{ backgroundColor: 'rgba(0, 0, 0, 1)' }}
          exit={{ backgroundColor: 'rgba(0, 0, 0, 0)' }}
          transition={{ duration: 0.5 }}
        >
          {/* Rank Reveal Phase */}
          <AnimatePresence mode="wait">
            {!showBadgePhases && (
              <motion.div
                key="rank-reveal"
                className="text-center space-y-8 px-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.5 }}
              >
                {/* Radial glow */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: phase !== 'darkening' ? 1 : 0 }}
                  transition={{ duration: 1 }}
                  style={{
                    background: `radial-gradient(circle at 50% 40%, ${tierColor}30, transparent 50%)`,
                  }}
                />

                {/* Sparkles floating */}
                {phase !== 'darkening' && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {[...Array(12)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute"
                        style={{
                          left: `${10 + Math.random() * 80}%`,
                          top: `${10 + Math.random() * 80}%`,
                        }}
                        initial={{ scale: 0, rotate: 0 }}
                        animate={{
                          scale: [0, 1, 0],
                          rotate: [0, 180, 360],
                        }}
                        transition={{
                          duration: 2.5,
                          delay: i * 0.15,
                          repeat: Infinity,
                          repeatDelay: 1,
                        }}
                      >
                        <Sparkles className="h-4 w-4" style={{ color: tierColor }} />
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {/* "You've Advanced!" text */}
                <motion.p
                  className="text-lg text-white/70 tracking-widest uppercase"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: phase !== 'darkening' ? 1 : 0, y: phase !== 'darkening' ? 0 : 20 }}
                  transition={{ delay: 0.3, duration: 0.8 }}
                >
                  You've Advanced!
                </motion.p>

                {/* Tier name */}
                <motion.h1
                  className="text-6xl md:text-8xl font-black tracking-tight"
                  style={{ color: tierColor }}
                  initial={{ opacity: 0, scale: 0.8, y: 30 }}
                  animate={{ 
                    opacity: phase !== 'darkening' ? 1 : 0, 
                    scale: phase !== 'darkening' ? 1 : 0.8, 
                    y: phase !== 'darkening' ? 0 : 30 
                  }}
                  transition={{ delay: 0.5, type: 'spring', damping: 15, stiffness: 100 }}
                >
                  {tierName.toUpperCase()}
                </motion.h1>

                {/* Points counter */}
                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: phase !== 'darkening' ? 1 : 0, y: phase !== 'darkening' ? 0 : 20 }}
                  transition={{ delay: 1, duration: 0.6 }}
                >
                  <p className="text-white/50 text-sm">Points Earned This Sprint</p>
                  <p className="text-4xl font-bold text-white">
                    <CountUp 
                      end={pointsEarned} 
                      duration={2} 
                      separator="," 
                      delay={1.2}
                    />
                  </p>
                </motion.div>

                {/* Season info */}
                <motion.p
                  className="text-white/40 text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: phase !== 'darkening' ? 1 : 0 }}
                  transition={{ delay: 1.5, duration: 0.6 }}
                >
                  Season {seasonNumber} • Sprint {sprintNumber}
                </motion.p>

                {/* Next button */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: phase === 'waiting-next' ? 1 : 0 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                >
                  <Button
                    variant="ghost"
                    className="group mt-8 px-8 py-6 rounded-full border transition-all duration-300"
                    style={{
                      borderColor: `${tierColor}60`,
                      color: tierColor,
                      opacity: hasBadge ? 0.8 : 0.6,
                    }}
                    onClick={handleNext}
                  >
                    <motion.span
                      animate={{ scale: [1, 1.03, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="flex items-center gap-2"
                    >
                      {hasBadge ? 'Claim Badge' : 'Continue'}
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </motion.span>
                  </Button>
                </motion.div>
              </motion.div>
            )}

            {/* Badge Unlock Phase */}
            {showBadgePhases && badge && (
              <motion.div
                key="badge-unlock"
                className="text-center space-y-8 px-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                {/* Badge container with glow */}
                <motion.div
                  className="relative mx-auto w-40 h-40"
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: 1,
                    scale: phase === 'unlocked' ? [1, 1.15, 1.05] : 1,
                  }}
                  transition={{ 
                    opacity: { duration: 2 },
                    scale: { duration: 0.5, times: [0, 0.5, 1] },
                  }}
                >
                  {/* Glow effect behind badge */}
                  <motion.div
                    className="absolute inset-0 rounded-full blur-xl"
                    style={{ backgroundColor: tierColor }}
                    initial={{ opacity: 0.2 }}
                    animate={{ opacity: phase === 'unlocked' ? 0.6 : 0.2 }}
                    transition={{ duration: 0.5 }}
                  />
                  
                  {/* Badge circle */}
                  <motion.div
                    className="relative w-full h-full rounded-full flex items-center justify-center border-4"
                    style={{
                      borderColor: tierColor,
                      backgroundColor: `${tierColor}15`,
                      boxShadow: phase === 'unlocked' 
                        ? `0 0 60px ${tierColor}60, 0 0 100px ${tierColor}30`
                        : `0 0 30px ${tierColor}30`,
                    }}
                  >
                    {getBadgeIcon()}
                  </motion.div>

                  {/* Lock overlay */}
                  {['badge-locked', 'lock-shaking', 'lock-falling'].includes(phase) && (
                    <LockFallAnimation
                      color={tierColor}
                      isShaking={phase === 'lock-shaking'}
                      isFalling={phase === 'lock-falling'}
                    />
                  )}

                  {/* Particle burst */}
                  <ParticleBurst color={tierColor} isActive={showParticles} />
                </motion.div>

                {/* Badge info - appears after unlock */}
                <motion.div
                  className="space-y-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: phase === 'unlocked' ? 1 : 0, 
                    y: phase === 'unlocked' ? 0 : 20 
                  }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <h2 className="text-3xl font-bold" style={{ color: tierColor }}>
                    {badge.name}
                  </h2>
                  <p className="text-white/60 max-w-xs mx-auto text-sm">
                    {badge.description}
                  </p>
                  
                  {/* Point value */}
                  <motion.div
                    className="flex items-center justify-center gap-2 py-3 px-6 rounded-full mx-auto w-fit"
                    style={{ 
                      backgroundColor: `${tierColor}20`,
                      border: `1px solid ${tierColor}50`,
                    }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: phase === 'unlocked' ? 1 : 0, scale: phase === 'unlocked' ? 1 : 0.9 }}
                    transition={{ delay: 0.6, duration: 0.4 }}
                  >
                    <Gift className="w-5 h-5" style={{ color: tierColor }} />
                    <span className="font-bold" style={{ color: tierColor }}>
                      +{badge.pointValue.toLocaleString()} points
                    </span>
                  </motion.div>
                </motion.div>

                {/* Claim button */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: phase === 'unlocked' ? 1 : 0 }}
                  transition={{ delay: 1, duration: 0.6 }}
                >
                  <Button
                    className="mt-4 px-8 py-6 rounded-full text-lg font-semibold transition-all duration-300"
                    style={{
                      background: `linear-gradient(135deg, ${tierColor}, ${tierColor}CC)`,
                      color: newTier === 'gold' || newTier === 'platinum' ? '#000' : '#fff',
                    }}
                    onClick={onComplete}
                  >
                    <motion.span
                      animate={{ scale: [1, 1.03, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="flex items-center gap-2"
                    >
                      <Gift className="w-5 h-5" />
                      Claim Badge
                    </motion.span>
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
