import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Flag, Eye, Loader2, CheckCircle } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { MathText } from '@/components/MathText';
import { ScrollArea } from '@/components/ui/scroll-area';

function QuestionPreviewDialog({ 
  open, 
  onOpenChange, 
  questionId,
}: { 
  open: boolean; 
  onOpenChange: (v: boolean) => void; 
  questionId: string | null;
}) {
  const { data: question, isLoading } = useQuery({
    queryKey: ['question-preview', questionId],
    queryFn: async () => {
      if (!questionId) return null;
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

  const options = question?.multiple_choice_options as Record<string, string> | null;
  const choiceImages = question?.choice_images as Record<string, string> | null;
  const labels = ['A', 'B', 'C', 'D'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Question Preview
          </DialogTitle>
          <DialogDescription>
            Preview how students see this question
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : question ? (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-5 pr-4">
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
              </div>

              {question.passage_text && (
                <div className="bg-muted/50 rounded-lg p-4 border text-sm leading-relaxed">
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Passage</p>
                  <MathText text={question.passage_text} />
                </div>
              )}

              {question.question_image_url && (
                <div className="flex justify-center">
                  <img 
                    src={question.question_image_url} 
                    alt="Question figure" 
                    className="max-w-full max-h-64 rounded-lg border object-contain"
                  />
                </div>
              )}

              <div className="bg-card rounded-lg p-4 border-2">
                <MathText text={question.question_text} className="text-base leading-relaxed" />
              </div>

              {question.question_type === 'multiple_choice' && options && (
                <div className="grid gap-2">
                  {labels.map((label) => {
                    const key = label.toLowerCase();
                    const text = options[key] || options[label];
                    const imgUrl = choiceImages?.[key] || choiceImages?.[label];
                    if (!text && !imgUrl) return null;
                    const isCorrect = question.answer?.toUpperCase() === label;

                    return (
                      <div
                        key={label}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                          isCorrect 
                            ? 'border-green-500/60 bg-green-500/10' 
                            : 'border-border bg-muted/30'
                        }`}
                      >
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                          isCorrect 
                            ? 'bg-green-500 text-white' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {label}
                        </span>
                        <div className="flex-1 min-w-0">
                          {imgUrl && (
                            <img src={imgUrl} alt={`Choice ${label}`} className="max-h-20 rounded mb-1" />
                          )}
                          {text && <MathText text={text} className="text-sm" />}
                        </div>
                        {isCorrect && (
                          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {question.question_type === 'fill_blank' && (
                <div className="flex items-center gap-2 p-3 rounded-lg border-2 border-green-500/60 bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm font-medium">Answer:</span>
                  <MathText text={question.answer} className="text-sm font-bold" />
                </div>
              )}

              {question.rationale && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-xs font-medium text-blue-400 mb-2 uppercase tracking-wide">Rationale</p>
                  <MathText text={question.rationale} className="text-sm text-muted-foreground" />
                </div>
              )}
            </div>
          </ScrollArea>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function TeacherFlaggedQuestions() {
  const [previewQuestionId, setPreviewQuestionId] = useState<string | null>(null);

  const { data: flags, isLoading } = useQuery({
    queryKey: ['teacher-flagged-questions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('question_flags')
        .select(`
          *,
          question:questions(id, question_id, question_text, question_image_url, multiple_choice_options, category:question_categories(name)),
          student:student_accounts(phone_number)
        `)
        .eq('admin_reviewed', false)
        .order('flagged_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!flags || flags.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Flag className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm font-medium">No flagged questions</p>
        <p className="text-xs">Questions flagged by students will appear here</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          {flags.length} question{flags.length !== 1 ? 's' : ''} flagged by students
        </p>
        {flags.map((flag: any) => (
          <Card key={flag.id} className="overflow-hidden">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <Badge variant="outline" className="font-mono text-xs">
                      {flag.question?.question_id}
                    </Badge>
                    {flag.question?.category?.name && (
                      <Badge variant="secondary" className="text-xs">{flag.question.category.name}</Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(flag.flagged_at).toLocaleDateString()}
                    </span>
                  </div>

                  {flag.question?.question_image_url && (
                    <img 
                      src={flag.question.question_image_url} 
                      alt="Question" 
                      className="max-h-16 rounded border mb-1.5 object-contain"
                    />
                  )}
                  <p className="text-xs md:text-sm line-clamp-2">
                    <MathText text={flag.question?.question_text || ''} />
                  </p>

                  {flag.flag_reason && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="font-medium">Reason:</span> {flag.flag_reason}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    By: {flag.student?.phone_number}
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="flex-shrink-0 h-8 text-xs"
                  onClick={() => setPreviewQuestionId(flag.question?.id)}
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  Preview
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <QuestionPreviewDialog
        open={!!previewQuestionId}
        onOpenChange={(v) => !v && setPreviewQuestionId(null)}
        questionId={previewQuestionId}
      />
    </>
  );
}
