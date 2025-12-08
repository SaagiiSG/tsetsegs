import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTeacherAuth } from "@/contexts/TeacherAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  BookOpen, 
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Award,
  Calendar
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
  Tooltip, 
  LineChart, 
  Line,
  Legend,
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

export default function TeacherClassAnalytics() {
  const { batchId } = useParams<{ batchId: string }>();
  const { teacherName, isLoading: authLoading } = useTeacherAuth();
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
      // Fetch batch info
      const { data: batchData, error: batchError } = await supabase
        .from("batches")
        .select("*")
        .eq("id", batchId)
        .maybeSingle();

      if (batchError) throw batchError;
      setBatch(batchData);

      // Fetch students
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, first_name, last_name")
        .eq("batch_id", batchId);

      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

      // Fetch attendance
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from("attendance")
        .select("*")
        .eq("batch_id", batchId);

      if (attendanceError) throw attendanceError;
      setAttendanceData(attendanceRecords || []);

      // Fetch homework
      const { data: homeworkRecords, error: homeworkError } = await supabase
        .from("homework")
        .select("*")
        .eq("batch_id", batchId);

      if (homeworkError) throw homeworkError;
      setHomeworkData(homeworkRecords || []);

      // Fetch practice tests
      const { data: testsData, error: testsError } = await supabase
        .from("practice_tests")
        .select("*")
        .eq("batch_id", batchId);

      if (testsError) throw testsError;
      setTestScores(testsData || []);

    } catch (error) {
      console.error("Error fetching analytics data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const sessionCount = batch?.course_type === "IELTS" ? 24 : 15;

  // Calculate attendance stats
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

  // Attendance by session
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
      
      // Only include sessions with data
      if (sessionStats.present + sessionStats.absent + sessionStats.late + sessionStats.sick > 0) {
        sessions.push(sessionStats);
      }
    }
    
    return sessions;
  })();

  // Homework stats
  const homeworkStats = (() => {
    const completed = homeworkData.filter(h => h.completed).length;
    const total = homeworkData.length;
    return { completed, notCompleted: total - completed, total };
  })();

  // Homework by session
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

  // Test score stats
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
        test: `Test ${num}`,
        testNumber: parseInt(num),
        avg: Math.round(data.total / data.count),
        min: Math.min(...data.scores),
        max: Math.max(...data.scores),
        count: data.count,
      }))
      .sort((a, b) => a.testNumber - b.testNumber);
  })();

  // Students needing attention (3+ absences or incomplete homework)
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

  // Top performers
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 md:p-6 lg:p-8">
        <div className="container mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/teacher/dashboard")}>
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
                <Target className="h-4 w-4 text-purple-500" />
                Avg Test Score
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold">
                {testScoreStats.length > 0 
                  ? Math.round(testScoreStats.reduce((sum, t) => sum + t.avg, 0) / testScoreStats.length)
                  : "—"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {testScoreStats.length > 0 
                  ? `Across ${testScoreStats.length} tests`
                  : "No test data yet"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Need Attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold">{studentsNeedingAttention.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Students with 3+ misses
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Attendance Pie Chart */}
          <Card className="bg-card/60 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Attendance Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <div className="h-64">
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
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
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

          {/* Attendance by Session */}
          <Card className="bg-card/60 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Attendance by Session</CardTitle>
            </CardHeader>
            <CardContent>
              {attendanceBySession.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={attendanceBySession}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="session" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="present" stackId="a" fill={COLORS.present} name="Present" />
                      <Bar dataKey="late" stackId="a" fill={COLORS.late} name="Late" />
                      <Bar dataKey="absent" stackId="a" fill={COLORS.absent} name="Absent" />
                      <Bar dataKey="sick" stackId="a" fill={COLORS.sick} name="Sick" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No session data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Test Score Progression */}
          <Card className="bg-card/60 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Test Score Progression</CardTitle>
              <CardDescription>Average, min, and max scores per test</CardDescription>
            </CardHeader>
            <CardContent>
              {testScoreStats.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={testScoreStats}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="test" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, batch?.course_type === "IELTS" ? 9 : 800]} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area 
                        type="monotone" 
                        dataKey="max" 
                        stroke="hsl(var(--chart-2))" 
                        fill="hsl(var(--chart-2))" 
                        fillOpacity={0.2}
                        name="Max"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="avg" 
                        stroke="hsl(var(--chart-1))" 
                        fill="hsl(var(--chart-1))" 
                        fillOpacity={0.4}
                        name="Average"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="min" 
                        stroke="hsl(var(--chart-4))" 
                        fill="hsl(var(--chart-4))" 
                        fillOpacity={0.2}
                        name="Min"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No test scores recorded yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Homework by Session */}
          <Card className="bg-card/60 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Homework by Session</CardTitle>
            </CardHeader>
            <CardContent>
              {homeworkBySession.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={homeworkBySession}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="session" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="completed" fill="hsl(var(--chart-2))" name="Completed" />
                      <Bar dataKey="incomplete" fill="hsl(var(--chart-4))" name="Incomplete" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No homework data recorded
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row - Lists */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Students Needing Attention */}
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

          {/* Top Performers */}
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
    </div>
  );
}
