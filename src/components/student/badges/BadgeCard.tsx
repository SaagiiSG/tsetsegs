import { motion } from 'framer-motion';
import { Lock, Check, Sparkles, Award, Zap, Timer, Flame, Link, Mountain, Clock, Crown, Target, Package, Medal, Hourglass, Diamond, Star, Bird, Snowflake, Gem } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { StudentBadge } from '@/hooks/useBadges';
import { RARITY_COLORS, BadgeRarity } from '@/data/badgeDefinitions';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface BadgeCardProps {
  badge: StudentBadge;
  onClick?: () => void;
}

export function BadgeCard({ badge, onClick }: BadgeCardProps) {
  const { badge: badgeDef, isUnlocked, progress, unlockedAt } = badge;
  const colors = RARITY_COLORS[badgeDef.rarity];
  
  // Map icon names to components
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Zap, Timer, Flame, Link, Mountain, Clock, Crown, Target, Package, Medal, 
    Hourglass, Diamond, Star, Bird, Snowflake, Gem, Award
  };
  const IconComponent = iconMap[badgeDef.iconName] || Award;

  const getRarityLabel = (rarity: BadgeRarity) => {
    return rarity.charAt(0).toUpperCase() + rarity.slice(1);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative rounded-xl border-2 p-4 cursor-pointer transition-all",
        colors.border,
        isUnlocked && `shadow-lg ${colors.glow}`,
        !isUnlocked && "opacity-70 grayscale-[30%]",
        badgeDef.rarity === 'legendary' && isUnlocked && "animate-pulse"
      )}
    >
      {/* Rarity glow effect for unlocked */}
      {isUnlocked && badgeDef.rarity !== 'common' && (
        <motion.div
          className={cn(
            "absolute inset-0 rounded-xl opacity-20",
            badgeDef.rarity === 'legendary' && "bg-gradient-to-br from-amber-400 to-rose-500",
            badgeDef.rarity === 'epic' && "bg-purple-500",
            badgeDef.rarity === 'rare' && "bg-blue-500",
            badgeDef.rarity === 'uncommon' && "bg-green-500"
          )}
          animate={{
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Lock/Check indicator */}
      <div className="absolute top-2 right-2">
        {isUnlocked ? (
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
            <Check className="h-4 w-4 text-white" />
          </div>
        ) : progress > 0 ? (
          <div className="text-xs font-bold text-muted-foreground">{progress}%</div>
        ) : (
          <Lock className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {/* Icon */}
      <div className={cn(
        "w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3",
        isUnlocked ? "bg-gradient-to-br from-card to-muted" : "bg-muted"
      )}>
        {badgeDef.rarity === 'legendary' && isUnlocked ? (
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className={cn("h-8 w-8", colors.text)} />
          </motion.div>
        ) : (
          <IconComponent className={cn("h-8 w-8", isUnlocked ? colors.text : "text-muted-foreground")} />
        )}
      </div>

      {/* Badge Info */}
      <div className="text-center space-y-1">
        <h3 className="font-semibold text-sm line-clamp-1">{badgeDef.name}</h3>
        <p className={cn("text-xs font-medium", colors.text)}>
          {getRarityLabel(badgeDef.rarity)}
        </p>
        <p className="text-xs text-muted-foreground">
          Worth: {badgeDef.pointValue.toLocaleString()} pts
        </p>
      </div>

      {/* Progress bar for incomplete */}
      {!isUnlocked && (
        <div className="mt-3">
          <Progress value={progress} className="h-1.5" />
        </div>
      )}

      {/* Unlock date */}
      {isUnlocked && unlockedAt && (
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Unlocked {format(new Date(unlockedAt), 'MMM d, yyyy')}
        </p>
      )}
    </motion.div>
  );
}
