import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Plus, Settings } from 'lucide-react';
import { StudentBadge, BadgeStats } from '@/hooks/useBadges';
import { RARITY_COLORS } from '@/data/badgeDefinitions';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface FeaturedBadgesProps {
  featuredBadges: (StudentBadge | null)[];
  badgeStats: BadgeStats;
}

const BadgeIcon = ({ iconName, rarity }: { iconName: string; rarity: string }) => {
  const Icon = (LucideIcons as any)[iconName] || LucideIcons.Award;
  const colors = RARITY_COLORS[rarity as keyof typeof RARITY_COLORS] || RARITY_COLORS.common;
  
  return (
    <div 
      className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center",
        rarity === 'legendary' && 'animate-pulse'
      )}
      style={{ 
        background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
        boxShadow: `0 0 20px ${colors.glow}`
      }}
    >
      <Icon className="w-6 h-6 text-white" />
    </div>
  );
};

export function FeaturedBadges({ featuredBadges, badgeStats }: FeaturedBadgesProps) {
  const navigate = useNavigate();
  const slots = Array(6).fill(null);
  
  // Fill slots with featured badges
  featuredBadges.forEach((badge, idx) => {
    if (idx < 6 && badge) slots[idx] = badge;
  });

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Featured Badges
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1"
            onClick={() => navigate('/practice/badges')}
          >
            <Settings className="w-4 h-4" />
            Manage
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
          {slots.map((badge, idx) => (
            <div
              key={idx}
              className={cn(
                "aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center p-2 transition-all",
                badge 
                  ? "border-primary/30 bg-primary/5 cursor-pointer hover:bg-primary/10" 
                  : "border-muted-foreground/20 bg-muted/20"
              )}
              onClick={() => !badge && navigate('/practice/badges')}
            >
              {badge ? (
                <>
                  <BadgeIcon iconName={badge.badge.iconName} rarity={badge.badge.rarity} />
                  <p className="text-[10px] font-medium text-center mt-1.5 line-clamp-2">
                    {badge.badge.name}
                  </p>
                </>
              ) : (
                <>
                  <Plus className="w-6 h-6 text-muted-foreground/40" />
                  <p className="text-[10px] text-muted-foreground/40 mt-1">Pin badge</p>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2 rounded-lg bg-muted/30">
            <p className="text-lg font-bold">{badgeStats.earned}/{badgeStats.total}</p>
            <p className="text-[10px] text-muted-foreground">Badges</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/30">
            <p className="text-lg font-bold">{badgeStats.totalPoints.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Badge Pts</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/30">
            <p className="text-lg font-bold text-purple-400">{badgeStats.byRarity.epic}</p>
            <p className="text-[10px] text-muted-foreground">Epic</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/30">
            <p className="text-lg font-bold text-amber-400">{badgeStats.byRarity.legendary}</p>
            <p className="text-[10px] text-muted-foreground">Legendary</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
