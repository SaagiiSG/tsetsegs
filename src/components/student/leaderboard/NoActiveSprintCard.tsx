import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Trophy, Sparkles, Calendar, ArrowUp, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { SprintInfo } from '@/hooks/useLeaderboard';
import { TIER_COLORS, TIER_DISPLAY_NAMES, TierType, TIER_ORDER } from '@/data/badgeDefinitions';

interface NoActiveSprintCardProps {
  lastEndedSprint: SprintInfo | null;
  nextSprint: SprintInfo | null;
  lastSprintResults: {
    rank: number;
    tier: TierType;
    points: number;
    isTop1: boolean;
    nextTier: TierType | null;
    sprintInfo?: { season_number: number; sprint_number: number } | null;
  } | null;
}

export function NoActiveSprintCard({ 
  lastEndedSprint,
  nextSprint,
  lastSprintResults
}: NoActiveSprintCardProps) {
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  // Calculate countdown to next sprint
  useEffect(() => {
    if (!nextSprint?.startDate) return;

    const nextSprintDate = new Date(nextSprint.startDate);

    const updateCountdown = () => {
      const now = new Date();
      const diff = nextSprintDate.getTime() - now.getTime();
      
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000)
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextSprint?.startDate]);

  const tierColor = lastSprintResults?.tier ? TIER_COLORS[lastSprintResults.tier] : TIER_COLORS.bronze;
  
  // Check if player is advancing to a higher tier
  const isAdvancing = lastSprintResults?.nextTier && lastSprintResults.nextTier !== lastSprintResults.tier &&
    TIER_ORDER.indexOf(lastSprintResults.nextTier) > TIER_ORDER.indexOf(lastSprintResults.tier);
  
  const nextTierColor = lastSprintResults?.nextTier ? TIER_COLORS[lastSprintResults.nextTier] : tierColor;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Next Sprint Countdown */}
      <Card className="relative overflow-hidden border-2 border-primary/20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        
        <CardContent className="relative z-10 p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/20">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">New Sprint Coming!</h2>
              <p className="text-sm text-muted-foreground">
                {nextSprint ? `Season ${nextSprint.seasonNumber} • Sprint ${nextSprint.sprintNumber}` : 'Get ready for the next competition'}
              </p>
            </div>
          </div>

          {/* Countdown Display */}
          <div className="flex items-center justify-center gap-2 sm:gap-4">
            <CountdownUnit value={countdown.days} label="DAYS" />
            <span className="text-2xl sm:text-4xl font-bold text-muted-foreground/50">:</span>
            <CountdownUnit value={countdown.hours} label="HRS" />
            <span className="text-2xl sm:text-4xl font-bold text-muted-foreground/50">:</span>
            <CountdownUnit value={countdown.minutes} label="MIN" />
            <span className="text-2xl sm:text-4xl font-bold text-muted-foreground/50">:</span>
            <CountdownUnit value={countdown.seconds} label="SEC" isLive />
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {nextSprint ? `Starts ${new Date(nextSprint.startDate).toLocaleDateString()}` : 'Next sprint coming soon'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Last Sprint Results */}
      {lastSprintResults && lastSprintResults.rank > 0 && (
        <Card className="relative overflow-hidden" style={{ borderColor: tierColor }}>
          <div 
            className="absolute inset-0 opacity-10"
            style={{ background: `linear-gradient(135deg, ${tierColor}, transparent)` }}
          />
          
          <CardContent className="relative z-10 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${tierColor}30` }}
                >
                  <Trophy className="h-5 w-5" style={{ color: tierColor }} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {lastSprintResults.sprintInfo 
                      ? `Season ${lastSprintResults.sprintInfo.season_number} • Sprint ${lastSprintResults.sprintInfo.sprint_number}`
                      : lastEndedSprint 
                        ? `Season ${lastEndedSprint.seasonNumber} • Sprint ${lastEndedSprint.sprintNumber}` 
                        : 'Last Sprint'}
                  </p>
                  <h3 className="font-semibold">Your Final Results</h3>
                </div>
              </div>
              {lastSprintResults.isTop1 && (
                <div className="flex items-center gap-1 text-amber-500">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm font-medium">Champion!</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div 
                className="rounded-xl p-4 text-center border"
                style={{ borderColor: `${tierColor}50`, backgroundColor: `${tierColor}10` }}
              >
                <p className="text-2xl font-bold" style={{ color: tierColor }}>
                  #{lastSprintResults.rank}
                </p>
                <p className="text-xs text-muted-foreground">Final Rank</p>
              </div>
              <div 
                className="rounded-xl p-4 text-center border"
                style={{ borderColor: `${tierColor}50`, backgroundColor: `${tierColor}10` }}
              >
                <p className="text-lg font-bold" style={{ color: tierColor }}>
                  {TIER_DISPLAY_NAMES[lastSprintResults.tier]}
                </p>
                <p className="text-xs text-muted-foreground">Tier</p>
              </div>
              <div 
                className="rounded-xl p-4 text-center border"
                style={{ borderColor: `${tierColor}50`, backgroundColor: `${tierColor}10` }}
              >
                <p className="text-2xl font-bold">
                  {lastSprintResults.points?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-muted-foreground">Points</p>
              </div>
            </div>

            {/* Tier Promotion Info */}
            {isAdvancing && lastSprintResults.nextTier && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl p-4 border-2 flex items-center justify-between"
                style={{ 
                  borderColor: nextTierColor,
                  background: `linear-gradient(135deg, ${nextTierColor}15, ${nextTierColor}05)`
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full" style={{ backgroundColor: `${nextTierColor}30` }}>
                    <ArrowUp className="h-5 w-5" style={{ color: nextTierColor }} />
                  </div>
                  <div>
                    <p className="font-semibold" style={{ color: nextTierColor }}>
                      Tier Promotion!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      You're advancing to {TIER_DISPLAY_NAMES[lastSprintResults.nextTier]}
                    </p>
                  </div>
                </div>
                <TrendingUp className="h-6 w-6" style={{ color: nextTierColor }} />
              </motion.div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No Results Message - only show if no results at all and no upcoming sprint */}
      {!lastSprintResults && !nextSprint && (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-muted-foreground">
            <p>No sprint results yet. Participate in the next sprint!</p>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}

function CountdownUnit({ value, label, isLive }: { value: number; label: string; isLive?: boolean }) {
  return (
    <div className="text-center">
      <motion.span
        key={value}
        initial={isLive ? { scale: 1.05 } : undefined}
        animate={{ scale: 1 }}
        className="text-3xl sm:text-5xl font-black tabular-nums"
      >
        {String(value).padStart(2, '0')}
      </motion.span>
      <p className="text-[10px] sm:text-xs text-muted-foreground font-bold tracking-wider mt-1">
        {label}
      </p>
    </div>
  );
}
