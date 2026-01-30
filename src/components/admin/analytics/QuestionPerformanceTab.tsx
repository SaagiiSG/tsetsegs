import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileQuestion, AlertTriangle, HelpCircle, TrendingUp } from 'lucide-react';
import { useQuestionPerformanceData } from '@/hooks/useAdminAnalytics';
import { QuestionTable } from './QuestionTable';
import { DifficultyCalibrationAlerts } from './DifficultyCalibrationAlerts';
import { TimeOutliersTable } from './TimeOutliersTable';
import { WrongAnswerPatterns } from './WrongAnswerPatterns';
import { NeverAttemptedSection } from './NeverAttemptedSection';

export function QuestionPerformanceTab() {
  const { data } = useQuestionPerformanceData(1, 50);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
            <FileQuestion className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data?.total || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Active in question bank</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-destructive/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Needs Review</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data?.questions?.filter(q => q.status === 'needs_review').length || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Flagged or low accuracy</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-yellow-500/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Never Attempted</CardTitle>
            <HelpCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data?.questions?.filter(q => q.status === 'never_attempted').length || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">No student attempts</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-green-500/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">High Performers</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data?.questions?.filter(q => q.accuracy >= 90).length || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">90%+ accuracy rate</p>
          </CardContent>
        </Card>
      </div>

      <QuestionTable />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DifficultyCalibrationAlerts />
        <WrongAnswerPatterns />
      </div>

      <TimeOutliersTable />
      <NeverAttemptedSection />
    </div>
  );
}