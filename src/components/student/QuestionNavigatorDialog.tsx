import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronUp, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';

// Event for marking questions
export const QUESTION_MARK_EVENT = 'questionMarkChange';

// Get marked questions from session storage
export function getMarkedQuestions(): Set<string> {
  try {
    const stored = sessionStorage.getItem('markedQuestions');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

// Toggle mark for a question
export function toggleQuestionMark(questionId: string): boolean {
  const marked = getMarkedQuestions();
  const isNowMarked = !marked.has(questionId);
  
  if (isNowMarked) {
    marked.add(questionId);
  } else {
    marked.delete(questionId);
  }
  
  sessionStorage.setItem('markedQuestions', JSON.stringify([...marked]));
  window.dispatchEvent(new CustomEvent(QUESTION_MARK_EVENT, { 
    detail: { questionId, isMarked: isNowMarked } 
  }));
  
  return isNowMarked;
}

// Hook to listen for mark changes
export function useMarkedQuestions() {
  const [markedQuestions, setMarkedQuestions] = useState<Set<string>>(getMarkedQuestions);

  useEffect(() => {
    const handleMarkChange = () => {
      setMarkedQuestions(getMarkedQuestions());
    };

    window.addEventListener(QUESTION_MARK_EVENT, handleMarkChange);
    return () => window.removeEventListener(QUESTION_MARK_EVENT, handleMarkChange);
  }, []);

  return markedQuestions;
}

interface QuestionNavigatorDialogProps {
  currentQuestionId: string;
  questionSet?: string;
  subject?: string;
}

type QuestionStatus = 'current' | 'marked' | 'correct' | 'correct_with_mistakes' | 'incorrect' | 'for_review' | 'not_attempted';

export function QuestionNavigatorDialog({ 
  currentQuestionId,
  questionSet,
  subject = 'math'
}: QuestionNavigatorDialogProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { student } = useStudentAuth();
  const markedQuestions = useMarkedQuestions();

  // Fetch all questions for the current set
  const { data: questions } = useQuery({
    queryKey: ['navigator-questions', questionSet, subject],
    queryFn: async () => {
      let query = supabase
        .from('questions')
        .select('id, question_id, question_set')
        .eq('is_original', true)
        .eq('is_active', true)
        .eq('subject', subject);
      
      if (questionSet) {
        query = query.eq('question_set', questionSet === 'CB' ? 'CollegeBoard' : questionSet);
      }
      
      const { data, error } = await query.order('question_id');
      if (error) throw error;
      return data || [];
    },
    enabled: !!student
  });

  // Fetch all attempts for status
  const { data: attempts } = useQuery({
    queryKey: ['navigator-attempts', student?.id],
    queryFn: async () => {
      if (!student) return [];
      const { data, error } = await supabase
        .from('student_attempts')
        .select('question_id, is_correct, attempt_number')
        .eq('student_account_id', student.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!student
  });

  // Fetch review queue
  const { data: reviewQueue } = useQuery({
    queryKey: ['navigator-review', student?.id],
    queryFn: async () => {
      if (!student) return [];
      const { data, error } = await supabase
        .from('student_review_queue')
        .select('question_id')
        .eq('student_account_id', student.id)
        .lte('next_review_at', new Date().toISOString());
      if (error) throw error;
      return data || [];
    },
    enabled: !!student
  });

  // Build status map
  const statusMap = useMemo(() => {
    const map = new Map<string, { status: QuestionStatus; isMarked: boolean }>();
    
    // Group attempts by question
    const attemptsByQuestion = new Map<string, { correct: boolean; hasIncorrect: boolean }>();
    attempts?.forEach(a => {
      const existing = attemptsByQuestion.get(a.question_id);
      if (!existing) {
        attemptsByQuestion.set(a.question_id, {
          correct: a.is_correct,
          hasIncorrect: !a.is_correct
        });
      } else {
        if (a.is_correct) existing.correct = true;
        if (!a.is_correct) existing.hasIncorrect = true;
      }
    });
    
    const reviewSet = new Set(reviewQueue?.map(r => r.question_id) || []);
    
    questions?.forEach(q => {
      const attemptData = attemptsByQuestion.get(q.id);
      const inReview = reviewSet.has(q.id);
      const isMarked = markedQuestions.has(q.id);
      
      let status: QuestionStatus = 'not_attempted';
      
      if (q.id === currentQuestionId) {
        status = 'current';
      } else if (isMarked) {
        status = 'marked';
      } else if (inReview) {
        status = 'for_review';
      } else if (attemptData?.correct) {
        status = attemptData.hasIncorrect ? 'correct_with_mistakes' : 'correct';
      } else if (attemptData && !attemptData.correct) {
        status = 'incorrect';
      }
      
      map.set(q.id, { status, isMarked });
    });
    
    return map;
  }, [questions, attempts, reviewQueue, currentQuestionId, markedQuestions]);

  // Current question index
  const currentIndex = questions?.findIndex(q => q.id === currentQuestionId) ?? 0;
  const totalQuestions = questions?.length || 0;

  const getStatusStyles = (status: QuestionStatus) => {
    switch (status) {
      case 'current':
        return 'border-2 border-foreground bg-background text-foreground font-bold';
      case 'marked':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'correct':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'correct_with_mistakes':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'incorrect':
        return 'bg-red-100 text-red-600 border-red-200';
      case 'for_review':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-muted text-muted-foreground border-border hover:bg-muted/80';
    }
  };

  const handleQuestionClick = (questionId: string) => {
    setOpen(false);
    navigate(subject === 'english' 
      ? `/practice/english/question/${questionId}` 
      : `/practice/question/${questionId}`
    );
  };

  // Get simple display number
  const getDisplayNumber = (questionId: string, index: number) => {
    if (questionId.startsWith('CB') || questionId.startsWith('ENG')) {
      const num = parseInt(questionId.replace(/^(CB|ENG)/, ''), 10);
      return isNaN(num) ? index + 1 : num;
    }
    // For 68 questions, try to extract number
    const match = questionId.match(/(\d+)$/);
    return match ? parseInt(match[1], 10) : index + 1;
  };

  return (
    <>
      {/* Trigger Button */}
      <Button
        variant="default"
        size="sm"
        onClick={() => setOpen(true)}
        className="rounded-full px-4 gap-1 bg-foreground text-background hover:bg-foreground/90"
      >
        {currentIndex + 1} of {totalQuestions}
        <ChevronUp className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Question Set</DialogTitle>
          </DialogHeader>

          {/* Legend */}
          <div className="space-y-1.5 text-xs">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-yellow-100 border border-yellow-300" />
                <span className="text-muted-foreground">Marked</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-green-100 border border-green-200" />
                <span className="text-muted-foreground">Correct</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-amber-100 border border-amber-200" />
                <span className="text-muted-foreground">With mistakes</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-red-100 border border-red-200" />
                <span className="text-muted-foreground">Incorrect</span>
              </div>
            </div>
          </div>

          {/* Question Grid - smaller squares */}
          <ScrollArea className="max-h-[50vh]">
            <div className="grid grid-cols-10 gap-1.5 p-1">
              {questions?.map((q, index) => {
                const { status, isMarked } = statusMap.get(q.id) || { status: 'not_attempted', isMarked: false };
                const displayNum = getDisplayNumber(q.question_id, index);
                
                return (
                  <button
                    key={q.id}
                    onClick={() => handleQuestionClick(q.id)}
                    className={cn(
                      "w-7 h-7 rounded border flex items-center justify-center text-xs font-medium transition-all hover:scale-105 relative",
                      getStatusStyles(status)
                    )}
                  >
                    {displayNum}
                    {isMarked && status !== 'marked' && (
                      <Bookmark className="absolute -top-1 -right-1 h-3 w-3 text-yellow-500 fill-yellow-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
