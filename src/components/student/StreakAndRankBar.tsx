import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, Snowflake, Trophy } from 'lucide-react';
import { useStudentTier } from '@/hooks/useStudentTier';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { TIER_DISPLAY_NAMES, TIER_COLORS } from '@/data/badgeDefinitions';
import { TodayPointsChip } from './TodayPointsChip';
import { cn } from '@/lib/utils';

interface StreakAndRankBarProps {
  onStreakClick?: () => void;
  className?: string;
}

/** Sum of points the server actually paid since local midnight. */
function useTodayPoints(studentId?: string) {
  return useQuery({
    queryKey: ['today-points', studentId],
    enabled: !!studentId,
    staleTime: 15000,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      let sum = 0;
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase
          .from('point_transactions')
          .select('points')
          .eq('student_account_id', studentId!)
          .gte('created_at', start.toISOString())
          .range(from, from + 999);
        if (error) throw error;
        if (!data?.length) break;
        sum += data.reduce((s, t) => s + (t.points || 0), 0);
        if (data.length < 1000) break;
      }
      return sum;
    },
  });
}

export function StreakAndRankBar({ onStreakClick, className }: StreakAndRankBarProps) {
  const navigate = useNavigate();
  const { student } = useStudentAuth();
  const { data: todayPoints } = useTodayPoints(student?.id);
  const { streak, isStreakActive, freezersAvailable } = useStudentStreak();
  const currentStreak = streak?.current_streak ?? 0;
  const { tier } = useStudentTier();
  const { currentUserEntry, activeSprint } = useLeaderboard();
  const rank = currentUserEntry?.rank ?? null;
  const group = currentUserEntry?.groupNumber;

  // The number only changes when a flying "+N" lands, so the reward feels caused.
  const todayRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef(0);
  const latest = useRef(todayPoints);
  latest.current = todayPoints;
  const [shownPoints, setShownPoints] = useState<number | undefined>(todayPoints);
  const [display, setDisplay] = useState<number | undefined>(todayPoints);
  const [hit, setHit] = useState(0);
  const [glow, setGlow] = useState(false);
  const displayRef = useRef(display);
  displayRef.current = display;
  const glowTimer = useRef<number>();

  useEffect(() => { if (inFlight.current === 0) setShownPoints(todayPoints); }, [todayPoints]);
  // Count-up from what's on screen to the new total.
  useEffect(() => {
    if (shownPoints === undefined) return;
    const from = displayRef.current;
    if (from === undefined || from >= shownPoints) { setDisplay(shownPoints); return; }
    const c = animate(from, shownPoints, { duration: 0.5, ease: 'easeOut', onUpdate: v => setDisplay(Math.round(v)) });
    return () => c.stop();
  }, [shownPoints]);

  const onLaunch = useCallback(() => { inFlight.current += 1; }, []);
  const onArrive = useCallback((points: number) => {
    inFlight.current = Math.max(0, inFlight.current - 1);
    // Use the server total if it already arrived, otherwise bump by what was paid.
    setShownPoints(prev => Math.max(latest.current ?? 0, (prev ?? 0) + points));
    setHit(h => h + 1);
    setGlow(true);
    window.clearTimeout(glowTimer.current);
    glowTimer.current = window.setTimeout(() => setGlow(false), 1100);
  }, []);
  useEffect(() => () => window.clearTimeout(glowTimer.current), []);

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

      <motion.div
        ref={todayRef}
        key={`today-${hit}`}
        initial={false}
        animate={hit ? { scale: [1, 1.3, 0.95, 1], x: [0, -2, 2, 0] } : undefined}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className={cn('student-chip relative transition-colors duration-300', glow && '!border-success ring-2 ring-success/60')}
        title="Points you collected today"
        aria-label={`${shownPoints ?? 0} points collected today`}
      >
        {hit > 0 && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit] border-2 border-success"
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: 1.6, opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        )}
        <Sparkles className={cn('h-3 w-3', glow ? 'text-success' : 'text-primary')} />
        <span className={cn('font-mono font-bold text-xs tabular-nums transition-colors duration-300', glow ? 'text-success' : 'text-foreground')}>
          {display === undefined ? '…' : `+${display.toLocaleString()}`}
        </span>
        <span className="text-[9px] text-muted-foreground">today</span>
      </motion.div>
      <PointsFlyer targetRef={todayRef} onLaunch={onLaunch} onArrive={onArrive} />

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
