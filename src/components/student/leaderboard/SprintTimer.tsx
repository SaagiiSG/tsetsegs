import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame, Trophy, TrendingUp, TrendingDown } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { SprintInfo, LeaderboardEntry } from '@/hooks/useLeaderboard';
import { TIER_COLORS, TIER_DISPLAY_NAMES, TierType } from '@/data/badgeDefinitions';

interface SprintTimerProps {
  sprint: SprintInfo | null;
  currentUserRanking?: LeaderboardEntry | null;
}

export function SprintTimer({ sprint, currentUserRanking }: SprintTimerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  // Live seconds countdown
  useEffect(() => {
    if (!sprint) return;
    
    const updateSeconds = () => {
      const endDate = new Date(sprint.endDate);
      const now = new Date();
      const diff = endDate.getTime() - now.getTime();
      const seconds = Math.max(0, Math.floor((diff % (1000 * 60)) / 1000));
      setSecondsRemaining(seconds);
    };
    
    updateSeconds();
    const interval = setInterval(updateSeconds, 1000);
    return () => clearInterval(interval);
  }, [sprint]);

  if (!sprint) {
    return (
      <div className="rounded-2xl border bg-card p-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
        <div className="h-20 bg-muted rounded w-2/3 mx-auto"></div>
      </div>
    );
  }

  const totalDuration = 14;
  const daysElapsed = totalDuration - sprint.daysRemaining;
  const progressPercent = Math.min(100, (daysElapsed / totalDuration) * 100);

  const tierColor = currentUserRanking?.currentTier 
    ? TIER_COLORS[currentUserRanking.currentTier as TierType]
    : TIER_COLORS.unranked;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border-2 bg-gradient-to-br from-card via-card to-background p-6 space-y-6 relative overflow-hidden"
    >
      {/* Background glow effect */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{ 
          background: `radial-gradient(circle at 50% 0%, ${tierColor}, transparent 70%)`
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div 
            className="p-2 rounded-xl"
            style={{ backgroundColor: `${tierColor}30` }}
          >
            <Flame className="h-6 w-6" style={{ color: tierColor }} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Season {sprint.seasonNumber}
            </p>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <span style={{ color: tierColor }}>
                {TIER_DISPLAY_NAMES[currentUserRanking?.currentTier as TierType] || 'Unranked'}
              </span>
              <span className="text-muted-foreground">
                Sprint ({sprint.sprintNumber}/3)
              </span>
            </h2>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Ends in</p>
          <p className="text-sm font-medium">{sprint.daysRemaining} days</p>
        </div>
      </div>

      {/* Giant Countdown */}
      <div className="flex items-center justify-center gap-1 sm:gap-3 relative z-10">
        <TimeUnit value={sprint.daysRemaining} label="DAYS" />
        <span className="text-3xl sm:text-5xl font-black text-muted-foreground/50 font-mono">:</span>
        <TimeUnit value={sprint.hoursRemaining} label="HRS" />
        <span className="text-3xl sm:text-5xl font-black text-muted-foreground/50 font-mono">:</span>
        <TimeUnit value={sprint.minutesRemaining} label="MIN" />
        <span className="text-3xl sm:text-5xl font-black text-muted-foreground/50 font-mono">:</span>
        <TimeUnit value={secondsRemaining} label="SEC" isLive />
      </div>

      {/* Progress bar */}
      <div className="space-y-2 relative z-10">
        <Progress value={progressPercent} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Day {daysElapsed + 1} of {totalDuration}</span>
          <span>{Math.round(100 - progressPercent)}% remaining</span>
        </div>
      </div>

      {/* Current User Rank Card */}
      {currentUserRanking && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="relative z-10 rounded-xl p-4 border-2"
          style={{ 
            borderColor: tierColor,
            background: `linear-gradient(135deg, ${tierColor}15, transparent)`
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div 
                className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black"
                style={{ backgroundColor: `${tierColor}30`, color: tierColor }}
              >
                #{currentUserRanking.rank}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Your Rank</p>
                <div className="flex items-center gap-2">
                  <span 
                    className="text-lg font-bold"
                    style={{ color: tierColor }}
                  >
                    {TIER_DISPLAY_NAMES[currentUserRanking.currentTier as TierType] || 'Unranked'}
                  </span>
                  <RankTrend isAdvancing={currentUserRanking.isAdvancing} />
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{currentUserRanking.totalPoints.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">points</p>
            </div>
          </div>
          {currentUserRanking.isTop1 && (
            <div className="mt-3 flex items-center gap-2 text-amber-500">
              <Trophy className="h-4 w-4" />
              <span className="text-sm font-medium">Sprint Leader!</span>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

function TimeUnit({ value, label, isLive }: { value: number; label: string; isLive?: boolean }) {
  return (
    <div className="text-center">
      <motion.span 
        key={value}
        initial={isLive ? { scale: 1.05 } : { scale: 1.1, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={isLive ? { duration: 0.15 } : undefined}
        className="text-4xl sm:text-6xl font-black tabular-nums tracking-tighter"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        {String(value).padStart(2, '0')}
      </motion.span>
      <p className="text-[9px] sm:text-xs text-muted-foreground font-bold tracking-widest mt-1">{label}</p>
    </div>
  );
}

function RankTrend({ isAdvancing }: { isAdvancing: boolean }) {
  if (isAdvancing) {
    return (
      <div className="flex items-center gap-1 text-emerald-500 text-xs">
        <TrendingUp className="h-3 w-3" />
        <span>Advancing</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-amber-500 text-xs">
      <TrendingDown className="h-3 w-3" />
      <span>At Risk</span>
    </div>
  );
}
