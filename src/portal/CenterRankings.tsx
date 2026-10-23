import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Trophy, Users, Crown, BarChart3, History, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { useCenter } from './centerContext';
import { useCenterSprints } from './admin/ToolPages';
import { TIER_ORDER, TIER_PROMOTION_CUTOFFS, type TierType } from '@/data/badgeDefinitions';
import { TierLadder } from '@/components/student/leaderboard/TierLadder';
import { CurrentSprintTab, AllTimeTab, MyRankTab } from '@/components/student/leaderboard';
import { SkyListSkeleton } from './SkySkeleton';
import type { LeaderboardEntry, SprintInfo, AllTimeEntry, AllTimeLimit, AllTimeWindow } from '@/hooks/useLeaderboard';
import { CenterStudentProfileDialog } from './CenterStudentProfileDialog';
import { sprintPointsByDay } from './sprintPoints';

const tierName = (tier: string) => tier === 'platinum' ? 'Emerald' : tier.charAt(0).toUpperCase() + tier.slice(1);
const asTier = (t: string | null | undefined): TierType => (TIER_ORDER as readonly string[]).includes(t ?? '') ? t as TierType : 'unranked';
const EMPTY_BREAKDOWN = { questions: 0, sectionBonuses: 0, speedSessions: 0, badges: 0, bankCompletions: 0 };
const dayAfter = (date: string) => { const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); };
/** The API returns at most 1,000 rows per request, so read page by page until a short page. */
async function allPages<T>(page: (from: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) return rows;
  }
}

