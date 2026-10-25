import { useMemo, useState } from 'react';
import { Flame, Snowflake, Lock, Award, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { STREAK_MILESTONES, computeDailyStreakXp } from '@/hooks/useStudentStreak';
import type { QMeta } from './questionMeta';

const COLORS = { speed: 'hsl(45, 95%, 55%)', hard: 'hsl(0, 84%, 60%)', medium: 'hsl(180, 85%, 45%)' };
type Attempt = { question_id: string; is_correct: boolean; created_at: string };
export const SKY_RING = { speed: '#8B7CF6', hard: '#D28CF5', medium: '#FBC2E5' };
type Run = { created_at: string };
type Goals = { speed: number; hard: number; medium: number };

export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Streak stats derived from a center student's attempts. Freezers: one earned per
 * completed 7-day block (max 3); a single missed day between practice days consumes one.
 */
export function useCenterStreak(attempts: { created_at: string }[]) {
  return useMemo(() => {
    const days = [...new Set(attempts.map(a => dayKey(new Date(a.created_at))))].sort();
    const set = new Set(days);
    let run = 0, longest = 0, earned = 0, used = 0, prev: Date | null = null;
    for (const k of days) {
      const d = new Date(k + 'T00:00:00');
      const gap = prev ? Math.round((d.getTime() - prev.getTime()) / 86400000) : 1;
      const wallet = Math.min(3, earned - used);
      if (gap === 1) run++;
      else if (gap === 2 && wallet > 0) { used++; run++; }
      else run = 1;
      if (run > 0 && run % 7 === 0) earned++;
      longest = Math.max(longest, run);
      prev = d;
    }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const last = prev ? Math.round((today.getTime() - prev.getTime()) / 86400000) : 99;
    const freezers = Math.max(0, Math.min(3, earned - used));
    const current = last <= 1 || (last === 2 && freezers > 0) ? run : 0;
    return { current, longest, totalDays: days.length, freezers, practicedToday: set.has(dayKey(today)), activeDays: set };
  }, [attempts]);
}
export type CenterStreak = ReturnType<typeof useCenterStreak>;

export function MiniRing({ size = 52, p, colors = COLORS, stroke = 5, gap = 2 }: { size?: number; p: [number, number, number]; colors?: typeof COLORS; stroke?: number; gap?: number }) {
  const c = size / 2;
  const radii = [c - stroke / 2 - 1, c - stroke * 1.5 - gap - 1, c - stroke * 2.5 - gap * 2 - 1];
  const cols = [colors.speed, colors.hard, colors.medium];
  return (
    <svg width={size} height={size}>
      {radii.map((r, i) => {
        const circ = 2 * Math.PI * r;
        return (
          <g key={i}>
            <circle cx={c} cy={c} r={r} fill="none" stroke={cols[i]} strokeOpacity={0.18} strokeWidth={stroke} />
            <circle cx={c} cy={c} r={r} fill="none" stroke={cols[i]} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${circ} ${circ}`} strokeDashoffset={circ * (1 - Math.min(1, p[i]))} transform={`rotate(-90 ${c} ${c})`} />
          </g>
        );
      })}
    </svg>
  );
}

/** Per-day ring history for the last `days` days. */
export function useCenterRingHistory(attempts: Attempt[], runs: Run[], meta: Record<string, QMeta>, days = 30) {
  return useMemo(() => {
    const b: Record<string, { speed: number; hard: Set<string>; medium: Set<string> }> = {};
    const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (days - 1));
    for (let i = 0; i < days; i++) { const d = new Date(start); d.setDate(start.getDate() + i); b[dayKey(d)] = { speed: 0, hard: new Set(), medium: new Set() }; }
    for (const r of runs) { const k = dayKey(new Date(r.created_at)); if (b[k]) b[k].speed++; }
    for (const a of attempts) {
      if (!a.is_correct) continue;
      const k = dayKey(new Date(a.created_at)); if (!b[k]) continue;
      const d = (meta[a.question_id]?.difficulty_level ?? '').toLowerCase();
      if (d === 'hard') b[k].hard.add(a.question_id); else if (d === 'medium') b[k].medium.add(a.question_id);
    }
    return Object.entries(b).map(([date, v]) => ({ date, speed: v.speed, hard: v.hard.size, medium: v.medium.size })).reverse();
  }, [attempts, runs, meta, days]);
}

function PastRings({ history, goals }: { history: ReturnType<typeof useCenterRingHistory>; goals: Goals }) {
  const closed = history.filter(d => d.speed >= goals.speed && d.hard >= goals.hard && d.medium >= goals.medium).length;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Past 30 days</h3>
        <span className="text-xs text-muted-foreground"><span className="font-mono text-foreground">{closed}</span> rings closed</span>
      </div>
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
        {history.map(d => {
          const date = new Date(d.date + 'T00:00:00');
          const done = d.speed >= goals.speed && d.hard >= goals.hard && d.medium >= goals.medium;
          return (
            <div key={d.date} title={`${date.toDateString()} · Speed ${d.speed}/${goals.speed} · Hard ${d.hard}/${goals.hard} · Medium ${d.medium}/${goals.medium}`}
              className={cn('flex flex-col items-center gap-1 rounded-xl border p-1.5', done && 'border-foreground/40')}>
              <MiniRing size={40} p={[d.speed / goals.speed, d.hard / goals.hard, d.medium / goals.medium]} />
              <span className="text-[10px] text-muted-foreground font-mono">{date.getDate()}/{date.getMonth() + 1}</span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 text-[11px] text-muted-foreground">
        {(['speed', 'hard', 'medium'] as const).map(k => <span key={k} className="inline-flex items-center gap-1 capitalize"><span className="h-2 w-2 rounded-full" style={{ background: COLORS[k] }} />{k}</span>)}
      </div>
    </div>
  );
}

/** Daily ring history dialog (opened by tapping the ring card). */
export function CenterRingHistoryDialog({ open, onOpenChange, history, goals }: { open: boolean; onOpenChange: (o: boolean) => void; history: ReturnType<typeof useCenterRingHistory>; goals: Goals }) {
  const totals = history.reduce((s, d) => ({ speed: s.speed + d.speed, hard: s.hard + d.hard, medium: s.medium + d.medium }), { speed: 0, hard: 0, medium: 0 });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Daily ring history</DialogTitle></DialogHeader>
        <div className="grid grid-cols-3 gap-2">
          {(['speed', 'hard', 'medium'] as const).map(k => (
            <div key={k} className="rounded-xl border p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground capitalize">{k} · 30d</p>
              <p className="font-mono text-xl">{totals[k]}</p>
            </div>
          ))}
        </div>
        <PastRings history={history} goals={goals} />
      </DialogContent>
    </Dialog>
  );
}

function Calendar({ active }: { active: Set<string> }) {
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const first = month.getDay(), n = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const shift = (m: number) => setMonth(d => new Date(d.getFullYear(), d.getMonth() + m, 1));
  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></Button>
        <p className="text-sm font-medium">{month.toLocaleString('en', { month: 'long', year: 'numeric' })}</p>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => shift(1)} aria-label="Next month"><ChevronRight className="h-4 w-4" /></Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i}>{d}</span>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: first }).map((_, i) => <span key={'e' + i} />)}
        {Array.from({ length: n }).map((_, i) => {
          const d = new Date(month.getFullYear(), month.getMonth(), i + 1);
          const on = active.has(dayKey(d)), today = dayKey(d) === dayKey(new Date());
          return <span key={i} className={cn('aspect-square rounded-lg grid place-items-center text-xs font-mono', on ? 'bg-foreground text-background' : 'text-muted-foreground', today && !on && 'ring-1 ring-foreground/40')}>{on ? <Flame className="h-3 w-3" /> : i + 1}</span>;
        })}
      </div>
    </div>
  );
}

/** Streak dialog: current/longest, freezers, upcoming milestone rewards, calendar, past rings. */
export function CenterStreakDialog({ open, onOpenChange, streak, history, goals }: { open: boolean; onOpenChange: (o: boolean) => void; streak: CenterStreak; history: ReturnType<typeof useCenterRingHistory>; goals: Goals }) {
  const next = STREAK_MILESTONES.find(m => m.days > streak.current);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Flame className={cn('h-5 w-5', !streak.current && 'opacity-40')} />{streak.current ? `${streak.current}-day streak` : 'Start your streak today'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 min-w-0">
          <div className="grid grid-cols-3 gap-2">
            {[['Current', streak.current], ['Longest', streak.longest], ['Practice days', streak.totalDays]].map(([l, v]) => (
              <div key={l as string} className="rounded-xl border p-3"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{l}</p><p className="font-mono text-xl">{v}</p></div>
            ))}
          </div>
          <div className="rounded-xl border p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 rounded-xl border grid place-items-center"><Snowflake className="h-5 w-5" />
                {streak.freezers > 0 && <span className="absolute -top-1 -right-1 h-[18px] min-w-[18px] rounded-full bg-foreground text-background text-[10px] font-bold grid place-items-center px-1">{streak.freezers}</span>}
              </div>
              <div><p className="text-sm font-semibold">Streak freezers · {streak.freezers}/3</p><p className="text-[11px] text-muted-foreground">Earn one every 7 days in a row. Covers one missed day automatically.</p></div>
            </div>
            <div className="text-right"><p className="text-sm font-semibold inline-flex items-center gap-1"><Zap className="h-4 w-4" />+{computeDailyStreakXp(streak.current + (streak.practicedToday ? 1 : 0) || 1)} XP</p><p className="text-[11px] text-muted-foreground">{streak.practicedToday ? "tomorrow's reward" : "today's reward"}</p></div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Upcoming rewards</h3>
            {next && <p className="text-sm"><span className="font-mono">{next.days - streak.current}</span> more day{next.days - streak.current === 1 ? '' : 's'} to <span className="font-medium">{next.badgeName}</span></p>}
            <div className="grid gap-2 sm:grid-cols-3">
              {STREAK_MILESTONES.map(m => {
                const got = streak.longest >= m.days;
                return (
                  <div key={m.days} className={cn('rounded-xl border p-3 flex items-center gap-2.5', !got && 'opacity-60')}>
                    {got ? <Award className="h-4 w-4 shrink-0" /> : <Lock className="h-4 w-4 shrink-0" />}
                    <div className="min-w-0"><p className="text-sm font-medium truncate">{m.badgeName}</p><p className="text-[11px] text-muted-foreground">{m.days} days{m.awardsFreezer ? ' · +1 freezer' : ''}</p></div>
                  </div>
                );
              })}
            </div>
          </div>
          <PastRings history={history.slice(0, 10)} goals={goals} />
          <Calendar active={streak.activeDays} />
          <p className="text-xs text-center text-muted-foreground">Practice any question tomorrow to keep your streak alive.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
