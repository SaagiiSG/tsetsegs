import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Flag,
  TrendingDown,
  TrendingUp,
  Search,
  Edit,
  Eye,
  BarChart3,
  Target,
  HelpCircle,
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface QuestionHealth {
  id: string;
  question_id: string;
  subject: string;
  category_name: string | null;
  subtopic: string | null;
  difficulty_level: string | null;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
  avgTimeSeconds: number;
  flagCount: number;
  neverAttempted: boolean;
  issue: 'too_easy' | 'too_hard' | 'high_flag_rate' | 'slow_response' | 'never_attempted' | null;
}

export function QuestionHealthTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'issues' | 'flagged'>('issues');
  const [selectedSubject, setSelectedSubject] = useState<'all' | 'math' | 'english'>('all');

  const { data: questionHealth, isLoading } = useQuery({
    queryKey: ['question-health-analysis'],
    queryFn: async () => {
      // Fetch all questions
      const { data: questions, error: qError } = await supabase
        .from('questions')
        .select(`
          id,
          question_id,
          subject,
          subtopic,
          difficulty_level,
          category:question_categories(name)
        `)
        .eq('is_active', true)
        .eq('is_original', true);

      if (qError) throw qError;

      // Fetch all attempts
      const { data: attempts, error: aError } = await supabase
        .from('student_attempts')
        .select('question_id, is_correct, time_spent_seconds');

      if (aError) throw aError;

      // Fetch flags
      const { data: flags, error: fError } = await supabase
        .from('question_flags')
        .select('question_id')
        .eq('admin_reviewed', false);

      if (fError) throw fError;

      // Aggregate attempt data
      const attemptMap = new Map<string, { correct: number; total: number; times: number[] }>();
      attempts?.forEach(a => {
        if (!attemptMap.has(a.question_id)) {
          attemptMap.set(a.question_id, { correct: 0, total: 0, times: [] });
        }
        const data = attemptMap.get(a.question_id)!;
        data.total++;
        if (a.is_correct) data.correct++;
        if (a.time_spent_seconds) data.times.push(a.time_spent_seconds);
      });

      // Count flags per question
      const flagMap = new Map<string, number>();
      flags?.forEach(f => {
        flagMap.set(f.question_id, (flagMap.get(f.question_id) || 0) + 1);
      });

      // Build health data
      const healthData: QuestionHealth[] = (questions || []).map(q => {
        const attemptData = attemptMap.get(q.id);
        const totalAttempts = attemptData?.total || 0;
        const correctAttempts = attemptData?.correct || 0;
        const accuracy = totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0;
        const avgTime = attemptData?.times.length 
          ? attemptData.times.reduce((a, b) => a + b, 0) / attemptData.times.length 
          : 0;
        const flagCount = flagMap.get(q.id) || 0;
        const neverAttempted = totalAttempts === 0;

        // Determine issue
        let issue: QuestionHealth['issue'] = null;
        if (neverAttempted) {
          issue = 'never_attempted';
        } else if (accuracy > 95 && totalAttempts >= 10) {
          issue = 'too_easy';
        } else if (accuracy < 25 && totalAttempts >= 10) {
          issue = 'too_hard';
        } else if (flagCount >= 2) {
          issue = 'high_flag_rate';
        } else if (avgTime > 180 && totalAttempts >= 5) {
          issue = 'slow_response';
        }

        return {
          id: q.id,
          question_id: q.question_id,
          subject: q.subject || 'math',
          category_name: q.category?.name || null,
          subtopic: q.subtopic,
          difficulty_level: q.difficulty_level,
          totalAttempts,
          correctAttempts,
          accuracy: Math.round(accuracy),
          avgTimeSeconds: Math.round(avgTime),
          flagCount,
          neverAttempted,
          issue,
        };
      });

      return healthData;
    },
  });

  // Filter and search
  const filteredQuestions = useMemo(() => {
    if (!questionHealth) return [];
    
    return questionHealth.filter(q => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!q.question_id.toLowerCase().includes(query) &&
            !q.category_name?.toLowerCase().includes(query) &&
            !q.subtopic?.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Subject filter
      if (selectedSubject !== 'all' && q.subject !== selectedSubject) {
        return false;
      }

      // Issue filter
      if (activeFilter === 'issues' && !q.issue) {
        return false;
      }
      if (activeFilter === 'flagged' && q.flagCount === 0) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      // Sort by severity: flagged > too_hard > too_easy > slow > never attempted
      const severity = (q: QuestionHealth) => {
        if (q.flagCount > 0) return 5;
        if (q.issue === 'too_hard') return 4;
        if (q.issue === 'too_easy') return 3;
        if (q.issue === 'slow_response') return 2;
        if (q.issue === 'never_attempted') return 1;
        return 0;
      };
      return severity(b) - severity(a);
    });
  }, [questionHealth, searchQuery, activeFilter, selectedSubject]);

  // Stats
  const stats = useMemo(() => {
    if (!questionHealth) return { total: 0, issues: 0, flagged: 0, neverAttempted: 0 };
    
    return {
      total: questionHealth.length,
      issues: questionHealth.filter(q => q.issue).length,
      flagged: questionHealth.filter(q => q.flagCount > 0).length,
      neverAttempted: questionHealth.filter(q => q.neverAttempted).length,
    };
  }, [questionHealth]);

  const getIssueLabel = (issue: QuestionHealth['issue']) => {
    switch (issue) {
      case 'too_easy': return { label: 'Too Easy', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
      case 'too_hard': return { label: 'Too Hard', color: 'bg-red-500/10 text-red-600 border-red-500/20' };
      case 'high_flag_rate': return { label: 'Flagged', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' };
      case 'slow_response': return { label: 'Slow', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' };
      case 'never_attempted': return { label: 'Unused', color: 'bg-gray-500/10 text-gray-600 border-gray-500/20' };
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Questions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={stats.issues > 0 ? "border-orange-500/30" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-500">{stats.issues}</p>
                <p className="text-xs text-muted-foreground">Need Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={stats.flagged > 0 ? "border-red-500/30" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <Flag className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-500">{stats.flagged}</p>
                <p className="text-xs text-muted-foreground">Student Flagged</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <HelpCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.neverAttempted}</p>
                <p className="text-xs text-muted-foreground">Never Attempted</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex rounded-lg border bg-muted/50 p-1">
              <Button
                variant={activeFilter === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveFilter('all')}
              >
                All
              </Button>
              <Button
                variant={activeFilter === 'issues' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveFilter('issues')}
              >
                Issues ({stats.issues})
              </Button>
              <Button
                variant={activeFilter === 'flagged' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveFilter('flagged')}
              >
                Flagged ({stats.flagged})
              </Button>
            </div>

            <div className="flex rounded-lg border bg-muted/50 p-1">
              <Button
                variant={selectedSubject === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedSubject('all')}
              >
                All
              </Button>
              <Button
                variant={selectedSubject === 'math' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedSubject('math')}
              >
                Math
              </Button>
              <Button
                variant={selectedSubject === 'english' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedSubject('english')}
              >
                English
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Question Health ({filteredQuestions.length} questions)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="w-24">ID</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Attempts</TableHead>
                  <TableHead className="text-center">Accuracy</TableHead>
                  <TableHead className="text-center">Avg Time</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuestions.map((q, index) => {
                  const issueInfo = getIssueLabel(q.issue);
                  
                  return (
                    <TableRow key={q.id}>
                      <TableCell className="font-mono text-sm">
                        {q.question_id}
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium text-sm">{q.category_name || '-'}</span>
                          {q.subtopic && (
                            <span className="block text-xs text-muted-foreground">{q.subtopic}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {q.totalAttempts > 0 ? (
                          <span className="font-medium">{q.totalAttempts}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {q.totalAttempts > 0 ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16">
                              <Progress 
                                value={q.accuracy} 
                                className={cn(
                                  "h-1.5",
                                  q.accuracy > 90 && "bg-blue-200 [&>div]:bg-blue-500",
                                  q.accuracy < 30 && "bg-red-200 [&>div]:bg-red-500"
                                )}
                              />
                            </div>
                            <span className={cn(
                              "text-sm font-medium w-10",
                              q.accuracy > 90 ? "text-blue-500" :
                              q.accuracy < 30 ? "text-red-500" : ""
                            )}>
                              {q.accuracy}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {q.avgTimeSeconds > 0 ? (
                          <span className={cn(
                            "text-sm",
                            q.avgTimeSeconds > 180 && "text-yellow-600 font-medium"
                          )}>
                            {Math.floor(q.avgTimeSeconds / 60)}:{String(q.avgTimeSeconds % 60).padStart(2, '0')}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {q.flagCount > 0 && (
                            <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/20 gap-1">
                              <Flag className="h-3 w-3" />
                              {q.flagCount}
                            </Badge>
                          )}
                          {issueInfo && (
                            <Badge variant="outline" className={cn("text-xs", issueInfo.color)}>
                              {issueInfo.label}
                            </Badge>
                          )}
                          {!q.issue && q.flagCount === 0 && (
                            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Good
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
