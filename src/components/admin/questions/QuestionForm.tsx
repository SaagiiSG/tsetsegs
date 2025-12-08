import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, X, Youtube } from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';

const questionSchema = z.object({
  question_id: z.string().min(1, 'Question ID is required'),
  question_text: z.string().min(1, 'Question text is required'),
  category_id: z.string().min(1, 'Category is required'),
  question_type: z.enum(['multiple_choice', 'fill_blank']),
  answer: z.string().min(1, 'Answer is required'),
  option_a: z.string().optional(),
  option_b: z.string().optional(),
  option_c: z.string().optional(),
  option_d: z.string().optional(),
  video_url: z.string().optional(),
  generate_variations: z.boolean().default(false),
});

type QuestionFormData = z.infer<typeof questionSchema>;

interface QuestionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingQuestion?: any;
}

export function QuestionForm({ open, onOpenChange, editingQuestion }: QuestionFormProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['question-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('question_categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Get next question ID
  const { data: nextQuestionId } = useQuery({
    queryKey: ['next-question-id'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('question_id')
        .eq('is_original', true)
        .order('question_id', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return '6801';
      }
      
      const lastId = parseInt(data[0].question_id);
      const nextNum = (lastId % 100) + 1;
      return `68${nextNum.toString().padStart(2, '0')}`;
    },
    enabled: !editingQuestion
  });

  const form = useForm<QuestionFormData>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      question_id: '',
      question_text: '',
      category_id: '',
      question_type: 'multiple_choice',
      answer: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      video_url: '',
      generate_variations: false,
    }
  });

  const questionType = form.watch('question_type');

  // Set form values when editing or when nextQuestionId changes
  useEffect(() => {
    if (editingQuestion) {
      const options = editingQuestion.multiple_choice_options || {};
      form.reset({
        question_id: editingQuestion.question_id,
        question_text: editingQuestion.question_text,
        category_id: editingQuestion.category_id,
        question_type: editingQuestion.question_type,
        answer: editingQuestion.answer,
        option_a: options.A || '',
        option_b: options.B || '',
        option_c: options.C || '',
        option_d: options.D || '',
        video_url: editingQuestion.video_url || '',
        generate_variations: false,
      });
      if (editingQuestion.question_image_url) {
        setImagePreview(editingQuestion.question_image_url);
      }
    } else if (nextQuestionId) {
      form.setValue('question_id', nextQuestionId);
    }
  }, [editingQuestion, nextQuestionId, form]);

  // Upload image mutation
  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `questions/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('question-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('question-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  // Save question mutation
  const saveMutation = useMutation({
    mutationFn: async (data: QuestionFormData) => {
      setIsUploading(true);
      
      let imageUrl = editingQuestion?.question_image_url || null;
      
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const questionData = {
        question_id: data.question_id,
        question_text: data.question_text,
        category_id: data.category_id,
        question_type: data.question_type,
        answer: data.answer,
        question_image_url: imageUrl,
        video_url: data.video_url || null,
        multiple_choice_options: data.question_type === 'multiple_choice' 
          ? { A: data.option_a, B: data.option_b, C: data.option_c, D: data.option_d }
          : null,
        is_original: true,
        is_active: true,
      };

      if (editingQuestion) {
        const { error } = await supabase
          .from('questions')
          .update(questionData)
          .eq('id', editingQuestion.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('questions')
          .insert(questionData);
        if (error) throw error;
      }

      // If generate_variations is true, call AI to generate variations
      if (data.generate_variations && !editingQuestion) {
        // Get the inserted question ID
        const { data: insertedQuestion } = await supabase
          .from('questions')
          .select('id')
          .eq('question_id', data.question_id)
          .single();

        if (insertedQuestion) {
          try {
            const response = await supabase.functions.invoke('generate-variations', {
              body: {
                questionId: insertedQuestion.id,
                questionText: data.question_text,
                questionType: data.question_type,
                answer: data.answer,
                multipleChoiceOptions: data.question_type === 'multiple_choice'
                  ? { A: data.option_a, B: data.option_b, C: data.option_c, D: data.option_d }
                  : null
              }
            });

            if (response.error) {
              toast({
                title: 'AI Generation Warning',
                description: 'Question saved but AI variations failed: ' + response.error.message,
                variant: 'destructive',
              });
            } else {
              toast({
                title: 'AI Variations Generated',
                description: `${response.data?.count || 3} variations created and pending review`,
              });
            }
          } catch (aiError: any) {
            toast({
              title: 'AI Generation Warning',
              description: 'Question saved but AI variations failed',
              variant: 'destructive',
            });
          }
        }
      }
    },
    onSuccess: () => {
      toast({
        title: editingQuestion ? 'Question updated' : 'Question created',
        description: 'The question has been saved successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['questions-count'] });
      queryClient.invalidateQueries({ queryKey: ['next-question-id'] });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save question',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });

  const handleClose = () => {
    form.reset();
    setImageFile(null);
    setImagePreview(null);
    onOpenChange(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingQuestion ? 'Edit Question' : 'Add New Question'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4">
            {/* Question ID */}
            <FormField
              control={form.control}
              name="question_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question ID</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="6801" disabled={!!editingQuestion} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Question Type */}
            <FormField
              control={form.control}
              name="question_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                      <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Question Text */}
            <FormField
              control={form.control}
              name="question_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question Text</FormLabel>
                  <FormControl>
                    <RichTextEditor
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Enter your question here..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Question Image (optional)</Label>
              {imagePreview ? (
                <div className="relative w-full max-w-sm">
                  <img 
                    src={imagePreview} 
                    alt="Question" 
                    className="rounded-lg border max-h-48 object-contain"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={removeImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="max-w-sm"
                  />
                </div>
              )}
            </div>

            {/* Multiple Choice Options */}
            {questionType === 'multiple_choice' && (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                <Label>Answer Options</Label>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="option_a"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <span className="font-medium w-6">A:</span>
                            <Input {...field} placeholder="Option A" />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="option_b"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <span className="font-medium w-6">B:</span>
                            <Input {...field} placeholder="Option B" />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="option_c"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <span className="font-medium w-6">C:</span>
                            <Input {...field} placeholder="Option C" />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="option_d"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <span className="font-medium w-6">D:</span>
                            <Input {...field} placeholder="Option D" />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Correct Answer */}
            <FormField
              control={form.control}
              name="answer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correct Answer</FormLabel>
                  {questionType === 'multiple_choice' ? (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select correct answer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="C">C</SelectItem>
                        <SelectItem value="D">D</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <FormControl>
                      <Input {...field} placeholder="Enter correct answer" />
                    </FormControl>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* YouTube Video URL */}
            <FormField
              control={form.control}
              name="video_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Youtube className="h-4 w-4 text-red-500" />
                    YouTube Video URL (optional)
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://youtube.com/watch?v=..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Generate AI Variations */}
            <FormField
              control={form.control}
              name="generate_variations"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <FormLabel className="text-base">Generate AI Variations</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Automatically generate 3 variations of this question
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending || isUploading}>
                {(saveMutation.isPending || isUploading) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingQuestion ? 'Update Question' : 'Add Question'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
