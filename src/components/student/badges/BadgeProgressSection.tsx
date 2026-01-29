import { motion } from 'framer-motion';
import { TrendingUp, Award, Zap, Timer, Flame, Link, Mountain, Clock, Crown, Target, Package, Medal, Hourglass, Diamond, Star, Bird, Snowflake, Gem } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { StudentBadge } from '@/hooks/useBadges';
import { RARITY_COLORS } from '@/data/badgeDefinitions';

interface BadgeProgressSectionProps {
  inProgressBadges: StudentBadge[];
  onBadgeClick?: (badge: StudentBadge) => void;
}

export function BadgeProgressSection({ inProgressBadges, onBadgeClick }: BadgeProgressSectionProps) {
  if (inProgressBadges.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Active Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {inProgressBadges.map((badge, index) => {
          const colors = RARITY_COLORS[badge.badge.rarity];
          const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
            Zap, Timer, Flame, Link, Mountain, Clock, Crown, Target, Package, Medal, 
            Hourglass, Diamond, Star, Bird, Snowflake, Gem, Award
          };
          const IconComponent = iconMap[badge.badge.iconName] || Award;
          
          // Get the most relevant requirement progress
          const requirements = badge.badge.requirements;
          const firstReq = requirements[0];
          const currentProgress = badge.requirementsProgress[firstReq?.type] || 0;

          return (
            <motion.div
              key={badge.badge.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onBadgeClick?.(badge)}
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
            >
              <div className={`p-2 rounded-lg ${colors.border} border`}>
                <IconComponent className={`h-5 w-5 ${colors.text}`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium truncate">{badge.badge.name}</p>
                  <span className="text-xs text-muted-foreground">
                    {badge.progress}%
                  </span>
                </div>
                <Progress value={badge.progress} className="h-1.5" />
                {firstReq && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {currentProgress}/{firstReq.target} - {firstReq.label}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
