import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VideoRoadmap } from './VideoRoadmap';
import { NavLink, Navigate, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calculator, Lightbulb, Home, BookOpen, RotateCcw, Zap, Trophy, PlayCircle, Award, LogOut, Megaphone, Timer, MoreHorizontal,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MathText } from '@/components/MathText';
import { QuestionFigures } from '@/components/QuestionFigures';
import { ExplanationView } from '@/components/explanation/ExplanationView';
import { DesmosCalculator, toggleCalculator } from '@/components/student/DesmosCalculator';
import { ConceptVideoPlayer } from '@/components/concept-videos/ConceptVideoPlayer';
import { normaliseChoices } from '@/lib/bluebookReview';
import { CenterLogo, STATUS_LABEL, centerDisplayName, hexToHslToken, useCenter } from './centerContext';
import { StudentAnnouncements } from './StudentExtras';
import { SkyHomeSkeleton, SkyListSkeleton, SkyCardSkeleton } from './SkySkeleton';
import { SprintLeaderboard, useCenterSprints } from './admin/ToolPages';
import { StudentLive, isCorrect, liveSessionQuery } from './LiveSession';
import { domainStats, loadQuestionMeta, pct } from './questionMeta';
import { allPages } from './centerApi';
import { DailyRing } from '@/components/student/dashboard/DailyRing';
import { CenterGoalDialog, CenterRingNudge, useCenterDailyProgress, useCenterGoals } from './CenterDailyGoals';
import { Star, BarChart3, Target, Mountain, Sparkles, ArrowRight, Users } from 'lucide-react';
import { CenterRingHistoryDialog, useCenterStreak, useCenterRingHistory, SKY_RING, dayKey } from './CenterStreak';
import { CenterTopBar } from './CenterTopBar';
import { ExamLockContext, withLock } from './examLock';
import { StudentRail, NAV } from './StudentRail';
import { emitPointsEarned } from '@/components/student/PointsFlyer';
import { attemptPoints, runPoints, ringStatus, shouldShowRingNudge } from './studentStats';
import { CenterAnalyticsPage } from './CenterAnalytics';
import { CenterPracticeBrowser, usePracticeQuestions, useSetTotals } from './CenterPracticeBrowser';
import { PRACTICE_SETS, CB_FILTER, practiceSetFromParam, practiceSetIds } from './practiceSets';
import { CenterReviewPage } from './CenterReviewPage';
import { CenterPracticeTests } from './CenterPracticeTests';
import { CenterPracticeTest } from './CenterPracticeTest';
import { CenterProctorJoin } from './CenterProctorJoin';
import { CenterSpeedLobby, type SpeedConfig, type SpeedRun } from './CenterSpeedLobby';
import { SatSimulationIsland } from '@/components/student/dashboard/StudentSatSimulationCard';
import { centerSatSimulation, centerSatProgress } from './centerSatSimulation';
import { CenterSatUnlockIsland } from './CenterSatUnlockIsland';
import { CenterRankings } from './CenterRankings';
import { CenterProfileView, CenterBadgeGrid } from './CenterProfileView';
import { centerBadges, type CenterBadge } from './centerProfile';
import { CenterBadgeWatcher } from './CenterBadgeWatcher';
import { usePopupTurn } from './popupGate';
import { RoadmapPreview } from './RoadmapPreview';
import { topicUnits } from './videoTopics';
import { SkyDepth, AURORA, CARD_WAVES } from './SkyDepth';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor, Settings as SettingsIcon } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Bell, UserRound, GripVertical, GripHorizontal, LifeBuoy } from 'lucide-react';
import { CenterHelpPage } from './CenterHelp';
import { motion, useMotionValue, animate, useDragControls, type PanInfo } from 'framer-motion';
import { CenterOnboarding } from './CenterOnboarding';
import { onboardingStep, latchGate, type GateLatch } from './onboarding';

type Q = { id: string; question_text: string; question_image_url: string | null; question_image_url_2: string | null; figure_svg: string | null; figure_description: string | null; multiple_choice_options: any; choice_images: any; answer: string; alternate_answers: any; rationale: string | null; subject: string | null; passage_text: string | null };
const COLS = 'id, question_text, question_image_url, question_image_url_2, figure_svg, figure_description, multiple_choice_options, choice_images, answer, alternate_answers, rationale, subject, passage_text';
const DIFFS = [['all', 'Any difficulty'], ['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']] as const;
const DAILY_GOAL = 20;
const glass = 'sky-card';

function Glass({ className = '', style, children }: { className?: string; style?: React.CSSProperties; children: React.ReactNode }) {
  return <div className={`${glass} ${className}`} style={style}>{children}</div>;
}

/** Home card per practice tab: 68 blue, 150 violet, CB pink. */
const SET_LOOK = {
  '68': { blurb: 'Core SAT math patterns', family: 'blue', btn: 'sky', icon: Target, wash: 'hsl(207 90% 95%)', wave: CARD_WAVES.blue },
  SATMathTraining800: { blurb: 'Hardest problems for 800', family: 'violet', btn: 'violet', icon: Mountain, wash: 'hsl(255 90% 97%)', wave: CARD_WAVES.violet },
  CB: { blurb: 'All other math, including the new 120', family: 'pink', btn: 'pink', icon: Sparkles, wash: 'hsl(300 70% 97%)', wave: CARD_WAVES.pink },
} as const;

/** Everything the student pages share: profile, class, attendance, attempts + question meta. */
function useMe() {
  const { center, userId } = useCenter();
  return useQuery({
    queryKey: ['center-student', center.id, userId],
    queryFn: async () => {
      const { data: s } = await supabase.from('tenant_students').select('id, name, class_id').eq('institution_id', center.id).eq('user_id', userId!).maybeSingle();
      if (!s) throw new Error('missing');
      const [cls, att, attempts] = await Promise.all([
        s.class_id ? supabase.from('tenant_classes').select('name, schedule').eq('id', s.class_id).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from('tenant_attendance').select('session_date, status').eq('student_id', s.id).order('session_date', { ascending: false }).limit(60),
        allPages(p => supabase.from('tenant_attempts').select('question_id, is_correct, created_at, time_spent_seconds, points').eq('student_id', s.id).order('created_at', { ascending: false }).order('id').range(p, p + 999), 10000),
      ]);
      const list = attempts;
      // Throws rather than reading as "nothing watched".
      const vids = await supabase.from('tenant_video_progress').select('video_id, completed_at').eq('student_id', s.id);
      if (vids.error) throw vids.error;
      const meta = await loadQuestionMeta(list.map(a => a.question_id));
      return { student: s, cls: cls.data as { name: string; schedule: string | null } | null, att: att.data ?? [], attempts: list, meta, videosDone: (vids.data ?? []).map(v => v.video_id) };
    },
  });
}
type Me = NonNullable<ReturnType<typeof useMe>['data']>;

