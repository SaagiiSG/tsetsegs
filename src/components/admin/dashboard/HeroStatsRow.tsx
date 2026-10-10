import { Skeleton } from '@/components/ui/skeleton';
import { Users, Target, Zap, Trophy, CheckCircle2 } from 'lucide-react';

interface HeroStatsRowProps {
  stats: { activeToday: number; weeklyAttempts: number; platformAccuracy: number; sprintParticipants: { active: number; total: number }; totalQuestionsSolved: number };
  sparklineData: { day: string; value: number }[];
  isLoading: boolean;
}
const statCards = [
  { key: 'activeToday', label: 'Active today', icon: Users, getValue: (s: HeroStatsRowProps['stats']) => s.activeToday, sub: 'students practicing' },
  { key: 'weeklyAttempts', label: 'This week', icon: Zap, getValue: (s: HeroStatsRowProps['stats']) => s.weeklyAttempts.toLocaleString(), sub: 'questions attempted' },
  { key: 'platformAccuracy', label: 'Accuracy', icon: Target, getValue: (s: HeroStatsRowProps['stats']) => `${s.platformAccuracy}%`, sub: '7-day average' },
  { key: 'sprintParticipants', label: 'Sprint', icon: Trophy, getValue: (s: HeroStatsRowProps['stats']) => `${s.sprintParticipants.active}/${s.sprintParticipants.total}`, sub: 'active participants' },
  { key: 'totalQuestionsSolved', label: 'Total solved', icon: CheckCircle2, getValue: (s: HeroStatsRowProps['stats']) => s.totalQuestionsSolved.toLocaleString(), sub: 'all-time correct' },
];
export function HeroStatsRow({ stats, isLoading }: HeroStatsRowProps) {
  return <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-x-6 gap-y-5 border-y py-6">
    {statCards.map(card => <div key={card.key} className="min-w-0 space-y-2 xl:border-r xl:last:border-r-0">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><card.icon className="h-3.5 w-3.5" />{card.label}</div>
      {isLoading ? <Skeleton className="h-8 w-20" /> : <p className="font-mono text-2xl font-medium tabular-nums">{card.getValue(stats)}</p>}
      <p className="text-xs text-muted-foreground">{card.sub}</p>
    </div>)}
  </div>;
}
