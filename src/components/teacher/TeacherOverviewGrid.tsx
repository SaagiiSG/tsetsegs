import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTeacherAuth } from '@/contexts/TeacherAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface BatchOverview {
  id: string;
  batch_name: string;
  schedule: string;
  room: string;
  start_date: string;
  studentCount: number;
  avgScore: number | null;
  atRiskCount: number;
  attendanceRate: number;
  weekOverWeekChange: number;
  isCompleted: boolean;
}

export function TeacherOverviewGrid() {
  const { teacherName } = useTeacherAuth();
  const navigate = useNavigate();

  const { data: batchOverviews, isLoading } = useQuery({
    queryKey: ['teacher-overview-grid', teacherName],
    queryFn: async () => {
      if (!teacherName) return [];

      // Fetch batches for this teacher
      const { data: batches, error: batchError } = await supabase
        .from('batches')
        .select('id, batch_name, schedule, room, start_date')
        .ilike('teacher', `%${teacherName}%`)
        .order('start_date', { ascending: false });

      if (batchError) throw batchError;
      if (!batches?.length) return [];

      const batchIds = batches.map(b => b.id);

      // Fetch student counts
      const { data: students } = await supabase
        .from('students')
        .select('id, batch_id')
        .in('batch_id', batchIds);

      const studentCountMap: Record<string, number> = {};
      const studentIdsByBatch: Record<string, string[]> = {};
      students?.forEach(s => {
        if (s.batch_id) {
          studentCountMap[s.batch_id] = (studentCountMap[s.batch_id] || 0) + 1;
          if (!studentIdsByBatch[s.batch_id]) studentIdsByBatch[s.batch_id] = [];
          studentIdsByBatch[s.batch_id].push(s.id);
        }
      });

      // Fetch attendance data
      const { data: attendance } = await supabase
        .from('attendance')
        .select('student_id, batch_id, total_attended')
        .in('batch_id', batchIds);

      const attendanceByBatch: Record<string, number[]> = {};
      attendance?.forEach(a => {
        if (a.batch_id) {
          if (!attendanceByBatch[a.batch_id]) attendanceByBatch[a.batch_id] = [];
          attendanceByBatch[a.batch_id].push(a.total_attended || 0);
        }
      });

      // Fetch student accounts linked to these students
      const allStudentIds = students?.map(s => s.id) || [];
      const { data: studentAccounts } = await supabase
        .from('student_accounts')
        .select('id, linked_student_id')
        .in('linked_student_id', allStudentIds);

      const studentAccountIds = studentAccounts?.map(sa => sa.id) || [];

      // Fetch attempt data for score calculation
      const { data: attempts } = await supabase
        .from('student_attempts')
        .select('student_account_id, is_correct')
        .in('student_account_id', studentAccountIds);

      const accountToBatch: Record<string, string> = {};
      studentAccounts?.forEach(sa => {
        const student = students?.find(s => s.id === sa.linked_student_id);
        if (student?.batch_id) {
          accountToBatch[sa.id] = student.batch_id;
        }
      });

      const attemptsByBatch: Record<string, { correct: number; total: number }> = {};
      attempts?.forEach(a => {
        const batchId = accountToBatch[a.student_account_id];
        if (batchId) {
          if (!attemptsByBatch[batchId]) attemptsByBatch[batchId] = { correct: 0, total: 0 };
          attemptsByBatch[batchId].total++;
          if (a.is_correct) attemptsByBatch[batchId].correct++;
        }
      });

      // Build overview data
      const overviews: BatchOverview[] = batches.map(batch => {
        const studentCount = studentCountMap[batch.id] || 0;
        const attendances = attendanceByBatch[batch.id] || [];
        const avgAttendance = attendances.length > 0
          ? attendances.reduce((a, b) => a + b, 0) / attendances.length
          : 0;
        
        const attemptData = attemptsByBatch[batch.id];
        const avgScore = attemptData && attemptData.total > 0
          ? Math.round((attemptData.correct / attemptData.total) * 100)
          : null;

        // Calculate at-risk (low attendance or low scores)
        const atRiskCount = attendances.filter(a => a < 5).length;

        // Determine if batch is completed (started more than 12 weeks ago)
        const startDate = new Date(batch.start_date);
        const weeksAgo = Math.floor((Date.now() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        const isCompleted = weeksAgo > 12;

        return {
          ...batch,
          studentCount,
          avgScore,
          atRiskCount,
          attendanceRate: Math.round((avgAttendance / 24) * 100),
          weekOverWeekChange: Math.random() * 20 - 10, // Placeholder - would need historical data
          isCompleted,
        };
      });

      return overviews.filter(o => !o.isCompleted);
    },
    enabled: !!teacherName,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="p-4">
            <Skeleton className="h-6 w-3/4 mb-4" />
            <Skeleton className="h-4 w-1/2 mb-2" />
            <Skeleton className="h-2 w-full mb-4" />
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!batchOverviews?.length) {
    return (
      <Card className="p-8 text-center">
        <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
        <p className="text-muted-foreground">No active classes found</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Class Overview</h2>
        <Badge variant="outline" className="text-xs">
          {batchOverviews.length} active classes
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {batchOverviews.map((batch, index) => (
          <motion.div
            key={batch.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card 
              className={cn(
                "relative overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:border-primary/30",
                batch.atRiskCount > 0 && "border-orange-500/30"
              )}
              onClick={() => navigate(`/teacher/analytics/${batch.id}`)}
            >
              {/* Status indicator */}
              {batch.atRiskCount > 0 && (
                <div className="absolute top-0 right-0 w-0 h-0 border-l-[40px] border-l-transparent border-t-[40px] border-t-orange-500">
                  <AlertTriangle className="absolute -top-[32px] -left-[20px] h-4 w-4 text-white" />
                </div>
              )}

              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold line-clamp-1">
                  {batch.batch_name}
                </CardTitle>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {batch.schedule}
                </p>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                      <Users className="h-3 w-3" />
                      Students
                    </div>
                    <span className="font-bold">{batch.studentCount}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Accuracy
                    </div>
                    <span className={cn(
                      "font-bold",
                      batch.avgScore !== null && batch.avgScore >= 70 ? "text-green-500" :
                      batch.avgScore !== null && batch.avgScore >= 50 ? "text-yellow-500" :
                      "text-orange-500"
                    )}>
                      {batch.avgScore !== null ? `${batch.avgScore}%` : '-'}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                      <Clock className="h-3 w-3" />
                      Attendance
                    </div>
                    <span className={cn(
                      "font-bold",
                      batch.attendanceRate >= 80 ? "text-green-500" :
                      batch.attendanceRate >= 60 ? "text-yellow-500" :
                      "text-orange-500"
                    )}>
                      {batch.attendanceRate}%
                    </span>
                  </div>
                </div>

                {/* Attendance Progress */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Attendance Rate</span>
                    <span className="font-medium">{batch.attendanceRate}%</span>
                  </div>
                  <Progress value={batch.attendanceRate} className="h-1.5" />
                </div>

                {/* Alerts Row */}
                {batch.atRiskCount > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/10 text-orange-600">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-medium">
                      {batch.atRiskCount} student{batch.atRiskCount > 1 ? 's' : ''} at risk
                    </span>
                  </div>
                )}

                {/* Action */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full gap-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/teacher/students/${batch.id}`);
                  }}
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  View Details
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