/** Students created after 0086 get onboarding until it's done; everyone else, and any failed read, gets the portal. */
function useOnboardingGate(me?: Me) {
  const { center, userId } = useCenter();
  // Own read beside useMe, so useMe still works before 0086 is applied. An error is data null = not eligible (no retries
  // holding the skeleton), and it's read once per session so a flaky refetch can't pull a student out of onboarding halfway.
  const eligible = useQuery({
    queryKey: ['center-onboarding-eligible', center.id, userId], enabled: !!userId, staleTime: Infinity,
    queryFn: async () => (await supabase.from('tenant_students').select('onboarding_eligible, sat_month').eq('institution_id', center.id).eq('user_id', userId!).maybeSingle()).data,
  });
  const goals = useCenterGoals(me?.student.id ?? '');
  // Only eligible students wait on the goals read (and only once useMe has a student); everyone else's home never does.
  const loading = (!!userId && eligible.isPending) || (!!me && eligible.data?.onboarding_eligible === true && goals.isPending);
  const live = onboardingStep(eligible.data?.onboarding_eligible, goals.data, !!me?.attempts.length);
  // Latched once the reads settle (a failed goals read latches the portal; onboarding resumes next visit). Finishing still
  // exits: "I'm in" caches onboarding_done_at.
  const latch = useRef<GateLatch>(null);
  latch.current = latchGate(latch.current, userId ?? '', !!me && !loading, live);
  const step = latch.current?.step != null && !goals.data?.onboarding_done_at ? latch.current.step : null;
  return { loading, step, satMonth: eligible.data?.sat_month ?? null, goals: goals.data };
}

/* ------------------------------ Shell ------------------------------ */

type DockEdge = 'bottom' | 'top' | 'left' | 'right';
// Top and side docks start below the sticky header (54px tall, from 12px on phones and 24px from md), so they never cover its
// chips; a top dock also widens the gap under the header (shell) so it doesn't cover the page's first line.
const DOCK_ALIGN: Record<DockEdge, string> = {
  bottom: 'items-end justify-center pb-3', top: 'items-start justify-center pt-[4.5rem] md:pt-[5.5rem]',
  left: 'items-center justify-start pl-3 pt-[4.5rem] md:pt-[5.5rem]', right: 'items-center justify-end pr-3 pt-[4.5rem] md:pt-[5.5rem]',
};
const DOCK_SPRING = { type: 'spring' as const, stiffness: 260, damping: 26, mass: 0.8 };
const DOCK_KEY = 'center_dock_edge';

/** Floating dock for phones/iPad: drag the handle and it snaps to the nearest screen edge (vertical on left/right). */
function MovableDock({ edge, setEdge }: { edge: DockEdge; setEdge: (e: DockEdge) => void }) {
  const { signOut } = useCenter();
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const x = useMotionValue(0), y = useMotionValue(0);
  const controls = useDragControls();
  const vertical = edge === 'left' || edge === 'right';
  const onDragEnd = (_: unknown, info: PanInfo) => {
    const w = window.innerWidth, h = window.innerHeight, px = info.point.x, py = info.point.y;
    const d: Record<DockEdge, number> = { left: px / w, right: 1 - px / w, top: py / h, bottom: 1 - py / h };
    const next = (Object.keys(d) as DockEdge[]).reduce((a, b) => (d[a] < d[b] ? a : b));
    animate(x, 0, DOCK_SPRING); animate(y, 0, DOCK_SPRING);
    setEdge(next); localStorage.setItem(DOCK_KEY, next);
  };
  const side = edge === 'left' ? 'right' : edge === 'right' ? 'left' : edge === 'top' ? 'bottom' : 'top';
  return (
    <div className={`lg:hidden fixed inset-0 z-40 flex pointer-events-none ${DOCK_ALIGN[edge]}`}>
      <motion.nav aria-label="Student" layout transition={DOCK_SPRING} drag dragListener={false} dragControls={controls}
        dragMomentum={false} dragElastic={0.15} onDragEnd={onDragEnd} whileDrag={{ scale: 1.05 }} style={{ x, y }}
        className={`pointer-events-auto select-none student-dock rounded-full p-1.5 flex items-center gap-0.5 ${vertical ? 'flex-col' : 'flex-row'}`}>
        <button type="button" aria-label="Drag dock" onPointerDown={e => controls.start(e)}
          className={`touch-none cursor-grab active:cursor-grabbing grid place-items-center text-foreground/50 ${vertical ? 'h-6 w-9' : 'h-9 w-6'}`}>
          {vertical ? <GripHorizontal className="h-4 w-4" /> : <GripVertical className="h-4 w-4" />}
        </button>
        {NAV.slice(0, 5).map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} aria-label={label} draggable={false} className={({ isActive }) => `rounded-full p-2.5 transition-all active:scale-90 ${isActive ? 'bg-primary text-primary-foreground scale-105' : 'text-foreground/65'}`}><Icon className="h-4 w-4" /></NavLink>
        ))}
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="More pages"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger><DropdownMenuContent side={side} align="end">{NAV.slice(5).map(({ to, label, icon: Icon }) => <DropdownMenuItem key={to} asChild><NavLink to={to}><Icon className="h-4 w-4 mr-2"/>{label}</NavLink></DropdownMenuItem>)}<DropdownMenuItem asChild><NavLink to="/student/profile"><UserRound className="h-4 w-4 mr-2"/>Profile</NavLink></DropdownMenuItem><DropdownMenuItem asChild><NavLink to="/student/settings"><SettingsIcon className="h-4 w-4 mr-2"/>Settings</NavLink></DropdownMenuItem><DropdownMenuCheckboxItem className="pl-2 [&>span:first-child]:hidden" checked={dark} onCheckedChange={c => setTheme(c ? 'dark' : 'light')} onSelect={e => e.preventDefault()}><Moon className="h-4 w-4 mr-2"/>Dark mode<Switch className="ml-auto pointer-events-none" tabIndex={-1} checked={dark} aria-hidden /></DropdownMenuCheckboxItem><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive focus:text-destructive dark:text-red-400 dark:focus:text-red-400" onSelect={signOut}><LogOut className="h-4 w-4 mr-2"/>Log out</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
      </motion.nav>
    </div>
  );
}

