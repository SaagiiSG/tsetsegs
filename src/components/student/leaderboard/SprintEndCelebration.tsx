import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Crown, Star, Sparkles, X } from 'lucide-react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { Button } from '@/components/ui/button';
import { TIER_COLORS, TIER_DISPLAY_NAMES, TierType } from '@/data/badgeDefinitions';

interface SprintEndCelebrationProps {
  isOpen: boolean;
  onClose: () => void;
  rank: number;
  tierReached: TierType;
  totalPoints: number;
  sprintNumber: number;
  seasonNumber: number;
}

export function SprintEndCelebration({
  isOpen,
  onClose,
  rank,
  tierReached,
  totalPoints,
  sprintNumber,
  seasonNumber
}: SprintEndCelebrationProps) {
  const { width, height } = useWindowSize();
  const [showConfetti, setShowConfetti] = useState(false);
  const isChampion = rank === 1;

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const tierColor = TIER_COLORS[tierReached] || TIER_COLORS.bronze;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          {showConfetti && (
            <Confetti
              width={width}
              height={height}
              numberOfPieces={isChampion ? 500 : 200}
              recycle={false}
              colors={isChampion 
                ? ['#FFD700', '#FFA500', '#FFE135', '#FFDF00', '#F4C430']
                : [tierColor, '#ffffff', '#888888']
              }
            />
          )}

          <motion.div
            initial={{ scale: 0.5, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.5, y: 50 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="relative bg-gradient-to-b from-card via-card to-background rounded-3xl p-8 max-w-md w-full shadow-2xl border-2 overflow-hidden"
            style={{ borderColor: tierColor }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>

            {/* Background glow */}
            <div 
              className="absolute inset-0 opacity-20"
              style={{ 
                background: `radial-gradient(circle at 50% 30%, ${tierColor}, transparent 60%)`
              }}
            />

            {/* Sparkles animation */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {[...Array(8)].map((_, i) => (
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
                    rotate: [0, 180, 360]
                  }}
                  transition={{
                    duration: 2,
                    delay: i * 0.2,
                    repeat: Infinity,
                    repeatDelay: 1
                  }}
                >
                  <Sparkles className="h-4 w-4 text-amber-400" />
                </motion.div>
              ))}
            </motion.div>

            {/* Content */}
            <div className="relative z-10 text-center space-y-6">
              {/* Champion badge */}
              {isChampion && (
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', delay: 0.2, damping: 10, stiffness: 200 }}
                  className="mx-auto w-32 h-32 rounded-full bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 flex items-center justify-center shadow-lg"
                  style={{ boxShadow: `0 0 60px ${tierColor}60` }}
                >
                  <motion.div
                    animate={{ 
                      rotate: [0, -5, 5, -5, 0],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Crown className="h-16 w-16 text-white drop-shadow-lg" />
                  </motion.div>
                </motion.div>
              )}

              {!isChampion && (
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                  className="mx-auto w-28 h-28 rounded-full flex items-center justify-center"
                  style={{ 
                    backgroundColor: `${tierColor}30`,
                    boxShadow: `0 0 40px ${tierColor}40`
                  }}
                >
                  <Trophy className="h-14 w-14" style={{ color: tierColor }} />
                </motion.div>
              )}

              {/* Title */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                {isChampion ? (
                  <>
                    <h2 className="text-3xl font-black bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500 bg-clip-text text-transparent">
                      SPRINT CHAMPION!
                    </h2>
                    <p className="text-muted-foreground mt-2">
                      You dominated the competition!
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold">Sprint Complete!</h2>
                    <p className="text-muted-foreground mt-2">
                      You finished #{rank} this sprint
                    </p>
                  </>
                )}
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="grid grid-cols-2 gap-4"
              >
                <div 
                  className="rounded-xl p-4 border"
                  style={{ borderColor: `${tierColor}50`, backgroundColor: `${tierColor}10` }}
                >
                  <div className="text-sm text-muted-foreground">Final Rank</div>
                  <div className="text-2xl font-bold" style={{ color: tierColor }}>
                    #{rank}
                  </div>
                </div>
                <div 
                  className="rounded-xl p-4 border"
                  style={{ borderColor: `${tierColor}50`, backgroundColor: `${tierColor}10` }}
                >
                  <div className="text-sm text-muted-foreground">Points</div>
                  <div className="text-2xl font-bold">
                    {totalPoints.toLocaleString()}
                  </div>
                </div>
              </motion.div>

              {/* Tier badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8, type: 'spring' }}
                className="flex items-center justify-center gap-2 py-3 px-6 rounded-full mx-auto w-fit"
                style={{ backgroundColor: `${tierColor}20`, border: `2px solid ${tierColor}` }}
              >
                <Star className="h-5 w-5" style={{ color: tierColor }} />
                <span className="font-bold" style={{ color: tierColor }}>
                  {TIER_DISPLAY_NAMES[tierReached]} Tier
                </span>
              </motion.div>

              {/* Season info */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-sm text-muted-foreground"
              >
                Season {seasonNumber} • Sprint {sprintNumber}
              </motion.p>

              {/* CTA Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
              >
                <Button 
                  onClick={onClose}
                  className="w-full text-lg py-6"
                  style={{ 
                    background: isChampion 
                      ? 'linear-gradient(135deg, #FFD700, #FFA500)' 
                      : `linear-gradient(135deg, ${tierColor}, ${tierColor}CC)`,
                    color: isChampion ? '#000' : '#fff'
                  }}
                >
                  {isChampion ? '🎉 Claim Your Glory' : 'Continue'}
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
