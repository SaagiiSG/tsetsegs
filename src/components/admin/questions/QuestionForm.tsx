import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Loader2, X, Youtube, Plus, Trash2 } from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MathText } from '@/components/MathText';

const variationSchema = z.object({
  question_text: z.string().min(1, 'Question text is required'),
  answer: z.string().min(1, 'Answer is required'),
  option_a: z.string().optional(),
  option_b: z.string().optional(),
  option_c: z.string().optional(),
  option_d: z.string().optional(),
});

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
  manual_variations: z.array(variationSchema).default([]),
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
      manual_variations: [],
    }
  });

  const { fields: variationFields, append: appendVariation, remove: removeVariation } = useFieldArray({
    control: form.control,
    name: 'manual_variations',
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
        const { data: insertedData, error } = await supabase
          .from('questions')
          .insert(questionData)
          .select()
          .single();
        if (error) throw error;

        // Insert manual variations if any
        if (data.manual_variations && data.manual_variations.length > 0 && insertedData) {
          const variationsToInsert = data.manual_variations.map((variation) => ({
            question_id: `${data.question_id}-V${Math.random().toString(36).substr(2, 4)}`,
            question_text: variation.question_text,
            category_id: data.category_id,
            question_type: data.question_type,
            answer: variation.answer,
            question_image_url: imageUrl,
            video_url: data.video_url || null,
            multiple_choice_options: data.question_type === 'multiple_choice'
              ? { A: variation.option_a, B: variation.option_b, C: variation.option_c, D: variation.option_d }
              : null,
            is_original: false,
            is_active: true,
            parent_question_id: insertedData.id,
          }));

          const { error: variationError } = await supabase
            .from('questions')
            .insert(variationsToInsert);
          
          if (variationError) {
            toast({
              title: 'Warning',
              description: 'Question saved but some variations failed to save',
              variant: 'destructive',
            });
          }
        }
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
    form.reset({
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
      manual_variations: [],
    });
    setImageFile(null);
    setImagePreview(null);
    onOpenChange(false);
  };

  const addVariation = () => {
    appendVariation({
      question_text: '',
      answer: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
    });
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

  const watchedValues = form.watch();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-[95vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>
            {editingQuestion ? 'Edit Question' : 'Add New Question'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Side - Form */}
          <ScrollArea className="flex-1 px-6 border-r">
            <Form {...form}>
              <form id="question-form" onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4 py-4">
              {/* Basic Info Row */}
              <div className="grid grid-cols-2 gap-4">
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
            </div>

            {/* Question Type */}
            <FormField
              control={form.control}
              name="question_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Answer Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="multiple_choice">Multiple Choice (A, B, C, D)</SelectItem>
                      <SelectItem value="fill_blank">Fill in the Blank (Student types answer)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Question Preview Section */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-4 py-2 border-b">
                <span className="text-sm font-medium">Question Preview Layout</span>
                <span className="text-xs text-muted-foreground ml-2">(Image on top, text below)</span>
              </div>
              
              {/* Graph/Table Image - FIRST (Top) */}
              <div className="p-4 border-b bg-background">
                <Label className="text-sm font-medium mb-2 block">
                  Graph / Table / Figure (optional)
                </Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Upload your Figma/Canva exported image here - it will display above the question text
                </p>
                {imagePreview ? (
                  <div className="relative w-full">
                    <img 
                      src={imagePreview} 
                      alt="Question figure" 
                      className="rounded-lg border w-full max-h-64 object-contain bg-white"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={removeImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <div className="text-muted-foreground">
                        <p className="font-medium">Click to upload image</p>
                        <p className="text-xs">PNG, JPG from Figma/Canva</p>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              {/* Question Text - SECOND (Below image) */}
              <div className="p-4">
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
                          placeholder="Enter the question text here..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Multiple Choice Options */}
            {questionType === 'multiple_choice' && (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                <Label>Answer Options</Label>
                <p className="text-xs text-muted-foreground">
                  Use $math$ for LaTeX notation (e.g., $x^2 + 1$)
                </p>
                <div className="grid grid-cols-1 gap-3">
                  <FormField
                    control={form.control}
                    name="option_a"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-start gap-2">
                          <span className="font-medium w-6 mt-2">A:</span>
                          <div className="flex-1">
                            <FormControl>
                              <RichTextEditor
                                value={field.value || ''}
                                onChange={field.onChange}
                                placeholder="Option A"
                                minHeight="60px"
                              />
                            </FormControl>
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="option_b"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-start gap-2">
                          <span className="font-medium w-6 mt-2">B:</span>
                          <div className="flex-1">
                            <FormControl>
                              <RichTextEditor
                                value={field.value || ''}
                                onChange={field.onChange}
                                placeholder="Option B"
                                minHeight="60px"
                              />
                            </FormControl>
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="option_c"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-start gap-2">
                          <span className="font-medium w-6 mt-2">C:</span>
                          <div className="flex-1">
                            <FormControl>
                              <RichTextEditor
                                value={field.value || ''}
                                onChange={field.onChange}
                                placeholder="Option C"
                                minHeight="60px"
                              />
                            </FormControl>
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="option_d"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-start gap-2">
                          <span className="font-medium w-6 mt-2">D:</span>
                          <div className="flex-1">
                            <FormControl>
                              <RichTextEditor
                                value={field.value || ''}
                                onChange={field.onChange}
                                placeholder="Option D"
                                minHeight="60px"
                              />
                            </FormControl>
                          </div>
                        </div>
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

            {/* Manual Variations Section */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-4 py-3 border-b flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">Manual Question Variations</span>
                  <p className="text-xs text-muted-foreground">Add custom variations of this question</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addVariation}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Variation
                </Button>
              </div>

              {variationFields.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <p className="text-sm">No manual variations added yet</p>
                  <p className="text-xs mt-1">Click "Add Variation" to create custom question variations</p>
                </div>
              ) : (
                <div className="divide-y">
                  {variationFields.map((field, index) => (
                    <div key={field.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Variation {index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeVariation(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Variation Question Text */}
                      <FormField
                        control={form.control}
                        name={`manual_variations.${index}.question_text`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Question Text</FormLabel>
                            <FormControl>
                              <RichTextEditor
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Enter variation question text..."
                                minHeight="80px"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Variation Options (if multiple choice) */}
                      {questionType === 'multiple_choice' && (
                        <div className="grid grid-cols-2 gap-2">
                          <FormField
                            control={form.control}
                            name={`manual_variations.${index}.option_a`}
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex items-start gap-1">
                                  <span className="text-xs font-medium mt-2">A:</span>
                                  <FormControl>
                                    <RichTextEditor
                                      value={field.value || ''}
                                      onChange={field.onChange}
                                      placeholder="Option A"
                                      minHeight="50px"
                                    />
                                  </FormControl>
                                </div>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`manual_variations.${index}.option_b`}
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex items-start gap-1">
                                  <span className="text-xs font-medium mt-2">B:</span>
                                  <FormControl>
                                    <RichTextEditor
                                      value={field.value || ''}
                                      onChange={field.onChange}
                                      placeholder="Option B"
                                      minHeight="50px"
                                    />
                                  </FormControl>
                                </div>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`manual_variations.${index}.option_c`}
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex items-start gap-1">
                                  <span className="text-xs font-medium mt-2">C:</span>
                                  <FormControl>
                                    <RichTextEditor
                                      value={field.value || ''}
                                      onChange={field.onChange}
                                      placeholder="Option C"
                                      minHeight="50px"
                                    />
                                  </FormControl>
                                </div>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`manual_variations.${index}.option_d`}
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex items-start gap-1">
                                  <span className="text-xs font-medium mt-2">D:</span>
                                  <FormControl>
                                    <RichTextEditor
                                      value={field.value || ''}
                                      onChange={field.onChange}
                                      placeholder="Option D"
                                      minHeight="50px"
                                    />
                                  </FormControl>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                      )}

                      {/* Variation Answer */}
                      <FormField
                        control={form.control}
                        name={`manual_variations.${index}.answer`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Correct Answer</FormLabel>
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
                    </div>
                  ))}
                </div>
              )}
            </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 pb-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" form="question-form" disabled={saveMutation.isPending || isUploading}>
                  {(saveMutation.isPending || isUploading) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingQuestion ? 'Update Question' : 'Add Question'}
                </Button>
              </div>
              </form>
            </Form>
          </ScrollArea>

          {/* Right Side - Live Preview */}
          <div className="w-[40%] shrink-0 flex flex-col bg-muted/30">
            <div className="px-4 py-3 border-b bg-muted/50">
              <span className="text-sm font-medium">Live Preview</span>
              <span className="text-xs text-muted-foreground ml-2">(How students will see it)</span>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {/* Question ID Badge */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded">
                    Q#{watchedValues.question_id || '----'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {categories?.find(c => c.id === watchedValues.category_id)?.name || 'No category'}
                  </span>
                </div>

                {/* Preview Image */}
                {imagePreview && (
                  <div className="rounded-lg border overflow-hidden bg-white">
                    <img 
                      src={imagePreview} 
                      alt="Question figure" 
                      className="w-full object-contain max-h-48"
                    />
                  </div>
                )}

                {/* Preview Question Text */}
                <div className="p-4 rounded-lg border bg-card">
                  {watchedValues.question_text ? (
                    <MathText 
                      text={watchedValues.question_text}
                      className="text-sm"
                    />
                  ) : (
                    <p className="text-muted-foreground italic text-sm">Question text will appear here...</p>
                  )}
                </div>

                {/* Preview Options */}
                {watchedValues.question_type === 'multiple_choice' && (
                  <div className="space-y-2">
                    {['A', 'B', 'C', 'D'].map((letter) => {
                      const optionKey = `option_${letter.toLowerCase()}` as keyof typeof watchedValues;
                      const optionValue = watchedValues[optionKey] as string;
                      const isCorrect = watchedValues.answer === letter;
                      
                      return (
                        <div 
                          key={letter}
                          className={`p-3 rounded-lg border transition-colors ${
                            isCorrect 
                              ? 'border-green-500 bg-green-500/10' 
                              : 'border-border bg-card hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span className={`font-medium text-sm ${isCorrect ? 'text-green-600' : ''}`}>
                              {letter}.
                            </span>
                            {optionValue ? (
                              <MathText 
                                text={optionValue}
                                className="flex-1 text-sm"
                              />
                            ) : (
                              <span className="text-muted-foreground italic text-sm">Option {letter}...</span>
                            )}
                            {isCorrect && (
                              <span className="text-xs text-green-600 font-medium">✓ Correct</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Fill in the blank preview */}
                {watchedValues.question_type === 'fill_blank' && (
                  <div className="space-y-2">
                    <div className="p-3 rounded-lg border bg-card">
                      <Input 
                        disabled 
                        placeholder="Student types answer here..." 
                        className="bg-muted/50"
                      />
                    </div>
                    {watchedValues.answer && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <span>✓</span> Correct answer: <strong>{watchedValues.answer}</strong>
                      </p>
                    )}
                  </div>
                )}

                {/* Video indicator */}
                {watchedValues.video_url && (
                  <div className="flex items-center gap-2 p-3 rounded-lg border bg-red-50 border-red-200">
                    <Youtube className="h-5 w-5 text-red-500" />
                    <span className="text-sm text-red-700">Video explanation attached</span>
                  </div>
                )}

                {/* Variations count */}
                {variationFields.length > 0 && (
                  <div className="p-3 rounded-lg border bg-blue-50 border-blue-200">
                    <span className="text-sm text-blue-700">
                      +{variationFields.length} manual variation{variationFields.length > 1 ? 's' : ''} added
                    </span>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