export default function CenterStudentPortal() {
  const { center } = useCenter();
  const me = useMe();
  const gate = useOnboardingGate(me.data);
  const [notesOpen, setNotesOpen] = useState(false);
  const [lockers, setLockers] = useState<ReadonlySet<string>>(new Set());
  const setLock = useCallback((id: string, on: boolean) => setLockers(h => withLock(h, id, on)), []);
  const locked = lockers.size > 0;
  // The shell owns the dock edge so a top dock can push the page content below itself.
  const [dockEdge, setDockEdge] = useState<DockEdge>(() => {
    const v = localStorage.getItem(DOCK_KEY);
    return v === 'top' || v === 'left' || v === 'right' ? v : 'bottom';
  });
  useEffect(() => {
    document.body.classList.add('student-portal', 'customer-student-portal');
    return () => document.body.classList.remove('student-portal', 'customer-student-portal');
  }, []);

  if (me.data && gate.step != null) return <OnboardingRoute me={me.data} start={gate.step} satMonth={gate.satMonth} goals={gate.goals} />;

  return (
    <div className="student-theme customer-student-theme min-h-screen overflow-x-clip admin-glow-scope">
      <SkyDepth />
      <ExamLockContext.Provider value={setLock}>
      <div className="relative z-[1] flex">
        {!locked && <><div className="hidden lg:block m-4 w-16 shrink-0" aria-hidden />
        <StudentRail /></>}

        <main className="flex-1 min-w-0 p-3 md:p-6 lg:p-8 pb-28 lg:pb-8">
          {!locked && <header className={`student-header sticky top-2 z-30 mb-4 ${dockEdge === 'top' ? 'max-lg:mb-[4.5rem]' : ''} grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl border px-2 py-1.5 backdrop-blur lg:flex lg:justify-end`}>
            <div className="lg:hidden flex min-w-0 items-center gap-2"><CenterLogo center={center} className="h-8 w-8 shrink-0" /><p className="truncate font-semibold">{centerDisplayName(center)}</p></div>
            {me.data ? <CenterTopBar studentId={me.data.student.id} attempts={me.data.attempts} meta={me.data.meta} /> : <div />}
            <div className="flex items-center justify-end gap-1">
              <Button variant="ghost" size="icon" className="student-bell rounded-full" onClick={() => setNotesOpen(true)} aria-label="Announcements"><Bell className="h-5 w-5" /></Button>
            </div>
          </header>}
          {me.isLoading || gate.loading ? <SkyHomeSkeleton /> : !me.data ? (me.error?.message === 'missing'
            ? <p className="text-sm">Your account isn't linked. Contact your center.</p>
            : <div className="space-y-3"><p className="text-sm">We couldn't load your progress. Check your connection and try again.</p><Button variant="outline" onClick={() => me.refetch()}>Try again</Button></div>) : (
            <div className="max-w-[1400px] mx-auto space-y-5">
              {me.data.student.class_id && <StudentLive studentId={me.data.student.id} classId={me.data.student.class_id} />}
              <MyBadgeWatcher me={me.data} />
              <Routes>
                <Route index element={<HomePage me={me.data} />} />
                <Route path="practice" element={<PracticePage me={me.data} />} />
                <Route path="speed" element={<SpeedPage me={me.data} />} />
                <Route path="sat/*" element={<Navigate to="/student" replace />} />
                <Route path="review" element={<ReviewPage me={me.data} />} />
                <Route path="analytics" element={<AnalyticsRoute me={me.data} />} />
                <Route path="leaderboard" element={<CenterRankings studentId={me.data.student.id} />} />
                <Route path="videos" element={<VideosPage me={me.data} />} />
                <Route path="tests" element={<CenterPracticeTests studentId={me.data.student.id} />} />
                <Route path="tests/:attemptId" element={<CenterPracticeTest />} />
                <Route path="proctor/:code" element={<CenterProctorJoin />} />
                <Route path="badges" element={<BadgesPage me={me.data} />} />
                <Route path="profile" element={<CenterProfileView studentId={me.data.student.id} name={me.data.student.name} />} />
                <Route path="settings" element={<StudentSettingsPage />} />
                <Route path="help" element={<CenterHelpPage />} />
                <Route path="*" element={<Navigate to="/student" replace />} />
              </Routes>
            </div>
          )}
        </main>
      </div>
      </ExamLockContext.Provider>

      <Sheet open={notesOpen} onOpenChange={setNotesOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-primary" />Announcements</SheetTitle></SheetHeader>
          <div className="mt-4">{me.data ? <StudentAnnouncements studentId={me.data.student.id} /> : <SkyListSkeleton rows={3} />}</div>
        </SheetContent>
      </Sheet>

      {!locked && <MovableDock edge={dockEdge} setEdge={setDockEdge} />}
    </div>
  );
}

/** Onboarding replaces the whole shell (no rail, top bar or dock). */
function OnboardingRoute({ me, start, satMonth, goals }: { me: Me; start: number; satMonth: string | null; goals: ReturnType<typeof useOnboardingGate>['goals'] }) {
  const record = useRecordAttempt(me);
  return <CenterOnboarding studentId={me.student.id} attempts={me.attempts} meta={me.meta} start={start} satMonth={satMonth} goals={goals} record={record} />;
}

function AnalyticsRoute({ me }: { me: Me }) {
  const s = useCenterStreak(me.attempts);
  return <CenterAnalyticsPage attempts={me.attempts} meta={me.meta} streak={s.current} />;
}

/* ------------------------------ Home ------------------------------ */

function Ring({ value, goal, label }: { value: number; goal: number; label: string }) {
  const r = 52, c = 2 * Math.PI * r, p = Math.min(1, goal ? value / goal : 0);
  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 120 120" className="h-36 w-36 -rotate-90">
        <circle cx="60" cy="60" r={r} className="stroke-muted" strokeWidth="10" fill="none" />
        <circle cx="60" cy="60" r={r} stroke="hsl(var(--section-glow))" strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p)} style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      <p className="-mt-24 mb-14 font-mono text-2xl">{value}<span className="text-sm text-muted-foreground">/{goal}</span></p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

/** Students already nudged this session, so blocked storage can't reopen it on every return to Home. */
const nudgeShown = new Set<string>();

