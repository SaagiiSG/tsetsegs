import { Card, CardContent } from '@/components/ui/card';
import { Brain, Zap, BookOpen, Flame, TrendingUp, TrendingDown, Clock, Target } from 'lucide-react';
import { PerformanceStats } from '@/hooks/useStudentProfile';
import { cn } from '@/lib/utils';

interface PerformanceStatsGridProps {
  stats: PerformanceStats | null;
}

interface StatCardProps {
  title: string;
  icon: React.ReactNode;
  iconBg: string;
  stats: { label: string; value: string | number; trend?: 'up' | 'down' }[];
}

function StatCard({ title, icon, iconBg, stats }: StatCardProps) {
  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", iconBg)}>
            {icon}
          </div>
          <h3 className="font-semibold">{title}</h3>
        </div>
        <div className="space-y-2">
          {stats.map((stat, idx) => (
            <div key={idx} className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <span className="font-medium flex items-center gap-1">
                {stat.value}
                {stat.trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-500" />}
                {stat.trend === 'down' && <TrendingDown className="w-3 h-3 text-red-500" />}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function PerformanceStatsGrid({ stats }: PerformanceStatsGridProps) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4">
      <StatCard
        title="Questions"
        icon={<Brain className="w-4 h-4 text-blue-400" />}
        iconBg="bg-blue-500/20"
        stats={[
          { label: 'Total Solved', value: stats.questionsSolved.toLocaleString() },
          { label: 'Overall Accuracy', value: `${stats.overallAccuracy}%` },
          { label: 'First-try Accuracy', value: `${stats.firstAttemptAccuracy}%` },
          { label: 'Avg Time', value: `${stats.avgTimePerQuestion}s` }
        ]}
      />

      <StatCard
        title="Speed Sessions"
        icon={<Zap className="w-4 h-4 text-yellow-400" />}
        iconBg="bg-yellow-500/20"
        stats={[
          { label: 'Completed', value: stats.speedSessionsCompleted },
          { label: 'Avg Time', value: `${stats.avgSpeedSessionTime}s` },
          { label: 'Best Time', value: `${stats.bestSpeedTime}s` },
          { label: 'Perfect Sessions', value: stats.perfectSpeedSessions }
        ]}
      />

      <StatCard
        title="Practice Tests"
        icon={<BookOpen className="w-4 h-4 text-emerald-400" />}
        iconBg="bg-emerald-500/20"
        stats={[
          { label: 'Tests Taken', value: stats.practiceTestsTaken },
          { label: 'Average Score', value: stats.avgPracticeScore || '—' },
          { label: 'Best Score', value: stats.bestPracticeScore || '—' },
          { label: 'Trend', value: '—' }
        ]}
      />

      <StatCard
        title="Streak Record"
        icon={<Flame className="w-4 h-4 text-orange-400" />}
        iconBg="bg-orange-500/20"
        stats={[
          { label: 'Longest Streak', value: `${stats.longestStreak} days` },
          { label: 'Current Streak', value: `${stats.currentStreak} days` },
          { label: 'Total Active Days', value: stats.totalActiveDays },
          { label: 'Consistency', value: `${Math.round((stats.totalActiveDays / 365) * 100)}%` }
        ]}
      />
    </div>
  );
}
