import { motion } from 'framer-motion';
import { BarChart3, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useStudentAnalytics } from '@/hooks/useStudentAnalytics';
import { PriorityAlertCard } from '@/components/student/analytics/PriorityAlertCard';
import { WeaknessIdentifier } from '@/components/student/analytics/WeaknessIdentifier';
import { TimeEfficiencyDashboard } from '@/components/student/analytics/TimeEfficiencyDashboard';
import { DifficultyAnalysis } from '@/components/student/analytics/DifficultyAnalysis';
import { ErrorPatternTracker } from '@/components/student/analytics/ErrorPatternTracker';
import { ProgressVelocityGraph } from '@/components/student/analytics/ProgressVelocityGraph';
import { GoalGapTracker } from '@/components/student/analytics/GoalGapTracker';
import { ConsistencyScoreCard } from '@/components/student/analytics/ConsistencyScoreCard';

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-[180px] w-full rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-[380px] w-full rounded-xl" />
        <Skeleton className="h-[380px] w-full rounded-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-[350px] w-full rounded-xl" />
        <Skeleton className="h-[350px] w-full rounded-xl" />
      </div>
      <Skeleton className="h-[400px] w-full rounded-xl" />
    </div>
  );
}

export default function StudentStats() {
  const analytics = useStudentAnalytics();

  if (analytics.isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6 select-none">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Analytics Dashboard
            </h1>
            <p className="text-muted-foreground text-sm">
              Loading your performance data...
            </p>
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
        <AnalyticsSkeleton />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 select-none">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground text-sm">
            Actionable insights to improve your SAT score
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-muted-foreground">Overall Accuracy</p>
            <p className="text-xl font-bold">{analytics.overallAccuracy}%</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.location.reload()}>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Quick Stats Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30">
          <p className="text-xs text-muted-foreground">Questions Mastered</p>
          <p className="text-xl font-bold text-emerald-600">
            {analytics.questionsCompleted}/{analytics.totalQuestions}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/30">
          <p className="text-xs text-muted-foreground">Total Attempts</p>
          <p className="text-xl font-bold text-blue-600">{analytics.totalAttempts}</p>
        </div>
        <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/30">
          <p className="text-xs text-muted-foreground">Correct Answers</p>
          <p className="text-xl font-bold text-purple-600">{analytics.totalCorrect}</p>
        </div>
        <div className="p-3 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/30 sm:block hidden">
          <p className="text-xs text-muted-foreground">Current Score</p>
          <p className="text-xl font-bold text-amber-600">{analytics.currentScore}</p>
        </div>
      </motion.div>

      {/* Priority Alert - Full Width */}
      <PriorityAlertCard weakestTopic={analytics.weakestTopic} />

      {/* Row 1: Weakness + Time Efficiency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WeaknessIdentifier topicAccuracy={analytics.topicAccuracy} />
        <TimeEfficiencyDashboard topicAccuracy={analytics.topicAccuracy} />
      </div>

      {/* Row 2: Difficulty + Error Patterns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DifficultyAnalysis difficultyBreakdown={analytics.difficultyBreakdown} />
        <ErrorPatternTracker errorPatterns={analytics.errorPatterns} />
      </div>

      {/* Row 3: Progress Velocity - Full Width */}
      <ProgressVelocityGraph 
        progressHistory={analytics.progressHistory}
        currentScore={analytics.currentScore}
        targetScore={analytics.targetScore}
      />

      {/* Row 4: Goal Gap + Consistency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GoalGapTracker 
          currentScore={analytics.currentScore}
          targetScore={analytics.targetScore}
          topicAccuracy={analytics.topicAccuracy}
        />
        <ConsistencyScoreCard consistencyMetrics={analytics.consistencyMetrics} />
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center py-6 text-sm text-muted-foreground"
      >
        <p>Analytics update in real-time as you practice.</p>
        <p className="text-xs mt-1">Every section includes an action—follow them to improve!</p>
      </motion.div>
    </div>
  );
}
