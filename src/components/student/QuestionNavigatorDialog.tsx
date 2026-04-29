import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronUp, Bookmark, CheckCircle2, XCircle, X, AlertCircle } from 'lucide-react';
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

  // Fetch bluebook question IDs to exclude
  const { data: bluebookQuestionIds } = useQuery({
    queryKey: ['bluebook-question-ids'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bluebook_module_questions')
        .select('question_id');
      if (error) throw error;
      return new Set(data?.map(q => q.question_id) || []);
    },
    enabled: !!student,
    staleTime: 10 * 60 * 1000
  });

  // Fetch all questions for the current set (excluding bluebook)
  // For 68 set: include ALL questions (original + variations as separate standalone problems)
  const { data: questions } = useQuery({
    queryKey: ['navigator-questions', questionSet, subject, bluebookQuestionIds ? 'filtered' : 'pending'],
    queryFn: async () => {
      let query = supabase
        .from('questions')
        .select('id, question_id, question_set')
        .eq('is_active', true)
        .eq('subject', subject);
      
      // For 68 set: include ALL questions (no is_original filter)
      // For other sets: only show originals
      if (questionSet === '68') {
        query = query.eq('question_set', '68');
      } else if (questionSet) {
        query = query
          .eq('question_set', questionSet === 'CB' ? 'CollegeBoard' : questionSet)
          .eq('is_original', true);
      } else {
        query = query.eq('is_original', true);
      }
      
      const { data, error } = await query.order('question_id');
      if (error) throw error;
      
      // Filter out bluebook questions
      if (bluebookQuestionIds && data) {
        return data.filter(q => !bluebookQuestionIds.has(q.id));
      }
      return data || [];
    },
    enabled: !!student && !!bluebookQuestionIds
  });

  // Fetch all attempts for status
  const { data: attempts } = useQuery({
    queryKey: ['navigator-attempts', student?.id],
    queryFn: async () => {
      if (!student) return [];
      const { data, error } = await supabase
        .from('student_attempts')
        .select('question_id, is_correct, attempt_number, question:questions(parent_question_id, question_set)')
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
    const recordAttempt = (questionId: string | null | undefined, isCorrect: boolean) => {
      if (!questionId) return;
      const existing = attemptsByQuestion.get(questionId);
      if (!existing) {
        attemptsByQuestion.set(questionId, {
          correct: isCorrect,
          hasIncorrect: !isCorrect
        });
      } else {
        if (isCorrect) existing.correct = true;
        if (!isCorrect) existing.hasIncorrect = true;
      }
    };

    attempts?.forEach(a => {
      const attemptedQuestion = Array.isArray((a as any).question)
        ? (a as any).question[0]
        : (a as any).question;
      const parentQuestionId = attemptedQuestion?.question_set !== '68'
        ? attemptedQuestion?.parent_question_id
        : null;

      recordAttempt(a.question_id, a.is_correct);
      recordAttempt(parentQuestionId, a.is_correct);
    });
    
    const reviewSet = new Set(reviewQueue?.map(r => r.question_id) || []);
    
    questions?.forEach(q => {
      const attemptData = attemptsByQuestion.get(q.id);
      const inReview = reviewSet.has(q.id);
      const isMarked = markedQuestions.has(q.id);
      
      let status: QuestionStatus = 'not_attempted';
      
      if (attemptData?.correct) {
        status = attemptData.hasIncorrect ? 'correct_with_mistakes' : 'correct';
      } else if (q.id === currentQuestionId) {
        status = 'current';
      } else if (isMarked) {
        status = 'marked';
      } else if (inReview) {
        status = 'for_review';
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
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'correct':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'correct_with_mistakes':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'incorrect':
        return 'bg-red-50 text-red-600 border-red-200';
      case 'for_review':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-background text-foreground border-border hover:bg-muted/50';
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
      {/* Trigger Button - positioned at bottom left */}
      <Button
        variant="default"
        size="sm"
        onClick={() => setOpen(true)}
        className="rounded-full px-4 gap-1 bg-foreground text-background hover:bg-foreground/90"
      >
        {currentIndex + 1} of {totalQuestions}
        <ChevronUp className="h-4 w-4" />
      </Button>

      {/* Overlay */}
      {open && (
        <div 
          className="fixed inset-0 z-50"
          onClick={() => setOpen(false)}
        >
          {/* Panel - positioned bottom left with 4:3 aspect ratio */}
          <div 
            className="absolute bottom-20 left-4 bg-background border rounded-xl shadow-2xl overflow-hidden"
            style={{ width: '380px', aspectRatio: '4/3' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold text-lg">Question Set</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="h-8 w-8 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Legend */}
            <div className="px-4 py-3 border-b bg-muted/30">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">For Review</span>
                  <Bookmark className="h-4 w-4 text-orange-500 fill-orange-500" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Correct</span>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Correct (incorrect attempts)</span>
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Incorrect</span>
                  <XCircle className="h-4 w-4 text-red-500" />
                </div>
              </div>
            </div>

            {/* Question Grid */}
            <ScrollArea className="flex-1" style={{ height: 'calc(100% - 120px)' }}>
              <div className="grid grid-cols-6 gap-2 p-4">
                {questions?.map((q, index) => {
                  const { status, isMarked } = statusMap.get(q.id) || { status: 'not_attempted', isMarked: false };
                  const displayNum = getDisplayNumber(q.question_id, index);
                  
                  return (
                    <button
                      key={q.id}
                      onClick={() => handleQuestionClick(q.id)}
                      className={cn(
                        "w-10 h-10 rounded-lg border-2 flex items-center justify-center text-sm font-medium transition-all hover:scale-105",
                        getStatusStyles(status)
                      )}
                    >
                      {displayNum}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </>
  );
}
