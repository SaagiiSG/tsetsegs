import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, ChevronUp, Bookmark, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuestionNavigatorDrawerProps {
  currentQuestionId: string;
  questionSet?: string;
  subject?: string;
}

type QuestionStatus = 'current' | 'correct' | 'correct_with_mistakes' | 'incorrect' | 'for_review' | 'not_attempted';

export function QuestionNavigatorDrawer({ 
  currentQuestionId,
  questionSet,
  subject = 'math'
}: QuestionNavigatorDrawerProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { student } = useStudentAuth();

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
    const map = new Map<string, { status: QuestionStatus; hadMistakes: boolean }>();
    
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
      
      let status: QuestionStatus = 'not_attempted';
      let hadMistakes = false;
      
      if (q.id === currentQuestionId) {
        status = 'current';
      } else if (inReview) {
        status = 'for_review';
      } else if (attemptData?.correct) {
        hadMistakes = attemptData.hasIncorrect;
        status = hadMistakes ? 'correct_with_mistakes' : 'correct';
      } else if (attemptData && !attemptData.correct) {
        status = 'incorrect';
      }
      
      map.set(q.id, { status, hadMistakes });
    });
    
    return map;
  }, [questions, attempts, reviewQueue, currentQuestionId]);

  // Current question index
  const currentIndex = questions?.findIndex(q => q.id === currentQuestionId) ?? 0;
  const totalQuestions = questions?.length || 0;

  const getStatusStyles = (status: QuestionStatus) => {
    switch (status) {
      case 'current':
        return 'border-2 border-foreground bg-background text-foreground font-bold';
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

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="flex items-center justify-between pb-2">
            <DrawerTitle>Question Set</DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </DrawerHeader>

          {/* Legend */}
          <div className="px-4 pb-4 space-y-2">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">For Review</span>
                <Bookmark className="h-4 w-4 text-orange-600 fill-orange-600" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Correct</span>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Correct (with mistakes)</span>
                <div className="w-4 h-4 rounded-sm bg-amber-100 border border-amber-300" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Incorrect</span>
                <XCircle className="h-4 w-4 text-red-500" />
              </div>
            </div>
          </div>

          {/* Question Grid */}
          <ScrollArea className="flex-1 px-4 pb-6">
            <div className="grid grid-cols-6 gap-2">
              {questions?.map((q, index) => {
                const { status } = statusMap.get(q.id) || { status: 'not_attempted' };
                const displayNum = getDisplayNumber(q.question_id, index);
                
                return (
                  <button
                    key={q.id}
                    onClick={() => handleQuestionClick(q.id)}
                    className={cn(
                      "aspect-square rounded-lg border flex items-center justify-center text-sm font-medium transition-all hover:scale-105",
                      getStatusStyles(status)
                    )}
                  >
                    {displayNum}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    </>
  );
}
