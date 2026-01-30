import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface QuestionDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionId: string | null;
}

interface RecentAttempt {
  id: string;
  studentName: string;
  studentInitials: string;
  isCorrect: boolean;
  answerSubmitted: string;
  timeSpent: number | null;
  attemptedAt: string;
}

interface QuestionDetails {
  id: string;
  questionId: string;
  questionText: string;
  answer: string;
  difficulty: string | null;
  topic: string;
  totalAttempts: number;
  accuracy: number;
  recentAttempts: RecentAttempt[];
}

export function QuestionDetailsDialog({ open, onOpenChange, questionId }: QuestionDetailsDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [details, setDetails] = useState<QuestionDetails | null>(null);

  useEffect(() => {
    if (!open || !questionId) return;

    const fetchDetails = async () => {
      setIsLoading(true);
      try {
        // Fetch question details
        const { data: question } = await supabase
          .from('questions')
          .select(`
            id,
            question_id,
            question_text,
            answer,
            difficulty_level,
            question_categories (name)
          `)
          .eq('id', questionId)
          .single();

        if (!question) return;

        // Fetch recent attempts with student info
        const { data: attempts } = await supabase
          .from('student_attempts')
          .select(`
            id,
            is_correct,
            answer_submitted,
            time_spent_seconds,
            attempted_at,
            student_account_id,
            student_accounts (
              phone_number,
              linked_student_id,
              students (name, first_name)
            )
          `)
          .eq('question_id', questionId)
          .order('attempted_at', { ascending: false })
          .limit(20);

        const totalAttempts = attempts?.length || 0;
        const correctAttempts = attempts?.filter(a => a.is_correct).length || 0;
        const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

        const recentAttempts: RecentAttempt[] = (attempts || []).map((a: any) => {
          const student = a.student_accounts?.students;
          const name = student?.name || student?.first_name || a.student_accounts?.phone_number || 'Unknown';
          const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
          
          return {
            id: a.id,
            studentName: name,
            studentInitials: initials,
            isCorrect: a.is_correct,
            answerSubmitted: a.answer_submitted,
            timeSpent: a.time_spent_seconds,
            attemptedAt: a.attempted_at,
          };
        });

        setDetails({
          id: question.id,
          questionId: question.question_id,
          questionText: question.question_text || '',
          answer: question.answer,
          difficulty: question.difficulty_level,
          topic: (question.question_categories as any)?.name || 'Uncategorized',
          totalAttempts,
          accuracy,
          recentAttempts,
        });
      } catch (error) {
        console.error('Error fetching question details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [open, questionId]);

  const getDifficultyBadge = (difficulty: string | null) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return <Badge variant="outline" className="text-green-500 border-green-500/30">Easy</Badge>;
      case 'medium':
        return <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">Medium</Badge>;
      case 'hard':
        return <Badge variant="outline" className="text-red-500 border-red-500/30">Hard</Badge>;
      default:
        return <Badge variant="outline">Unset</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Question Details</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : details ? (
          <div className="space-y-6">
            {/* Question Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg font-medium">{details.questionId}</span>
                {getDifficultyBadge(details.difficulty)}
                <Badge variant="outline">{details.topic}</Badge>
              </div>
              
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{details.questionText}</p>
              </div>

              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-muted-foreground">Correct Answer:</span>
                  <span className="ml-2 font-medium text-green-600">{details.answer}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Attempts:</span>
                  <span className="ml-2 font-medium">{details.totalAttempts}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Accuracy:</span>
                  <span className={`ml-2 font-medium ${details.accuracy >= 70 ? 'text-green-600' : details.accuracy >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {details.accuracy}%
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Attempts */}
            <div>
              <h3 className="font-medium mb-3">Recent Attempts</h3>
              {details.recentAttempts.length === 0 ? (
                <p className="text-muted-foreground text-sm">No attempts yet</p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Answer</TableHead>
                        <TableHead className="text-center">Result</TableHead>
                        <TableHead className="text-center">Time</TableHead>
                        <TableHead className="text-right">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {details.recentAttempts.map((attempt) => (
                        <TableRow key={attempt.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarFallback className="text-xs">{attempt.studentInitials}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{attempt.studentName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{attempt.answerSubmitted}</TableCell>
                          <TableCell className="text-center">
                            {attempt.isCorrect ? (
                              <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {attempt.timeSpent ? (
                              <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {attempt.timeSpent}s
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {format(new Date(attempt.attemptedAt), 'MMM d, HH:mm')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">Question not found</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
