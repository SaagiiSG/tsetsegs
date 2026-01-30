import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import { RARITY_COLORS } from '@/data/badgeDefinitions';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { FeaturedBadgeSimple, SimpleBadgeStats } from '@/hooks/useOtherStudentProfile';

interface FeaturedBadgesReadOnlyProps {
  featuredBadges: FeaturedBadgeSimple[];
  badgeStats: SimpleBadgeStats;
}

const BadgeIcon = ({ iconName, rarity }: { iconName: string; rarity: string }) => {
  const Icon = (LucideIcons as any)[iconName] || LucideIcons.Award;
  const colors = RARITY_COLORS[rarity as keyof typeof RARITY_COLORS] || RARITY_COLORS.common;
  
  return (
    <div 
      className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center relative z-10",
        rarity === 'legendary' && 'animate-pulse'
      )}
      style={{ 
        background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
        boxShadow: `0 0 16px ${colors.glow}`
      }}
    >
      <Icon className="w-6 h-6 text-white" />
    </div>
  );
};

const BackgroundBadgeIcon = ({ iconName }: { iconName: string }) => {
  const Icon = (LucideIcons as any)[iconName] || LucideIcons.Award;
  
  return (
    <Icon 
      className="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)] text-primary opacity-[0.12]" 
      strokeWidth={1}
    />
  );
};

export function FeaturedBadgesReadOnly({ featuredBadges, badgeStats }: FeaturedBadgesReadOnlyProps) {
  // Create 6 slots filled with featured badges
  const slots: (FeaturedBadgeSimple | null)[] = Array(6).fill(null);
  
  featuredBadges.forEach((fb) => {
    if (fb.slotPosition >= 1 && fb.slotPosition <= 6) {
      slots[fb.slotPosition - 1] = fb;
    }
  });

  const hasFeaturedBadges = featuredBadges.length > 0;

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Featured Badges
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasFeaturedBadges ? (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
            {slots.map((badge, idx) => (
              <div
                key={idx}
                className={cn(
                  "aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-between p-2 transition-all relative overflow-hidden",
                  badge 
                    ? "border-primary/30 bg-primary/5" 
                    : "border-muted-foreground/20 bg-muted/20"
                )}
              >
                {badge ? (
                  <>
                    <BackgroundBadgeIcon iconName={badge.badge.iconName} />
                    <div className="flex-1 flex items-center justify-center pt-1">
                      <BadgeIcon iconName={badge.badge.iconName} rarity={badge.badge.rarity} />
                    </div>
                    <p className="font-chillax text-sm font-semibold text-center leading-tight line-clamp-2 relative z-10 text-foreground pb-0.5">
                      {badge.badge.name}
                    </p>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-muted/40" />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground text-sm mb-4">
            No featured badges yet
          </div>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2 rounded-lg bg-muted/30">
            <p className="text-lg font-bold">{badgeStats.unlocked}/{badgeStats.total}</p>
            <p className="text-[10px] text-muted-foreground">Badges</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/30">
            <p className="text-lg font-bold">{badgeStats.totalPoints.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Badge Pts</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/30">
            <p className="text-lg font-bold text-purple-400">{badgeStats.epicEarned}</p>
            <p className="text-[10px] text-muted-foreground">Epic</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/30">
            <p className="text-lg font-bold text-amber-400">{badgeStats.legendaryEarned}</p>
            <p className="text-[10px] text-muted-foreground">Legendary</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
