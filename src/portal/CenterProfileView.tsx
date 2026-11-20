import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CalendarDays, Clock, GraduationCap, Mail, Pencil, Target } from 'lucide-react';
import { BadgeCard } from '@/components/student/badges/BadgeCard';
import type { StudentBadge } from '@/hooks/useBadges';
import { supabase } from '@/integrations/supabase/client';
import { ActivityHeatmap, RankHistoryGraph } from '@/components/student/profile';
import { TIER_ASSETS } from '@/components/student/leaderboard/tierAssets';
import { TIER_COLORS, TIER_DISPLAY_NAMES, type TierType } from '@/data/badgeDefinitions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useCenter } from './centerContext';
import { SkyListSkeleton } from './SkySkeleton';
import { useCenterStreak } from './CenterStreak';
import { useSetTotals } from './CenterPracticeBrowser';
import { useCenterSprints } from './admin/ToolPages';
import { pct } from './questionMeta';
import { avatarSrc, centerBadges, studyTime, toProfileView, type CenterBadge, type RawProfile } from './centerProfile';
import { useSoloPlan } from './soloPlan';
import { SkyClouds } from './OnboardingSky';
import { useCenterGoals } from './CenterDailyGoals';
import { SoloPlanCard } from './SoloBilling';
import { EditProfileDialog } from './EditProfileDialog';

export function toStudentBadge(b: CenterBadge): StudentBadge {
  return {
    id: b.key, badgeId: b.key, isUnlocked: b.got, unlockedAt: null, requirementsProgress: {},
    progress: b.got ? 100 : Math.min(99, pct(b.prog[0], b.prog[1])),
    badge: { id: b.key, name: b.name, description: b.desc, rarity: b.rarity, pointValue: 0, iconName: b.icon, category: 'discipline', requirements: [] },
  };
}

