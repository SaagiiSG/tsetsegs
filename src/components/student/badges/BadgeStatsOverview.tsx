import { motion } from 'framer-motion';
import { Award, Trophy, Star, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BadgeStats } from '@/hooks/useBadges';
import { RARITY_COLORS, BadgeRarity } from '@/data/badgeDefinitions';

interface BadgeStatsOverviewProps {
  stats: BadgeStats;
}

export function BadgeStatsOverview({ stats }: BadgeStatsOverviewProps) {
  const completionPercent = Math.round((stats.earnedBadges / stats.totalBadges) * 100);
  
  const rarities: BadgeRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

  return (
    <Card className="bg-gradient-to-br from-card to-muted/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          Badge Collection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-primary">{stats.earnedBadges}</p>
            <p className="text-xs text-muted-foreground">of {stats.totalBadges}</p>
          </div>
          <div>
            <motion.p 
              className="text-2xl font-bold"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring" }}
            >
              {stats.totalPoints.toLocaleString()}
            </motion.p>
            <p className="text-xs text-muted-foreground">Badge Points</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-500">{completionPercent}%</p>
            <p className="text-xs text-muted-foreground">Complete</p>
          </div>
        </div>

        {/* Progress bar */}
        <Progress value={completionPercent} className="h-2" />

        {/* Rarity breakdown */}
        <div className="grid grid-cols-5 gap-2">
          {rarities.map((rarity) => {
            const data = stats.byRarity[rarity];
            const colors = RARITY_COLORS[rarity];
            
            return (
              <div key={rarity} className="text-center">
                <div 
                  className={`text-lg font-bold ${colors.text}`}
                >
                  {data.earned}/{data.total}
                </div>
                <p className="text-[10px] text-muted-foreground capitalize">
                  {rarity}
                </p>
              </div>
            );
          })}
        </div>

        {/* Rarest badge */}
        {stats.rarestEarned && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className={`p-2 rounded-full ${RARITY_COLORS[stats.rarestEarned.rarity].glow}`}>
              {stats.rarestEarned.rarity === 'legendary' ? (
                <Sparkles className={`h-5 w-5 ${RARITY_COLORS[stats.rarestEarned.rarity].text}`} />
              ) : (
                <Star className={`h-5 w-5 ${RARITY_COLORS[stats.rarestEarned.rarity].text}`} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{stats.rarestEarned.name}</p>
              <p className={`text-xs ${RARITY_COLORS[stats.rarestEarned.rarity].text}`}>
                Rarest badge owned
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
