import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle2, XCircle, ChevronLeft, Trophy, 
  Calculator, BookOpen, X, Circle, Minus
} from 'lucide-react';
import { MathText } from '@/components/MathText';
import { QuestionFigures } from '@/components/QuestionFigures';
import { cn } from '@/lib/utils';
import {
  normaliseChoices,
  type BluebookQuestionResult as QuestionResult,
  type BluebookResultsData as ResultsData,
} from '@/lib/bluebookReview';


interface BluebookResultsDialogProps {
  open: boolean;
  onClose: () => void;
  results: ResultsData;
}

export function BluebookResultsDialog({ open, onClose, results }: BluebookResultsDialogProps) {
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionResult | null>(null);
  
  const rwQuestions = results.questions.filter(q => q.section === 'reading_writing');
  const mathQuestions = results.questions.filter(q => q.section === 'math');
  
  const rwCorrect = rwQuestions.filter(q => q.is_correct).length;
  const mathCorrect = mathQuestions.filter(q => q.is_correct).length;

  // Group questions by module
  const groupByModule = (questions: QuestionResult[]) => {
    const sorted = [...questions].sort((a, b) => {
      if (a.module_number !== b.module_number) return a.module_number - b.module_number;
      return a.order_index - b.order_index;
    });
    
    const modules: { moduleNumber: number; questions: QuestionResult[] }[] = [];
    let currentModule: number | null = null;
    let currentQuestions: QuestionResult[] = [];
    
    sorted.forEach(q => {
      if (q.module_number !== currentModule) {
        if (currentQuestions.length > 0) {
          modules.push({ moduleNumber: currentModule!, questions: currentQuestions });
        }
        currentModule = q.module_number;
        currentQuestions = [q];
      } else {
        currentQuestions.push(q);
      }
    });
    
    if (currentQuestions.length > 0) {
      modules.push({ moduleNumber: currentModule!, questions: currentQuestions });
    }
    
    return modules;
  };

  const renderQuestionList = (questions: QuestionResult[], sectionLabel: string) => {
    const modules = groupByModule(questions);
    let questionNumber = 0;
    
    return (
      <div className="space-y-4">
        {modules.map(({ moduleNumber, questions: moduleQuestions }) => (
          <div key={moduleNumber} className="space-y-1">
            {/* Module Header */}
            <div className="sticky top-0 bg-background/95 backdrop-blur-sm py-2 border-b">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {sectionLabel} — Module {moduleNumber}
              </h3>
            </div>
            
            {/* Question List */}
            <div className="divide-y">
              {moduleQuestions.map((q) => {
                questionNumber++;
                const hasAnswer = q.user_answer !== null && q.user_answer !== '';
                
                return (
                  <button
                    key={q.id}
                    onClick={() => setSelectedQuestion(q)}
                    className={cn(
                      "w-full flex items-center gap-4 py-3 px-2 text-left transition-colors hover:bg-muted/50 rounded-lg",
                      "focus:outline-none focus:ring-2 focus:ring-primary/20"
                    )}
                  >
                    {/* Question Number */}
                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-muted text-sm font-semibold shrink-0">
                      {questionNumber}
                    </div>
                    
                    {/* Status Icon */}
                    <div className="shrink-0">
                      {q.is_correct ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : hasAnswer ? (
                        <XCircle className="h-5 w-5 text-red-600" />
                      ) : (
                        <Minus className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    
                    {/* Answer Info */}
                    <div className="flex-1 min-w-0 flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Your answer:</span>
                        <span className={cn(
                          "font-medium",
                          q.is_correct ? "text-green-600" : hasAnswer ? "text-red-600" : "text-muted-foreground"
                        )}>
                          {hasAnswer ? q.user_answer?.toUpperCase() : "Omitted"}
                        </span>
                      </div>
                      
                      {!q.is_correct && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Correct:</span>
                          <span className="font-medium text-green-600">
                            {q.correct_answer?.toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Status Badge */}
                    <Badge 
                      variant="outline"
                      className={cn(
                        "shrink-0",
                        q.is_correct 
                          ? "bg-green-50 text-green-700 border-green-200" 
                          : hasAnswer 
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-muted text-muted-foreground"
                      )}
                    >
                      {q.is_correct ? "Correct" : hasAnswer ? "Incorrect" : "Omitted"}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (selectedQuestion) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl w-[calc(100vw-1rem)] h-[calc(100dvh-1rem)] sm:w-[95vw] sm:h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
          {/* Question Detail Header */}
          <div className="flex items-center justify-between p-4 border-b shrink-0">
            <Button 
              variant="ghost" 
              onClick={() => setSelectedQuestion(null)}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Results
            </Button>
            <Badge variant={selectedQuestion.is_correct ? "default" : "destructive"} className="mr-8">
              {selectedQuestion.is_correct ? "Correct" : "Incorrect"}
            </Badge>
          </div>
          
          {/* Question Content - Scrollable */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 touch-pan-y">
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Passage if exists */}
              {selectedQuestion.passage_text && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Passage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <MathText text={selectedQuestion.passage_text} />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Question */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {selectedQuestion.section === 'math' ? 'Math' : 'Reading & Writing'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Module {selectedQuestion.module_number}, Q{selectedQuestion.order_index + 1}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <MathText text={selectedQuestion.question_text} />
                  </div>

                  <QuestionFigures
                    url1={selectedQuestion.question_image_url}
                    url2={selectedQuestion.question_image_url_2}
                    alt="Question figure"
                    imgClassName={cn(
                      "rounded-lg border object-contain",
                      selectedQuestion.question_image_url_2 ? "max-h-72 w-auto" : "max-w-md w-full h-auto"
                    )}
                  />

                  {/* Multiple Choice Options (text and/or image choices) */}
                  {(() => {
                    const choices = normaliseChoices(
                      selectedQuestion.multiple_choice_options,
                      selectedQuestion.choice_images,
                    );
                    if (choices.length === 0) return null;

                    return (
                      <div className="space-y-2 mt-4">
                        {choices.map(({ letter, text, image }) => {
                          const isCorrect = letter === selectedQuestion.correct_answer?.trim().toUpperCase();
                          const isUserAnswer = letter === selectedQuestion.user_answer?.trim().toUpperCase();

                          return (
                            <div
                              key={letter}
                              className={cn(
                                "p-3 rounded-lg border-2 flex items-start gap-3",
                                isCorrect && "border-green-500 bg-green-500/10",
                                isUserAnswer && !isCorrect && "border-red-500 bg-red-500/10",
                                !isCorrect && !isUserAnswer && "border-muted"
                              )}
                            >
                              <span className={cn(
                                "font-semibold w-6 h-6 flex items-center justify-center rounded-full text-sm shrink-0",
                                isCorrect && "bg-green-500 text-white",
                                isUserAnswer && !isCorrect && "bg-red-500 text-white",
                                !isCorrect && !isUserAnswer && "bg-muted"
                              )}>
                                {letter}
                              </span>
                              <span className="flex-1 min-w-0">
                                {text ? <MathText text={text} /> : null}
                                {image && (
                                  <img
                                    src={image}
                                    alt={`Answer choice ${letter}`}
                                    loading="lazy"
                                    className={cn(
                                      "max-h-40 w-auto rounded-md border bg-background object-contain",
                                      text && "mt-2"
                                    )}
                                  />
                                )}
                              </span>
                              {isCorrect && <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />}
                              {isUserAnswer && !isCorrect && <XCircle className="h-5 w-5 text-red-500 shrink-0" />}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Fill in the blank answer display */}
                  {(selectedQuestion.question_type === 'fill_blank' ||
                    selectedQuestion.question_type === 'fill_in_blank') && (
                    <div className="space-y-3 mt-4 p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">Your Answer:</span>
                        <Badge variant={selectedQuestion.is_correct ? "default" : "destructive"}>
                          {selectedQuestion.user_answer || "(No answer)"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">Correct Answer:</span>
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500">
                          {selectedQuestion.correct_answer}
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* Explanation */}
                  {selectedQuestion.rationale && (
                    <div className="mt-4 p-4 rounded-lg border bg-muted/30 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Explanation
                      </p>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <MathText text={selectedQuestion.rationale} />
                      </div>
                    </div>
                  )}

                </CardContent>
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[calc(100vw-1rem)] h-[calc(100dvh-1rem)] sm:h-[90vh] grid grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-0 p-0 overflow-hidden">
        {/* Header with Score */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 px-4 py-3 sm:p-6 text-center border-b shrink-0">
          <div className="hidden sm:inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/20 mb-3">
            <Trophy className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-lg sm:text-2xl font-bold mb-1">Test Complete!</h2>
          <div className="text-3xl sm:text-4xl font-black text-primary mb-2 sm:mb-3">
            {results.totalScore}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 sm:gap-6 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-500" />
              <span>R&W: <strong>{results.rwScaled}</strong></span>
              <span className="text-muted-foreground">({rwCorrect}/{rwQuestions.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-green-500" />
              <span>Math: <strong>{results.mathScaled}</strong></span>
              <span className="text-muted-foreground">({mathCorrect}/{mathQuestions.length})</span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 py-2 sm:py-3 border-b bg-muted/30 text-xs sm:text-sm shrink-0">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>Correct</span>
          </div>
          <div className="flex items-center gap-1.5">
            <XCircle className="h-4 w-4 text-red-600" />
            <span>Incorrect</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Minus className="h-4 w-4 text-muted-foreground" />
            <span>Omitted</span>
          </div>
        </div>

        {/* Question Breakdown */}
        <div className="min-h-0 overflow-hidden">
          <Tabs defaultValue="reading_writing" className="h-full min-h-0 flex flex-col">
            <div className="px-4 pt-3">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="reading_writing" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  Reading & Writing
                </TabsTrigger>
                <TabsTrigger value="math" className="gap-2">
                  <Calculator className="h-4 w-4" />
                  Math
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="min-h-0 flex-1 px-4 py-3 touch-pan-y">
              <TabsContent value="reading_writing" className="mt-0">
                {renderQuestionList(rwQuestions, "Reading & Writing")}
              </TabsContent>

              <TabsContent value="math" className="mt-0">
                {renderQuestionList(mathQuestions, "Math")}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t shrink-0">
          <Button onClick={onClose} className="w-full gap-2">
            <X className="h-4 w-4" />
            Close & Return to Practice Tests
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
