import { motion } from 'framer-motion';
import { TrendingUp, Target, Trophy, ArrowUp, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { LeaderboardEntry, SprintInfo } from '@/hooks/useLeaderboard';
import { TIER_COLORS, TIER_PROMOTION_CUTOFFS } from '@/data/badgeDefinitions';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { cn } from '@/lib/utils';

interface MyRankTabProps {
  currentEntry: LeaderboardEntry | undefined;
  leaderboard: LeaderboardEntry[];
  pointsToAdvance: number | null;
  pointsToTop1: number | null;
  sprint: SprintInfo | null;
}

export function MyRankTab({ 
  currentEntry, 
  leaderboard, 
  pointsToAdvance, 
  pointsToTop1,
  sprint 
}: MyRankTabProps) {
  if (!currentEntry) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">You haven't joined this sprint yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Start practicing to appear on the leaderboard!
          </p>
        </CardContent>
      </Card>
    );
  }

  const tierColor = TIER_COLORS[currentEntry.currentTier];
  const cutoff = TIER_PROMOTION_CUTOFFS[currentEntry.currentTier];
  const progressToAdvance = currentEntry.isAdvancing 
    ? 100 
    : Math.max(0, Math.min(100, ((cutoff - currentEntry.rank + 1) / cutoff) * 100));

  // Mock point history data (would come from real data in production)
  const pointHistory = Array.from({ length: 14 }, (_, i) => ({
    day: i + 1,
    points: Math.round(currentEntry.totalPoints * ((i + 1) / 14) * (0.8 + Math.random() * 0.4))
  }));

  // Find who's directly above and below
  const playerAbove = leaderboard.find(e => e.rank === currentEntry.rank - 1);
  const playerBelow = leaderboard.find(e => e.rank === currentEntry.rank + 1);

  return (
    <div className="space-y-4">
      {/* Main Rank Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <Card className="border-2" style={{ borderColor: tierColor }}>
          <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
            <div className="text-center space-y-3 sm:space-y-4">
              {/* Rank Circle */}
              <motion.div
                className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full flex items-center justify-center text-white text-2xl sm:text-3xl font-bold"
                style={{ backgroundColor: tierColor }}
                animate={{ 
                  boxShadow: [
                    `0 0 20px ${tierColor}40`,
                    `0 0 40px ${tierColor}60`,
                    `0 0 20px ${tierColor}40`
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                #{currentEntry.rank}
              </motion.div>

              <div>
                <p className="text-lg sm:text-2xl font-bold truncate">{currentEntry.username}</p>
                <p className="text-xs sm:text-base text-muted-foreground">
                  Level {currentEntry.level} • <span className="capitalize">{currentEntry.currentTier}</span>
                </p>
              </div>

              <div className="text-2xl sm:text-4xl font-bold text-primary">
                {currentEntry.totalPoints.toLocaleString()} pts
              </div>

              {/* Status Badge */}
              <div className={cn(
                "inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm",
                currentEntry.isAdvancing 
                  ? "bg-green-500/10 text-green-500" 
                  : currentEntry.isAtRisk 
                    ? "bg-yellow-500/10 text-yellow-500"
                    : "bg-muted text-muted-foreground"
              )}>
                {currentEntry.isAdvancing ? (
                  <>
                    <ArrowUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span>Advancing to {getNextTier(currentEntry.currentTier)}</span>
                  </>
                ) : currentEntry.isAtRisk ? (
                  <>
                    <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span>At Risk - {pointsToAdvance} pts to advance</span>
                  </>
                ) : (
                  <>
                    <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span>{pointsToAdvance?.toLocaleString()} pts needed to advance</span>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Progress Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1.5 sm:gap-2">
              <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              To Advance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <p className="text-lg sm:text-2xl font-bold">
              {pointsToAdvance === 0 ? '✓ Secured' : `${pointsToAdvance?.toLocaleString()} pts`}
            </p>
            <Progress value={progressToAdvance} className="mt-2 h-1.5 sm:h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1.5 sm:gap-2">
              <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              To #1 + Badge
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <p className="text-lg sm:text-2xl font-bold">
              {pointsToTop1 === 0 ? '🏆 You\'re #1!' : `${pointsToTop1?.toLocaleString()} pts`}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
              {currentEntry.currentTier.charAt(0).toUpperCase() + currentEntry.currentTier.slice(1)} badge
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Point Graph */}
      <Card>
        <CardHeader className="pb-2 p-3 sm:p-6">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
            Sprint Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
          <div className="h-36 sm:h-48 -ml-2 sm:ml-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={pointHistory}>
                <defs>
                  <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={tierColor} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={tierColor} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="day" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `Day ${v}`}
                />
                <YAxis 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => v.toLocaleString()}
                />
                <Tooltip 
                  formatter={(value: number) => [value.toLocaleString(), 'Points']}
                  labelFormatter={(label) => `Day ${label}`}
                />
                <Area 
                  type="monotone" 
                  dataKey="points" 
                  stroke={tierColor}
                  strokeWidth={2}
                  fill="url(#colorPoints)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Comparison */}
      {(playerAbove || playerBelow) && (
        <Card>
          <CardHeader className="pb-2 p-3 sm:p-6">
            <CardTitle className="text-sm sm:text-base">Nearby Players</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3 p-3 sm:p-6 pt-0 sm:pt-0">
            {playerAbove && (
              <div className="flex items-center justify-between gap-2 p-2 sm:p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <span className="text-muted-foreground text-sm shrink-0">#{playerAbove.rank}</span>
                  <span className="truncate text-sm sm:text-base">{playerAbove.username}</span>
                </div>
                <span className="text-xs sm:text-sm text-green-500 shrink-0">
                  +{(playerAbove.totalPoints - currentEntry.totalPoints).toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between gap-2 p-2 sm:p-3 rounded-lg border-2 border-primary/30 bg-primary/5">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <span className="font-bold text-primary text-sm shrink-0">#{currentEntry.rank}</span>
                <span className="font-medium truncate text-sm sm:text-base">{currentEntry.username} (You)</span>
              </div>
              <span className="font-bold text-sm sm:text-base shrink-0">{currentEntry.totalPoints.toLocaleString()} pts</span>
            </div>
            {playerBelow && (
              <div className="flex items-center justify-between gap-2 p-2 sm:p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <span className="text-muted-foreground text-sm shrink-0">#{playerBelow.rank}</span>
                  <span className="truncate text-sm sm:text-base">{playerBelow.username}</span>
                </div>
                <span className="text-xs sm:text-sm text-muted-foreground shrink-0">
                  -{(currentEntry.totalPoints - playerBelow.totalPoints).toLocaleString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function getNextTier(current: string): string {
  const order = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'ruby'];
  const idx = order.indexOf(current);
  return idx < order.length - 1 ? order[idx + 1].charAt(0).toUpperCase() + order[idx + 1].slice(1) : 'Ruby';
}
