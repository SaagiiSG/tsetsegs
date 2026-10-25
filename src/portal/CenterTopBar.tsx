import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Flame, Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TodayPointsChip } from '@/components/student/TodayPointsChip';
import { TIER_DISPLAY_NAMES, type TierType } from '@/data/badgeDefinitions';
import { useCenter } from './centerContext';
import { useCenterSprints } from './admin/ToolPages';
import { CenterRingHistoryDialog, CenterStreakDialog, MiniRing, SKY_RING, useCenterRingHistory, useCenterStreak } from './CenterStreak';
import { useCenterDailyProgress, useCenterGoals } from './CenterDailyGoals';
import { activeSprintId, rankFromBoard, ringStatus, todayPoints } from './studentStats';
import type { QMeta } from './questionMeta';

type Rank = { place: number; tier: TierType };

/** My place on the active sprint board, or the all-time board when no sprint is running. Null until real. */
export function useCenterRank(studentId: string): Rank | null {
  const { center } = useCenter();
  const sid = activeSprintId(useCenterSprints().data);
  // Same query keys as CenterRankings so the two share one cache entry.
  const sprint = useQuery({ queryKey: ['center-board', center.id, sid], enabled: !!sid,
    queryFn: async () => { const { data, error } = await supabase.rpc('tenant_student_board', { _institution: center.id, _sprint: sid! }); if (error) throw error; return data ?? []; } });
  const allTime = useQuery({ queryKey: ['center-all-time', center.id, 'all'], enabled: sid === null,
    queryFn: async () => { const { data, error } = await supabase.rpc('tenant_student_board', { _institution: center.id }); if (error) throw error; return data ?? []; } });
  return rankFromBoard(sid ? sprint.data : sid === null ? allTime.data : undefined, studentId);
}

export function StreakChip({ days, onClick }: { days: number; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="student-chip shrink-0" title="Day streak. Tap for history" aria-label={`${days} day streak`}>
      <Flame className="h-3.5 w-3.5 student-chip-flame" />
      <span className="tabular-nums">{days}</span>
    </button>
  );
}

export function RankChip({ rank, onClick }: { rank: Rank | null; onClick?: () => void }) {
  if (!rank) return null;
  return (
    <button type="button" onClick={onClick} className="hidden md:inline-flex student-chip shrink-0" title="Leaderboard" aria-label={`Rank ${rank.place}, ${TIER_DISPLAY_NAMES[rank.tier]}`}>
      <Trophy className="h-3.5 w-3.5 text-primary" />
      <span className="tabular-nums">{`#${rank.place}`}</span>
      <span className="text-[9px] text-muted-foreground">{TIER_DISPLAY_NAMES[rank.tier]}</span>
    </button>
  );
}

export function RingChip({ p, closed, onClick }: { p: [number, number, number]; closed: number; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="hidden md:inline-flex student-chip shrink-0" title="Daily rings" aria-label={`${closed} of 3 daily rings closed`}>
      <MiniRing size={18} stroke={1.5} gap={1} p={p} colors={SKY_RING} />
      <span className="tabular-nums">{`${closed}/3`}</span>
    </button>
  );
}

type Attempt = { question_id: string; is_correct: boolean; created_at: string; points: number | null };

export function CenterTopBar({ studentId, attempts, meta }: { studentId: string; attempts: Attempt[]; meta: Record<string, QMeta> }) {
  const navigate = useNavigate();
  const [streakOpen, setStreakOpen] = useState(false);
  const [ringOpen, setRingOpen] = useState(false);
  const streak = useCenterStreak(attempts);
  const prog = useCenterDailyProgress(studentId, attempts, meta);
  const goals = useCenterGoals(studentId).data ?? { speed: 2, hard: 5, medium: 10 };
  const history = useCenterRingHistory(attempts, prog.runs, meta);
  const rank = useCenterRank(studentId);
  const status = ringStatus(prog, goals);
  const frac = (v: number, g: number) => (g > 0 ? v / g : 1);
  return (
    <div className="flex items-center justify-center gap-2">
      <TodayPointsChip points={prog.ready ? todayPoints(attempts, prog.runs) : undefined} />
      <StreakChip days={streak.current} onClick={() => setStreakOpen(true)} />
      <RankChip rank={rank} onClick={() => navigate('/student/leaderboard')} />
      {prog.ready && <RingChip p={[frac(prog.speed, goals.speed), frac(prog.hard, goals.hard), frac(prog.medium, goals.medium)]} closed={status.closed} onClick={() => setRingOpen(true)} />}
      <CenterStreakDialog open={streakOpen} onOpenChange={setStreakOpen} streak={streak} history={history} goals={goals} />
      <CenterRingHistoryDialog open={ringOpen} onOpenChange={setRingOpen} history={history} goals={goals} />
    </div>
  );
}
