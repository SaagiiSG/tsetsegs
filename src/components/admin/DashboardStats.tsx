import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import {
  HeroStatsRow,
  ActivityHeatmap,
  TopicWeakSpots,
  SprintPreview,
  RecentClasses,
  AtRiskQuickView,
  QuickActionsBar
} from './dashboard';
import { Radio } from 'lucide-react';

export function DashboardStats() {
  const {
    stats,
    sparklineData,
    heatmapData,
    topicData,
    sprintLeaders,
    recentBatches,
    atRiskStudents,
    isLoading
  } = useAdminDashboard();

  return (
    <div className="space-y-6 dashboard-grid-bg min-h-[calc(100vh-8rem)] -mx-4 px-4 -my-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Command Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time platform insights at a glance
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">Live</span>
        </div>
      </div>

      {/* Hero Stats Row */}
      <HeroStatsRow 
        stats={stats} 
        sparklineData={sparklineData} 
        isLoading={isLoading} 
      />

      {/* Quick Actions */}
      <QuickActionsBar />

      {/* Two-Column Grid: Heatmap & Topics */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ActivityHeatmap data={heatmapData} />
        <TopicWeakSpots data={topicData} />
      </div>

      {/* Sprint Leaderboard Preview */}
      <SprintPreview leaders={sprintLeaders} />

      {/* Two-Column Grid: Recent Classes & At-Risk */}
      <div className="grid gap-4 lg:grid-cols-2">
        <RecentClasses batches={recentBatches} />
        <AtRiskQuickView students={atRiskStudents} />
      </div>
    </div>
  );
}
