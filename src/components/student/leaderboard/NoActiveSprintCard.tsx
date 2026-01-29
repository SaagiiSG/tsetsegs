import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Trophy, Sparkles, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { SprintInfo } from '@/hooks/useLeaderboard';
import { TIER_COLORS, TIER_DISPLAY_NAMES, TierType } from '@/data/badgeDefinitions';

interface NoActiveSprintCardProps {
  lastEndedSprint: SprintInfo | null;
  lastRank?: number;
  lastTier?: TierType;
  lastPoints?: number;
}

export function NoActiveSprintCard({ 
  lastEndedSprint,
  lastRank,
  lastTier,
  lastPoints
}: NoActiveSprintCardProps) {
  const [countdown, setCountdown] = useState({
    days: 1,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  // Simulate countdown to next sprint (1 day from now)
  useEffect(() => {
    const nextSprintDate = new Date();
    nextSprintDate.setDate(nextSprintDate.getDate() + 1);
    nextSprintDate.setHours(0, 0, 0, 0);

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
  }, []);

  const tierColor = lastTier ? TIER_COLORS[lastTier] : TIER_COLORS.bronze;

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
              <p className="text-sm text-muted-foreground">Get ready for the next competition</p>
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
            <span>Next sprint starts tomorrow</span>
          </div>
        </CardContent>
      </Card>

      {/* Last Sprint Results */}
      {lastEndedSprint && lastRank && (
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
                    Season {lastEndedSprint.seasonNumber} • Sprint {lastEndedSprint.sprintNumber}
                  </p>
                  <h3 className="font-semibold">Your Final Results</h3>
                </div>
              </div>
              {lastRank === 1 && (
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
                  #{lastRank}
                </p>
                <p className="text-xs text-muted-foreground">Final Rank</p>
              </div>
              <div 
                className="rounded-xl p-4 text-center border"
                style={{ borderColor: `${tierColor}50`, backgroundColor: `${tierColor}10` }}
              >
                <p className="text-lg font-bold" style={{ color: tierColor }}>
                  {lastTier ? TIER_DISPLAY_NAMES[lastTier] : 'Unranked'}
                </p>
                <p className="text-xs text-muted-foreground">Tier</p>
              </div>
              <div 
                className="rounded-xl p-4 text-center border"
                style={{ borderColor: `${tierColor}50`, backgroundColor: `${tierColor}10` }}
              >
                <p className="text-2xl font-bold">
                  {lastPoints?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-muted-foreground">Points</p>
              </div>
            </div>
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