export function HomePage({ me }: { me: Me }) {
  const navigate = useNavigate();
  const totals = useSetTotals();
  const today = new Date().toDateString();
  const todayList = me.attempts.filter(a => new Date(a.created_at).toDateString() === today);
  const total = me.attempts.length, correct = me.attempts.filter(a => a.is_correct).length;
  const present = me.att.filter(a => a.status === 'present' || a.status === 'late').length;
  const domains = useMemo(() => domainStats(me.attempts, me.meta), [me]);
  const solved = useMemo(() => new Set(me.attempts.filter(a => a.is_correct).map(a => a.question_id)), [me]);
  const first = me.student.name.split(' ')[0];
  const goals = useCenterGoals(me.student.id);
  const prog = useCenterDailyProgress(me.student.id, me.attempts, me.meta);
  const [goalOpen, setGoalOpen] = useState(false);
  const [ringOpen, setRingOpen] = useState(false);
  const [goalDue, setGoalDue] = useState(false);
  const goalSeenKey = `center_goals_seen_${me.student.id}`;
  useEffect(() => {
    if (!goals.data || goals.data.isSet) return;
    let seen: string | null = null;
    try { seen = localStorage.getItem(goalSeenKey); } catch { /* storage blocked: treat as unseen */ }
    if (seen) return;
    setGoalDue(true);
  }, [goals.data, goalSeenKey]);
  // The first-visit goal dialog waits its turn too, so it never stacks on the badge pop-up.
  const goalTurn = usePopupTurn('ring-goals', goalDue);
  useEffect(() => {
    if (!goalTurn) return;
    setGoalOpen(true);
    try { localStorage.setItem(goalSeenKey, '1'); } catch { /* ignore */ }
  }, [goalTurn, goalSeenKey]);
  const g = goals.data ?? { speed: 2, hard: 5, medium: 10 };
  const [nudgeDue, setNudgeDue] = useState(false);
  const nudgeKey = `center_ring_nudge_${me.student.id}`;
  // Once per local day; never opens on top of the "Set your daily ring" dialog (goalOpen is a dependency, so it opens after that closes),
  // and waits its turn behind badge pop-ups, live games and any other dialog.
  useEffect(() => {
    if (goalOpen || !goals.data || nudgeShown.has(me.student.id)) return;
    let lastShown: string | null = null;
    try { lastShown = localStorage.getItem(nudgeKey); } catch { /* storage blocked: the session flag still limits it to once */ }
    if (!shouldShowRingNudge({ goalsSet: goals.data.isSet, ready: prog.ready, done: ringStatus(prog, goals.data).done, lastShown, today: dayKey(new Date()) })) return;
    setNudgeDue(true);
  }, [goalOpen, goals.data, prog, me.student.id, nudgeKey]);
  const nudgeOpen = usePopupTurn('ring-nudge', nudgeDue);
  // The day counts as nudged only once the student closed it, by dismissing or by "Start practicing". Closing gives the turn back.
  const closeNudge = () => { nudgeShown.add(me.student.id); setNudgeDue(false); try { localStorage.setItem(nudgeKey, dayKey(new Date())); } catch { /* ignore */ } };
  // Topic order and per-video state, exactly as the videos page shows them.
  const videos = usePublishedVideos();
  const videosFailed = videos.isError && !videos.data;
  const videoItems = topicUnits(videos.data ?? [], new Set(me.videosDone)).flatMap(u => u.items.map(i => ({ id: i.video.id, state: i.state })));
  const videosWatched = videoItems.filter(i => i.state === 'done').length;
  const ringHistory = useCenterRingHistory(me.attempts, prog.runs, me.meta);
  const ringDone = prog.speed >= g.speed && prog.hard >= g.hard && prog.medium >= g.medium;
  const simulation = useMemo(() => centerSatSimulation(me.attempts, me.meta), [me.attempts, me.meta]);
  const simulationProgress = useMemo(() => centerSatProgress(me.attempts, me.meta), [me.attempts, me.meta]);
  // Save today's simulated score so it can be compared with the real SAT later.
  const { center: simCenter } = useCenter();
  useEffect(() => {
    if (!simulation?.simScore) return;
    supabase.rpc('tenant_save_sat_prediction', { _institution: simCenter.id, p_sim: simulation.simScore }).then(() => {});
  }, [simulation?.simScore, simCenter.id]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold">Hey {first}</h1>
        <p className="text-lg sky-body mt-1">{!goals.data?.isSet ? 'Set up your daily ring to get started.' : ringDone ? 'Rings closed. Keep the streak going.' : "Let's close those rings today."}</p>
      </div>
      {/* Tablet: 2 x 2 (the set cards join this grid via md:contents). Desktop: ring + three sets in one row. */}
      <div className="grid gap-4 md:grid-cols-2 md:auto-rows-fr lg:grid-cols-12">
        <div className="lg:col-span-3 md:min-h-[320px]">
          {prog.failed ? <div role="alert" className="sky-card h-full text-sm text-muted-foreground">Couldn't load today's speed runs.</div> : <DailyRing
            speed={{ current: prog.speed, goal: g.speed }}
            hard={{ current: prog.hard, goal: g.hard }}
            medium={{ current: prog.medium, goal: g.medium }}
            onEditGoals={() => setGoalOpen(true)}
            onShowHistory={() => setRingOpen(true)}
            colors={SKY_RING}
            decor={AURORA}
            className="sky-card !p-0"
          />}
        </div>
        <CenterRingHistoryDialog open={ringOpen} onOpenChange={setRingOpen} history={ringHistory} goals={g} />
        <CenterRingNudge open={nudgeOpen} onOpenChange={o => { if (!o) closeNudge(); }} progress={prog} goals={g} onStart={() => { closeNudge(); navigate('/student/practice?mode=random'); }} />
        <CenterGoalDialog open={goalOpen} onOpenChange={o => { setGoalOpen(o); if (!o) setGoalDue(false); }} studentId={me.student.id} goals={goals.data} />
        <div className="grid gap-3 sm:grid-cols-3 md:contents lg:grid lg:col-span-9">
          {PRACTICE_SETS.map(s => {
            const ids = totals.data?.[s.key] ?? [];
            const done = ids.filter(id => solved.has(id)).length;
            const look = SET_LOOK[s.key];
            const p = pct(done, ids.length);
            return (
              <button key={s.key} onClick={() => navigate(`/student/practice?set=${s.key}`)} className="text-left group">
                <Glass className="sky-wash sky-decor h-full flex flex-col transition-transform group-hover:-translate-y-0.5" style={{ '--wash': look.wash, '--wave': `url(${look.wave})` } as React.CSSProperties}>
                  <div className="flex items-center gap-3">
                    <span className={`sky-tile sky-tile-${look.family}`}><look.icon /></span>
                    <div className="min-w-0"><p className="font-semibold">{s.label}</p><p className="text-sm text-muted-foreground line-clamp-2" title={look.blurb}>{look.blurb}</p></div>
                  </div>
                  <p className="font-mono text-4xl font-bold mt-auto pt-10">{done}<span className="text-xl font-normal sky-ink-soft">/{ids.length || '…'}</span></p>
                  <div className="flex items-center gap-3 mt-3">
                    <div className="sky-track flex-1"><div className={`sky-fill-${look.family}`} style={{ width: `${p}%` }} /></div>
                    <span className="sky-pct">{p}%</span>
                  </div>
                  <span className={`sky-btn sky-btn-${look.btn} w-full mt-4`}>Continue<ArrowRight className="h-5 w-5" /></span>
                </Glass>
              </button>
            );
          })}
        </div>
      </div>
      {simulation ? <SatSimulationIsland latest={simulation} trend={simulation.trend} /> : <CenterSatUnlockIsland distinct={simulationProgress} />}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Glass className="sky-wash sky-decor md:col-span-2 space-y-4 min-h-[180px]" style={{ '--wash': 'hsl(207 90% 96%)', '--wave': `url(${CARD_WAVES.blue})` } as React.CSSProperties}>
          <div className="flex items-center gap-3">
            <span className="sky-tile sky-tile-solid"><BarChart3 /></span>
            <div><p className="text-lg font-bold">Domain mastery</p><p className="text-sm text-muted-foreground">Your accuracy by topic</p></div>
          </div>
          {!domains.length ? (
            <div className="relative min-h-[90px]">
              <p className="sky-body">Solve a few problems to see your strengths.</p>
              <div aria-hidden className="absolute right-0 bottom-0 flex items-end gap-2.5">
                {[28, 42, 56, 76, 100].map(h => <span key={h} className="w-5 rounded-t-md" style={{ height: h, background: 'linear-gradient(180deg, #C7DBFE, transparent)' }} />)}
              </div>
            </div>
          ) : domains.map(d => (
            <div key={d.domain} className="space-y-1"><div className="flex justify-between text-sm"><span>{d.domain} <span className="text-xs text-muted-foreground capitalize">· {d.subject}</span></span><span className="font-mono text-xs">{pct(d.c, d.n)}% <span className="text-muted-foreground">({d.n})</span></span></div>
              <div className="sky-track !h-2.5"><div className="sky-fill-blue" style={{ width: `${pct(d.c, d.n)}%` }} /></div></div>
          ))}
        </Glass>
        <button onClick={() => navigate('/student/videos')} className="text-left group">
          <Glass className="sky-decor h-full space-y-4 transition-transform group-hover:-translate-y-0.5" style={{ '--wave': `url(${CARD_WAVES.violet})` } as React.CSSProperties}>
            <div className="flex items-center gap-3">
              <span className="sky-tile sky-tile-video"><PlayCircle /></span>
              <div><p className="text-lg font-bold leading-tight">Concept videos</p><p className="text-sm text-muted-foreground">Your video roadmap</p></div>
            </div>
            {videosFailed ? <p className="sky-body">Couldn't load videos.</p> : <>
              <p className="font-mono text-4xl font-bold">{videosWatched}<span className="text-xl font-normal sky-ink-soft">/{videoItems.length || '…'}</span></p>
              <div className="sky-track"><div className="sky-fill-violet" style={{ width: `${pct(videosWatched, videoItems.length)}%` }} /></div>
            </>}
            <span className="sky-link">Continue your roadmap<ArrowRight className="h-4 w-4" /></span>
            <RoadmapPreview items={videoItems} />
          </Glass>
        </button>
        <Glass className="sky-decor space-y-4" style={{ '--wave': `url(${CARD_WAVES.orange})` } as React.CSSProperties}>
          <div className="flex items-center gap-3">
            <span className="sky-tile sky-tile-orange"><Users /></span>
            <div className="min-w-0"><p className="text-lg font-bold truncate" title={me.cls?.name ?? undefined}>{me.cls?.name ?? 'Not assigned'}</p>{me.cls?.schedule && <p className="text-sm text-muted-foreground truncate">{me.cls.schedule}</p>}</div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><p className="text-xs text-muted-foreground">Answered</p><p className="font-mono text-2xl font-medium">{total}</p></div>
            <div><p className="text-xs text-muted-foreground">Accuracy</p><p className="font-mono text-2xl font-medium">{total ? `${pct(correct, total)}%` : '–'}</p></div>
            <div><p className="text-xs text-muted-foreground">Attended</p><p className="font-mono text-2xl font-medium">{present}/{me.att.length}</p></div>
          </div>
          {me.att[0] && <div className="flex justify-between text-sm"><span className="font-mono">{me.att[0].session_date}</span><span className="text-muted-foreground">{STATUS_LABEL[me.att[0].status]}</span></div>}
        </Glass>
      </div>
    </div>
  );
}

