import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Edit, Brain, Loader2 } from 'lucide-react';

export function VariationsReview() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pending variations with parent question info
  const { data: variations, isLoading } = useQuery({
    queryKey: ['pending-variations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_variations')
        .select(`
          *,
          parent:questions(question_id, question_text, category:question_categories(name))
        `)
        .eq('status', 'pending_review')
        .order('generated_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  // Approve mutation - move to questions table
  const approveMutation = useMutation({
    mutationFn: async (variation: any) => {
      // Get parent question to copy category and question_set
      const { data: parent } = await supabase
        .from('questions')
        .select('category_id, question_type, video_url, question_set, question_id')
        .eq('id', variation.parent_question_id)
        .single();

      const questionSet = parent?.question_set || '68';
      let newQuestionId: string;

      // Generate variation ID: parentId-V001, parentId-V002, etc.
      const { data: existingVariations } = await supabase
        .from('questions')
        .select('question_id')
        .eq('parent_question_id', variation.parent_question_id)
        .eq('is_original', false);
      
      const varCount = (existingVariations?.length || 0) + 1;
      newQuestionId = `${parent?.question_id}-V${varCount.toString().padStart(3, '0')}`;

      // Insert as new question
      const { error: insertError } = await supabase
        .from('questions')
        .insert({
          question_id: newQuestionId,
          question_text: variation.question_text,
          answer: variation.answer,
          multiple_choice_options: variation.multiple_choice_options,
          category_id: parent?.category_id,
          question_type: parent?.question_type || 'multiple_choice',
          video_url: parent?.video_url,
          question_set: questionSet,
          is_original: false,
          is_active: true,
          parent_question_id: variation.parent_question_id,
        });

      if (insertError) throw insertError;

      // Update variation status
      const { error: updateError } = await supabase
        .from('ai_variations')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('id', variation.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast({ title: 'Variation approved and added to question bank' });
      queryClient.invalidateQueries({ queryKey: ['pending-variations'] });
      queryClient.invalidateQueries({ queryKey: ['pending-variations-count'] });
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (variationId: string) => {
      const { error } = await supabase
        .from('ai_variations')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
        .eq('id', variationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Variation rejected' });
      queryClient.invalidateQueries({ queryKey: ['pending-variations'] });
      queryClient.invalidateQueries({ queryKey: ['pending-variations-count'] });
    }
  });

  // Edit mutation
  const editMutation = useMutation({
    mutationFn: async ({ id, question_text, answer }: { id: string; question_text: string; answer: string }) => {
      const { error } = await supabase
        .from('ai_variations')
        .update({ question_text, answer })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Variation updated' });
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['pending-variations'] });
    }
  });

  const startEdit = (variation: any) => {
    setEditingId(variation.id);
    setEditText(variation.question_text);
    setEditAnswer(variation.answer);
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

  if (!variations || variations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI-Generated Variations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No pending variations to review</p>
            <p className="text-sm">Generate variations when adding questions</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group by parent question
  const grouped = variations.reduce((acc: any, v: any) => {
    const parentId = v.parent_question_id;
    if (!acc[parentId]) {
      acc[parentId] = {
        parent: v.parent,
        variations: []
      };
    }
    acc[parentId].variations.push(v);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI-Generated Variations ({variations.length} pending)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(grouped).map(([parentId, group]: [string, any]) => (
            <div key={parentId} className="border rounded-lg p-4 space-y-4">
              {/* Parent Question Info */}
              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="font-mono">
                    {group.parent?.question_id}
                  </Badge>
                  <Badge variant="secondary">{group.parent?.category?.name}</Badge>
                  <span className="text-sm text-muted-foreground">Original Question</span>
                </div>
                <p className="text-sm">{group.parent?.question_text}</p>
              </div>

              {/* Variations */}
              <div className="space-y-3">
                {group.variations.map((v: any, index: number) => (
                  <div key={v.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge>Variation {index + 1}</Badge>
                          <span className="text-xs text-muted-foreground">
                            Generated {new Date(v.generated_at).toLocaleDateString()}
                          </span>
                        </div>

                        {editingId === v.id ? (
                          <div className="space-y-3">
                            <Textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="min-h-[80px]"
                            />
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">Answer:</span>
                              <Input
                                value={editAnswer}
                                onChange={(e) => setEditAnswer(e.target.value)}
                                className="w-32"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => editMutation.mutate({
                                  id: v.id,
                                  question_text: editText,
                                  answer: editAnswer
                                })}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm mb-2">{v.question_text}</p>
                            <p className="text-sm">
                              <span className="font-medium">Answer:</span> {v.answer}
                            </p>
                            {v.multiple_choice_options && (
                              <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                                {Object.entries(v.multiple_choice_options).map(([key, val]) => (
                                  <span key={key}>{key}: {val as string}</span>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {editingId !== v.id && (
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => startEdit(v)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => approveMutation.mutate(v)}
                            disabled={approveMutation.isPending}
                            title="Approve"
                            className="text-green-500 hover:text-green-600"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => rejectMutation.mutate(v.id)}
                            disabled={rejectMutation.isPending}
                            title="Reject"
                            className="text-red-500 hover:text-red-600"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
