import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  Save,
  CheckCircle,
  Circle,
  Type,
  ListOrdered,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

interface HomeworkQuestion {
  id: string;
  assignment_id: string;
  question_type: 'multiple_choice' | 'fill_blank';
  question_text: string;
  options: { label: string; value: string }[];
  correct_answer: string;
  explanation: string | null;
  points: number;
  order_index: number;
}

interface QuestionEditorProps {
  assignmentId: string;
}

export function QuestionEditor({ assignmentId }: QuestionEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<HomeworkQuestion | null>(null);
  const [newQuestion, setNewQuestion] = useState<{
    type: 'multiple_choice' | 'fill_blank';
    text: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    points: number;
  }>({
    type: 'multiple_choice',
    text: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    explanation: '',
    points: 1,
  });
  const queryClient = useQueryClient();

  const { data: questions, isLoading } = useQuery({
    queryKey: ['homework-questions', assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('homework_questions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data.map((q) => ({
        ...q,
        options: (q.options as { label: string; value: string }[]) || [],
      })) as HomeworkQuestion[];
    },
  });

  const addQuestionMutation = useMutation({
    mutationFn: async () => {
      const maxOrder = questions?.length ? Math.max(...questions.map((q) => q.order_index)) + 1 : 0;

      const options = newQuestion.type === 'multiple_choice'
        ? newQuestion.options
            .filter((o) => o.trim())
            .map((o, i) => ({ label: String.fromCharCode(65 + i), value: o }))
        : [];

      const { error } = await supabase.from('homework_questions').insert({
        assignment_id: assignmentId,
        question_type: newQuestion.type,
        question_text: newQuestion.text,
        options,
        correct_answer: newQuestion.correctAnswer,
        explanation: newQuestion.explanation || null,
        points: newQuestion.points,
        order_index: maxOrder,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework-questions', assignmentId] });
      resetNewQuestion();
      setIsAdding(false);
      toast.success('Question added');
    },
    onError: () => {
      toast.error('Failed to add question');
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: string) => {
      const { error } = await supabase.from('homework_questions').delete().eq('id', questionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework-questions', assignmentId] });
      toast.success('Question deleted');
    },
    onError: () => {
      toast.error('Failed to delete question');
    },
  });

  const resetNewQuestion = () => {
    setNewQuestion({
      type: 'multiple_choice',
      text: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      explanation: '',
      points: 1,
    });
  };

  const handleAddQuestion = () => {
    if (!newQuestion.text.trim()) {
      toast.error('Please enter a question');
      return;
    }
    if (!newQuestion.correctAnswer.trim()) {
      toast.error('Please specify the correct answer');
      return;
    }
    if (newQuestion.type === 'multiple_choice' && !newQuestion.options.some((o) => o.trim())) {
      toast.error('Please add at least one option');
      return;
    }
    addQuestionMutation.mutate();
  };

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h5 className="font-medium flex items-center gap-2">
          <ListOrdered className="w-4 h-4" />
          Questions ({questions?.length || 0})
        </h5>
        {!isAdding && (
          <Button size="sm" variant="outline" onClick={() => setIsAdding(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add Question
          </Button>
        )}
      </div>

      {/* Add new question form */}
      {isAdding && (
        <Card className="p-4 bg-card border-primary/20">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h6 className="font-medium">New Question</h6>
              <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select
                  value={newQuestion.type}
                  onValueChange={(value) =>
                    setNewQuestion({
                      ...newQuestion,
                      type: value as 'multiple_choice' | 'fill_blank',
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Points</Label>
                <Input
                  type="number"
                  min={1}
                  value={newQuestion.points}
                  onChange={(e) =>
                    setNewQuestion({ ...newQuestion, points: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Question</Label>
              <Textarea
                value={newQuestion.text}
                onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                placeholder="Enter your question here..."
                rows={2}
              />
            </div>

            {newQuestion.type === 'multiple_choice' && (
              <div className="space-y-2">
                <Label>Options</Label>
                <div className="grid grid-cols-2 gap-2">
                  {newQuestion.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-sm font-medium w-6">
                        {String.fromCharCode(65 + index)}.
                      </span>
                      <Input
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...newQuestion.options];
                          newOptions[index] = e.target.value;
                          setNewQuestion({ ...newQuestion, options: newOptions });
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + index)}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Correct Answer</Label>
              {newQuestion.type === 'multiple_choice' ? (
                <Select
                  value={newQuestion.correctAnswer}
                  onValueChange={(value) =>
                    setNewQuestion({ ...newQuestion, correctAnswer: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select correct answer" />
                  </SelectTrigger>
                  <SelectContent>
                    {newQuestion.options.map(
                      (option, index) =>
                        option.trim() && (
                          <SelectItem key={index} value={String.fromCharCode(65 + index)}>
                            {String.fromCharCode(65 + index)}. {option}
                          </SelectItem>
                        )
                    )}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={newQuestion.correctAnswer}
                  onChange={(e) =>
                    setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })
                  }
                  placeholder="Enter the correct answer"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Explanation (optional)</Label>
              <Textarea
                value={newQuestion.explanation}
                onChange={(e) => setNewQuestion({ ...newQuestion, explanation: e.target.value })}
                placeholder="Explain why this is the correct answer..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddQuestion} disabled={addQuestionMutation.isPending}>
                <Save className="w-4 h-4 mr-1" />
                Add Question
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Questions list */}
      {questions?.length === 0 && !isAdding ? (
        <div className="text-center py-6 text-muted-foreground text-sm">
          No questions yet. Add your first question to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {questions?.map((question, index) => (
            <Card key={question.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      Q{index + 1}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {question.question_type === 'multiple_choice' ? 'Multiple Choice' : 'Fill Blank'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {question.points} pt{question.points > 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium mb-2">{question.question_text}</p>

                  {question.question_type === 'multiple_choice' && question.options.length > 0 && (
                    <div className="grid grid-cols-2 gap-1 text-sm">
                      {question.options.map((option) => (
                        <div
                          key={option.label}
                          className={`flex items-center gap-1 ${
                            option.label === question.correct_answer
                              ? 'text-green-600 font-medium'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {option.label === question.correct_answer ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <Circle className="w-3 h-3" />
                          )}
                          {option.label}. {option.value}
                        </div>
                      ))}
                    </div>
                  )}

                  {question.question_type === 'fill_blank' && (
                    <p className="text-sm text-green-600">
                      Answer: {question.correct_answer}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm('Delete this question?')) {
                      deleteQuestionMutation.mutate(question.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
