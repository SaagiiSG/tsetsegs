import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { 
  Brain, Target, FileText, Calendar, Clock, AlertCircle,
  CheckCircle2, XCircle, History, Zap, Loader2
} from 'lucide-react';
import { formatDistanceToNow, subWeeks } from 'date-fns';

const chartConfig = {
  mastery: {
    label: "Mastery",
    color: "hsl(var(--primary))",
  },
};

export default function StudentReview() {
  const { student, logActivity } = useStudentAuth();
  const navigate = useNavigate();
  
  const [subject, setSubject] = useState<'math' | 'english'>('math');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sessionQuestionCount, setSessionQuestionCount] = useState(10);

  // Fetch review queue with category data
  const { data: reviewQueue, isLoading } = useQuery({
    queryKey: ['review-queue', student?.id, subject],
    queryFn: async () => {
      if (!student) return { dueNow: [], scheduled: [], byCategory: {} };
      
      const { data, error } = await supabase
        .from('student_review_queue')
        .select(`
          *,
          question:questions(
            id, question_id, subject,
            category:question_categories(id, name)
          )
        `)
        .eq('student_account_id', student.id);
      
      if (error) throw error;
      
      // Filter by subject
      const filtered = data?.filter(r => 
        r.question?.subject?.toLowerCase() === subject
      ) || [];
      
      const now = new Date();
      const dueNow = filtered.filter(r => new Date(r.next_review_at) <= now);
      const scheduled = filtered.filter(r => new Date(r.next_review_at) > now);
      
      // Group by category for breakdown
      const byCategory: Record<string, number> = {};
      dueNow.forEach(r => {
        const catName = r.question?.category?.name || 'Uncategorized';
        byCategory[catName] = (byCategory[catName] || 0) + 1;
      });
      
      return { dueNow, scheduled, byCategory };
    },
    enabled: !!student
  });

  // Fetch uncorrected mistakes
  const { data: mistakesData } = useQuery({
    queryKey: ['uncorrected-mistakes', student?.id, subject],
    queryFn: async () => {
      if (!student) return { count: 0, byCategory: {} };
      
      const { data: attempts } = await supabase
        .from('student_attempts')
        .select(`
          question_id, is_correct,
          questions!inner(subject, category:question_categories(name))
        `)
        .eq('student_account_id', student.id);
      
      // Group by question, check if ever correct
      const questionResults = new Map<string, { 
        everCorrect: boolean; 
        category: string;
        subject: string;
      }>();
      
      attempts?.forEach((a: any) => {
        const existing = questionResults.get(a.question_id);
        if (!existing) {
          questionResults.set(a.question_id, {
            everCorrect: a.is_correct,
            category: a.questions?.category?.name || 'Uncategorized',
            subject: a.questions?.subject || 'math'
          });
        } else if (a.is_correct) {
          existing.everCorrect = true;
        }
      });
      
      // Filter to subject and never correct
      const mistakes = Array.from(questionResults.entries())
        .filter(([_, v]) => !v.everCorrect && v.subject?.toLowerCase() === subject);
      
      // Group by category
      const byCategory: Record<string, number> = {};
      mistakes.forEach(([_, v]) => {
        byCategory[v.category] = (byCategory[v.category] || 0) + 1;
      });
      
      return { count: mistakes.length, byCategory };
    },
    enabled: !!student
  });

  // Fetch review history
  const { data: reviewHistory } = useQuery({
    queryKey: ['review-history', student?.id, subject],
    queryFn: async () => {
      if (!student) return [];
      
      const { data } = await supabase
        .from('student_attempts')
        .select(`
          id, question_id, is_correct, attempted_at,
          questions!inner(
            question_id, subject, question_text, question_set,
            category:question_categories(name)
          )
        `)
        .eq('student_account_id', student.id)
        .order('attempted_at', { ascending: false })
        .limit(50);
      
      // Filter by subject
      return data?.filter((a: any) => 
        a.questions?.subject?.toLowerCase() === subject
      ).slice(0, 20) || [];
    },
    enabled: !!student
  });

  // Fetch mastery data for radar chart
  const { data: masteryData } = useQuery({
    queryKey: ['student-mastery-review', student?.id, subject],
    queryFn: async () => {
      if (!student?.id) return [];

      const twoWeeksAgo = subWeeks(new Date(), 2).toISOString();

      if (subject === 'math') {
        const { data: recentAttempts } = await supabase
          .from('student_attempts')
          .select(`
            question_id, is_correct, time_spent_seconds, attempt_number, attempted_at,
            questions!inner(subject, subtopic)
          `)
          .eq('student_account_id', student.id)
          .gte('attempted_at', twoWeeksAgo);

        const categories = {
          'Algebra': { correct: 0, total: 0 },
          'Advanced Math': { correct: 0, total: 0 },
          'Geometry & Trig': { correct: 0, total: 0 },
          'Problem Solving': { correct: 0, total: 0 },
        };

        recentAttempts?.forEach((attempt: any) => {
          if (attempt.questions?.subject?.toLowerCase() !== 'math') return;
          
          const subtopic = attempt.questions?.subtopic || '';
          let category = 'Algebra';

          if (subtopic.toLowerCase().includes('advanced') || subtopic.toLowerCase().includes('quadratic') || subtopic.toLowerCase().includes('polynomial')) {
            category = 'Advanced Math';
          } else if (subtopic.toLowerCase().includes('geometry') || subtopic.toLowerCase().includes('trig') || subtopic.toLowerCase().includes('circle')) {
            category = 'Geometry & Trig';
          } else if (subtopic.toLowerCase().includes('data') || subtopic.toLowerCase().includes('problem') || subtopic.toLowerCase().includes('ratio')) {
            category = 'Problem Solving';
          }

          if (categories[category as keyof typeof categories]) {
            categories[category as keyof typeof categories].total++;
            if (attempt.is_correct) {
              categories[category as keyof typeof categories].correct++;
            }
          }
        });

        return [
          { 
            area: 'Algebra', 
            score: categories['Algebra'].total > 0 
              ? Math.round((categories['Algebra'].correct / categories['Algebra'].total) * 100) 
              : 0,
            fullMark: 100 
          },
          { 
            area: 'Advanced', 
            score: categories['Advanced Math'].total > 0 
              ? Math.round((categories['Advanced Math'].correct / categories['Advanced Math'].total) * 100) 
              : 0,
            fullMark: 100 
          },
          { 
            area: 'Geo/Trig', 
            score: categories['Geometry & Trig'].total > 0 
              ? Math.round((categories['Geometry & Trig'].correct / categories['Geometry & Trig'].total) * 100) 
              : 0,
            fullMark: 100 
          },
          { 
            area: 'Problem', 
            score: categories['Problem Solving'].total > 0 
              ? Math.round((categories['Problem Solving'].correct / categories['Problem Solving'].total) * 100) 
              : 0,
            fullMark: 100 
          },
        ];
      } else {
        // English categories
        const { data: recentAttempts } = await supabase
          .from('student_attempts')
          .select(`
            question_id, is_correct,
            questions!inner(subject, subtopic)
          `)
          .eq('student_account_id', student.id)
          .gte('attempted_at', twoWeeksAgo);

        const categories = {
          'Grammar': { correct: 0, total: 0 },
          'Vocabulary': { correct: 0, total: 0 },
          'Reading': { correct: 0, total: 0 },
          'Inference': { correct: 0, total: 0 },
        };

        recentAttempts?.forEach((attempt: any) => {
          if (attempt.questions?.subject?.toLowerCase() !== 'english') return;
          
          const subtopic = attempt.questions?.subtopic?.toLowerCase() || '';
          let category = 'Reading';

          if (subtopic.includes('grammar') || subtopic.includes('punctuation') || subtopic.includes('structure')) {
            category = 'Grammar';
          } else if (subtopic.includes('vocab') || subtopic.includes('word')) {
            category = 'Vocabulary';
          } else if (subtopic.includes('inference') || subtopic.includes('imply')) {
            category = 'Inference';
          }

          if (categories[category as keyof typeof categories]) {
            categories[category as keyof typeof categories].total++;
            if (attempt.is_correct) {
              categories[category as keyof typeof categories].correct++;
            }
          }
        });

        return [
          { 
            area: 'Grammar', 
            score: categories['Grammar'].total > 0 
              ? Math.round((categories['Grammar'].correct / categories['Grammar'].total) * 100) 
              : 0,
            fullMark: 100 
          },
          { 
            area: 'Vocabulary', 
            score: categories['Vocabulary'].total > 0 
              ? Math.round((categories['Vocabulary'].correct / categories['Vocabulary'].total) * 100) 
              : 0,
            fullMark: 100 
          },
          { 
            area: 'Reading', 
            score: categories['Reading'].total > 0 
              ? Math.round((categories['Reading'].correct / categories['Reading'].total) * 100) 
              : 0,
            fullMark: 100 
          },
          { 
            area: 'Inference', 
            score: categories['Inference'].total > 0 
              ? Math.round((categories['Inference'].correct / categories['Inference'].total) * 100) 
              : 0,
            fullMark: 100 
          },
        ];
      }
    },
    enabled: !!student?.id
  });

  const startReviewSession = () => {
    logActivity('review_session_start', { 
      subject,
      questionCount: sessionQuestionCount 
    });
    
    const firstQuestion = reviewQueue?.dueNow?.[0];
    if (firstQuestion) {
      navigate(`/practice/question/${firstQuestion.question_id}?mode=review`);
    }
    setDrawerOpen(false);
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 select-none">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-orange-500" />
            Review
          </h1>
          <p className="text-muted-foreground">
            Spaced repetition to strengthen memory
          </p>
        </div>
        
        {/* Subject Toggle */}
        <div className="flex rounded-lg border bg-muted/50 p-1 w-fit">
          <Button
            variant={subject === 'math' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSubject('math')}
            className="gap-2"
          >
            <Target className="h-4 w-4" />
            Math
          </Button>
          <Button
            variant={subject === 'english' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSubject('english')}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            English
          </Button>
        </div>
      </div>

      {/* 70/30 Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
        {/* Left 70% */}
        <div className="lg:col-span-7 space-y-4">
          {/* Top Row - 50/50 Stat Boxes */}
          <div className="grid grid-cols-2 gap-4">
            {/* Scheduled to Solve - Clickable */}
            <Card 
              className="cursor-pointer hover:border-primary/50 transition-colors bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20"
              onClick={() => setDrawerOpen(true)}
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                  <Calendar className="h-5 w-5" />
                  <span className="font-medium">Scheduled</span>
                </div>
                <p className="text-4xl font-bold">{(reviewQueue?.dueNow?.length || 0) + (reviewQueue?.scheduled?.length || 0)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  questions to review
                </p>
                <p className="text-xs text-primary mt-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Tap to start session
                </p>
              </CardContent>
            </Card>

            {/* Mistakes Not Corrected */}
            <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-red-600 mb-2">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Uncorrected</span>
                </div>
                <p className="text-4xl font-bold">{mistakesData?.count || 0}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  mistakes to fix
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Radar Chart with Area Breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Weakness Areas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Radar Chart - Left */}
                <div className="flex-1">
                  <ChartContainer config={chartConfig} className="h-[240px] w-full">
                    <RadarChart data={masteryData || []} outerRadius="70%">
                      <PolarGrid />
                      <PolarAngleAxis dataKey="area" tick={{ fontSize: 10 }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                      <Radar
                        name="Mastery"
                        dataKey="score"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.4}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </RadarChart>
                  </ChartContainer>
                </div>

                {/* Area Breakdown - Right */}
                <div className="lg:w-48 border-t lg:border-t-0 lg:border-l pt-4 lg:pt-0 lg:pl-4">
                  <h4 className="font-medium text-sm mb-3">Mistakes by Area</h4>
                  <div className="space-y-3">
                    {Object.entries(mistakesData?.byCategory || {}).map(([cat, count]) => (
                      <div key={cat} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground truncate">{cat}</span>
                        <Badge variant="secondary">{count as number}</Badge>
                      </div>
                    ))}
                    {Object.keys(mistakesData?.byCategory || {}).length === 0 && (
                      <p className="text-sm text-muted-foreground">No mistakes found</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 30% - History */}
        <div className="lg:col-span-3">
          <Card className="h-[400px] lg:h-[calc(100vh-200px)] flex flex-col">
            <CardHeader className="pb-2 flex-shrink-0">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" />
                Review History
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-2">
              <ScrollArea className="h-full">
                <div className="space-y-2 pr-2">
                  {reviewHistory?.map((item: any) => {
                    const questionId = item.questions?.question_id || '';
                    const questionSet = item.questions?.question_set;
                    const categoryName = item.questions?.category?.name;
                    const questionText = item.questions?.question_text || '';
                    
                    // Determine source badge
                    const is68 = questionSet === '68' || questionId.startsWith('68');
                    const isCB = questionSet === 'CB' || questionId.startsWith('CB') || questionId.startsWith('ENG');
                    
                    // Get first few words of question text (strip HTML)
                    const plainText = questionText.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
                    const preview = plainText.length > 30 ? plainText.slice(0, 30) + '...' : plainText;
                    
                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                        onClick={() => navigate(`/practice/question/${item.question_id}`)}
                      >
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5">
                            {item.is_correct ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {is68 && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-orange-100 text-orange-700 border-orange-200">
                                  68
                                </Badge>
                              )}
                              {isCB && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-blue-100 text-blue-700 border-blue-200">
                                  CB
                                </Badge>
                              )}
                              {categoryName && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 truncate max-w-[100px]">
                                  {categoryName.length > 12 ? categoryName.slice(0, 12) + '...' : categoryName}
                                </Badge>
                              )}
                            </div>
                            {preview && (
                              <p className="text-xs text-muted-foreground truncate">
                                {preview}
                              </p>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                            {formatDistanceToNow(new Date(item.attempted_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {(!reviewHistory || reviewHistory.length === 0) && (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">No review history yet</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right-side Drawer for Session Builder */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction="right">
        <DrawerContent className="h-full w-[400px] max-w-[90vw] ml-auto rounded-l-[10px] rounded-t-none fixed inset-y-0 right-0">
          <DrawerHeader>
            <DrawerTitle>Start Review Session</DrawerTitle>
            <DrawerDescription>
              Configure your scheduled review session
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="p-6 space-y-6">
            {/* Available Questions */}
            <div className="text-center p-4 rounded-lg bg-primary/10">
              <p className="text-3xl font-bold text-primary">
                {reviewQueue?.dueNow?.length || 0}
              </p>
              <p className="text-sm text-muted-foreground">questions due now</p>
            </div>
            
            {/* Question Count Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Questions to Review</Label>
                <span className="font-mono font-bold text-primary">
                  {sessionQuestionCount}
                </span>
              </div>
              <Slider
                value={[sessionQuestionCount]}
                onValueChange={([val]) => setSessionQuestionCount(val)}
                min={5}
                max={Math.max(5, reviewQueue?.dueNow?.length || 20)}
                step={5}
              />
            </div>
            
            {/* Category Filter Badges */}
            <div>
              <Label className="mb-2 block">Focus Areas</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(reviewQueue?.byCategory || {}).map(([cat, count]) => (
                  <Badge 
                    key={cat} 
                    variant="outline" 
                    className="cursor-pointer hover:bg-primary/10"
                  >
                    {cat} ({count as number})
                  </Badge>
                ))}
                {Object.keys(reviewQueue?.byCategory || {}).length === 0 && (
                  <p className="text-sm text-muted-foreground">No categories available</p>
                )}
              </div>
            </div>
          </div>
          
          <DrawerFooter>
            <Button 
              onClick={startReviewSession}
              disabled={!reviewQueue?.dueNow?.length}
              className="w-full"
            >
              <Zap className="h-4 w-4 mr-2" />
              Start Review ({sessionQuestionCount} questions)
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
