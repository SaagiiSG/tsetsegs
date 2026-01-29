import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BluebookResultsDialog } from '@/components/student/BluebookResultsDialog';
import { toast } from 'sonner';
import { 
  BookOpen, Clock, PlayCircle, CheckCircle2, 
  FileText, AlertCircle, Trophy, Calculator, Filter,
  RotateCcw, Eye
} from 'lucide-react';

interface BluebookTest {
  id: string;
  name: string;
  description: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  section_type: string | null;
  test_month: number | null;
  test_year: number | null;
  variant: string | null;
}

interface BluebookAttempt {
  id: string;
  test_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  total_score: number | null;
  rw_scaled_score: number | null;
  math_scaled_score: number | null;
  rw_raw_score: number | null;
  math_raw_score: number | null;
}

interface QuestionResult {
  id: string;
  question_id: string;
  question_text: string;
  question_image_url: string | null;
  question_type: string;
  multiple_choice_options: any;
  passage_text: string | null;
  correct_answer: string;
  user_answer: string | null;
  is_correct: boolean;
  order_index: number;
  section: 'reading_writing' | 'math';
  module_number: number;
}

interface ResultsData {
  totalScore: number;
  rwScaled: number;
  mathScaled: number;
  rwRaw: number;
  mathRaw: number;
  rwTotal: number;
  mathTotal: number;
  questions: QuestionResult[];
}

const MONTHS = [
  { value: 1, label: "January", short: "Jan" },
  { value: 2, label: "February", short: "Feb" },
  { value: 3, label: "March", short: "Mar" },
  { value: 4, label: "April", short: "Apr" },
  { value: 5, label: "May", short: "May" },
  { value: 6, label: "June", short: "Jun" },
  { value: 7, label: "July", short: "Jul" },
  { value: 8, label: "August", short: "Aug" },
  { value: 9, label: "September", short: "Sep" },
  { value: 10, label: "October", short: "Oct" },
  { value: 11, label: "November", short: "Nov" },
  { value: 12, label: "December", short: "Dec" },
];