export function CenterBadgeGrid({ badges, heading = true }: { badges: CenterBadge[]; heading?: boolean }) {
  return (
    <div className="sky-card !p-4">
      {heading && <p className="mb-3 font-semibold">Badges <span className="font-mono text-sm text-muted-foreground">{badges.filter(b => b.got).length}/{badges.length}</span></p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{badges.map(b => (
        <BadgeCard key={b.key} badge={toStudentBadge(b)} />))}
      </div>
    </div>
  );
}

const TierIcon = ({ tier }: { tier: TierType }) => {
  const asset = TIER_ASSETS[tier];
  return asset.image ? <img src={asset.image} alt="" className="h-4 w-4 object-contain" /> : <asset.icon className="h-4 w-4" />;
};

/** The solo student's full name and sign-in email (their own row only); null for center students. */
function useSoloAccount(enabled: boolean) {
  const { userId } = useCenter();
  return useQuery({
    queryKey: ['solo-account', userId], enabled: enabled && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('solo_students').select('name, email').eq('user_id', userId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Center-only profile (own page and classmates): reads tenant records through tenant_student_profile, never main student data.
 *  `own` (the student's own page, Saagii 20 Nov) adds the private details, editing and, for solo students, the plan. */
export function CenterProfileView({ studentId, name, own = false }: { studentId: string; name: string; own?: boolean }) {
  const { center, isSolo } = useCenter();
  const [editing, setEditing] = useState(false);
  const q = useQuery({
    queryKey: ['center-student-profile', center.id, studentId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('tenant_student_profile', { _institution: center.id, _student: studentId, _tz: Intl.DateTimeFormat().resolvedOptions().timeZone });
      if (error) throw error;
      return data as unknown as RawProfile | null;
    },
  });
  const totals = useSetTotals();
  // A free viewer's set lists are the free slice, so no master badge is judged against them, on anyone's profile.
  const plan = useSoloPlan();
  const sprints = useCenterSprints();
  const goals = useCenterGoals(own ? studentId : '');
  const solo = useSoloAccount(own && isSolo);
  const raw = q.data;
  const sprintNumbers = useMemo(() => Object.fromEntries((sprints.data ?? []).map((s, i, l) => [s.name, l.length - i])), [sprints.data]);
  const v = useMemo(() => raw && sprints.data ? toProfileView(raw, sprintNumbers) : null, [raw, sprints.data, sprintNumbers]);
  const streak = useCenterStreak(useMemo(() => (v?.activeDays ?? []).map(d => ({ created_at: `${d}T12:00:00` })), [v]));
  const badges = useMemo(() => raw ? centerBadges({
    answered: raw.practice_answered, correct: raw.practice_correct, present: raw.present, solved: new Set(raw.solved_ids),
    setIds: totals.data, masters: plan.premium,
  }) : [], [raw, totals.data, plan.premium]);

  if (q.isLoading || sprints.isLoading) return <div className="py-6"><SkyListSkeleton rows={4} /></div>;
  if (q.error || sprints.error) return <p role="alert" className="py-8 text-center text-destructive">Could not load this profile.</p>;
  if (!raw || !v) return <p className="py-8 text-center text-muted-foreground">This student is no longer active.</p>;

  const shown = raw.name || name;
  const tierColor = TIER_COLORS[v.tier];
  const sat = goals.data?.sat_date ?? null;
  const days = sat ? Math.ceil((new Date(sat).getTime() - Date.now()) / 86400000) : null;
  const details: { icon: typeof Mail; text: string }[] = [
    ...(own && solo.data?.email ? [{ icon: Mail, text: solo.data.email }] : []),
    { icon: CalendarDays, text: `Joined ${format(new Date(raw.joined), 'MMMM d, yyyy')}` },
    ...(own ? [
      { icon: GraduationCap, text: sat ? `SAT ${format(new Date(`${sat}T12:00:00`), 'MMMM d, yyyy')}${days !== null && days >= 0 ? ` · ${days} days to go` : ''}` : 'No SAT date yet' },
      { icon: Target, text: goals.data?.target_score ? `Target score ${goals.data.target_score}` : 'No target score yet' },
    ] : raw.last_active ? [{ icon: Clock, text: `Last seen ${format(new Date(raw.last_active), 'MMM d')}` }] : []),
  ];
  const stats = [
    own && raw.study_seconds != null ? { label: 'Study time', value: studyTime(raw.study_seconds) } : { label: 'Points collected', value: raw.points.toLocaleString() },
    { label: 'Questions solved', value: raw.solved_ids.length.toLocaleString() },
    { label: 'Speed sessions', value: raw.speed_runs.toLocaleString() }, { label: 'Active days', value: v.activeDays.length.toLocaleString() },
  ];
  return (
    <div className="min-w-0 space-y-4">
      <div className="sky-card !p-0">
        <div className="onb-sky relative isolate h-28 overflow-hidden sm:h-36">
          <SkyClouds step={1} parting={false} />
          {own && <Button size="sm" variant="secondary" className="absolute right-3 top-3 z-40 rounded-full shadow-sm" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" />Edit profile</Button>}
        </div>
        <div className="relative z-10 px-4 pb-5 sm:px-6">
          <div className="flex items-end justify-between gap-3">
            <Avatar className="-mt-12 h-24 w-24 border-4 border-card shadow-md sm:-mt-14 sm:h-28 sm:w-28">
              <AvatarImage src={avatarSrc(raw.avatar)} alt="" />
              <AvatarFallback className="sky-avatar !rounded-full !text-4xl font-bold">{shown.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="pb-1 text-right">
              <p className="font-mono text-2xl font-bold tabular-nums" style={{ color: tierColor }}>{raw.points.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total points</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="mr-1 text-2xl font-bold sm:text-3xl">{shown}</h1>
            <Badge variant="outline" className="gap-1" style={{ borderColor: tierColor, color: tierColor }}><TierIcon tier={v.tier} />{TIER_DISPLAY_NAMES[v.tier]}</Badge>
            <Badge variant="secondary">Level {v.level.level}</Badge>
          </div>
          <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-sm text-muted-foreground sm:grid-cols-2">
            {details.map(d => <li key={d.text} className="flex min-w-0 items-center gap-2"><d.icon className="h-4 w-4 shrink-0" /><span className="truncate">{d.text}</span></li>)}
          </ul>
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground"><span>Level {v.level.level}</span><span>{v.level.toNext.toLocaleString()} pts to level {v.level.level + 1}</span></div>
            <Progress value={v.level.progress} className="h-2" />
          </div>
        </div>
      </div>
      {own && isSolo && <SoloPlanCard />}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{stats.map(s => (
        <div key={s.label} className="sky-card !p-3"><p className="text-xs text-muted-foreground">{s.label}</p><p className="mt-1 font-mono text-2xl font-semibold">{s.value}</p></div>))}
      </div>
      <ActivityHeatmap activityData={v.activity} currentStreak={streak.current} longestStreak={streak.longest} totalActiveDays={streak.totalDays} />
      <CenterBadgeGrid badges={badges} />
      <RankHistoryGraph rankHistory={v.rankHistory} currentTier={v.tier} />
      {own && <EditProfileDialog open={editing} onOpenChange={setEditing} studentId={studentId} name={shown} avatar={raw.avatar ?? null}
        goals={goals.data} fullName={isSolo ? solo.data?.name ?? '' : null} />}
    </div>
  );
}