/* ------------------------------ Solver ------------------------------ */

function useRecordAttempt(me: Me) {
  const { center, userId } = useCenter();
  const qc = useQueryClient();
  // The server grades `answer` and decides points; `ok` is display-only.
  return async (questionId: string, ok: boolean, seconds?: number, answer?: string) => {
    const key = ['center-student', center.id, userId];
    const { data: row } = await supabase.from('tenant_attempts').insert({ institution_id: center.id, student_id: me.student.id, question_id: questionId, is_correct: ok, answer: answer ?? '', time_spent_seconds: seconds != null ? Math.max(1, Math.min(3600, Math.round(seconds))) : null })
      .select('question_id, is_correct, created_at, time_spent_seconds, points').single();
    if (!row) { qc.invalidateQueries({ queryKey: key }); return null; }
    const paid = attemptPoints(row);
    emitPointsEarned(paid); // emit first: the chip holds its number until "+N" lands
    if (paid > 0) for (const k of ['center-board', 'center-all-time']) qc.invalidateQueries({ queryKey: [k, center.id] });
    // Add the server-graded row to the cached history instead of re-reading every answer.
    const meta = me.meta[questionId] ? {} : await loadQuestionMeta([questionId]);
    qc.setQueryData<Me>(key, old => old && { ...old, attempts: [row, ...old.attempts], meta: { ...old.meta, ...meta } });
    return { is_correct: row.is_correct, points: paid };
  };
}

