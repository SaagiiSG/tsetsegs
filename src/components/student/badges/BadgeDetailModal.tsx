import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Clock, Users, Award, Zap, Timer, Flame, Link, Mountain, Crown, Target, Package, Medal, Hourglass, Diamond, Star, Bird, Snowflake, Gem, Pin, PinOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StudentBadge } from '@/hooks/useBadges';
import { RARITY_COLORS } from '@/data/badgeDefinitions';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface BadgeDetailModalProps {
  badge: StudentBadge | null;
  open: boolean;
  onClose: () => void;
  onPin?: (badgeId: string) => void;
  isPinned?: boolean;
  isPinning?: boolean;
}

export function BadgeDetailModal({ badge, open, onClose, onPin, isPinned, isPinning }: BadgeDetailModalProps) {
  if (!badge) return null;

  const { badge: badgeDef, isUnlocked, progress, unlockedAt, requirementsProgress, badgeId } = badge;
  const colors = RARITY_COLORS[badgeDef.rarity];
  
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Zap, Timer, Flame, Link, Mountain, Clock, Crown, Target, Package, Medal, 
    Hourglass, Diamond, Star, Bird, Snowflake, Gem, Award
  };
  const IconComponent = iconMap[badgeDef.iconName] || Award;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">{badgeDef.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Badge Icon */}
          <motion.div 
            className="text-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <motion.div
              className={cn(
                "w-24 h-24 mx-auto rounded-full flex items-center justify-center border-4",
                colors.border,
                isUnlocked && `shadow-xl ${colors.glow}`
              )}
              animate={isUnlocked ? {
                boxShadow: [
                  `0 0 20px currentColor`,
                  `0 0 40px currentColor`,
                  `0 0 20px currentColor`
                ]
              } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <IconComponent className={cn("h-12 w-12", colors.text)} />
            </motion.div>

            <h2 className="text-xl font-bold mt-4">{badgeDef.name}</h2>
            
            <div className="flex items-center justify-center gap-2 mt-2">
              <Badge 
                variant="outline" 
                className={cn(colors.border, colors.text)}
              >
                {badgeDef.rarity.charAt(0).toUpperCase() + badgeDef.rarity.slice(1)}
              </Badge>
              <Badge variant="secondary">
                {badgeDef.pointValue.toLocaleString()} pts
              </Badge>
            </div>

            {isUnlocked && unlockedAt && (
              <p className="text-sm text-green-500 mt-2 flex items-center justify-center gap-1">
                <Check className="h-4 w-4" />
                Unlocked on {format(new Date(unlockedAt), 'MMM d, yyyy')}
              </p>
            )}

            {/* Pin to Profile Button */}
            {isUnlocked && onPin && (
              <Button
                variant={isPinned ? "secondary" : "default"}
                size="sm"
                className="mt-3 gap-2"
                onClick={() => onPin(badgeId)}
                disabled={isPinning}
              >
                {isPinned ? (
                  <>
                    <PinOff className="h-4 w-4" />
                    Unpin from Profile
                  </>
                ) : (
                  <>
                    <Pin className="h-4 w-4" />
                    Pin to Profile
                  </>
                )}
              </Button>
            )}
          </motion.div>

          {/* Description */}
          <p className="text-muted-foreground text-center">
            {badgeDef.description}
          </p>

          {/* Requirements */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Requirements</h3>
            {badgeDef.requirements.map((req, index) => {
              const currentValue = requirementsProgress[req.type] || 0;
              const isComplete = currentValue >= req.target;
              const reqProgress = Math.min(100, (currentValue / req.target) * 100);

              return (
                <div 
                  key={index}
                  className={cn(
                    "p-3 rounded-lg border",
                    isComplete && "bg-green-500/10 border-green-500/30"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {isComplete ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm">{req.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {currentValue}/{req.target}
                    </span>
                  </div>
                  <Progress value={reqProgress} className="h-1.5" />
                </div>
              );
            })}
          </div>

          {/* Tips */}
          {!isUnlocked && (
            <div className="p-3 rounded-lg bg-muted/50">
              <h3 className="font-semibold text-sm mb-1">💡 Tip</h3>
              <p className="text-xs text-muted-foreground">
                {getTipForBadge(badgeDef.category)}
              </p>
            </div>
          )}

          {/* Overall progress */}
          {!isUnlocked && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Overall Progress</p>
              <div className="flex items-center gap-3">
                <Progress value={progress} className="flex-1 h-2" />
                <span className="text-sm font-bold">{progress}%</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getTipForBadge(category: string): string {
  switch (category) {
    case 'speed':
      return 'Practice in Speed Mode to complete questions quickly while maintaining accuracy.';
    case 'discipline':
      return 'Consistent daily practice is key. Try to log in and complete at least a few questions every day.';
    case 'championship':
      return 'Focus on earning points during the sprint to climb the leaderboard and finish in the top positions.';
    case 'legendary':
      return 'These badges require mastering multiple aspects of the platform. Take your time and work towards each requirement.';
    default:
      return 'Keep practicing to make progress towards this badge!';
  }
}
