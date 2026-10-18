import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Medal, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useCenter } from './centerContext';
import { useCenterSprints } from './admin/ToolPages';
import { TIER_ORDER } from '@/data/badgeDefinitions';
import { TierLadder } from '@/components/student/leaderboard/TierLadder';

const tierName = (tier: string) => tier === 'platinum' ? 'Emerald' : tier.charAt(0).toUpperCase() + tier.slice(1);

export function CenterRankings({ studentId }: { studentId: string }) {
  const { center } = useCenter();
  const sprints = useCenterSprints();
  const [selected, setSelected] = useState('');
  const [tier, setTier] = useState('all');
  const [limit, setLimit] = useState('100');
  const sprint = sprints.data?.find(s => s.id === selected) ?? sprints.data?.find(s => s.status === 'active') ?? sprints.data?.[0];
  const board = useQuery({ queryKey: ['center-board', center.id, sprint?.id], enabled: !!sprint,
    queryFn: async () => { const { data, error } = await supabase.rpc('tenant_student_board', { _institution: center.id, _sprint: sprint?.id }); if (error) throw error; return data ?? []; } });
  const allTime = useQuery({ queryKey: ['center-all-time', center.id],
    queryFn: async () => { const { data, error } = await supabase.rpc('tenant_student_board', { _institution: center.id }); if (error) throw error; return data ?? []; } });
  const history = useQuery({ queryKey: ['center-rank-history', center.id, studentId], queryFn: async () => {
    const { data, error } = await supabase.from('tenant_rank_history').select('*').eq('institution_id', center.id).eq('student_id', studentId).order('created_at', { ascending: false }).limit(100); if (error) throw error; return data ?? [];
  } });
  const mine = board.data?.find(r => r.student_id === studentId);
  const currentTier = history.data?.[0]?.next_tier ?? 'unranked';
  const unlockedAt: Record<string, string> = {};
  for (const h of [...(history.data ?? [])].reverse()) {
    if (h.tier && !unlockedAt[h.tier]) unlockedAt[h.tier] = h.created_at;
    if (h.next_tier && !unlockedAt[h.next_tier]) unlockedAt[h.next_tier] = h.created_at;
  }
  const renderRows = (query: typeof board, filter: boolean) => {
    if (query.isLoading) return <p className="py-8 text-muted-foreground">Loading standings…</p>;
    if (query.error) return <p role="alert" className="py-8 text-destructive">Could not load standings. Please try again.</p>;
    const rows = (query.data ?? []).filter(r => !filter || tier === 'all' || r.tier === tier).slice(0, Number(limit));
    return !rows.length ? <p className="py-8 text-muted-foreground">No students in this ranking yet.</p> : <div className="space-y-2">{rows.map(r => <div key={r.student_id} className={`grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 py-3 px-3 rounded-2xl border bg-card transition-transform hover:scale-[1.005] ${r.student_id === studentId ? 'border-primary bg-[#F2FAFF] dark:bg-primary/10 shadow-[0_0_0_2px_hsl(var(--primary)/0.2)]' : 'shadow-[0_1px_2px_rgb(0_0_0/0.05)]'}`}>
      <span className={`ds-tile h-9 w-9 font-mono font-bold text-sm ${r.standing === 1 ? 'ds-tile-gold' : r.standing === 2 ? 'ds-tile-blue' : r.standing === 3 ? 'ds-tile-orange' : 'bg-muted text-muted-foreground'}`}>{r.standing}</span><div className="min-w-0"><p className="font-medium truncate">{r.name}{r.student_id === studentId ? ' · You' : ''}</p><p className="text-xs text-muted-foreground">{tierName(r.tier)}{r.class_name ? ` · ${r.class_name}` : ''}</p></div><div className="text-right"><p className="font-mono font-semibold">{r.points} pts</p><p className="text-xs text-muted-foreground">{r.answered} answered</p></div>
    </div>)}</div>;
  };
  return <div className="space-y-6 max-w-5xl">
    <header className="flex justify-between items-start gap-3"><div className="flex items-center gap-4"><span className="ds-tile ds-tile-gold h-12 w-12"><Trophy className="h-6 w-6" /></span><div><h1 className="text-3xl font-bold">Leaderboard</h1><p className="ds-sub">{center.name}</p></div></div><div className="student-chip"><Medal className="h-4 w-4 text-[hsl(var(--ds-orange))]"/><span className="font-semibold">{tierName(currentTier)}</span></div></header>
    <Tabs defaultValue="sprint" className="space-y-5"><TabsList className="h-auto flex flex-wrap justify-start"><TabsTrigger value="sprint">Sprint</TabsTrigger><TabsTrigger value="position">My position</TabsTrigger><TabsTrigger value="all">All-time</TabsTrigger><TabsTrigger value="history">Rank history</TabsTrigger></TabsList>
      <TabsContent value="sprint" className="space-y-4">
        <div className="flex flex-wrap gap-3">{!!sprint && <Select value={sprint.id} onValueChange={setSelected}><SelectTrigger className="w-64"><SelectValue/></SelectTrigger><SelectContent>{sprints.data?.map(s => <SelectItem key={s.id} value={s.id}>{s.name} · {s.status}</SelectItem>)}</SelectContent></Select>}
          <Select value={tier} onValueChange={setTier}><SelectTrigger className="w-44"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All ranks</SelectItem>{TIER_ORDER.map(t => <SelectItem key={t} value={t}>{tierName(t)}</SelectItem>)}</SelectContent></Select></div>
        {sprint?.status === 'active' && <TierLadder currentTier={currentTier} unlockedAt={unlockedAt} standing={mine?.standing ?? null} />}
        {sprint ? <><p className="text-sm text-muted-foreground">{sprint.starts_on} → {sprint.ends_on}</p>{renderRows(board, true)}</> : <p className="py-8 text-muted-foreground">Your center hasn't started a sprint yet.</p>}
      </TabsContent>
      <TabsContent value="position" className="space-y-6">
        <div className="grid sm:grid-cols-3 gap-4">{[['Current position', mine ? `#${mine.standing}` : '—'], ['Sprint points', String(mine?.points ?? 0)], ['Your rank', tierName(currentTier)]].map(([label, value]) => <div key={label} className="admin-glass-card admin-glass-neutral rounded-3xl border p-5 flex items-center gap-4"><span className={`ds-tile h-12 w-12 ${label === 'Current position' ? 'ds-tile-blue' : label === 'Sprint points' ? 'ds-tile-gold' : 'ds-tile-purple'}`}>{label === 'Current position' ? <Trophy className="h-6 w-6" /> : label === 'Sprint points' ? <ArrowUpRight className="h-6 w-6" /> : <Medal className="h-6 w-6" />}</span><div><p className="ds-sub">{label}</p><p className="font-mono text-2xl font-bold leading-tight">{value}</p></div></div>)}</div>
        <div className="flex gap-2 flex-wrap">{TIER_ORDER.map(t => <span key={t} className={`px-3 py-1.5 rounded-full border text-sm font-semibold ${currentTier === t ? 'bg-primary text-primary-foreground border-primary shadow-[0_3px_0_hsl(var(--ds-blue-press))]' : 'bg-card text-muted-foreground'}`}>{tierName(t)}</span>)}</div>
        <p className="text-sm text-muted-foreground">Ranks update when your center finishes a sprint. Correct practice answers earn 10 points.</p>
      </TabsContent>
      <TabsContent value="all" className="space-y-3"><div className="flex items-center justify-between"><h2 className="font-semibold flex gap-2 items-center"><Trophy className="h-5 w-5"/>All-time standings</h2><Select value={limit} onValueChange={setLimit}><SelectTrigger className="w-28"><SelectValue/></SelectTrigger><SelectContent>{['10','50','100'].map(n => <SelectItem key={n} value={n}>Top {n}</SelectItem>)}</SelectContent></Select></div>{renderRows(allTime, false)}</TabsContent>
      <TabsContent value="history">{history.isLoading ? <p>Loading history…</p> : history.error ? <p role="alert">Could not load rank history.</p> : !history.data?.length ? <p className="py-8 text-muted-foreground">Your rank history starts after your first completed sprint.</p> : <div className="space-y-2">{history.data.map(h => <div key={h.id} className="flex justify-between gap-4 py-3 px-4 rounded-2xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.05)]"><div><p className="font-medium">{sprints.data?.find(s => s.id === h.sprint_id)?.name ?? 'Completed sprint'}</p><p className="text-sm text-muted-foreground">{tierName(h.tier)} <ArrowUpRight className="inline h-4 w-4"/> {tierName(h.next_tier)}</p></div><div className="text-right font-mono"><p>#{h.final_position}</p><p className="text-xs text-muted-foreground">{h.points} pts</p></div></div>)}</div>}</TabsContent>
    </Tabs>
  </div>;
}