import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { BadgeDefinition, RARITY_COLORS } from '@/data/badgeDefinitions';
import { 
  Zap, Timer, Flame, Link, Mountain, Clock, Crown, Target, Package,
  Medal, Hourglass, Diamond, Star, Sword, Award, Gem, Bird, Snowflake, Sparkles
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap, Timer, Flame, Link, Mountain, Clock, Crown, Target, Package,
  Medal, Hourglass, Diamond, Star, Sword, Award, Gem, Bird, Snowflake, Sparkles
};

interface EpicBadgeUnlockProps {
  isOpen: boolean;
  onClaim: () => void;
  badge: BadgeDefinition;
}

export function EpicBadgeUnlock({ isOpen, onClaim, badge }: EpicBadgeUnlockProps) {
  const navigate = useNavigate();
  const [showBadge, setShowBadge] = useState(false);
  const [showClaim, setShowClaim] = useState(false);
  
  const rarityColors = RARITY_COLORS[badge.rarity];
  const IconComponent = ICON_MAP[badge.iconName] || Medal;

  const handleClaim = () => {
    onClaim();
    navigate('/practice/badges');
  };

  useEffect(() => {
    if (isOpen) {
      // Sequence the animations
      const badgeTimer = setTimeout(() => setShowBadge(true), 500);
      const claimTimer = setTimeout(() => setShowClaim(true), 2500);
      
      return () => {
        clearTimeout(badgeTimer);
        clearTimeout(claimTimer);
      };
    } else {
      setShowBadge(false);
      setShowClaim(false);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
        >
          {/* Dark overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 bg-black/95"
          />

          {/* Radial glow behind badge */}
          <AnimatePresence>
            {showBadge && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ 
                  opacity: [0, 0.8, 0.6],
                  scale: [0, 1.5, 1.2]
                }}
                transition={{ 
                  duration: 1.5,
                  times: [0, 0.5, 1],
                  ease: "easeOut"
                }}
                className="absolute w-96 h-96 rounded-full"
                style={{
                  background: `radial-gradient(circle, ${rarityColors.glow}60 0%, ${rarityColors.glow}20 40%, transparent 70%)`,
                  filter: 'blur(20px)'
                }}
              />
            )}
          </AnimatePresence>

          {/* Secondary glow rings */}
          <AnimatePresence>
            {showBadge && (
              <>
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ 
                    opacity: [0, 0.5, 0.3],
                    scale: [0, 2, 1.8],
                    rotate: [0, 180]
                  }}
                  transition={{ 
                    duration: 2,
                    delay: 0.3,
                    ease: "easeOut"
                  }}
                  className="absolute w-80 h-80 rounded-full border-2"
                  style={{
                    borderColor: `${rarityColors.glow}40`,
                    boxShadow: `0 0 40px ${rarityColors.glow}30`
                  }}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ 
                    opacity: [0, 0.3, 0.2],
                    scale: [0, 2.5, 2.2],
                    rotate: [0, -90]
                  }}
                  transition={{ 
                    duration: 2.5,
                    delay: 0.5,
                    ease: "easeOut"
                  }}
                  className="absolute w-96 h-96 rounded-full border"
                  style={{
                    borderColor: `${rarityColors.glow}20`
                  }}
                />
              </>
            )}
          </AnimatePresence>

          {/* Particle sparkles */}
          <AnimatePresence>
            {showBadge && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ 
                      opacity: 0, 
                      x: '50vw', 
                      y: '50vh',
                      scale: 0 
                    }}
                    animate={{ 
                      opacity: [0, 1, 0],
                      x: `${Math.random() * 100}vw`,
                      y: `${Math.random() * 100}vh`,
                      scale: [0, 1, 0]
                    }}
                    transition={{ 
                      duration: 2 + Math.random() * 2,
                      delay: 0.5 + Math.random() * 1,
                      repeat: Infinity,
                      repeatDelay: Math.random() * 2
                    }}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: rarityColors.glow,
                      boxShadow: `0 0 10px ${rarityColors.glow}`
                    }}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>

          {/* Badge content */}
          <div className="relative z-10 flex flex-col items-center justify-center">
            {/* Badge unlock text */}
            <AnimatePresence>
              {showBadge && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="mb-8 text-center"
                >
                  <motion.p
                    animate={{ 
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity
                    }}
                    className="text-sm uppercase tracking-[0.3em] font-medium mb-2"
                    style={{ color: rarityColors.glow }}
                  >
                    {badge.rarity} Achievement
                  </motion.p>
                  <motion.h2
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ 
                      duration: 0.8, 
                      delay: 0.4,
                      type: 'spring',
                      stiffness: 200
                    }}
                    className="text-3xl md:text-4xl font-black text-white"
                  >
                    BADGE UNLOCKED!
                  </motion.h2>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main badge */}
            <AnimatePresence>
              {showBadge && (
                <motion.div
                  initial={{ 
                    opacity: 0, 
                    scale: 0,
                    rotateY: -180 
                  }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1,
                    rotateY: 0
                  }}
                  transition={{ 
                    duration: 1,
                    type: 'spring',
                    stiffness: 100,
                    damping: 15
                  }}
                  className="relative"
                >
                  {/* Outer glow ring */}
                  <motion.div
                    animate={{
                      boxShadow: [
                        `0 0 30px ${rarityColors.glow}60, 0 0 60px ${rarityColors.glow}40`,
                        `0 0 50px ${rarityColors.glow}80, 0 0 100px ${rarityColors.glow}60`,
                        `0 0 30px ${rarityColors.glow}60, 0 0 60px ${rarityColors.glow}40`
                      ]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="w-40 h-40 md:w-52 md:h-52 rounded-full flex items-center justify-center border-4"
                    style={{
                      borderColor: rarityColors.glow,
                      background: `radial-gradient(circle, ${rarityColors.primary}30 0%, ${rarityColors.secondary}10 60%, transparent 80%)`
                    }}
                  >
                    {/* Inner badge */}
                    <motion.div
                      animate={{
                        scale: [1, 1.05, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="w-28 h-28 md:w-36 md:h-36 rounded-full flex items-center justify-center border-2"
                      style={{
                        borderColor: `${rarityColors.glow}80`,
                        background: `linear-gradient(135deg, ${rarityColors.primary}, ${rarityColors.secondary})`
                      }}
                    >
                      <IconComponent className="w-14 h-14 md:w-18 md:h-18 text-white drop-shadow-lg" />
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Badge name */}
            <AnimatePresence>
              {showBadge && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 1 }}
                  className="mt-8 text-center"
                >
                  <h3 
                    className="text-2xl md:text-3xl font-bold mb-2"
                    style={{ color: rarityColors.glow }}
                  >
                    {badge.name}
                  </h3>
                  <p className="text-muted-foreground text-sm md:text-base max-w-xs mx-auto">
                    {badge.description}
                  </p>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                    className="mt-4 flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" style={{ color: rarityColors.glow }} />
                    <span className="text-lg font-semibold" style={{ color: rarityColors.glow }}>
                      +{badge.pointValue.toLocaleString()} points
                    </span>
                    <Sparkles className="w-4 h-4" style={{ color: rarityColors.glow }} />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Claim button */}
            <AnimatePresence>
              {showClaim && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    duration: 0.5,
                    type: 'spring',
                    stiffness: 200
                  }}
                  className="mt-10"
                >
                  <motion.div
                    animate={{
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <Button
                      onClick={handleClaim}
                      size="lg"
                      className="text-lg px-12 py-6 rounded-full font-bold text-white border-2"
                      style={{
                        background: `linear-gradient(135deg, ${rarityColors.primary}, ${rarityColors.secondary})`,
                        borderColor: rarityColors.glow,
                        boxShadow: `0 0 30px ${rarityColors.glow}50`
                      }}
                    >
                      ✨ Claim Badge ✨
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
