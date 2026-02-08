import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Target, Zap, Trophy, CheckCircle2 } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

interface HeroStatsRowProps {
  stats: {
    activeToday: number;
    weeklyAttempts: number;
    platformAccuracy: number;
    sprintParticipants: { active: number; total: number };
    totalQuestionsSolved: number;
  };
  sparklineData: { day: string; value: number }[];
  isLoading: boolean;
}

const statCards = [
  {
    key: 'activeToday',
    label: 'ACTIVE TODAY',
    icon: Users,
    color: 'text-cyan-400',
    bgGlow: 'shadow-cyan-500/20',
    getValue: (stats: HeroStatsRowProps['stats']) => stats.activeToday,
    getSubtext: () => 'students practicing'
  },
  {
    key: 'weeklyAttempts',
    label: 'THIS WEEK',
    icon: Zap,
    color: 'text-amber-400',
    bgGlow: 'shadow-amber-500/20',
    getValue: (stats: HeroStatsRowProps['stats']) => stats.weeklyAttempts.toLocaleString(),
    getSubtext: () => 'questions attempted'
  },
  {
    key: 'platformAccuracy',
    label: 'ACCURACY',
    icon: Target,
    color: 'text-emerald-400',
    bgGlow: 'shadow-emerald-500/20',
    getValue: (stats: HeroStatsRowProps['stats']) => `${stats.platformAccuracy}%`,
    getSubtext: () => '7-day rolling avg'
  },
  {
    key: 'sprintParticipants',
    label: 'SPRINT',
    icon: Trophy,
    color: 'text-purple-400',
    bgGlow: 'shadow-purple-500/20',
    getValue: (stats: HeroStatsRowProps['stats']) => 
      `${stats.sprintParticipants.active}/${stats.sprintParticipants.total}`,
    getSubtext: () => 'active participants'
  },
  {
    key: 'totalQuestionsSolved',
    label: 'TOTAL SOLVED',
    icon: CheckCircle2,
    color: 'text-rose-400',
    bgGlow: 'shadow-rose-500/20',
    getValue: (stats: HeroStatsRowProps['stats']) => stats.totalQuestionsSolved.toLocaleString(),
    getSubtext: () => 'all-time correct'
  }
];

export function HeroStatsRow({ stats, sparklineData, isLoading }: HeroStatsRowProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
            <Skeleton className="h-4 w-20 mb-3" />
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-24" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {statCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card 
            key={card.key}
            className={`
              relative overflow-hidden p-4 
              bg-card/50 backdrop-blur-sm border-border/50
              hover:border-primary/30 transition-all duration-300
              animate-fade-in
            `}
            style={{ animationDelay: `${index * 75}ms` }}
          >
            {/* Subtle glow effect */}
            <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-20 ${card.bgGlow}`} />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  {card.label}
                </span>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
              
              <div className="font-mono text-2xl md:text-3xl font-bold tracking-tight tabular-nums text-foreground">
                {card.getValue(stats)}
              </div>
              
              <p className="text-xs text-muted-foreground mt-1">
                {card.getSubtext()}
              </p>
              
              {/* Mini sparkline for the first card */}
              {index === 0 && sparklineData.length > 0 && (
                <div className="h-8 mt-2 -mx-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparklineData}>
                      <defs>
                        <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(187 100% 50%)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="hsl(187 100% 50%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="hsl(187 100% 50%)"
                        strokeWidth={1.5}
                        fill="url(#sparklineGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
