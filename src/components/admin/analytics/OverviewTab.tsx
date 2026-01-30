import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlatformHealthCard } from './PlatformHealthCard';
import { AtRiskStudentsTable } from './AtRiskStudentsTable';
import { TopicStruggleHeatmap } from './TopicStruggleHeatmap';
import { PracticePatternsChart } from './PracticePatternsChart';
import { CohortAnalysis } from './CohortAnalysis';
import { InterventionRecommendations } from './InterventionRecommendations';
import { ImprovementMetricsCard } from './ImprovementMetricsCard';
import { MostImprovedStudents } from './MostImprovedStudents';
import { WeeklyTrendsChart } from './WeeklyTrendsChart';
import { ActivityHeatmapCard } from './ActivityHeatmapCard';
import { SprintLeaderboardPreview } from './SprintLeaderboardPreview';

export function OverviewTab() {
  return (
    <div className="space-y-6">
      {/* Top Row: Platform Health */}
      <PlatformHealthCard />

      {/* NEW: Improvement Metrics - Focus on Progress */}
      <ImprovementMetricsCard />

      {/* NEW: Three Column Layout - Most Improved, Leaderboard Preview, Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <MostImprovedStudents />
        <SprintLeaderboardPreview />
        <ActivityHeatmapCard />
      </div>

      {/* At-Risk Students Table */}
      <AtRiskStudentsTable />

      {/* NEW: Weekly Trends Chart */}
      <WeeklyTrendsChart />

      {/* Two Column Layout: Topic Struggle & Practice Patterns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopicStruggleHeatmap />
        <PracticePatternsChart />
      </div>

      {/* Cohort Analysis (Collapsible) */}
      <CohortAnalysis />

      {/* Intervention Recommendations */}
      <InterventionRecommendations />
    </div>
  );
}
