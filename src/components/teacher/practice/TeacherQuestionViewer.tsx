import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MathText } from '@/components/MathText';
import { DesmosCalculator, toggleCalculator } from '@/components/student/DesmosCalculator';
import { ReferenceSheet, toggleReferenceSheet } from '@/components/student/ReferenceSheet';
import {
  ChevronLeft, ChevronRight, CheckCircle, XCircle, Loader2,
  Calculator, BookOpen, Video,
} from 'lucide-react';

interface TeacherQuestionViewerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  questionId: string;
  onNext?: () => void;
  onPrev?: () => void;
  currentIndex: number;
  totalCount: number;
}

export function TeacherQuestionViewer({
  open, onOpenChange, questionId, onNext, onPrev, currentIndex, totalCount,
}: TeacherQuestionViewerProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [fillAnswer, setFillAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { data: question, isLoading } = useQuery({
    queryKey: ['teacher-question-detail', questionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('*, category:question_categories(name)')
        .eq('id', questionId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!questionId && open,
  });

  // Reset state when question changes
  const resetState = () => {
    setSelectedAnswer(null);
    setFillAnswer('');
    setSubmitted(false);
  };

  const handleNext = () => {
    resetState();
    onNext?.();
  };

  const handlePrev = () => {
    resetState();
    onPrev?.();
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const options = question?.multiple_choice_options as Record<string, string> | null;
  const choiceImages = question?.choice_images as Record<string, string> | null;
  const labels = ['A', 'B', 'C', 'D'];
  const correctAnswer = question?.answer?.toUpperCase();

  const isCorrectAnswer = () => {
    if (!question) return false;
    if (question.question_type === 'multiple_choice') {
      return selectedAnswer === correctAnswer;
    }
    const trimmed = fillAnswer.trim();
    if (trimmed.toLowerCase() === question.answer?.toLowerCase()) return true;
    if (question.alternate_answers?.some((a: string) => a.toLowerCase() === trimmed.toLowerCase())) return true;
    return false;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] p-0 gap-0">
          {/* Header with nav */}
          <DialogHeader className="px-4 pt-4 pb-2 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-sm font-medium">
                Question {currentIndex + 1} of {totalCount}
              </DialogTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => toggleCalculator()}
                  title="Desmos Calculator"
                >
                  <Calculator className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => toggleReferenceSheet()}
                  title="Reference Sheet"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                </Button>
                <div className="w-px h-5 bg-border mx-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={!onPrev}
                  onClick={handlePrev}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={!onNext}
                  onClick={handleNext}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : question ? (
            <ScrollArea className="max-h-[calc(90vh-80px)]">
              <div className="space-y-5 p-4 md:p-6">
                {/* Meta badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono text-sm">
                    {question.question_id}
                  </Badge>
                  {question.category?.name && (
                    <Badge variant="secondary">{question.category.name}</Badge>
                  )}
                  {question.difficulty_level && (
                    <Badge
                      variant="outline"
                      className={
                        question.difficulty_level === 'hard' ? 'border-red-500 text-red-500' :
                        question.difficulty_level === 'medium' ? 'border-yellow-500 text-yellow-500' :
                        'border-green-500 text-green-500'
                      }
                    >
                      {question.difficulty_level}
                    </Badge>
                  )}
                  {question.skill && (
                    <Badge variant="outline" className="text-xs">{question.skill}</Badge>
                  )}
                </div>

                {/* Passage */}
                {question.passage_text && (
                  <div className="bg-muted/50 rounded-lg p-4 border text-sm leading-relaxed">
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Passage</p>
                    <MathText text={question.passage_text} />
                  </div>
                )}

                {/* Question image */}
                {question.question_image_url && (
                  <div className="flex justify-center">
                    <img
                      src={question.question_image_url}
                      alt="Question figure"
                      className="max-w-full max-h-72 rounded-lg border object-contain"
                    />
                  </div>
                )}

                {/* Question text */}
                <div className="bg-card rounded-lg p-4 border-2">
                  <MathText text={question.question_text} className="text-base leading-relaxed" />
                </div>

                {/* Multiple choice */}
                {question.question_type === 'multiple_choice' && options && (
                  <div className="grid gap-2">
                    {labels.map((label) => {
                      const key = label.toLowerCase();
                      const text = options[key] || options[label];
                      const imgUrl = choiceImages?.[key] || choiceImages?.[label];
                      if (!text && !imgUrl) return null;

                      const isSelected = selectedAnswer === label;
                      const isCorrect = label === correctAnswer;
                      const showResult = submitted;

                      let borderClass = 'border-border bg-muted/30';
                      if (isSelected && !showResult) borderClass = 'border-primary bg-primary/10';
                      if (showResult && isCorrect) borderClass = 'border-green-500/60 bg-green-500/10';
                      if (showResult && isSelected && !isCorrect) borderClass = 'border-red-500/60 bg-red-500/10';

                      return (
                        <button
                          key={label}
                          onClick={() => { if (!submitted) setSelectedAnswer(label); }}
                          className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors text-left ${borderClass} ${!submitted ? 'hover:border-primary/40 cursor-pointer' : ''}`}
                        >
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                            showResult && isCorrect ? 'bg-green-500 text-white' :
                            showResult && isSelected && !isCorrect ? 'bg-red-500 text-white' :
                            isSelected ? 'bg-primary text-primary-foreground' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {label}
                          </span>
                          <div className="flex-1 min-w-0">
                            {imgUrl && <img src={imgUrl} alt={`Choice ${label}`} className="max-h-20 rounded mb-1" />}
                            {text && <MathText text={text} className="text-sm" />}
                          </div>
                          {showResult && isCorrect && <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />}
                          {showResult && isSelected && !isCorrect && <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Fill in blank */}
                {question.question_type === 'fill_blank' && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type your answer..."
                        value={fillAnswer}
                        onChange={e => setFillAnswer(e.target.value)}
                        disabled={submitted}
                        className="flex-1"
                        onKeyDown={e => { if (e.key === 'Enter' && fillAnswer.trim() && !submitted) handleSubmit(); }}
                      />
                    </div>
                    {submitted && (
                      <div className={`flex items-center gap-2 p-3 rounded-lg border-2 ${
                        isCorrectAnswer() ? 'border-green-500/60 bg-green-500/10' : 'border-red-500/60 bg-red-500/10'
                      }`}>
                        {isCorrectAnswer() ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        <span className="text-sm font-medium">Correct answer:</span>
                        <MathText text={question.answer} className="text-sm font-bold" />
                      </div>
                    )}
                  </div>
                )}

                {/* Submit / Reset */}
                <div className="flex gap-2">
                  {!submitted ? (
                    <Button
                      onClick={handleSubmit}
                      disabled={question.question_type === 'multiple_choice' ? !selectedAnswer : !fillAnswer.trim()}
                      className="flex-1"
                    >
                      Check Answer
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={resetState} className="flex-1">
                      Try Again
                    </Button>
                  )}
                </div>

                {/* Rationale (only after submit) */}
                {submitted && question.rationale && (
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                    <p className="text-xs font-medium text-blue-400 mb-2 uppercase tracking-wide">Rationale</p>
                    <MathText text={question.rationale} className="text-sm text-muted-foreground" />
                  </div>
                )}

                {/* Video link (only after submit) */}
                {submitted && question.video_url && (
                  <a
                    href={question.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <Video className="h-5 w-5 text-red-500" />
                    <span className="text-sm font-medium">Watch Explanation Video</span>
                  </a>
                )}
              </div>
            </ScrollArea>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Floating tools */}
      <DesmosCalculator />
      <ReferenceSheet />
    </>
  );
}
