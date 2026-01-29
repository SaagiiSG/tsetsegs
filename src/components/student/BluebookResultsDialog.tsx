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
import { cn } from '@/lib/utils';

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
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          {/* Question Detail Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <Button 
              variant="ghost" 
              onClick={() => setSelectedQuestion(null)}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Results
            </Button>
            <Badge variant={selectedQuestion.is_correct ? "default" : "destructive"}>
              {selectedQuestion.is_correct ? "Correct" : "Incorrect"}
            </Badge>
          </div>
          
          {/* Question Content */}
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6">
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

                  {selectedQuestion.question_image_url && (
                    <img 
                      src={selectedQuestion.question_image_url} 
                      alt="Question" 
                      className="max-w-full h-auto rounded-lg border"
                    />
                  )}

                  {/* Multiple Choice Options */}
                  {selectedQuestion.multiple_choice_options && (
                    <div className="space-y-2 mt-4">
                      {Object.entries(selectedQuestion.multiple_choice_options as Record<string, string>).map(([key, value]) => {
                        const isCorrect = key.toUpperCase() === selectedQuestion.correct_answer?.toUpperCase();
                        const isUserAnswer = key.toUpperCase() === selectedQuestion.user_answer?.toUpperCase();
                        
                        return (
                          <div
                            key={key}
                            className={cn(
                              "p-3 rounded-lg border-2 flex items-start gap-3",
                              isCorrect && "border-green-500 bg-green-500/10",
                              isUserAnswer && !isCorrect && "border-red-500 bg-red-500/10",
                              !isCorrect && !isUserAnswer && "border-muted"
                            )}
                          >
                            <span className={cn(
                              "font-semibold w-6 h-6 flex items-center justify-center rounded-full text-sm",
                              isCorrect && "bg-green-500 text-white",
                              isUserAnswer && !isCorrect && "bg-red-500 text-white",
                              !isCorrect && !isUserAnswer && "bg-muted"
                            )}>
                              {key.toUpperCase()}
                            </span>
                            <span className="flex-1">
                              <MathText text={value} />
                            </span>
                            {isCorrect && <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />}
                            {isUserAnswer && !isCorrect && <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Fill in the blank answer display */}
                  {selectedQuestion.question_type === 'fill_in_blank' && (
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
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        {/* Header with Score */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 text-center border-b">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/20 mb-3">
            <Trophy className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-1">Test Complete!</h2>
          <div className="text-4xl font-black text-primary mb-3">
            {results.totalScore}
          </div>
          <div className="flex items-center justify-center gap-6 text-sm">
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
        <div className="flex items-center justify-center gap-6 py-3 border-b bg-muted/30 text-sm">
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
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="reading_writing" className="h-full flex flex-col">
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

            <ScrollArea className="flex-1 px-4 py-3">
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
        <div className="p-4 border-t">
          <Button onClick={onClose} className="w-full gap-2">
            <X className="h-4 w-4" />
            Close & Return to Practice Tests
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
