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
import { InstitutionCustomerSummary } from './InstitutionCustomerSummary';
import { useIsMobile } from '@/hooks/use-mobile';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold tracking-normal">Dashboard</h2>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted border border-border">
            <Radio className="w-2.5 h-2.5 text-status-healthy" />
            <span className="text-xs font-mono text-muted-foreground">Live</span>
          </div>
        </div>

        <HeroStatsRow stats={stats} sparklineData={sparklineData} isLoading={isLoading} />
        <QuickActionsBar />
        <InstitutionCustomerSummary />

        <Accordion type="multiple" defaultValue={["at-risk", "sprint"]} className="space-y-2">
          <AccordionItem value="at-risk" className="border-b px-0">
            <AccordionTrigger className="text-sm py-3">At-Risk Students</AccordionTrigger>
            <AccordionContent><AtRiskQuickView students={atRiskStudents} /></AccordionContent>
          </AccordionItem>
          <AccordionItem value="sprint" className="border-b px-0">
            <AccordionTrigger className="text-sm py-3">Sprint Leaderboard</AccordionTrigger>
            <AccordionContent><SprintPreview leaders={sprintLeaders} /></AccordionContent>
          </AccordionItem>
          <AccordionItem value="recent" className="border-b px-0">
            <AccordionTrigger className="text-sm py-3">Recent Classes</AccordionTrigger>
            <AccordionContent><RecentClasses batches={recentBatches} /></AccordionContent>
          </AccordionItem>
          <AccordionItem value="topics" className="border-b px-0">
            <AccordionTrigger className="text-sm py-3">Topic Weak Spots</AccordionTrigger>
            <AccordionContent><TopicWeakSpots data={topicData} /></AccordionContent>
          </AccordionItem>
          <AccordionItem value="activity" className="border-b px-0">
            <AccordionTrigger className="text-sm py-3">Activity Heatmap</AccordionTrigger>
            <AccordionContent><ActivityHeatmap data={heatmapData} /></AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-normal text-foreground">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Platform overview
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border">
          <Radio className="w-3 h-3 text-status-healthy" />
          <span className="text-xs font-mono text-muted-foreground">Live</span>
        </div>
      </div>

      <HeroStatsRow stats={stats} sparklineData={sparklineData} isLoading={isLoading} />
      <QuickActionsBar />
        <InstitutionCustomerSummary />

      <div className="grid gap-4 lg:grid-cols-2">
        <ActivityHeatmap data={heatmapData} />
        <TopicWeakSpots data={topicData} />
      </div>

      <SprintPreview leaders={sprintLeaders} />

      <div className="grid gap-4 lg:grid-cols-2">
        <RecentClasses batches={recentBatches} />
        <AtRiskQuickView students={atRiskStudents} />
      </div>
    </div>
  );
}
