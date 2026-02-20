import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { 
  ArrowLeft, 
  Users, 
  CheckCircle2, 
  BookOpen, 
  Target,
  AlertTriangle,
  Award,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  Area,
  AreaChart
} from "recharts";

interface Batch {
  id: string;
  batch_name: string;
  schedule: string;
  room: string;
  start_date: string;
  course_type: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
}

interface AttendanceRecord {
  student_id: string;
  [key: string]: string | number | null;
}

const COLORS = {
  present: "hsl(142, 76%, 36%)",
  absent: "hsl(0, 84%, 60%)",
  sick: "hsl(38, 92%, 50%)",
  late: "hsl(25, 95%, 53%)",
  excused: "hsl(215, 20%, 65%)",
};

export default function AdminBatchAnalytics() {
  const { batchId } = useParams<{ batchId: string }>();
  const { isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [batch, setBatch] = useState<Batch | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [homeworkData, setHomeworkData] = useState<any[]>([]);
  const [testScores, setTestScores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && batchId) {
      fetchAllData();
    }
  }, [batchId, authLoading]);

  const fetchAllData = async () => {
    try {
      const { data: batchData } = await supabase
        .from("batches")
        .select("*")
        .eq("id", batchId)
        .maybeSingle();

      setBatch(batchData);

      const { data: studentsData } = await supabase
        .from("students")
        .select("id, first_name, last_name")
        .eq("batch_id", batchId);

      setStudents(studentsData || []);

      const { data: attendanceRecords } = await supabase
        .from("attendance")
        .select("*")
        .eq("batch_id", batchId);

      setAttendanceData(attendanceRecords || []);

      const { data: homeworkRecords } = await supabase
        .from("homework")
        .select("*")
        .eq("batch_id", batchId);

      setHomeworkData(homeworkRecords || []);

      const { data: testsData } = await supabase
        .from("practice_tests")
        .select("*")
        .eq("batch_id", batchId);

      setTestScores(testsData || []);
    } catch (error) {
      console.error("Error fetching analytics data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const sessionCount = batch?.course_type === "IELTS" ? 24 : 15;

  const attendanceStats = (() => {
    const stats = { present: 0, absent: 0, sick: 0, late: 0, excused: 0, total: 0 };
    attendanceData.forEach((record) => {
      for (let i = 1; i <= sessionCount; i++) {
        const status = record[`session_${i}`] as string | null;
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
    return stats;
  })();

  const attendanceBySession = (() => {
    const sessions: { session: string; present: number; absent: number; late: number; sick: number }[] = [];
    for (let i = 1; i <= sessionCount; i++) {
      const sessionStats = { session: `S${i}`, present: 0, absent: 0, late: 0, sick: 0 };
      attendanceData.forEach((record) => {
        const status = record[`session_${i}`] as string | null;
        if (status === "present") sessionStats.present++;
        else if (status === "absent") sessionStats.absent++;
        else if (status === "late") sessionStats.late++;
        else if (status === "sick") sessionStats.sick++;
      });
      if (sessionStats.present + sessionStats.absent + sessionStats.late + sessionStats.sick > 0) {
        sessions.push(sessionStats);
      }
    }
    return sessions;
  })();

  const homeworkStats = (() => {
    const completed = homeworkData.filter(h => h.completed).length;
    const total = homeworkData.length;
    return { completed, notCompleted: total - completed, total };
  })();

  const homeworkBySession = (() => {
    const sessions: { session: string; completed: number; incomplete: number }[] = [];
    for (let i = 1; i <= sessionCount; i++) {
      const sessionHw = homeworkData.filter(h => h.session_number === i);
      if (sessionHw.length > 0) {
        sessions.push({
          session: `S${i}`,
          completed: sessionHw.filter(h => h.completed).length,
          incomplete: sessionHw.filter(h => !h.completed).length,
        });
      }
    }
    return sessions;
  })();

  const testScoreStats = (() => {
    const testGroups: Record<number, { scores: number[]; total: number; count: number }> = {};
    testScores.forEach((test) => {
      if (test.score !== null) {
        if (!testGroups[test.test_number]) {
          testGroups[test.test_number] = { scores: [], total: 0, count: 0 };
        }
        testGroups[test.test_number].scores.push(test.score);
        testGroups[test.test_number].total += test.score;
        testGroups[test.test_number].count++;
      }
    });
    return Object.entries(testGroups)
      .map(([num, data]) => ({
        test: parseInt(num) === 9 ? 'SAT Mock' : `Test ${parseInt(num) + 3}`,
        testNumber: parseInt(num),
        avg: Math.round(data.total / data.count),
        min: Math.min(...data.scores),
        max: Math.max(...data.scores),
        count: data.count,
      }))
      .sort((a, b) => a.testNumber - b.testNumber);
  })();

  // Calculate average improvement from first to last test per student
  const scoreImprovementStats = (() => {
    const studentImprovements: { student: Student; firstScore: number; lastScore: number; improvement: number; testCount: number }[] = [];
    
    students.forEach((student) => {
      const studentTests = testScores
        .filter(t => t.student_id === student.id && t.score !== null)
        .sort((a, b) => a.test_number - b.test_number);
      
      if (studentTests.length >= 2) {
        const firstScore = studentTests[0].score;
        const lastScore = studentTests[studentTests.length - 1].score;
        const improvement = lastScore - firstScore;
        studentImprovements.push({ 
          student, 
          firstScore, 
          lastScore, 
          improvement,
          testCount: studentTests.length 
        });
      }
    });
    
    // Calculate class average improvement
    const avgImprovement = studentImprovements.length > 0
      ? Math.round(studentImprovements.reduce((sum, s) => sum + s.improvement, 0) / studentImprovements.length)
      : 0;
    
    // Get students with improvements (sorted by improvement descending)
    const topImprovers = [...studentImprovements]
      .sort((a, b) => b.improvement - a.improvement)
      .slice(0, 3);
    
    return { avgImprovement, topImprovers, totalWithMultipleTests: studentImprovements.length };
  })();

  const studentsNeedingAttention = (() => {
    const alerts: { student: Student; absences: number; incompleteHw: number }[] = [];
    students.forEach((student) => {
      const attendance = attendanceData.find(a => a.student_id === student.id);
      let absences = 0;
      if (attendance) {
        for (let i = 1; i <= sessionCount; i++) {
          const status = attendance[`session_${i}`] as string | null;
          if (status === "absent") absences++;
        }
      }
      const incompleteHw = homeworkData.filter(
        h => h.student_id === student.id && !h.completed
      ).length;
      if (absences >= 3 || incompleteHw >= 3) {
        alerts.push({ student, absences, incompleteHw });
      }
    });
    return alerts.sort((a, b) => (b.absences + b.incompleteHw) - (a.absences + a.incompleteHw));
  })();

  const topPerformers = (() => {
    const studentScores: { student: Student; avgScore: number; testCount: number }[] = [];
    students.forEach((student) => {
      const studentTests = testScores.filter(t => t.student_id === student.id && t.score !== null);
      if (studentTests.length > 0) {
        const avg = studentTests.reduce((sum, t) => sum + t.score, 0) / studentTests.length;
        studentScores.push({ student, avgScore: Math.round(avg), testCount: studentTests.length });
      }
    });
    return studentScores.sort((a, b) => b.avgScore - a.avgScore).slice(0, 5);
  })();

  // Current session (highest session with any recorded attendance)
  const currentSession = (() => {
    let maxSession = 0;
    attendanceData.forEach((record) => {
      for (let i = sessionCount; i >= 1; i--) {
        const status = record[`session_${i}`] as string | null;
        if (status && i > maxSession) {
          maxSession = i;
          break;
        }
      }
    });
    return maxSession;
  })();

  // Class progress percentage
  const classProgress = currentSession > 0 ? Math.round((currentSession / sessionCount) * 100) : 0;

  const attendanceRate = attendanceStats.total > 0 
    ? Math.round((attendanceStats.present / attendanceStats.total) * 100) 
    : 0;

  const homeworkRate = homeworkStats.total > 0
    ? Math.round((homeworkStats.completed / homeworkStats.total) * 100)
    : 0;

  const pieData = [
    { name: "Present", value: attendanceStats.present, color: COLORS.present },
    { name: "Absent", value: attendanceStats.absent, color: COLORS.absent },
    { name: "Late", value: attendanceStats.late, color: COLORS.late },
    { name: "Sick", value: attendanceStats.sick, color: COLORS.sick },
    { name: "Excused", value: attendanceStats.excused, color: COLORS.excused },
  ].filter(d => d.value > 0);

  const chartConfig = {
    present: { label: 'Present', color: COLORS.present },
    absent: { label: 'Absent', color: COLORS.absent },
    late: { label: 'Late', color: COLORS.late },
    sick: { label: 'Sick', color: COLORS.sick },
    completed: { label: 'Completed', color: '#22c55e' },
    incomplete: { label: 'Incomplete', color: '#ef4444' },
    avg: { label: 'Average', color: '#3b82f6' },
    max: { label: 'Max', color: '#22c55e' },
    min: { label: 'Min', color: '#f97316' },
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/overview")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-bold">{batch?.batch_name}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
            <Calendar className="h-4 w-4" />
            Started {batch?.start_date ? new Date(batch.start_date).toLocaleDateString() : "N/A"}
            <span className="mx-2">•</span>
            <Users className="h-4 w-4" />
            {students.length} students
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/60 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Attendance Rate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold">{attendanceRate}%</div>
            <Progress value={attendanceRate} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {attendanceStats.present} present of {attendanceStats.total} total
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-blue-500" />
              Homework Completion
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold">{homeworkRate}%</div>
            <Progress value={homeworkRate} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {homeworkStats.completed} of {homeworkStats.total} done
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              Avg Score Improvement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              {scoreImprovementStats.totalWithMultipleTests > 0 ? (
                <>
                  {scoreImprovementStats.avgImprovement > 0 ? "+" : ""}
                  {scoreImprovementStats.avgImprovement}
                  {scoreImprovementStats.avgImprovement > 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  ) : scoreImprovementStats.avgImprovement < 0 ? (
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  ) : (
                    <Minus className="h-5 w-5 text-muted-foreground" />
                  )}
                </>
              ) : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {scoreImprovementStats.totalWithMultipleTests > 0 
                ? `First → Last mock (${scoreImprovementStats.totalWithMultipleTests} students)`
                : "Need 2+ tests per student"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-cyan-500" />
              Class Progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold">{currentSession}/{sessionCount}</div>
            <Progress value={classProgress} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {classProgress}% complete
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card/60 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Attendance Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No attendance data recorded
              </div>
            )}
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              {pieData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}: {entry.value}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Attendance by Session</CardTitle>
          </CardHeader>
          <CardContent>
            {attendanceBySession.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceBySession}>
                    <defs>
                      <linearGradient id="presentGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.present} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={COLORS.present} stopOpacity={0.4}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="session" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="present" stackId="a" fill="url(#presentGradient)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="late" stackId="a" fill={COLORS.late} fillOpacity={0.7} />
                    <Bar dataKey="absent" stackId="a" fill={COLORS.absent} fillOpacity={0.7} />
                    <Bar dataKey="sick" stackId="a" fill={COLORS.sick} fillOpacity={0.7} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No session data available
              </div>
            )}
            <div className="flex flex-wrap justify-center gap-3 mt-3">
              <div className="flex items-center gap-1.5 text-xs">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.present }} />Present
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.late }} />Late
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.absent }} />Absent
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.sick }} />Sick
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card/60 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Test Score Progression</CardTitle>
            <CardDescription>Average, min, and max scores per test</CardDescription>
          </CardHeader>
          <CardContent>
            {testScoreStats.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={testScoreStats}>
                    <defs>
                      <linearGradient id="avgGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="maxGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="minGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="test" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} domain={[0, batch?.course_type === "IELTS" ? 9 : 800]} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="max" stroke="#22c55e" strokeWidth={2} fill="url(#maxGradient)" />
                    <Area type="monotone" dataKey="avg" stroke="#3b82f6" strokeWidth={2} fill="url(#avgGradient)" />
                    <Area type="monotone" dataKey="min" stroke="#f97316" strokeWidth={2} fill="url(#minGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No test scores recorded yet
              </div>
            )}
            <div className="flex flex-wrap justify-center gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-xs">
                <div className="w-3 h-3 rounded bg-green-500" />Max
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <div className="w-3 h-3 rounded bg-blue-500" />Average
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <div className="w-3 h-3 rounded bg-orange-500" />Min
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Homework by Session</CardTitle>
          </CardHeader>
          <CardContent>
            {homeworkBySession.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={homeworkBySession}>
                    <defs>
                      <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.3}/>
                      </linearGradient>
                      <linearGradient id="incompleteGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.3}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="session" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="completed" fill="url(#completedGradient)" radius={[4, 4, 0, 0]} stroke="#22c55e" strokeWidth={1} />
                    <Bar dataKey="incomplete" fill="url(#incompleteGradient)" radius={[4, 4, 0, 0]} stroke="#ef4444" strokeWidth={1} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No homework data recorded
              </div>
            )}
            <div className="flex flex-wrap justify-center gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-xs">
                <div className="w-3 h-3 rounded bg-green-500" />Completed
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <div className="w-3 h-3 rounded bg-red-500" />Incomplete
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row - Lists */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card/60 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Students Needing Attention
            </CardTitle>
            <CardDescription>3+ absences or incomplete homework</CardDescription>
          </CardHeader>
          <CardContent>
            {studentsNeedingAttention.length > 0 ? (
              <div className="space-y-3">
                {studentsNeedingAttention.map(({ student, absences, incompleteHw }) => (
                  <div 
                    key={student.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20"
                  >
                    <span className="font-medium">
                      {student.first_name} {student.last_name?.charAt(0)}.
                    </span>
                    <div className="flex gap-3 text-xs">
                      {absences >= 3 && (
                        <span className="text-destructive">{absences} absences</span>
                      )}
                      {incompleteHw >= 3 && (
                        <span className="text-orange-500">{incompleteHw} hw missing</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                All students are on track! 🎉
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4 text-yellow-500" />
              Top Performers
            </CardTitle>
            <CardDescription>Highest average test scores</CardDescription>
          </CardHeader>
          <CardContent>
            {topPerformers.length > 0 ? (
              <div className="space-y-3">
                {topPerformers.map(({ student, avgScore, testCount }, index) => (
                  <div 
                    key={student.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`
                        w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                        ${index === 0 ? "bg-yellow-500 text-yellow-950" : 
                          index === 1 ? "bg-gray-300 text-gray-700" : 
                          index === 2 ? "bg-orange-400 text-orange-950" : "bg-muted-foreground/20"}
                      `}>
                        {index + 1}
                      </span>
                      <span className="font-medium">
                        {student.first_name} {student.last_name?.charAt(0)}.
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold">{avgScore}</span>
                      <span className="text-xs text-muted-foreground ml-1">
                        ({testCount} tests)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No test scores recorded yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
