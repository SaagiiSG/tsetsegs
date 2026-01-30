import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlatformHealthCard } from './PlatformHealthCard';
import { AtRiskStudentsTable } from './AtRiskStudentsTable';
import { TopicStruggleHeatmap } from './TopicStruggleHeatmap';
import { PracticePatternsChart } from './PracticePatternsChart';
import { CohortAnalysis } from './CohortAnalysis';
import { InterventionRecommendations } from './InterventionRecommendations';

export function OverviewTab() {
  return (
    <div className="space-y-6">
      {/* Top Row: Platform Health */}
      <PlatformHealthCard />

      {/* At-Risk Students Table */}
      <AtRiskStudentsTable />

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
