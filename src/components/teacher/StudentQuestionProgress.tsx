import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle2, XCircle, Clock, Brain, Target, TrendingUp,
  Video, Flag, HelpCircle
} from "lucide-react";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend 
} from "recharts";

interface QuestionProgress {
  question_id: string;
  question_text: string;
  category_name: string;
  attempts: number;
  is_correct: boolean;
  video_watched: boolean;
  first_attempt_correct: boolean;
}

interface StudentQuestionProgressProps {
  studentPhone: string;
}

const CHART_COLORS = ["#03C988", "#FA6363", "#60a5fa", "#FFDE0B"];

export default function StudentQuestionProgress({ studentPhone }: StudentQuestionProgressProps) {
  const [progress, setProgress] = useState<QuestionProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [studentAccountId, setStudentAccountId] = useState<string | null>(null);

  useEffect(() => {
    fetchProgress();
  }, [studentPhone]);

  const fetchProgress = async () => {
    try {
      setIsLoading(true);

      // First find the student account by phone number
      const { data: studentAccount, error: accountError } = await supabase
        .from("student_accounts")
        .select("id")
        .eq("phone_number", studentPhone)
        .maybeSingle();

      if (accountError || !studentAccount) {
        setIsLoading(false);
        return;
      }

      setStudentAccountId(studentAccount.id);

      // Fetch all questions
      const { data: questions, error: questionsError } = await supabase
        .from("questions")
        .select(`
          id,
          question_id,
          question_text,
          category:question_categories(name)
        `)
        .eq("is_original", true)
        .eq("is_active", true)
        .order("question_id");

      if (questionsError) throw questionsError;

      // Fetch student attempts
      const { data: attempts, error: attemptsError } = await supabase
        .from("student_attempts")
        .select("question_id, attempt_number, is_correct")
        .eq("student_account_id", studentAccount.id);

      if (attemptsError) throw attemptsError;

      // Fetch student progress (video watched)
      const { data: progressData, error: progressError } = await supabase
        .from("student_progress")
        .select("question_id, video_watched")
        .eq("student_account_id", studentAccount.id);

      if (progressError) throw progressError;

      // Build progress map
      const attemptsMap = new Map<string, { attempts: number; isCorrect: boolean; firstCorrect: boolean }>();
      attempts?.forEach((attempt) => {
        const existing = attemptsMap.get(attempt.question_id);
        if (!existing) {
          attemptsMap.set(attempt.question_id, {
            attempts: 1,
            isCorrect: attempt.is_correct,
            firstCorrect: attempt.attempt_number === 1 && attempt.is_correct,
          });
        } else {
          attemptsMap.set(attempt.question_id, {
            attempts: Math.max(existing.attempts, attempt.attempt_number),
            isCorrect: existing.isCorrect || attempt.is_correct,
            firstCorrect: existing.firstCorrect,
          });
        }
      });

      const videoMap = new Map<string, boolean>();
      progressData?.forEach((p) => {
        videoMap.set(p.question_id, p.video_watched);
      });

      // Combine data
      const combinedProgress: QuestionProgress[] = (questions || []).map((q: any) => {
        const attemptData = attemptsMap.get(q.id);
        return {
          question_id: q.question_id,
          question_text: q.question_text.substring(0, 80) + (q.question_text.length > 80 ? "..." : ""),
          category_name: q.category?.name || "Uncategorized",
          attempts: attemptData?.attempts || 0,
          is_correct: attemptData?.isCorrect || false,
          video_watched: videoMap.get(q.id) || false,
          first_attempt_correct: attemptData?.firstCorrect || false,
        };
      });

      setProgress(combinedProgress);
    } catch (error) {
      console.error("Error fetching question progress:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = progress.length;
    const attempted = progress.filter((p) => p.attempts > 0).length;
    const correct = progress.filter((p) => p.is_correct).length;
    const firstTryCorrect = progress.filter((p) => p.first_attempt_correct).length;
    const videosWatched = progress.filter((p) => p.video_watched).length;
    const notAttempted = total - attempted;

    // By category
    const categoryStats = progress.reduce((acc, p) => {
      if (!acc[p.category_name]) {
        acc[p.category_name] = { total: 0, correct: 0, attempted: 0 };
      }
      acc[p.category_name].total++;
      if (p.attempts > 0) acc[p.category_name].attempted++;
      if (p.is_correct) acc[p.category_name].correct++;
      return acc;
    }, {} as Record<string, { total: number; correct: number; attempted: number }>);

    return {
      total,
      attempted,
      correct,
      firstTryCorrect,
      videosWatched,
      notAttempted,
      completionRate: total > 0 ? (correct / total) * 100 : 0,
      accuracyRate: attempted > 0 ? (correct / attempted) * 100 : 0,
      categoryStats,
    };
  }, [progress]);

  const pieData = useMemo(() => {
    return [
      { name: "Correct", value: stats.correct },
      { name: "Incorrect", value: stats.attempted - stats.correct },
      { name: "Not Attempted", value: stats.notAttempted },
    ].filter((d) => d.value > 0);
  }, [stats]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!studentAccountId) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No practice account found for this student's phone number.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Student needs to log in to the practice system at least once.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-primary mb-1">
              <Target className="h-4 w-4" />
              <span className="text-xs font-medium">Completion</span>
            </div>
            <p className="text-2xl font-bold">{stats.completionRate.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">{stats.correct}/{stats.total} questions</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-medium">Accuracy</span>
            </div>
            <p className="text-2xl font-bold">{stats.accuracyRate.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">{stats.correct}/{stats.attempted} correct</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium">First Try</span>
            </div>
            <p className="text-2xl font-bold">{stats.firstTryCorrect}</p>
            <p className="text-xs text-muted-foreground">correct on first attempt</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
              <Video className="h-4 w-4" />
              <span className="text-xs font-medium">Videos</span>
            </div>
            <p className="text-2xl font-bold">{stats.videosWatched}</p>
            <p className="text-xs text-muted-foreground">explanations watched</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Progress Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Overall Progress
            </CardTitle>
            <CardDescription>Question completion status</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                No progress yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Progress by Category</CardTitle>
            <CardDescription>Performance across SAT math topics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(stats.categoryStats).map(([category, data]) => (
              <div key={category} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium truncate">{category}</span>
                  <span className="text-muted-foreground">
                    {data.correct}/{data.total}
                  </span>
                </div>
                <Progress 
                  value={data.total > 0 ? (data.correct / data.total) * 100 : 0} 
                  className="h-2"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Question List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Question Details</CardTitle>
          <CardDescription>Individual question progress (68 questions)</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {progress.map((q) => (
                <div
                  key={q.question_id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    {q.is_correct ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : q.attempts > 0 ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">#{q.question_id}</span>
                      <Badge variant="outline" className="text-xs">
                        {q.category_name}
                      </Badge>
                      {q.video_watched && (
                        <Video className="h-3 w-3 text-blue-500" />
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {q.attempts > 0 ? (
                      <span className="text-sm text-muted-foreground">
                        {q.attempts} attempt{q.attempts !== 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not started</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
