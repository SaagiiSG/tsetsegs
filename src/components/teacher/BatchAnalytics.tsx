import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Minus,
  BookOpen,
  Target
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line } from "recharts";

interface BatchAnalyticsProps {
  batchId: string;
  courseType?: string;
}

interface AttendanceStats {
  present: number;
  absent: number;
  sick: number;
  late: number;
  excused: number;
  total: number;
}

interface HomeworkStats {
  completed: number;
  notCompleted: number;
  total: number;
}

interface TestScore {
  testNumber: number;
  avgScore: number;
  studentCount: number;
}

const COLORS = {
  present: "hsl(var(--chart-2))",
  absent: "hsl(var(--destructive))",
  sick: "hsl(var(--chart-4))",
  late: "hsl(var(--chart-3))",
  excused: "hsl(var(--muted-foreground))",
};

export function BatchAnalytics({ batchId, courseType = "SAT" }: BatchAnalyticsProps) {
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats>({
    present: 0,
    absent: 0,
    sick: 0,
    late: 0,
    excused: 0,
    total: 0,
  });
  const [homeworkStats, setHomeworkStats] = useState<HomeworkStats>({
    completed: 0,
    notCompleted: 0,
    total: 0,
  });
  const [testScores, setTestScores] = useState<TestScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [batchId]);

  const fetchAnalytics = async () => {
    try {
      // Fetch attendance data
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance")
        .select("*")
        .eq("batch_id", batchId);

      if (attendanceError) throw attendanceError;

      // Calculate attendance stats
      const stats: AttendanceStats = {
        present: 0,
        absent: 0,
        sick: 0,
        late: 0,
        excused: 0,
        total: 0,
      };

      const sessionCount = courseType === "IELTS" ? 24 : 15;

      attendanceData?.forEach((record) => {
        for (let i = 1; i <= sessionCount; i++) {
          const status = record[`session_${i}` as keyof typeof record] as string | null;
          if (status) {
            stats.total++;
            if (status === "present") stats.present++;
            else if (status === "absent") stats.absent++;
            else if (status === "sick") stats.sick++;
            else if (status === "late") stats.late++;
            else if (status === "excused") stats.excused++;
          }
        }
      });

      setAttendanceStats(stats);

      // Fetch homework data
      const { data: homeworkData, error: homeworkError } = await supabase
        .from("homework")
        .select("completed")
        .eq("batch_id", batchId);

      if (homeworkError) throw homeworkError;

      const hwStats: HomeworkStats = {
        completed: homeworkData?.filter((h) => h.completed).length || 0,
        notCompleted: homeworkData?.filter((h) => !h.completed).length || 0,
        total: homeworkData?.length || 0,
      };
      setHomeworkStats(hwStats);

      // Fetch practice test scores
      const { data: testsData, error: testsError } = await supabase
        .from("practice_tests")
        .select("test_number, score")
        .eq("batch_id", batchId)
        .not("score", "is", null);

      if (testsError) throw testsError;

      // Group by test number and calculate averages
      const testGroups: Record<number, { total: number; count: number }> = {};
      testsData?.forEach((test) => {
        if (!testGroups[test.test_number]) {
          testGroups[test.test_number] = { total: 0, count: 0 };
        }
        testGroups[test.test_number].total += test.score || 0;
        testGroups[test.test_number].count++;
      });

      const scores: TestScore[] = Object.entries(testGroups)
        .map(([num, data]) => ({
          testNumber: parseInt(num),
          avgScore: Math.round(data.total / data.count),
          studentCount: data.count,
        }))
        .sort((a, b) => a.testNumber - b.testNumber);

      setTestScores(scores);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-20 bg-muted rounded"></div>
        <div className="h-20 bg-muted rounded"></div>
      </div>
    );
  }

  const attendanceRate = attendanceStats.total > 0 
    ? Math.round((attendanceStats.present / attendanceStats.total) * 100) 
    : 0;

  const homeworkRate = homeworkStats.total > 0
    ? Math.round((homeworkStats.completed / homeworkStats.total) * 100)
    : 0;

  const pieData = [
    { name: "Present", value: attendanceStats.present, color: COLORS.present },
    { name: "Absent", value: attendanceStats.absent, color: COLORS.absent },
    { name: "Sick", value: attendanceStats.sick, color: COLORS.sick },
    { name: "Late", value: attendanceStats.late, color: COLORS.late },
    { name: "Excused", value: attendanceStats.excused, color: COLORS.excused },
  ].filter((d) => d.value > 0);

  // Calculate score trend
  const scoreTrend = testScores.length >= 2
    ? testScores[testScores.length - 1].avgScore - testScores[testScores.length - 2].avgScore
    : 0;

  return (
    <div className="space-y-4 mt-4 pt-4 border-t">
      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Class Analytics</h4>
      
      {/* Attendance Overview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-chart-2" />
            Attendance Rate
          </span>
          <span className="font-semibold">{attendanceRate}%</span>
        </div>
        <Progress value={attendanceRate} className="h-2" />
        
        {attendanceStats.total > 0 && (
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="flex items-center gap-1 text-chart-2">
              <span className="w-2 h-2 rounded-full bg-chart-2"></span>
              {attendanceStats.present} present
            </span>
            {attendanceStats.absent > 0 && (
              <span className="flex items-center gap-1 text-destructive">
                <span className="w-2 h-2 rounded-full bg-destructive"></span>
                {attendanceStats.absent} absent
              </span>
            )}
            {attendanceStats.late > 0 && (
              <span className="flex items-center gap-1 text-chart-3">
                <span className="w-2 h-2 rounded-full bg-chart-3"></span>
                {attendanceStats.late} late
              </span>
            )}
            {attendanceStats.sick > 0 && (
              <span className="flex items-center gap-1 text-chart-4">
                <span className="w-2 h-2 rounded-full bg-chart-4"></span>
                {attendanceStats.sick} sick
              </span>
            )}
          </div>
        )}
      </div>

      {/* Homework Completion */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-chart-1" />
            Homework Completion
          </span>
          <span className="font-semibold">{homeworkRate}%</span>
        </div>
        <Progress value={homeworkRate} className="h-2" />
        {homeworkStats.total > 0 && (
          <p className="text-xs text-muted-foreground">
            {homeworkStats.completed} of {homeworkStats.total} assignments completed
          </p>
        )}
      </div>

      {/* Practice Test Scores */}
      {testScores.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-chart-5" />
              Avg Test Scores
            </span>
            {scoreTrend !== 0 && (
              <span className={`flex items-center gap-1 text-xs ${scoreTrend > 0 ? "text-chart-2" : "text-destructive"}`}>
                {scoreTrend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {scoreTrend > 0 ? "+" : ""}{scoreTrend}
              </span>
            )}
          </div>
          <div className="h-16">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={testScores}>
                <XAxis 
                  dataKey="testNumber" 
                  tick={{ fontSize: 10 }} 
                  tickFormatter={(v) => `T${v}`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  formatter={(value: number) => [value, "Avg Score"]}
                  labelFormatter={(label) => `Test ${label}`}
                  contentStyle={{ 
                    fontSize: 12,
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 6
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="avgScore" 
                  stroke="hsl(var(--chart-5))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--chart-5))", r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Latest avg: {testScores[testScores.length - 1]?.avgScore || 0}
            {courseType === "IELTS" ? " band" : " pts"}
          </p>
        </div>
      )}

      {attendanceStats.total === 0 && homeworkStats.total === 0 && testScores.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          No data recorded yet
        </p>
      )}
    </div>
  );
}
