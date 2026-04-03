import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MathText } from '@/components/MathText';
import { DesmosCalculator, toggleCalculator } from '@/components/student/DesmosCalculator';
import { ReferenceSheet, toggleReferenceSheet } from '@/components/student/ReferenceSheet';
import {
  ChevronLeft, ChevronRight, CheckCircle, XCircle, Loader2,
  Calculator, BookOpen, Video, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

  const resetState = () => {
    setSelectedAnswer(null);
    setFillAnswer('');
    setSubmitted(false);
  };

  // Reset when question changes
  useEffect(() => {
    resetState();
  }, [questionId]);

  const handleNext = () => { resetState(); onNext?.(); };
  const handlePrev = () => { resetState(); onPrev?.(); };
  const handleSubmit = () => setSubmitted(true);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
      if (e.key === 'ArrowRight' && onNext) { e.preventDefault(); handleNext(); }
      if (e.key === 'ArrowLeft' && onPrev) { e.preventDefault(); handlePrev(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onNext, onPrev]);

  const options = question?.multiple_choice_options as Record<string, string> | null;
  const choiceImages = question?.choice_images as Record<string, string> | null;
  const labels = ['A', 'B', 'C', 'D'];
  const correctAnswer = question?.answer?.toUpperCase();

  const isCorrectAnswer = () => {
    if (!question) return false;
    if (question.question_type === 'multiple_choice') return selectedAnswer === correctAnswer;
    const trimmed = fillAnswer.trim();
    if (trimmed.toLowerCase() === question.answer?.toLowerCase()) return true;
    if (question.alternate_answers?.some((a: string) => a.toLowerCase() === trimmed.toLowerCase())) return true;
    return false;
  };

  if (!open) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background flex flex-col"
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="gap-1.5">
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">Close</span>
              </Button>
              <span className="text-sm font-medium text-muted-foreground">
                {currentIndex + 1} / {totalCount}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => toggleCalculator()}
              >
                <Calculator className="h-4 w-4" />
                <span className="hidden sm:inline">Desmos</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => toggleReferenceSheet()}
              >
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Reference</span>
              </Button>
            </div>

            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={!onPrev} onClick={handlePrev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={!onNext} onClick={handleNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
              {isLoading ? (
                <div className="py-24 flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : question ? (
                <>
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
                    <div className="bg-muted/50 rounded-lg p-5 border text-sm leading-relaxed">
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
                        className="max-w-full max-h-80 rounded-lg border object-contain"
                      />
                    </div>
                  )}

                  {/* Question text */}
                  <div className="bg-card rounded-lg p-5 border-2">
                    <MathText text={question.question_text} className="text-base md:text-lg leading-relaxed" />
                  </div>

                  {/* Multiple choice */}
                  {question.question_type === 'multiple_choice' && options && (
                    <div className="grid gap-3">
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
                            className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-colors text-left ${borderClass} ${!submitted ? 'hover:border-primary/40 cursor-pointer' : ''}`}
                          >
                            <span className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0 ${
                              showResult && isCorrect ? 'bg-green-500 text-white' :
                              showResult && isSelected && !isCorrect ? 'bg-red-500 text-white' :
                              isSelected ? 'bg-primary text-primary-foreground' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {label}
                            </span>
                            <div className="flex-1 min-w-0">
                              {imgUrl && <img src={imgUrl} alt={`Choice ${label}`} className="max-h-24 rounded mb-1" />}
                              {text && <MathText text={text} className="text-sm md:text-base" />}
                            </div>
                            {showResult && isCorrect && <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />}
                            {showResult && isSelected && !isCorrect && <XCircle className="h-6 w-6 text-red-500 flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Fill in blank */}
                  {question.question_type === 'fill_blank' && (
                    <div className="space-y-3">
                      <Input
                        placeholder="Type your answer..."
                        value={fillAnswer}
                        onChange={e => setFillAnswer(e.target.value)}
                        disabled={submitted}
                        className="text-base h-12"
                        onKeyDown={e => { if (e.key === 'Enter' && fillAnswer.trim() && !submitted) handleSubmit(); }}
                      />
                      {submitted && (
                        <div className={`flex items-center gap-3 p-4 rounded-lg border-2 ${
                          isCorrectAnswer() ? 'border-green-500/60 bg-green-500/10' : 'border-red-500/60 bg-red-500/10'
                        }`}>
                          {isCorrectAnswer() ? <CheckCircle className="h-6 w-6 text-green-500" /> : <XCircle className="h-6 w-6 text-red-500" />}
                          <span className="text-sm font-medium">Correct answer:</span>
                          <MathText text={question.answer} className="font-bold" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Submit / Reset */}
                  <div className="flex gap-3">
                    {!submitted ? (
                      <Button
                        onClick={handleSubmit}
                        disabled={question.question_type === 'multiple_choice' ? !selectedAnswer : !fillAnswer.trim()}
                        size="lg"
                        className="flex-1"
                      >
                        Check Answer
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={resetState} size="lg" className="flex-1">
                        Try Again
                      </Button>
                    )}
                  </div>

                  {/* Rationale */}
                  {submitted && question.rationale && (
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-5">
                      <p className="text-xs font-medium text-blue-400 mb-2 uppercase tracking-wide">Rationale</p>
                      <MathText text={question.rationale} className="text-sm text-muted-foreground leading-relaxed" />
                    </div>
                  )}

                  {/* Video */}
                  {submitted && question.video_url && (
                    <a
                      href={question.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <Video className="h-5 w-5 text-red-500" />
                      <span className="text-sm font-medium">Watch Explanation Video</span>
                    </a>
                  )}
                </>
              ) : null}
            </div>
          </ScrollArea>
        </motion.div>
      </AnimatePresence>

      {/* Floating tools */}
      <DesmosCalculator />
      <ReferenceSheet />
    </>
  );
}
