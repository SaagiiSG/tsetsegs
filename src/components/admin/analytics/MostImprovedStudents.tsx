import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Medal, ArrowUpRight } from 'lucide-react';
import { useMostImprovedStudents } from '@/hooks/useAdminAnalytics';
import { Skeleton } from '@/components/ui/skeleton';

export function MostImprovedStudents() {
  const { data: students, isLoading } = useMostImprovedStudents();

  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-500';
      case 2: return 'text-gray-400';
      case 3: return 'text-amber-600';
      default: return 'text-muted-foreground';
    }
  };

  const getMedalBg = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-yellow-500/10 border-yellow-500/30';
      case 2: return 'bg-gray-400/10 border-gray-400/30';
      case 3: return 'bg-amber-600/10 border-amber-600/30';
      default: return 'bg-muted border-border';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Medal className="h-5 w-5 text-yellow-500" />
          <CardTitle>Most Improved Students</CardTitle>
        </div>
        <CardDescription>
          Top 5 students with greatest score improvement
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {students?.slice(0, 5).map((student, index) => (
          <div
            key={student.id}
            className={`flex items-center gap-3 p-3 rounded-lg border ${getMedalBg(index + 1)}`}
          >
            <div className={`flex items-center justify-center h-8 w-8 rounded-full ${getMedalBg(index + 1)}`}>
              <span className={`font-bold ${getMedalColor(index + 1)}`}>
                {index + 1}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{student.name}</p>
              <p className="text-xs text-muted-foreground">{student.batchName}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-green-500">
                <TrendingUp className="h-3 w-3" />
                <span className="font-bold">+{student.improvement}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {student.firstScore} → {student.latestScore}
              </p>
            </div>
          </div>
        ))}

        {(!students || students.length === 0) && (
          <div className="text-center py-6 text-muted-foreground">
            <Medal className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Not enough data for improvement tracking</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