function Solver({ q, me, onNext }: { q: Q; me: Me; onNext: () => void }) {
  const record = useRecordAttempt(me);
  const [picked, setPicked] = useState(''); const [typed, setTyped] = useState('');
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [tries, setTries] = useState(0);
  const [showExp, setShowExp] = useState(false);
  const [forfeit, setForfeit] = useState(false);
  const startedAt = useRef(Date.now());
  useEffect(() => { setPicked(''); setTyped(''); setResult(null); setTries(0); setShowExp(false); setForfeit(false); startedAt.current = Date.now(); }, [q.id]);
  const choices = normaliseChoices(q.multiple_choice_options, q.choice_images);
  const submit = async () => {
    const given = choices.length ? picked : typed;
    const ok = isCorrect(q, given);
    // Only the first try counts, and peeking at the explanation first forfeits it.
    if (tries === 0 && !forfeit) await record(q.id, ok, (Date.now() - startedAt.current) / 1000, given);
    setTries(t => t + 1); setResult(ok ? 'correct' : 'wrong');
  };
  const openExplanation = () => {
    if (!showExp && result !== 'correct' && q.rationale && !forfeit) {
      if (!window.confirm("Viewing the explanation before solving means this question won't count toward your stats. Continue?")) return;
      setForfeit(true);
    }
    setShowExp(v => !v);
  };
  return (
    <div className={`grid gap-4 ${showExp ? 'xl:grid-cols-[1fr_minmax(0,420px)]' : ''}`}>
      <article className="sky-card space-y-5 min-w-0">
        {q.passage_text && <div className="text-sm leading-relaxed border-l-2 pl-4"><MathText text={q.passage_text} /></div>}
        <div className="leading-relaxed"><MathText text={q.question_text} /></div>
        <QuestionFigures svg={q.figure_svg} description={q.figure_description} url1={q.question_image_url} url2={q.question_image_url_2} className="justify-start" imgClassName="max-h-80 rounded border bg-background" />
        {choices.length ? (
          <div className="grid gap-2">{choices.map(c => (
            <Button variant="ghost" key={c.letter} disabled={result === 'correct'} onClick={() => { setPicked(c.letter); if (result === 'wrong') setResult(null); }}
              className={`student-choice h-auto min-h-12 whitespace-normal justify-start text-left rounded-xl border p-3 flex gap-3 items-start transition-colors active:scale-[0.99] ${picked === c.letter ? 'border-primary bg-primary/10' : 'hover:bg-muted/50'}`}>
              <span className="font-mono text-sm w-5">{c.letter}</span><span className="min-w-0 flex-1">{c.image ? <img src={c.image} alt={`Choice ${c.letter}`} className="max-h-40" /> : <MathText text={c.text} />}</span>
            </Button>))}</div>
        ) : <Input aria-label="Your answer" value={typed} onChange={e => { setTyped(e.target.value); if (result === 'wrong') setResult(null); }} placeholder="Type your answer" className="max-w-xs font-mono" />}
        {result === 'wrong' && <p role="status" className="text-sm text-status-risk">Not quite — try again.</p>}
        {result === 'correct' && <p role="status" className="text-sm text-status-healthy">Correct!{forfeit && ' (not counted — explanation viewed)'}</p>}
        <div className="flex flex-wrap gap-2">
          {result !== 'correct' && <Button onClick={submit} disabled={choices.length ? !picked : !typed.trim()}>Check</Button>}
          <Button variant="outline" onClick={openExplanation}><Lightbulb className="h-4 w-4" />{showExp ? 'Hide explanation' : 'Show explanation'}</Button>
          <Button variant={result === 'correct' ? 'default' : 'ghost'} onClick={onNext}>Next question</Button>
        </div>
      </article>
      {showExp && (
        <aside className="sky-card xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto">
          <p className="text-xs text-muted-foreground mb-3">Explanation</p>
          {q.rationale ? <ExplanationView text={q.rationale} /> : <p className="text-sm text-muted-foreground">No explanation has been written for this question yet.</p>}
        </aside>
      )}
    </div>
  );
}

/* ------------------------------ Practice ------------------------------ */