/** Customer leaderboard: same tabs and components as the main student leaderboard, fed only by tenant data. */
export function CenterRankings({ studentId }: { studentId: string }) {
  const { center } = useCenter();
  const sprints = useCenterSprints();
  const [limit, setLimit] = useState<AllTimeLimit>(100);
  const [win, setWin] = useState<AllTimeWindow>('all');
  const [profile, setProfile] = useState<{ id: string; name: string } | null>(null);
  const openProfile = (id: string, name: string) => setProfile({ id, name });
  const list = sprints.data ?? [];
  const active = list.find(s => s.status === 'active') ?? null;
  const board = useQuery({ queryKey: ['center-board', center.id, active?.id], enabled: !!active,
    queryFn: async () => { const { data, error } = await supabase.rpc('tenant_student_board', { _institution: center.id, _sprint: active!.id }); if (error) throw error; return data ?? []; } });
  const allTime = useQuery({ queryKey: ['center-all-time', center.id, win],
    queryFn: async () => { const { data, error } = await supabase.rpc('tenant_student_board', { _institution: center.id, _since: win === 'last30' ? new Date(Date.now() - 30 * 864e5).toISOString() : undefined }); if (error) throw error; return data ?? []; } });
  // My points in the active sprint, from the same rows and window tenant_student_board sums.
  const myPoints = useQuery({ queryKey: ['center-sprint-points', center.id, active?.id, studentId], enabled: !!active,
    queryFn: async () => {
      const from = active!.starts_on, to = dayAfter(active!.ends_on);
      const [attempts, runs] = await Promise.all([
        allPages(p => supabase.from('tenant_attempts').select('id, created_at, points, is_correct').eq('institution_id', center.id).eq('student_id', studentId)
          .gte('created_at', from).lt('created_at', to).order('created_at').order('id').range(p, p + 999)),
        allPages(p => supabase.from('tenant_speed_runs').select('id, created_at, correct').eq('institution_id', center.id).eq('student_id', studentId)
          .gte('created_at', from).lt('created_at', to).order('created_at').order('id').range(p, p + 999)),
      ]);
      return [
        ...attempts.map(a => ({ created_at: a.created_at, points: a.points ?? (a.is_correct ? 10 : 0) })),
        ...runs.map(r => ({ created_at: r.created_at, points: r.correct * 10 })),
      ];
    } });
  const pointHistory = useMemo(() => active && myPoints.data ? sprintPointsByDay(myPoints.data, active.starts_on, active.ends_on) : undefined, [active, myPoints.data]);
  const history = useQuery({ queryKey: ['center-rank-history', center.id, studentId], queryFn: async () => {
    const { data, error } = await supabase.from('tenant_rank_history').select('*').eq('institution_id', center.id).eq('student_id', studentId).order('created_at', { ascending: false }).limit(100); if (error) throw error; return data ?? [];
  } });

  const currentTier = asTier(history.data?.[0]?.next_tier);
  const unlockedAt: Record<string, string> = {};
  for (const h of [...(history.data ?? [])].reverse()) {
    if (h.tier && !unlockedAt[h.tier]) unlockedAt[h.tier] = h.created_at;
    if (h.next_tier && !unlockedAt[h.next_tier]) unlockedAt[h.next_tier] = h.created_at;
  }

  const sprintInfo: SprintInfo | null = useMemo(() => {
    if (!active) return null;
    const end = new Date(`${active.ends_on}T23:59:59`);
    const ms = Math.max(0, end.getTime() - Date.now());
    return { id: active.id, sprintNumber: list.length - list.indexOf(active), seasonNumber: 1, startDate: active.starts_on, endDate: end.toISOString(),
      daysRemaining: Math.floor(ms / 864e5), hoursRemaining: Math.floor(ms / 36e5) % 24, minutesRemaining: Math.floor(ms / 6e4) % 60, isActive: true };
  }, [active, list]);

  const entries: LeaderboardEntry[] = useMemo(() => (board.data ?? []).map(r => {
    const tier = asTier(r.tier);
    const cutoff = TIER_PROMOTION_CUTOFFS[tier] ?? 10;
    return { rank: r.standing, userId: r.student_id, username: r.name, level: Math.max(1, Math.floor(Math.log2(r.points / 100 + 1)) + 1), totalPoints: r.points,
      currentTier: tier, groupNumber: 1, isAdvancing: r.standing <= cutoff && r.points > 0, isAtRisk: false, isTop1: r.standing === 1 && r.points > 0,
      reservedNextTier: null, pointsBreakdown: { ...EMPTY_BREAKDOWN, questions: Number(r.practice_points), speedSessions: Number(r.speed_points) } };
  }), [board.data]);

  const allTimeEntries: AllTimeEntry[] = useMemo(() => (allTime.data ?? []).slice(0, limit).map(r => ({
    userId: r.student_id, username: r.name, level: Math.max(1, Math.floor(Math.log2(r.points / 100 + 1)) + 1), totalPoints: r.points, highestTier: asTier(r.tier),
    rubyWeeks: 0, isRubyLegend: false, satMathScore: null, satEnglishScore: null, satTotalScore: null, satScoreDate: null,
  })), [allTime.data, limit]);

  const me = entries.find(e => e.userId === studentId);
  const cutoff = TIER_PROMOTION_CUTOFFS[me?.currentTier ?? 'unranked'] ?? 10;
  const pointsToAdvance = me && me.rank > cutoff ? Math.max(0, (entries[cutoff - 1]?.totalPoints ?? 0) - me.totalPoints + 1) : null;
  const pointsToTop1 = me && me.rank > 1 ? Math.max(0, (entries[0]?.totalPoints ?? 0) - me.totalPoints + 1) : null;
  const ladder = <TierLadder currentTier={me?.currentTier ?? currentTier} unlockedAt={unlockedAt} standing={me?.rank ?? null} />;
  const fade = { initial: { opacity: 0, x: -20 }, animate: { opacity: 1, x: 0 }, transition: { duration: 0.2 } };

  return (
    <div className="space-y-4 md:space-y-6 select-none">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1 md:space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-2"><span className="sky-tile sky-tile-violet"><Trophy /></span>Leaderboard</h1>
        <p className="text-lg sky-body">Compete with other students at {center.name} and climb the ranks</p>
      </motion.div>

      <Tabs defaultValue={active ? 'current' : 'alltime'} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-3 md:mb-4 h-auto">
          <TabsTrigger value="current" className="gap-1 sm:gap-2 text-[11px] sm:text-sm py-1.5 px-1 sm:px-3"><Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span className="hidden sm:inline">Current Sprint</span><span className="sm:hidden">Sprint</span></TabsTrigger>
          <TabsTrigger value="alltime" className="gap-1 sm:gap-2 text-[11px] sm:text-sm py-1.5 px-1 sm:px-3"><Crown className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span>All-Time</span></TabsTrigger>
          <TabsTrigger value="myrank" className="gap-1 sm:gap-2 text-[11px] sm:text-sm py-1.5 px-1 sm:px-3"><BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span className="hidden sm:inline">My Rank</span><span className="sm:hidden">Rank</span></TabsTrigger>
          <TabsTrigger value="history" className="gap-1 sm:gap-2 text-[11px] sm:text-sm py-1.5 px-1 sm:px-3"><History className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span>History</span></TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="mt-0"><motion.div {...fade}>
          {active ? (
            <CurrentSprintTab sprint={sprintInfo} leaderboard={entries} currentUserId={studentId} isLoading={board.isLoading} ladder={ladder} onProfileClick={openProfile}
              onSprintEnd={() => { sprints.refetch(); board.refetch(); }} />
          ) : (
            <div className="space-y-4">{ladder}<Card><CardContent className="py-10 text-center text-muted-foreground">
              {list.length ? 'No sprint is running right now. Your center will start the next one soon.' : "Your center hasn't started a sprint yet."}
            </CardContent></Card></div>
          )}
        </motion.div></TabsContent>

        <TabsContent value="alltime" className="mt-0"><motion.div {...fade}>
          <AllTimeTab leaderboard={allTimeEntries} currentUserId={studentId} isLoading={allTime.isLoading} window={win} onWindowChange={setWin}
            limit={limit} onLimitChange={setLimit} showEysh={false} onProfileClick={openProfile} />
        </motion.div></TabsContent>

        <TabsContent value="myrank" className="mt-0"><motion.div {...fade}>
          <MyRankTab currentEntry={me} leaderboard={entries} pointsToAdvance={pointsToAdvance} pointsToTop1={pointsToTop1} sprint={sprintInfo} pointHistory={pointHistory} />
        </motion.div></TabsContent>

        <TabsContent value="history" className="mt-0"><motion.div {...fade}>
          <Card><CardContent className="p-3 sm:p-6">
            {history.isLoading ? <div className="py-6"><SkyListSkeleton rows={4} /></div>
              : history.error ? <p role="alert" className="py-8 text-destructive">Could not load rank history.</p>
              : !history.data?.length ? <p className="py-8 text-center text-muted-foreground">Your rank history starts after your first completed sprint.</p>
              : <div className="divide-y">{history.data.map(h => <div key={h.id} className="flex justify-between gap-4 py-4">
                  <div><p className="font-medium">{list.find(s => s.id === h.sprint_id)?.name ?? 'Completed sprint'}</p><p className="text-sm text-muted-foreground">{tierName(h.tier)} <ArrowUpRight className="inline h-4 w-4" /> {tierName(h.next_tier)}</p></div>
                  <div className="text-right font-mono"><p>#{h.final_position}</p><p className="text-xs text-muted-foreground">{h.points} pts</p></div>
                </div>)}</div>}
          </CardContent></Card>
        </motion.div></TabsContent>
      </Tabs>
      <CenterStudentProfileDialog studentId={profile?.id ?? null} name={profile?.name ?? ''} open={!!profile} onOpenChange={o => !o && setProfile(null)} />
    </div>
  );
}
