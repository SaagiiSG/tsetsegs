import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Search, MoreHorizontal, ChevronLeft, ChevronRight, Flag, Eye, Edit, Archive } from 'lucide-react';
import { useQuestionPerformanceData } from '@/hooks/useAdminAnalytics';
import { QuestionDetailsDialog } from './QuestionDetailsDialog';
import { QuestionForm } from '@/components/admin/questions/QuestionForm';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function QuestionTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  
  // Dialog states
  const [viewDetailsId, setViewDetailsId] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [retireDialogOpen, setRetireDialogOpen] = useState(false);
  const [questionToRetire, setQuestionToRetire] = useState<{ id: string; questionId: string } | null>(null);
  
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuestionPerformanceData(page, 50);

  // Get unique topics from data for dynamic filter options
  const topicOptions = useMemo(() => {
    if (!data?.questions) return [];
    const topics = [...new Set(data.questions.map(q => q.topic))];
    return topics.filter(Boolean).sort();
  }, [data?.questions]);

  // Filter questions based on all filters
  const filteredQuestions = useMemo(() => {
    if (!data?.questions) return [];
    
    return data.questions.filter(q => {
      // Search filter
      if (search && !q.questionId.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      // Topic filter
      if (topicFilter !== 'all' && q.topic !== topicFilter) {
        return false;
      }
      // Difficulty filter
      if (difficultyFilter !== 'all' && q.difficulty?.toLowerCase() !== difficultyFilter) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'all' && q.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [data?.questions, search, topicFilter, difficultyFilter, statusFilter]);

  const getAccuracyBadge = (accuracy: number) => {
    if (accuracy >= 80) return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">{accuracy}%</Badge>;
    if (accuracy >= 60) return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">{accuracy}%</Badge>;
    return <Badge variant="destructive">{accuracy}%</Badge>;
  };

  const getDifficultyBadge = (difficulty: string | null) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return <Badge variant="outline" className="text-green-500 border-green-500/30">Easy</Badge>;
      case 'medium':
        return <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">Medium</Badge>;
      case 'hard':
        return <Badge variant="outline" className="text-red-500 border-red-500/30">Hard</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'needs_review':
        return <Badge variant="destructive">Needs Review</Badge>;
      case 'never_attempted':
        return <Badge variant="secondary">Never Attempted</Badge>;
      case 'calibrated':
        return <Badge className="bg-green-500/10 text-green-500">Calibrated</Badge>;
      default:
        return <Badge variant="outline">Active</Badge>;
    }
  };

  const toggleSelectQuestion = (id: string) => {
    setSelectedQuestions(prev => 
      prev.includes(id) ? prev.filter(q => q !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedQuestions.length === filteredQuestions.length) {
      setSelectedQuestions([]);
    } else {
      setSelectedQuestions(filteredQuestions.map(q => q.id));
    }
  };

  const handleViewDetails = (questionId: string) => {
    setViewDetailsId(questionId);
  };

  const handleEditQuestion = async (question: { id: string; questionId: string }) => {
    // Fetch full question data for editing
    const { data } = await supabase
      .from('questions')
      .select('*')
      .eq('id', question.id)
      .single();
    
    if (data) {
      setEditingQuestion(data);
    }
  };

  const handleRetireQuestion = (question: { id: string; questionId: string }) => {
    setQuestionToRetire(question);
    setRetireDialogOpen(true);
  };

  const confirmRetire = async () => {
    if (!questionToRetire) return;
    
    try {
      const { error } = await supabase
        .from('questions')
        .update({ is_active: false })
        .eq('id', questionToRetire.id);

      if (error) throw error;

      toast.success(`Question ${questionToRetire.questionId} retired`);
      queryClient.invalidateQueries({ queryKey: ['admin-analytics', 'question-performance'] });
    } catch (error) {
      console.error('Error retiring question:', error);
      toast.error('Failed to retire question');
    } finally {
      setRetireDialogOpen(false);
      setQuestionToRetire(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Question Performance Table</CardTitle>
          <CardDescription>
            Detailed question-level analytics with filtering and sorting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by question ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={topicFilter} onValueChange={setTopicFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Topic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                {topicOptions.map(topic => (
                  <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="needs_review">Needs Review</SelectItem>
                <SelectItem value="never_attempted">Never Attempted</SelectItem>
                <SelectItem value="calibrated">Calibrated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedQuestions.length === filteredQuestions.length && filteredQuestions.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Question ID</TableHead>
                  <TableHead className="hidden md:table-cell">Topic</TableHead>
                  <TableHead className="hidden sm:table-cell">Difficulty</TableHead>
                  <TableHead className="text-center">Attempts</TableHead>
                  <TableHead className="text-center">Accuracy</TableHead>
                  <TableHead className="hidden lg:table-cell text-center">Avg Time</TableHead>
                  <TableHead className="hidden lg:table-cell text-center">1st Attempt</TableHead>
                  <TableHead className="hidden xl:table-cell text-center">Flags</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuestions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      No questions match the current filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredQuestions.map((question) => (
                    <TableRow 
                      key={question.id}
                      className={selectedQuestions.includes(question.id) ? 'bg-muted/50' : ''}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedQuestions.includes(question.id)}
                          onCheckedChange={() => toggleSelectQuestion(question.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{question.questionId}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline">{question.topic}</Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {getDifficultyBadge(question.difficulty)}
                      </TableCell>
                      <TableCell className="text-center">{question.attempts.toLocaleString()}</TableCell>
                      <TableCell className="text-center">{getAccuracyBadge(question.accuracy)}</TableCell>
                      <TableCell className="hidden lg:table-cell text-center">
                        <span className={question.avgTime > question.expectedTime * 1.5 ? 'text-destructive' : ''}>
                          {question.avgTime}s
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-center">{question.firstAttemptAcc}%</TableCell>
                      <TableCell className="hidden xl:table-cell text-center">
                        {question.flagCount > 0 && (
                          <Badge variant="destructive" className="gap-1">
                            <Flag className="h-3 w-3" />
                            {question.flagCount}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {getStatusBadge(question.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(question.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditQuestion({ id: question.id, questionId: question.questionId })}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Question
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleRetireQuestion({ id: question.id, questionId: question.questionId })}
                            >
                              <Archive className="h-4 w-4 mr-2" />
                              Retire
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {filteredQuestions.length} of {data?.total || 0} questions
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">Page {page} of {data?.totalPages || 1}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page >= (data?.totalPages || 1)}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <QuestionDetailsDialog
        open={viewDetailsId !== null}
        onOpenChange={(open) => !open && setViewDetailsId(null)}
        questionId={viewDetailsId}
      />

      {/* Edit Question Dialog */}
      <QuestionForm
        open={editingQuestion !== null}
        onOpenChange={(open) => !open && setEditingQuestion(null)}
        editingQuestion={editingQuestion}
      />

      {/* Retire Confirmation Dialog */}
      <AlertDialog open={retireDialogOpen} onOpenChange={setRetireDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retire Question</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to retire question <span className="font-mono font-medium">{questionToRetire?.questionId}</span>? 
              This will hide it from students but keep all attempt data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRetire} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Retire Question
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