function PracticePage({ me }: { me: Me }) {
  const [params, setParams] = useSearchParams();
  const set = practiceSetFromParam(params.get('set'));
  const pinned = params.get('q');
  const cats = useQuery({ queryKey: ['question-categories'], queryFn: async () => (await supabase.from('question_categories').select('id, name').order('name')).data ?? [] });
  const [subject, setSubject] = useState<'math' | 'english'>('math');
  const [domain, setDomain] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [q, setQ] = useState<Q | null | undefined>(undefined);

  const domainOptions = useMemo(() => {
    const english = ['Information and Ideas', 'Craft and Structure', 'Expression of Ideas', 'Standard English Conventions'];
    return (cats.data ?? []).filter(c => subject === 'english' ? english.includes(c.name) : !english.includes(c.name));
  }, [cats.data, subject]);
  useEffect(() => { setDomain('all'); }, [subject]);

  const loadQuestion = useCallback(async () => {
    setQ(undefined);
    if (pinned) {
      const { data } = await supabase.from('intl_questions').select(COLS).eq('id', pinned).maybeSingle();
      setQ((data as Q) ?? null); return;
    }
    const sub = subject === 'math' ? ['math', 'Math'] : ['english', 'English'];
    const base = () => {
      let b = supabase.from('intl_questions').select(COLS, { count: 'exact' }).eq('is_active', true).eq('hide_from_practice', false).in('subject', sub);
      if (subject === 'math') b = set === 'CB' ? b.or(CB_FILTER) : b.eq('question_set', set);
      if (domain !== 'all') b = b.eq('category_id', domain);
      if (difficulty !== 'all') b = b.ilike('difficulty_level', difficulty);
      return b;
    };
    const { count } = await base().range(0, 0);
    if (!count) { setQ(null); return; }
    const offset = Math.floor(Math.random() * count);
    const { data } = await base().range(offset, offset);
    setQ((data?.[0] as Q) ?? null);
  }, [subject, domain, difficulty, set, pinned]);
  const solving = !!pinned || params.get('mode') === 'random';
  useEffect(() => { if (solving) loadQuestion(); }, [loadQuestion, solving]);

  const setSet = (v: string) => { const p = new URLSearchParams(params); p.delete('q'); p.set('set', v); setParams(p); setSubject('math'); };
  const next = () => { if (pinned) { const p = new URLSearchParams(params); p.delete('q'); p.set('mode', 'random'); setParams(p); } else loadQuestion(); };
  const back = () => { const p = new URLSearchParams(params); p.delete('q'); p.delete('mode'); setParams(p); };

  if (!solving) return (
    <div className="space-y-4">
      <div className="flex items-center gap-3"><span className="sky-tile sky-tile-blue"><BookOpen /></span><div><h1 className="text-3xl font-bold">Practice</h1><p className="sky-body mt-1">One question closer to your goal.</p></div></div>
      <CenterPracticeBrowser
        attempts={me.attempts} subject={subject} setKey={set}
        onSubject={s => { setSubject(s); if (s === 'english') { const p = new URLSearchParams(params); p.delete('set'); setParams(p); } }}
        onSet={setSet}
        onOpen={id => { const p = new URLSearchParams(params); p.set('q', id); setParams(p); }}
        onRandom={() => { const p = new URLSearchParams(params); p.set('mode', 'random'); setParams(p); }} />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3"><Button variant="ghost" size="sm" onClick={back}>← All questions</Button><h1 className="text-2xl font-bold tracking-tight">Practice</h1></div>
      <div className="sky-card flex flex-wrap gap-2 items-center !p-3">
        <div className="flex gap-1 rounded-lg border p-1" role="tablist" aria-label="Subject">
          {(['math', 'english'] as const).map(s => <Button variant="ghost" key={s} role="tab" aria-selected={subject === s} onClick={() => setSubject(s)}
            className={`rounded-md px-3 py-1 text-sm active:scale-[0.97] transition-colors ${subject === s ? 'bg-primary text-primary-foreground' : 'text-foreground/70 hover:text-foreground'}`}>{s === 'math' ? 'Math' : 'English'}</Button>)}
        </div>
        {subject === 'math' && <Select value={set} onValueChange={setSet}><SelectTrigger className="w-44" aria-label="Question set"><SelectValue /></SelectTrigger>
          <SelectContent>{PRACTICE_SETS.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent></Select>}
        <Select value={domain} onValueChange={setDomain}><SelectTrigger className="w-56" aria-label="Domain"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All domains</SelectItem>{domainOptions.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
        <Select value={difficulty} onValueChange={setDifficulty}><SelectTrigger className="w-40" aria-label="Difficulty"><SelectValue /></SelectTrigger>
          <SelectContent>{DIFFS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
        {subject === 'math' && <Button variant="outline" size="sm" onClick={toggleCalculator}><Calculator className="h-4 w-4" />Desmos</Button>}
      </div>
      {q === undefined ? <SkyCardSkeleton lines={4} /> : q === null ? <p className="text-sm text-muted-foreground">No questions match these filters. Try another set, domain or difficulty.</p> : <Solver q={q} me={me} onNext={next} />}
      {subject === 'math' && <DesmosCalculator />}
    </div>
  );
}

/* ------------------------------ Speed mode ------------------------------ */

function SpeedPage({ me }: { me: Me }) {
  const record = useRecordAttempt(me);
  const { center } = useCenter();
  const qc = useQueryClient();
  const [cfg, setCfg] = useState<SpeedConfig | null>(null);
  const subject = cfg?.subject ?? 'math';
  const SPEED_SECONDS = cfg?.duration ?? 120;
  const [qs, setQs] = useState<Q[] | null>(null);
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(SPEED_SECONDS);
  const [qStart, setQStart] = useState(SPEED_SECONDS);
  const [picked, setPicked] = useState(''); const [typed, setTyped] = useState('');
  const [score, setScore] = useState<boolean[]>([]);
  const [timeUp, setTimeUp] = useState(false);

  const runs = useQuery({
    queryKey: ['center-speed-runs', me.student.id, 'list'],
    queryFn: async () => ((await supabase.from('tenant_speed_runs').select('id, created_at, subject, correct, total, duration_seconds, total_time_seconds, category').eq('student_id', me.student.id).order('created_at', { ascending: false }).limit(200)).data ?? []) as SpeedRun[],
  });

  const start = async (c: SpeedConfig = cfg!) => {
    setCfg(c);
    const sub = c.subject === 'math' ? ['math', 'Math'] : ['english', 'English'];
    const base = () => { let b = supabase.from('intl_questions').select(COLS, { count: 'exact' }).eq('is_active', true).eq('hide_from_practice', false).in('subject', sub); if (c.category) b = b.eq('category_id', c.category); return b; };
    const { count } = await base().range(0, 0);
    const off = Math.max(0, Math.floor(Math.random() * Math.max(1, (count ?? 0) - 80)));
    const { data } = await base().range(off, off + 79);
    const pool = [...(data as Q[] ?? [])].sort(() => Math.random() - 0.5).slice(0, c.count);
    setQs(pool); setI(0); setScore([]); setLeft(c.duration); setQStart(c.duration); setPicked(''); setTyped(''); setTimeUp(false);
  };
  const q = qs?.[i];
  const done = qs && (i >= qs.length || timeUp);
  useEffect(() => {
    if (!done || !qs?.length || !cfg) return;
    supabase.from('tenant_speed_runs').insert({ student_id: me.student.id, institution_id: center.id, subject, correct: score.filter(Boolean).length, total: Math.max(score.length, 1), duration_seconds: cfg.duration, total_time_seconds: cfg.duration - left, category: cfg.category }).select('correct').single()
      .then(({ data }) => { if (data) emitPointsEarned(runPoints(data)); qc.invalidateQueries({ queryKey: ['center-speed-runs', me.student.id] }); });
  }, [done]);
  const answer = useCallback(async (given: string) => {
    if (!q) return;
    const ok = !!given && isCorrect(q, given);
    record(q.id, ok, qStart - left, given);
    setScore(s => [...s, ok]); setI(n => n + 1); setQStart(left); setPicked(''); setTyped('');
  }, [q, record, left, qStart]);
  useEffect(() => {
    if (!q || done) return;
    if (left <= 0) { setTimeUp(true); return; }
    const t = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left, q, done]);

  if (!qs) return <CenterSpeedLobby runs={runs.data ?? []} onStart={start} />;
  if (done) {
    const c = score.filter(Boolean).length;
    const ratio = qs.length ? c / qs.length : 0;
    const stars = ratio >= 0.9 ? 3 : ratio >= 0.7 ? 2 : ratio >= 0.5 ? 1 : 0;
    return (
      <Glass className="max-w-xl text-center space-y-3">
        <div className="flex justify-center gap-1">{[0, 1, 2].map(n => <Star key={n} className={`h-9 w-9 ${n < stars ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`} />)}</div>
        <p className="font-mono text-3xl">{c}/{qs.length}</p>
        <p className="text-sm sky-body">{timeUp ? 'Time is up. ' : ''}{stars === 3 ? 'Perfect pace.' : 'Run it again to climb a star.'}</p>
        <div className="flex justify-center gap-2"><Button onClick={() => start()}>Play again</Button><Button variant="ghost" onClick={() => setQs(null)}>Back to speed practice</Button></div>
      </Glass>
    );
  }
  if (!q) return <p className="text-sm text-muted-foreground">No questions available.</p>;
  const choices = normaliseChoices(q.multiple_choice_options, q.choice_images);
  return (
    <div className="space-y-4" data-popup-hold>
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm">{i + 1}/{qs.length}</span>
        <div className="sky-track flex-1 !h-1.5 overflow-hidden"><div className={`h-full transition-[width] duration-1000 ease-linear ${left < 15 ? '' : 'sky-fill-accent'}`} style={left < 15 ? { width: `${(left / SPEED_SECONDS) * 100}%`, background: 'hsl(var(--destructive))' } : { width: `${(left / SPEED_SECONDS) * 100}%` }} /></div>
        <span className="font-mono text-sm flex items-center gap-1"><Timer className="h-4 w-4" />{left}s</span>
      </div>
      <Glass className="space-y-5">
        {q.passage_text && <div className="text-sm leading-relaxed border-l-2 pl-4"><MathText text={q.passage_text} /></div>}
        <div className="leading-relaxed"><MathText text={q.question_text} /></div>
        <QuestionFigures svg={q.figure_svg} description={q.figure_description} url1={q.question_image_url} url2={q.question_image_url_2} className="justify-start" imgClassName="max-h-72 rounded border bg-background" />
        {choices.length ? <div className="grid gap-2">{choices.map(c => (
          <button key={c.letter} onClick={() => setPicked(c.letter)} className={`student-choice text-left rounded-xl border p-3 flex gap-3 ${picked === c.letter ? 'border-primary bg-primary/10' : 'hover:bg-muted/50'}`}>
            <span className="font-mono text-sm w-5">{c.letter}</span><span className="flex-1 min-w-0">{c.image ? <img src={c.image} alt={`Choice ${c.letter}`} className="max-h-40" /> : <MathText text={c.text} />}</span></button>))}</div>
          : <Input value={typed} onChange={e => setTyped(e.target.value)} placeholder="Type your answer" className="max-w-xs font-mono" />}
        <Button onClick={() => answer(choices.length ? picked : typed)} disabled={choices.length ? !picked : !typed.trim()}>Submit</Button>
      </Glass>
      {subject === 'math' && <><Button variant="outline" size="sm" onClick={toggleCalculator}><Calculator className="h-4 w-4" />Desmos</Button><DesmosCalculator /></>}
    </div>
  );
}

/* ------------------------------ Review ------------------------------ */

function ReviewPage({ me }: { me: Me }) {
  return <CenterReviewPage attempts={me.attempts} meta={me.meta} studentId={me.student.id} />;
}

/* ------------------------------ Leaderboard ------------------------------ */

function LeaderboardPage({ me }: { me: Me }) {
  const sprints = useCenterSprints();
  const list = (sprints.data ?? []).filter(s => s.status !== 'paused');
  const [id, setId] = useState<string | null>(null);
  const cur = list.find(s => s.id === id) ?? list.find(s => s.status === 'active') ?? list[0];
  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
      {!cur ? <Glass><p className="text-sm text-muted-foreground">Your center hasn't started a sprint yet.</p></Glass> : (
        <Glass className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">{cur.name} <span className="text-xs text-muted-foreground font-mono">{cur.starts_on} → {cur.ends_on}</span></p>
            {list.length > 1 && <Select value={cur.id} onValueChange={setId}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent>{list.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>}
          </div>
          <SprintLeaderboard sprintId={cur.id} highlight={me.student.id} />
        </Glass>
      )}
    </div>
  );
}

/* ------------------------------ Concept videos ------------------------------ */

function usePublishedVideos() {
  return useQuery({
    queryKey: ['center-concept-videos'],
    queryFn: async () => {
      // Throws so a failed read says so instead of "No videos yet." and 0 watched.
      const { data, error } = await supabase.from('concept_videos').select('*').eq('is_published', true).order('order_index');
      if (error) throw error;
      return data ?? [];
    },
  });
}

function VideosPage({ me }: { me: Me }) {
  return <VideoRoadmap videos={usePublishedVideos()} me={me} />;
}

/* ------------------------------ Badges ------------------------------ */

/** The student's center badges, worked out in the browser. Null until the practice sets load, so a master badge isn't judged early. */
function useMyCenterBadges(me: Me): CenterBadge[] | null {
  const totals = useSetTotals();
  if (!totals.data) return null;
  return centerBadges({
    answered: me.attempts.length, correct: me.attempts.filter(a => a.is_correct).length,
    solved: new Set(me.attempts.filter(a => a.is_correct).map(a => a.question_id)),
    present: me.att.filter(a => a.status === 'present' || a.status === 'late').length, setIds: totals.data,
  });
}

function MyBadgeWatcher({ me }: { me: Me }) {
  const badges = useMyCenterBadges(me);
  // Same cached query as StudentLive, so a badge pop-up steps aside when a live game starts.
  const live = useQuery({ ...liveSessionQuery(me.student.class_id ?? ''), enabled: !!me.student.class_id });
  return <CenterBadgeWatcher studentId={me.student.id} badges={badges} liveUp={!!live.data} />;
}

function BadgesPage({ me }: { me: Me }) {
  const badges = useMyCenterBadges(me);
  const questions = usePracticeQuestions();
  if (!badges) return questions.isError
    ? <div className="space-y-3"><p className="text-sm">Couldn't load badges.</p><Button variant="outline" onClick={() => questions.refetch()}>Try again</Button></div>
    : <SkyCardSkeleton />;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Badges <span className="text-base text-muted-foreground font-mono">{badges.filter(b => b.got).length}/{badges.length}</span></h1>
      <CenterBadgeGrid badges={badges} heading={false} />
    </div>
  );
}

/* ------------------------------ Settings ------------------------------ */

const THEMES = [
  { value: 'light', label: 'Light', hint: 'Bright sky look', icon: Sun },
  { value: 'dark', label: 'Dark', hint: 'Easier on the eyes at night', icon: Moon },
  { value: 'system', label: 'Match device', hint: 'Follows your phone or computer', icon: Monitor },
] as const;

function StudentSettingsPage() {
  const { theme, setTheme } = useTheme();
  const { name } = useCenter();
  const current = theme ?? 'system';
  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold">Settings</h1>
        <p className="text-lg sky-body mt-1">Make the portal look the way you like.</p>
      </div>
      <Glass className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="sky-tile sky-tile-blue">{current === 'dark' ? <Moon /> : <Sun />}</span>
          <div><p className="text-lg font-bold">Appearance</p><p className="text-sm text-muted-foreground">Choose light or dark mode</p></div>
        </div>
        <div role="radiogroup" aria-label="Appearance" className="grid gap-3 sm:grid-cols-3">
          {THEMES.map(t => {
            const active = current === t.value;
            return (
              <button key={t.value} type="button" role="radio" aria-checked={active} onClick={() => setTheme(t.value)}
                className={`rounded-2xl p-4 text-left transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? 'sky-btn-blue text-white' : 'bg-muted/60 hover:bg-muted'}`}>
                <t.icon className="h-5 w-5" />
                <p className="font-semibold mt-3">{t.label}</p>
                <p className={`text-sm ${active ? 'text-white/85' : 'text-muted-foreground'}`}>{t.hint}</p>
              </button>
            );
          })}
        </div>
      </Glass>
      <Glass className="flex items-center justify-between gap-3">
        <div className="min-w-0"><p className="text-sm text-muted-foreground">Signed in as</p><p className="font-semibold truncate">{name}</p></div>
      </Glass>
    </div>
  );
}