export default function StudentBluebook() {
  const { student, logActivity } = useStudentAuth();
  const navigate = useNavigate();
  
  const [sectionFilter, setSectionFilter] = useState<'all' | 'math' | 'english'>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [resultsData, setResultsData] = useState<ResultsData | null>(null);
  const [isLoadingResults, setIsLoadingResults] = useState(false);

  // Fetch published tests
  const { data: tests, isLoading: testsLoading } = useQuery({
    queryKey: ['student-bluebook-tests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bluebook_tests')
        .select('*')
        .eq('is_published', true)
        .order('test_year', { ascending: false })
        .order('test_month', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BluebookTest[];
    },
    enabled: !!student
  });

  // Get unique years from tests
  const availableYears = [...new Set(tests?.map(t => t.test_year).filter(Boolean) as number[])].sort((a, b) => b - a);

  // Fetch module counts for tests
  const { data: moduleStats } = useQuery({
    queryKey: ['student-bluebook-module-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bluebook_modules')
        .select(`
          test_id,
          time_limit_minutes,
          bluebook_module_questions(count)
        `);

      if (error) throw error;

      const stats: Record<string, { questions: number; totalTime: number }> = {};
      data?.forEach((module: any) => {
        const testId = module.test_id;
        const count = module.bluebook_module_questions?.[0]?.count || 0;
        if (!stats[testId]) {
          stats[testId] = { questions: 0, totalTime: 0 };
        }
        stats[testId].questions += count;
        stats[testId].totalTime += module.time_limit_minutes || 0;
      });

      return stats;
    },
    enabled: !!student
  });

  // Fetch student's attempts
  const { data: attempts } = useQuery({
    queryKey: ['student-bluebook-attempts', student?.id],
    queryFn: async () => {
      if (!student) return [];
      const { data, error } = await supabase
        .from('bluebook_attempts')
        .select('*')
        .eq('student_account_id', student.id)
        .order('started_at', { ascending: false });

      if (error) throw error;
      return data as BluebookAttempt[];
    },
    enabled: !!student
  });

  const getTestAttempt = (testId: string) => {
    return attempts?.find(a => a.test_id === testId);
  };

  // Filter tests
  const filteredTests = tests?.filter(test => {
    // Section filter
    if (sectionFilter !== 'all') {
      const testSection = test.section_type || 'full';
      if (sectionFilter === 'math' && testSection !== 'math' && testSection !== 'full') return false;
      if (sectionFilter === 'english' && testSection !== 'english' && testSection !== 'full') return false;
    }
    
    // Year filter
    if (yearFilter !== 'all' && test.test_year?.toString() !== yearFilter) return false;
    
    // Month filter
    if (monthFilter !== 'all' && test.test_month?.toString() !== monthFilter) return false;
    
    return true;
  });

  // Separate Math, English, and Full tests
  const mathTests = filteredTests?.filter(t => t.section_type === 'math');
  const englishTests = filteredTests?.filter(t => t.section_type === 'english');
  const fullTests = filteredTests?.filter(t => t.section_type === 'full' || !t.section_type);

  const handleStartTest = async (testId: string) => {
    const existingAttempt = getTestAttempt(testId);
    
    if (existingAttempt && existingAttempt.status !== 'completed') {
      navigate(`/practice/bluebook/test/${existingAttempt.id}`);
    } else {
      const { data: modules } = await supabase
        .from('bluebook_modules')
        .select('id')
        .eq('test_id', testId)
        .order('module_number')
        .limit(1);

      const firstModuleId = modules?.[0]?.id || null;

      const { data: attempt, error } = await supabase
        .from('bluebook_attempts')
        .insert({
          test_id: testId,
          student_account_id: student?.id,
          status: 'in_progress',
          current_module: 1,
          current_module_id: firstModuleId,
          started_at: new Date().toISOString(),
          module_started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create attempt:', error);
        return;
      }

      logActivity('bluebook_test_start', { testId, attemptId: attempt.id });
      navigate(`/practice/bluebook/test/${attempt.id}`);
    }
  };

  const handleReviewTest = async (attemptId: string, testId: string) => {
    setIsLoadingResults(true);
    try {
      // Fetch all answers with full question data
      const { data: allAnswers } = await supabase
        .from('bluebook_answers')
        .select(`
          *,
          question:questions(id, question_id, question_text, question_image_url, question_type, multiple_choice_options, passage_text, answer)
        `)
        .eq('attempt_id', attemptId);

      // Get all modules with questions for ordering
      const { data: allModulesData } = await supabase
        .from('bluebook_modules')
        .select(`
          id, 
          section, 
          module_number,
          bluebook_module_questions(order_index, question_id)
        `)
        .eq('test_id', testId);

      const moduleMap = new Map(allModulesData?.map(m => [m.id, { section: m.section, module_number: m.module_number }]));
      
      // Create a map for question order within modules
      const questionOrderMap = new Map<string, { module_id: string; order_index: number }>();
      allModulesData?.forEach(m => {
        m.bluebook_module_questions?.forEach((mq: any) => {
          questionOrderMap.set(mq.question_id, { module_id: m.id, order_index: mq.order_index });
        });
      });

      // Build question results
      const questionResults: QuestionResult[] = [];
      let rwCorrect = 0, mathCorrect = 0, rwTotal = 0, mathTotal = 0;

      allAnswers?.forEach(a => {
        const isCorrect = a.answer_submitted?.toLowerCase() === a.question?.answer?.toLowerCase();
        const moduleInfo = moduleMap.get(a.module_id!);
        const orderInfo = questionOrderMap.get(a.question_id!);
        const section = moduleInfo?.section as 'reading_writing' | 'math';
        
        if (section === 'reading_writing') {
          rwTotal++;
          if (isCorrect) rwCorrect++;
        } else if (section === 'math') {
          mathTotal++;
          if (isCorrect) mathCorrect++;
        }

        if (a.question) {
          questionResults.push({
            id: a.question.id,
            question_id: a.question.question_id,
            question_text: a.question.question_text,
            question_image_url: a.question.question_image_url,
            question_type: a.question.question_type,
            multiple_choice_options: a.question.multiple_choice_options,
            passage_text: a.question.passage_text,
            correct_answer: a.question.answer,
            user_answer: a.answer_submitted,
            is_correct: isCorrect,
            order_index: orderInfo?.order_index || 0,
            section: section,
            module_number: moduleInfo?.module_number || 1
          });
        }
      });

      // Get attempt scores
      const attempt = getTestAttempt(testId);
      const rwScaled = attempt?.rw_scaled_score || Math.round(200 + (rwCorrect / Math.max(rwTotal, 54)) * 600);
      const mathScaled = attempt?.math_scaled_score || Math.round(200 + (mathCorrect / Math.max(mathTotal, 44)) * 600);
      const totalScore = attempt?.total_score || (rwScaled + mathScaled);

      setResultsData({
        totalScore,
        rwScaled,
        mathScaled,
        rwRaw: rwCorrect,
        mathRaw: mathCorrect,
        rwTotal,
        mathTotal,
        questions: questionResults
      });
      setShowResultsDialog(true);
    } catch (error) {
      console.error('Failed to load review data:', error);
      toast.error('Failed to load test review');
    } finally {
      setIsLoadingResults(false);
    }
  };

  const handleRedoTest = async (testId: string) => {
    const { data: modules } = await supabase
      .from('bluebook_modules')
      .select('id')
      .eq('test_id', testId)
      .order('module_number')
      .limit(1);

    const firstModuleId = modules?.[0]?.id || null;

    const { data: attempt, error } = await supabase
      .from('bluebook_attempts')
      .insert({
        test_id: testId,
        student_account_id: student?.id,
        status: 'in_progress',
        current_module: 1,
        current_module_id: firstModuleId,
        started_at: new Date().toISOString(),
        module_started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create attempt:', error);
      toast.error('Failed to start new attempt');
      return;
    }

    logActivity('bluebook_test_redo', { testId, attemptId: attempt.id });
    navigate(`/practice/bluebook/test/${attempt.id}`);
  };

  const renderTestCard = (test: BluebookTest) => {
    const stats = moduleStats?.[test.id];
    const attempt = getTestAttempt(test.id);
    const isCompleted = attempt?.status === 'completed';
    const isInProgress = attempt?.status === 'in_progress';
    const monthLabel = test.test_month ? MONTHS.find(m => m.value === test.test_month)?.short : '';

    return (
      <Card 
        key={test.id}
        className={`transition-all hover:border-primary/50 ${
          isCompleted ? 'border-green-500/50 bg-green-500/5' : 
          isInProgress ? 'border-amber-500/50 bg-amber-500/5' : ''
        }`}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-base flex items-center gap-2">
                {test.section_type === 'math' ? (
                  <Calculator className="h-4 w-4 text-green-600" />
                ) : test.section_type === 'english' ? (
                  <BookOpen className="h-4 w-4 text-blue-600" />
                ) : (
                  <FileText className="h-4 w-4 text-primary" />
                )}
                <span className="line-clamp-1">{test.name}</span>
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {test.test_month && test.test_year && (
                  <Badge variant="outline" className="text-xs">
                    {monthLabel} {test.test_year}
                  </Badge>
                )}
                {test.variant && (
                  <Badge variant="secondary" className="text-xs">
                    {test.variant}
                  </Badge>
                )}
              </div>
              {isCompleted && attempt?.total_score && (
                <Badge variant="default" className="mt-2 gap-1 bg-green-500">
                  <Trophy className="h-3 w-3" />
                  Score: {attempt.total_score}
                </Badge>
              )}
              {isInProgress && (
                <Badge variant="secondary" className="mt-2 gap-1 bg-amber-500/20 text-amber-600">
                  <AlertCircle className="h-3 w-3" />
                  In Progress
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span>{stats?.questions || 0} questions</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{stats?.totalTime || 0} min</span>
            </div>
          </div>

          {/* Action Buttons */}
          {isCompleted && attempt ? (
            <div className="flex gap-2">
              <Button 
                className="flex-1 gap-2"
                variant="outline"
                size="sm"
                onClick={() => handleReviewTest(attempt.id, test.id)}
                disabled={isLoadingResults}
              >
                <Eye className="h-4 w-4" />
                Review
              </Button>
              <Button 
                className="flex-1 gap-2"
                variant="default"
                size="sm"
                onClick={() => handleRedoTest(test.id)}
              >
                <RotateCcw className="h-4 w-4" />
                Redo
              </Button>
            </div>
          ) : (
            <Button 
              className="w-full gap-2"
              variant="default"
              size="sm"
              onClick={() => handleStartTest(test.id)}
            >
              {isInProgress ? (
                <>
                  <PlayCircle className="h-4 w-4" />
                  Continue
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4" />
                  Start
                </>
              )}
            </Button>
          )}

          {/* Previous Scores */}
          {isCompleted && attempt && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">R&W</p>
                <p className="text-sm font-bold">{attempt.rw_scaled_score || '-'}</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Math</p>
                <p className="text-sm font-bold">{attempt.math_scaled_score || '-'}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (testsLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Practice Tests</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-4 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 select-none">
      {/* Results Dialog */}
      {resultsData && (
        <BluebookResultsDialog 
          open={showResultsDialog} 
          onClose={() => setShowResultsDialog(false)} 
          results={resultsData} 
        />
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Practice Tests</h1>
            <p className="text-sm text-muted-foreground">Full SAT practice tests</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-[100px] h-8">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {availableYears.map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-[110px] h-8">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {MONTHS.map(month => (
                <SelectItem key={month.value} value={month.value.toString()}>{month.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tests Tabs */}
      {!tests || tests.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Tests Available</h3>
            <p className="text-muted-foreground text-center">
              Practice tests will appear here when published.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="math" className="w-full">
          <TabsList className="grid w-full max-w-[400px] grid-cols-3">
            <TabsTrigger value="math" className="gap-1.5 text-sm">
              <Calculator className="h-4 w-4" />
              <span className="hidden sm:inline">Math</span>
              {mathTests && mathTests.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {mathTests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="english" className="gap-1.5 text-sm">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">English</span>
              {englishTests && englishTests.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {englishTests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="full" className="gap-1.5 text-sm">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Full</span>
              {fullTests && fullTests.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {fullTests.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="math" className="mt-4">
            {mathTests && mathTests.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mathTests.map(renderTestCard)}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Calculator className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground text-center">
                    No math tests match your filters.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="english" className="mt-4">
            {englishTests && englishTests.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {englishTests.map(renderTestCard)}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <BookOpen className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground text-center">
                    No English tests match your filters.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="full" className="mt-4">
            {fullTests && fullTests.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {fullTests.map(renderTestCard)}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground text-center">
                    No full-length tests match your filters.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
