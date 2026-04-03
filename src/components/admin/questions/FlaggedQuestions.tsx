import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Flag, CheckCircle, Loader2, Eye, Pencil } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { MathText } from '@/components/MathText';
import { QuestionForm } from './QuestionForm';
import { ScrollArea } from '@/components/ui/scroll-area';

function QuestionPreviewDialog({ 
  open, 
  onOpenChange, 
  questionId,
  onEdit 
}: { 
  open: boolean; 
  onOpenChange: (v: boolean) => void; 
  questionId: string | null;
  onEdit: (question: any) => void;
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
              {/* Header badges */}
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
                <Badge variant={question.question_type === 'multiple_choice' ? 'default' : 'secondary'}>
                  {question.question_type === 'multiple_choice' ? 'Multiple Choice' : 'Fill in Blank'}
                </Badge>
              </div>

              {/* Passage text (English questions) */}
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
                    className="max-w-full max-h-64 rounded-lg border object-contain"
                  />
                </div>
              )}

              {/* Question text */}
              <div className="bg-card rounded-lg p-4 border-2">
                <MathText text={question.question_text} className="text-base leading-relaxed" />
              </div>

              {/* Answer choices */}
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

              {/* Fill in blank answer */}
              {question.question_type === 'fill_blank' && (
                <div className="flex items-center gap-2 p-3 rounded-lg border-2 border-green-500/60 bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm font-medium">Answer:</span>
                  <MathText text={question.answer} className="text-sm font-bold" />
                  {question.alternate_answers && question.alternate_answers.length > 0 && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (also: {question.alternate_answers.join(', ')})
                    </span>
                  )}
                </div>
              )}

              {/* Rationale */}
              {question.rationale && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-xs font-medium text-blue-400 mb-2 uppercase tracking-wide">Rationale</p>
                  <MathText text={question.rationale} className="text-sm text-muted-foreground" />
                </div>
              )}

              {/* Video link */}
              {question.video_url && (
                <div className="text-xs text-muted-foreground">
                  📹 Video explanation available
                </div>
              )}
            </div>
          </ScrollArea>
        ) : null}

        {/* Edit button at bottom */}
        {question && (
          <div className="flex justify-end pt-2 border-t">
            <Button 
              onClick={() => {
                onEdit(question);
                onOpenChange(false);
              }}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit Question
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function FlaggedQuestions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [previewQuestionId, setPreviewQuestionId] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);

  // Fetch flagged questions
  const { data: flags, isLoading } = useQuery({
    queryKey: ['flagged-questions'],
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

  // Mark as reviewed mutation
  const reviewMutation = useMutation({
    mutationFn: async (flagId: string) => {
      const { error } = await supabase
        .from('question_flags')
        .update({ admin_reviewed: true, reviewed_at: new Date().toISOString() })
        .eq('id', flagId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Flag marked as reviewed' });
      queryClient.invalidateQueries({ queryKey: ['flagged-questions'] });
      queryClient.invalidateQueries({ queryKey: ['flagged-questions-count'] });
    }
  });

  const handleEditFromPreview = (question: any) => {
    setEditingQuestion(question);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (!flags || flags.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Flagged Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Flag className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No flagged questions</p>
            <p className="text-sm">Questions flagged by students will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Flagged Questions ({flags.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {flags.map((flag: any) => (
            <div key={flag.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge variant="outline" className="font-mono">
                      {flag.question?.question_id}
                    </Badge>
                    <Badge variant="secondary">{flag.question?.category?.name}</Badge>
                    <span className="text-xs text-muted-foreground">
                      Flagged {new Date(flag.flagged_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Question preview snippet */}
                  <div className="mb-2">
                    {flag.question?.question_image_url && (
                      <img 
                        src={flag.question.question_image_url} 
                        alt="Question" 
                        className="max-h-20 rounded border mb-2 object-contain"
                      />
                    )}
                    <p className="text-sm line-clamp-2">
                      <MathText text={flag.question?.question_text || ''} />
                    </p>
                  </div>

                  {flag.flag_reason && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Reason:</span> {flag.flag_reason}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Flagged by: {flag.student?.phone_number}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPreviewQuestionId(flag.question?.id)}
                  >
                    <Eye className="h-4 w-4 mr-1.5" />
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => reviewMutation.mutate(flag.id)}
                    disabled={reviewMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-1.5" />
                    Reviewed
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditingQuestion(flag.question)}
                  >
                    <Pencil className="h-4 w-4 mr-1.5" />
                    Edit
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Question Preview Dialog */}
      <QuestionPreviewDialog
        open={!!previewQuestionId}
        onOpenChange={(v) => !v && setPreviewQuestionId(null)}
        questionId={previewQuestionId}
        onEdit={handleEditFromPreview}
      />

      {/* Question Edit Form */}
      <QuestionForm
        open={!!editingQuestion}
        onOpenChange={(v) => !v && setEditingQuestion(null)}
        editingQuestion={editingQuestion}
      />
    </>
  );
}
