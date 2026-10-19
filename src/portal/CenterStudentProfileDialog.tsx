import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ArrowUpRight, BookOpen, Zap, CalendarDays, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { TIER_ASSETS } from '@/components/student/leaderboard/tierAssets';
import { useCenter } from './centerContext';
import { SkyListSkeleton } from './SkySkeleton';

type Profile = {
  name: string; class_name: string | null; joined: string; tier: string;
  practice_answered: number; practice_correct: number; math_correct: number; english_correct: number;
  speed_runs: number; speed_correct: number; best_speed: number | null;
  active_days_30: number; last_active: string | null;
  history: { sprint: string; tier: string; next_tier: string; position: number; points: number }[];
};

const tierName = (t: string) => t === 'platinum' ? 'Emerald' : t.charAt(0).toUpperCase() + t.slice(1);

/** Center-only student profile: reads tenant records through tenant_student_profile, never main student data. */
export function CenterStudentProfileDialog({ studentId, name, open, onOpenChange }: { studentId: string | null; name: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { center } = useCenter();
  const q = useQuery({
    queryKey: ['center-student-profile', center.id, studentId], enabled: open && !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('tenant_student_profile', { _institution: center.id, _student: studentId! });
      if (error) throw error;
      return data as unknown as Profile | null;
    },
  });
  const p = q.data;
  const acc = p && p.practice_answered ? Math.round((p.practice_correct / p.practice_answered) * 100) : 0;
  const practicePts = (p?.practice_correct ?? 0) * 10, speedPts = (p?.speed_correct ?? 0) * 10;
  const tierAsset = p ? (TIER_ASSETS as Record<string, typeof TIER_ASSETS.unranked | undefined>)[p.tier] : undefined;
  const TierIcon = tierAsset?.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground">{name.charAt(0).toUpperCase()}</span>
            <div className="min-w-0 text-left">
              <DialogTitle className="truncate">{name}</DialogTitle>
              <DialogDescription>{p ? [p.class_name, `${tierName(p.tier)} rank`].filter(Boolean).join(' · ') : center.name}</DialogDescription>
            </div>
            {tierAsset?.image ? <img src={tierAsset.image} alt="" className="ml-auto h-12 w-12 object-contain" /> : TierIcon && <TierIcon className="ml-auto h-8 w-8 text-primary" />}
          </div>
        </DialogHeader>

        {q.isLoading ? <div className="py-6"><SkyListSkeleton rows={4} /></div>
          : q.error ? <p role="alert" className="py-8 text-center text-destructive">Could not load this profile.</p>
          : !p ? <p className="py-8 text-center text-muted-foreground">This student is no longer active.</p> : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: BookOpen, label: 'Practice points', value: practicePts, sub: `${p.practice_correct}/${p.practice_answered} correct · ${acc}%` },
                { icon: Zap, label: 'Speed points', value: speedPts, sub: `${p.speed_runs} sessions · best ${p.best_speed ?? 0}` },
                { icon: Target, label: 'Total points', value: practicePts + speedPts, sub: `Math ${p.math_correct} · English ${p.english_correct}` },
                { icon: CalendarDays, label: 'Active days (30d)', value: p.active_days_30, sub: p.last_active ? `Last active ${formatDistanceToNow(new Date(p.last_active), { addSuffix: true })}` : 'No activity yet' },
              ].map(s => (
                <div key={s.label} className="sky-card !p-3">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><s.icon className="h-3.5 w-3.5" />{s.label}</p>
                  <p className="mt-1 font-mono text-2xl font-semibold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.sub}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">Recent sprints</p>
              {!p.history.length ? <p className="text-sm text-muted-foreground">No finished sprints yet.</p> : (
                <div className="divide-y rounded-xl border">
                  {p.history.map((h, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                      <div className="min-w-0"><p className="truncate font-medium">{h.sprint}</p><p className="text-xs text-muted-foreground">{tierName(h.tier)} <ArrowUpRight className="inline h-3 w-3" /> {tierName(h.next_tier)}</p></div>
                      <div className="text-right font-mono"><p>#{h.position}</p><p className="text-xs text-muted-foreground">{h.points} pts</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Member since {new Date(p.joined).toLocaleDateString()}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
