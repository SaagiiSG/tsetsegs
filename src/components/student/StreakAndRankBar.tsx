import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, Snowflake, Trophy } from 'lucide-react';
import { useStudentStreak } from '@/hooks/useStudentStreak';
import { useStudentTier } from '@/hooks/useStudentTier';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { TIER_DISPLAY_NAMES, TIER_COLORS } from '@/data/badgeDefinitions';
import { TodayPointsChip } from './TodayPointsChip';
import { cn } from '@/lib/utils';

interface StreakAndRankBarProps {
  onStreakClick?: () => void;
  className?: string;
}

export function StreakAndRankBar({ onStreakClick, className }: StreakAndRankBarProps) {
  const navigate = useNavigate();
  const { streak, isStreakActive, freezersAvailable } = useStudentStreak();
  const currentStreak = streak?.current_streak ?? 0;
  const { tier } = useStudentTier();
  const { currentUserEntry, activeSprint } = useLeaderboard();
  const rank = currentUserEntry?.rank ?? null;
  const group = currentUserEntry?.groupNumber;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        type="button"
        onClick={onStreakClick}
        data-tour="streak-chip"
        title={isStreakActive ? `${currentStreak} day streak — tap for history` : 'Start your streak today'}
        className={cn(
          'student-chip',
          isStreakActive ? 'student-chip-flame' : 'text-muted-foreground'
        )}
      >
        <motion.span
          animate={isStreakActive ? { scale: [1, 1.15, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="inline-flex"
        >
          <Flame className={cn('w-3.5 h-3.5', isStreakActive ? 'fill-orange-500/40' : 'grayscale opacity-50')} />
        </motion.span>
        {currentStreak}
      </button>

      {freezersAvailable > 0 && (
        <button
          type="button"
          onClick={onStreakClick}
          title={`${freezersAvailable} streak freezer${freezersAvailable === 1 ? '' : 's'}`}
          className="student-chip text-primary"
        >
          <Snowflake className="w-3.5 h-3.5" />
          {freezersAvailable}
        </button>
      )}

      <TodayPointsChip />

      <div
        className="student-chip text-[10px] uppercase"
        style={{
          backgroundColor: `${TIER_COLORS[tier]}20`,
          color: TIER_COLORS[tier],
          border: `1.5px solid ${TIER_COLORS[tier]}40`,
        }}
      >
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: TIER_COLORS[tier] }} />
        {TIER_DISPLAY_NAMES[tier]}
      </div>

      <button
        type="button"
        onClick={() => navigate('/practice/leaderboard')}
        className="student-chip"
        aria-label="View leaderboard"
      >
        <Trophy className="h-3 w-3 text-amber-500" />
        <span className="font-mono font-bold text-xs text-foreground">
          {!activeSprint ? '—' : rank ? `#${rank}` : '—'}
          {group && rank && (
            <span className="ml-1 text-[9px] text-muted-foreground font-normal">G{group}</span>
          )}
        </span>
      </button>
    </div>
  );
}
