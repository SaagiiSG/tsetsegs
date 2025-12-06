import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { 
  ChevronLeft, User, Phone, School, BookOpen, TrendingUp, 
  Calendar, Clock, AlertTriangle, Award, Target, BarChart3,
  CheckCircle2, XCircle, Clock3, StickyNote, Plus, Trash2, Send
} from "lucide-react";
import { useTeacherAuth } from "@/contexts/TeacherAuthContext";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar, Area, AreaChart
} from "recharts";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  parent_phone?: string;
  grade?: string;
  school_name?: string;
  math_level?: string;
  english_level?: string;
  first_session_completed?: boolean;
  batch_id: string;
  created_at: string;
}

interface Batch {
  id: string;
  batch_name: string;
  schedule: string;
  room: string;
  start_date: string;
  course_type: 'SAT' | 'IELTS';
  teacher: string;
}

interface AttendanceRecord {
  session_number: number;
  status: "present" | "absent" | "sick" | "late" | "excused" | null;
}

interface HomeworkRecord {
  session_number: number;
  completed: boolean | null;
}

interface PracticeTest {
  test_number: number;
  score: number | null;
  created_at?: string;
}

interface StudentNote {
  id: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Chart colors using design tokens
const CHART_COLORS = {
  present: "hsl(var(--chart-2))",
  absent: "hsl(var(--chart-1))",
  sick: "hsl(var(--chart-4))",
  late: "hsl(var(--chart-3))",
  excused: "hsl(var(--chart-5))",
  primary: "hsl(var(--primary))",
  muted: "hsl(var(--muted))",
};

const PIE_COLORS = ["#03C988", "#FA6363", "#FFDE0B", "#60a5fa", "#a78bfa"];

export default function TeacherStudentProfile() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { teacherName } = useTeacherAuth();

