import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ProfileHeader, ActivityHeatmap, RankHistoryGraph } from '@/components/student/profile';
import { useCenter } from './centerContext';
import { SkyListSkeleton } from './SkySkeleton';
import { useCenterStreak } from './CenterStreak';
import { useSetTotals } from './CenterPracticeBrowser';
import { useCenterSprints } from './admin/ToolPages';
import { pct } from './questionMeta';
import { centerBadges, toProfileView, type CenterBadge, type RawProfile } from './centerProfile';

export function CenterBadgeGrid({ badges, heading = true }: { badges: CenterBadge[]; heading?: boolean }) {
  return (
    <div className="sky-card !p-4">
      {heading && <p className="mb-3 font-semibold">Badges <span className="font-mono text-sm text-muted-foreground">{badges.filter(b => b.got).length}/{badges.length}</span></p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{badges.map(b => (
        <div key={b.name} className={`min-w-0 rounded-xl border p-3 ${b.got ? '' : 'opacity-60'}`}>
          <Award className={`h-5 w-5 ${b.got ? '' : 'text-muted-foreground'}`} style={b.got ? { color: 'hsl(var(--section-glow))' } : undefined} />
          <p className="mt-1.5 text-sm font-medium">{b.name}</p><p className="text-xs text-muted-foreground">{b.desc}</p>
          {!b.got && <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-foreground/60" style={{ width: `${Math.min(100, pct(b.prog[0], b.prog[1]))}%` }} /></div>}
        </div>))}
      </div>
    </div>
  );
}

/** Center-only profile (own page and classmates): reads tenant records through tenant_student_profile, never main student data. */
export function CenterProfileView({ studentId, name }: { studentId: string; name: string }) {
  const { center } = useCenter();
  const q = useQuery({
    queryKey: ['center-student-profile', center.id, studentId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('tenant_student_profile', { _institution: center.id, _student: studentId, _tz: Intl.DateTimeFormat().resolvedOptions().timeZone });
      if (error) throw error;
      return data as unknown as RawProfile | null;
    },
  });
  const totals = useSetTotals();
  const sprints = useCenterSprints();
  const raw = q.data;
  const sprintNumbers = useMemo(() => Object.fromEntries((sprints.data ?? []).map((s, i, l) => [s.name, l.length - i])), [sprints.data]);
  const v = useMemo(() => raw && sprints.data ? toProfileView(raw, sprintNumbers) : null, [raw, sprints.data, sprintNumbers]);
  const streak = useCenterStreak(useMemo(() => (v?.activeDays ?? []).map(d => ({ created_at: `${d}T12:00:00` })), [v]));
  const badges = useMemo(() => raw ? centerBadges({
    answered: raw.practice_answered, correct: raw.practice_correct, present: raw.present, solved: new Set(raw.solved_ids),
    setIds: totals.data,
  }) : [], [raw, totals.data]);

  if (q.isLoading || sprints.isLoading) return <div className="py-6"><SkyListSkeleton rows={4} /></div>;
  if (q.error || sprints.error) return <p role="alert" className="py-8 text-center text-destructive">Could not load this profile.</p>;
  if (!raw || !v) return <p className="py-8 text-center text-muted-foreground">This student is no longer active.</p>;

  const stats = [
    { label: 'Points collected', value: raw.points }, { label: 'Questions solved', value: raw.solved_ids.length },
    { label: 'Speed sessions', value: raw.speed_runs }, { label: 'Active days', value: v.activeDays.length },
  ];
  return (
    <div className="min-w-0 space-y-4">
      <ProfileHeader username={name} avatarInitial={name.charAt(0).toUpperCase()} level={v.level.level} levelProgress={v.level.progress} totalPoints={raw.points}
        pointsToNextLevel={v.level.toNext} currentTier={v.tier} reservedNextTier={null} createdAt={raw.joined} lastLogin={raw.last_active} />
      <ActivityHeatmap activityData={v.activity} currentStreak={streak.current} longestStreak={streak.longest} totalActiveDays={streak.totalDays} />
      <CenterBadgeGrid badges={badges} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{stats.map(s => (
        <div key={s.label} className="sky-card !p-3"><p className="text-xs text-muted-foreground">{s.label}</p><p className="mt-1 font-mono text-2xl font-semibold">{s.value.toLocaleString()}</p></div>))}
      </div>
      <RankHistoryGraph rankHistory={v.rankHistory} currentTier={v.tier} />
    </div>
  );
}
