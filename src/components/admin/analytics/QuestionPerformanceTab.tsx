import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileQuestion, AlertTriangle, HelpCircle, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function QuestionPerformanceTab() {
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
            <Skeleton className="h-8 w-16" />
            <p className="text-xs text-muted-foreground mt-1">Active in question bank</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-destructive/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Needs Review</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
            <p className="text-xs text-muted-foreground mt-1">Flagged or low accuracy</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-yellow-500/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Never Attempted</CardTitle>
            <HelpCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
            <p className="text-xs text-muted-foreground mt-1">No student attempts</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-green-500/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">High Performers</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
            <p className="text-xs text-muted-foreground mt-1">90%+ accuracy rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Question Table Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Question Performance Table</CardTitle>
          <CardDescription>
            Detailed question-level analytics with filtering and sorting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">Question table with pagination coming in Phase 3</p>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Difficulty Calibration Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Difficulty Calibration Alerts</CardTitle>
            <CardDescription>
              Questions with mismatched difficulty settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">Calibration alerts coming in Phase 3</p>
            </div>
          </CardContent>
        </Card>

        {/* Wrong Answer Patterns */}
        <Card>
          <CardHeader>
            <CardTitle>Wrong Answer Patterns</CardTitle>
            <CardDescription>
              Common mistakes and error patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">Error patterns coming in Phase 3</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Outliers */}
      <Card>
        <CardHeader>
          <CardTitle>Time Outliers</CardTitle>
          <CardDescription>
            Questions taking significantly longer than expected
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">Time outliers analysis coming in Phase 3</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