  const [student, setStudent] = useState<Student | null>(null);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [homework, setHomework] = useState<HomeworkRecord[]>([]);
  const [practiceTests, setPracticeTests] = useState<PracticeTest[]>([]);
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (studentId) {
      fetchStudentData();
    }
  }, [studentId]);

  const fetchStudentData = async () => {
    try {
      setIsLoading(true);

      // Fetch student
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("*")
        .eq("id", studentId)
        .single();

      if (studentError) throw studentError;
      setStudent(studentData);

      // Fetch batch
      const { data: batchData, error: batchError } = await supabase
        .from("batches")
        .select("*")
        .eq("id", studentData.batch_id)
        .single();

      if (batchError) throw batchError;
      setBatch(batchData);

      const maxSessions = batchData.course_type === 'IELTS' ? 24 : 15;

      // Fetch attendance
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("*")
        .eq("student_id", studentId)
        .eq("batch_id", studentData.batch_id)
        .single();

      const attendanceRecords: AttendanceRecord[] = [];
      for (let i = 1; i <= maxSessions; i++) {
        attendanceRecords.push({
          session_number: i,
          status: attendanceData ? (attendanceData as any)[`session_${i}`] : null,
        });
      }
      setAttendance(attendanceRecords);

      // Fetch homework
      const { data: homeworkData } = await supabase
        .from("homework")
        .select("session_number, completed")
        .eq("student_id", studentId)
        .eq("batch_id", studentData.batch_id);

      const hwMap = new Map(homeworkData?.map(h => [h.session_number, h.completed]) || []);
      const homeworkRecords: HomeworkRecord[] = Array.from({ length: maxSessions }, (_, i) => ({
        session_number: i + 1,
        completed: hwMap.get(i + 1) ?? null,
      }));
      setHomework(homeworkRecords);

      // Fetch practice tests
      const { data: testsData } = await supabase
        .from("practice_tests")
        .select("test_number, score, created_at")
        .eq("student_id", studentId)
        .eq("batch_id", studentData.batch_id)
        .order("test_number");

      setPracticeTests(testsData || []);

      // Fetch notes
      const { data: notesData } = await supabase
        .from("student_notes")
        .select("*")
        .eq("student_id", studentId)
        .eq("batch_id", studentData.batch_id)
        .order("created_at", { ascending: false });

      setNotes(notesData || []);

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !student || !batch || !teacherName) return;
    
    setIsAddingNote(true);
    try {
      const { data, error } = await supabase
        .from("student_notes")
        .insert({
          student_id: student.id,
          batch_id: batch.id,
          content: newNote.trim(),
          created_by: teacherName,
        })
        .select()
        .single();

      if (error) throw error;

      setNotes([data, ...notes]);
      setNewNote("");
      toast({
        title: "Note added",
        description: "Your note has been saved",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from("student_notes")
        .delete()
        .eq("id", noteId);

      if (error) throw error;

      setNotes(notes.filter(n => n.id !== noteId));
      toast({
        title: "Note deleted",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const attendedCount = attendance.filter(a => a.status === 'present' || a.status === 'late').length;
    const markedCount = attendance.filter(a => a.status !== null).length;
    const absentCount = attendance.filter(a => a.status === 'absent' || a.status === 'sick').length;
    const attendanceRate = markedCount > 0 ? (attendedCount / markedCount) * 100 : 0;

    const homeworkCompleted = homework.filter(h => h.completed === true).length;
    const homeworkMarked = homework.filter(h => h.completed !== null).length;
    const homeworkRate = homeworkMarked > 0 ? (homeworkCompleted / homeworkMarked) * 100 : 0;

    const testsWithScores = practiceTests.filter(t => t.score !== null);
    const avgScore = testsWithScores.length > 0 
      ? testsWithScores.reduce((sum, t) => sum + (t.score || 0), 0) / testsWithScores.length 
      : 0;
    
    const firstScore = testsWithScores[0]?.score || 0;
    const lastScore = testsWithScores[testsWithScores.length - 1]?.score || 0;
    const improvement = testsWithScores.length > 1 ? lastScore - firstScore : 0;

    return {
      attendedCount,
      markedCount,
      absentCount,
      attendanceRate,
      homeworkCompleted,
      homeworkMarked,
      homeworkRate,
      avgScore,
      testsCompleted: testsWithScores.length,
      improvement,
      firstScore,
      lastScore,
    };
  }, [attendance, homework, practiceTests]);

  // Chart data
  const scoreProgressData = useMemo(() => {
    return practiceTests
      .filter(t => t.score !== null)
      .map(t => ({
        test: batch?.course_type === 'IELTS' ? `Mock ${t.test_number}` : `Test ${t.test_number + 3}`,
        score: t.score,
        target: batch?.course_type === 'IELTS' ? 7 : 1400,
      }));
  }, [practiceTests, batch]);

  const attendancePieData = useMemo(() => {
    const statusCounts = {
      present: attendance.filter(a => a.status === 'present').length,
      late: attendance.filter(a => a.status === 'late').length,
      absent: attendance.filter(a => a.status === 'absent').length,
      sick: attendance.filter(a => a.status === 'sick').length,
      excused: attendance.filter(a => a.status === 'excused').length,
    };
    
    return Object.entries(statusCounts)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: count,
      }));
  }, [attendance]);

  const homeworkPieData = useMemo(() => {
    const completed = homework.filter(h => h.completed === true).length;
    const incomplete = homework.filter(h => h.completed === false).length;
    const unmarked = homework.filter(h => h.completed === null).length;
    
    return [
      { name: "Completed", value: completed },
      { name: "Incomplete", value: incomplete },
      { name: "Unmarked", value: unmarked },
    ].filter(item => item.value > 0);
  }, [homework]);

  const sessionProgressData = useMemo(() => {
    return attendance.slice(0, 12).map((a, i) => ({
      session: `S${i + 1}`,
      attendance: a.status === 'present' || a.status === 'late' ? 1 : 0,
      homework: homework[i]?.completed ? 1 : 0,
    }));
  }, [attendance, homework]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!student || !batch) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Student not found</p>
            <Button className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasAlert = stats.absentCount >= 3 || (stats.homeworkMarked - stats.homeworkCompleted) >= 3;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold">
                {student.first_name} {student.last_name}
              </h1>
              {hasAlert && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Needs Attention
                </Badge>
              )}
              {!student.first_session_completed && (
                <Badge variant="outline" className="gap-1">
                  First Session Incomplete
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1 text-sm md:text-base truncate">
              {batch.batch_name} • {batch.course_type}
            </p>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-medium">Attendance</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold">{stats.attendanceRate.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">{stats.attendedCount}/{stats.markedCount} sessions</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                <BookOpen className="h-4 w-4" />
                <span className="text-xs font-medium">Homework</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold">{stats.homeworkRate.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">{stats.homeworkCompleted}/{stats.homeworkMarked} completed</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
                <Target className="h-4 w-4" />
                <span className="text-xs font-medium">Avg Score</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold">
                {batch.course_type === 'IELTS' 
                  ? stats.avgScore.toFixed(1) 
                  : Math.round(stats.avgScore)}
              </p>
              <p className="text-xs text-muted-foreground">{stats.testsCompleted} tests taken</p>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${stats.improvement >= 0 ? 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20' : 'from-red-500/10 to-red-600/5 border-red-500/20'}`}>
            <CardContent className="p-4">
              <div className={`flex items-center gap-2 mb-1 ${stats.improvement >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs font-medium">Improvement</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold">
                {stats.improvement >= 0 ? '+' : ''}{batch.course_type === 'IELTS' ? stats.improvement.toFixed(1) : Math.round(stats.improvement)}
              </p>
              <p className="text-xs text-muted-foreground">
                {batch.course_type === 'IELTS' 
                  ? `${stats.firstScore.toFixed(1)} → ${stats.lastScore.toFixed(1)}`
                  : `${stats.firstScore} → ${stats.lastScore}`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-5 mb-6">
            <TabsTrigger value="overview" className="text-xs md:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="progress" className="text-xs md:text-sm">Progress</TabsTrigger>
            <TabsTrigger value="attendance" className="text-xs md:text-sm">Attendance</TabsTrigger>
            <TabsTrigger value="notes" className="text-xs md:text-sm">
              <StickyNote className="h-3 w-3 mr-1 hidden md:inline" />
              Notes
              {notes.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs justify-center hidden md:flex">
                  {notes.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="info" className="text-xs md:text-sm">Info</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Score Progress Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Score Progress
                  </CardTitle>
                  <CardDescription>Practice test scores over time</CardDescription>
                </CardHeader>
                <CardContent>
                  {scoreProgressData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={scoreProgressData}>
                        <defs>
                          <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="test" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis 
                          domain={batch.course_type === 'IELTS' ? [0, 9] : [400, 1600]} 
                          className="text-xs" 
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }} 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="score" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          fill="url(#scoreGradient)" 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="target" 
                          stroke="hsl(var(--muted-foreground))" 
                          strokeDasharray="5 5" 
                          strokeWidth={1}
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      No test scores recorded yet
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Session Progress */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Session Performance
                  </CardTitle>
                  <CardDescription>Attendance vs Homework completion</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={sessionProgressData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="session" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis domain={[0, 1]} ticks={[0, 1]} className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number) => value === 1 ? '✓' : '✗'}
                      />
                      <Bar dataKey="attendance" fill="#03C988" name="Attendance" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="homework" fill="#60a5fa" name="Homework" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Distribution Charts */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Attendance Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {attendancePieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={attendancePieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {attendancePieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend />
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                      No attendance data yet
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Homework Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {homeworkPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={homeworkPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {homeworkPieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend />
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                      No homework data yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  Practice Test History
                </CardTitle>
                <CardDescription>
                  All {batch.course_type === 'IELTS' ? 'mock test' : 'practice test'} scores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {practiceTests.filter(t => t.score !== null).length > 0 ? (
                    practiceTests.filter(t => t.score !== null).map((test) => (
                      <div key={test.test_number} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">
                            {batch.course_type === 'IELTS' 
                              ? `Mock Test ${test.test_number}` 
                              : test.test_number === 7 
                                ? 'Real SAT Mock' 
                                : `Test ${test.test_number + 3}`}
                          </p>
                          {test.created_at && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(test.created_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">
                            {batch.course_type === 'IELTS' ? test.score?.toFixed(1) : test.score}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {batch.course_type === 'IELTS' ? '/9.0' : '/1600'}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No tests recorded yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Score Trend Analysis */}
            {scoreProgressData.length >= 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>Performance Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <p className="text-sm text-muted-foreground mb-1">First Score</p>
                      <p className="text-2xl font-bold">{batch.course_type === 'IELTS' ? stats.firstScore.toFixed(1) : stats.firstScore}</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <p className="text-sm text-muted-foreground mb-1">Latest Score</p>
                      <p className="text-2xl font-bold">{batch.course_type === 'IELTS' ? stats.lastScore.toFixed(1) : stats.lastScore}</p>
                    </div>
                    <div className={`p-4 rounded-lg text-center ${stats.improvement >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      <p className="text-sm text-muted-foreground mb-1">Total Improvement</p>
                      <p className={`text-2xl font-bold ${stats.improvement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {stats.improvement >= 0 ? '+' : ''}{batch.course_type === 'IELTS' ? stats.improvement.toFixed(1) : Math.round(stats.improvement)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Session History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Session History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-2">
                      {attendance.map((session) => (
                        <div 
                          key={session.session_number} 
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <span className="font-medium">Session {session.session_number}</span>
                          <div className="flex items-center gap-2">
                            {session.status ? (
                              <Badge 
                                variant={session.status === 'present' || session.status === 'late' ? 'default' : 'destructive'}
                                className={
                                  session.status === 'present' ? 'bg-green-500' :
                                  session.status === 'late' ? 'bg-yellow-500' :
                                  session.status === 'sick' ? 'bg-blue-500' :
                                  session.status === 'excused' ? 'bg-purple-500' : ''
                                }
                              >
                                {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                              </Badge>
                            ) : (
                              <Badge variant="outline">Not marked</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Homework History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Homework History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-2">
                      {homework.map((hw) => (
                        <div 
                          key={hw.session_number} 
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <span className="font-medium">Session {hw.session_number}</span>
                          <div className="flex items-center gap-2">
                            {hw.completed !== null ? (
                              hw.completed ? (
                                <Badge className="bg-green-500 gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Done
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="gap-1">
                                  <XCircle className="h-3 w-3" />
                                  Missing
                                </Badge>
                              )
                            ) : (
                              <Badge variant="outline">Not marked</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Info Tab */}
          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Student Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Full Name</p>
                      <p className="font-medium text-lg">{student.first_name} {student.last_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                        <Phone className="h-3 w-3" /> Phone
                      </p>
                      <p className="font-medium">{student.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                        <Phone className="h-3 w-3" /> Parent Phone
                      </p>
                      <p className="font-medium">{student.parent_phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                        <School className="h-3 w-3" /> School
                      </p>
                      <p className="font-medium">{student.school_name || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Grade</p>
                      <p className="font-medium">{student.grade || 'Not provided'}</p>
                    </div>
                    {batch.course_type === 'SAT' && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Math Level</p>
                        <Badge variant="outline" className="capitalize">{student.math_level || 'Not assessed'}</Badge>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">English Level</p>
                      <Badge variant="outline" className="capitalize">{student.english_level || 'Not assessed'}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Enrolled
                      </p>
                      <p className="font-medium">
                        {new Date(student.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Class Info */}
                <div className="mt-8 pt-6 border-t">
                  <h3 className="font-semibold mb-4">Class Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Batch</p>
                      <p className="font-medium">{batch.batch_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Course Type</p>
                      <Badge>{batch.course_type}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Schedule</p>
                      <p className="font-medium text-sm">{batch.schedule}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Teacher</p>
                      <p className="font-medium">{batch.teacher}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StickyNote className="h-5 w-5 text-primary" />
                  Teacher Notes
                </CardTitle>
                <CardDescription>
                  Private notes about this student (only visible to teachers)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Note Form */}
                <div className="space-y-3">
                  <Textarea
                    placeholder="Add a note about this student..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                  <Button 
                    onClick={handleAddNote} 
                    disabled={!newNote.trim() || isAddingNote}
                    className="w-full sm:w-auto"
                  >
                    {isAddingNote ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Add Note
                      </>
                    )}
                  </Button>
                </div>

                {/* Notes List */}
                <div className="border-t pt-4">
                  {notes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <StickyNote className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p>No notes yet</p>
                      <p className="text-sm">Add your first note above</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3 pr-4">
                        {notes.map((note) => (
                          <div 
                            key={note.id} 
                            className="p-4 bg-muted/50 rounded-lg group relative"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <p className="whitespace-pre-wrap text-sm">{note.content}</p>
                                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                  <span className="font-medium">{note.created_by}</span>
                                  <span>•</span>
                                  <span>
                                    {new Date(note.created_at).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteNote(note.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-3">
              <Button 
                variant="outline" 
                onClick={() => navigate(`/teacher/students/${batch.id}`)}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Class
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate(`/teacher/attendance/${batch.id}`)}
              >
                <Clock className="h-4 w-4 mr-2" />
                Class Attendance
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
