import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle2, XCircle, ChevronLeft, Trophy, 
  Calculator, BookOpen, Target, X
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

  const renderQuestionGrid = (questions: QuestionResult[]) => (
    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
      {questions
        .sort((a, b) => {
          if (a.module_number !== b.module_number) return a.module_number - b.module_number;
          return a.order_index - b.order_index;
        })
        .map((q, idx) => (
          <button
            key={q.id}
            onClick={() => setSelectedQuestion(q)}
            className={cn(
              "aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all hover:scale-105",
              q.is_correct 
                ? "bg-green-500/20 text-green-600 hover:bg-green-500/30 border border-green-500/30" 
                : "bg-red-500/20 text-red-600 hover:bg-red-500/30 border border-red-500/30"
            )}
          >
            {idx + 1}
          </button>
        ))}
    </div>
  );

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
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        {/* Header with Score */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 text-center border-b">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4">
            <Trophy className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-2">Test Complete!</h2>
          <div className="text-5xl font-black text-primary mb-4">
            {results.totalScore}
          </div>
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-500" />
              <span>Reading & Writing: <strong>{results.rwScaled}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-green-500" />
              <span>Math: <strong>{results.mathScaled}</strong></span>
            </div>
          </div>
        </div>

        {/* Question Breakdown */}
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="reading_writing" className="h-full flex flex-col">
            <div className="px-4 pt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="reading_writing" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  Reading & Writing
                  <Badge variant="secondary" className="ml-1">
                    {rwCorrect}/{rwQuestions.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="math" className="gap-2">
                  <Calculator className="h-4 w-4" />
                  Math
                  <Badge variant="secondary" className="ml-1">
                    {mathCorrect}/{mathQuestions.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 p-4">
              <TabsContent value="reading_writing" className="mt-0">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Click on a question to see details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {renderQuestionGrid(rwQuestions)}
                  </CardContent>
                </Card>
                <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500/30" />
                    <span>Correct</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500/30" />
                    <span>Incorrect</span>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="math" className="mt-0">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Click on a question to see details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {renderQuestionGrid(mathQuestions)}
                  </CardContent>
                </Card>
                <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500/30" />
                    <span>Correct</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500/30" />
                    <span>Incorrect</span>
                  </div>
                </div>
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
