import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, X, Plus, Trash2, ImagePlus } from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';
import { ImageCropper } from './ImageCropper';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MathText } from '@/components/MathText';
import { Badge } from '@/components/ui/badge';

const cbQuestionSchema = z.object({
  question_id: z.string().min(1, 'Question ID is required'),
  original_cb_id: z.string().optional(),
  question_text: z.string().min(1, 'Question text is required'),
  category_id: z.string().min(1, 'Category is required'),
  subtopic: z.string().optional(),
  difficulty_level: z.string().optional(),
  question_type: z.enum(['multiple_choice', 'fill_blank']),
  answer: z.string().min(1, 'Answer is required'),
  option_a: z.string().optional(),
  option_b: z.string().optional(),
  option_c: z.string().optional(),
  option_d: z.string().optional(),
  rationale: z.string().optional(),
  video_url: z.string().optional(),
  alternate_answers: z.array(z.object({ value: z.string() })).default([]),
});

type CBQuestionFormData = z.infer<typeof cbQuestionSchema>;

interface CBQuestionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingQuestion?: any;
}

export function CBQuestionForm({ open, onOpenChange, editingQuestion }: CBQuestionFormProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [choiceImageFiles, setChoiceImageFiles] = useState<Record<string, File | null>>({ A: null, B: null, C: null, D: null });
  const [choiceImagePreviews, setChoiceImagePreviews] = useState<Record<string, string | null>>({ A: null, B: null, C: null, D: null });
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperSrc, setCropperSrc] = useState('');
  const [cropperTarget, setCropperTarget] = useState<'main' | string>('main');
  const [pendingOriginalFile, setPendingOriginalFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch math categories only (exclude English categories)
  const englishCategories = ['Information and Ideas', 'Craft and Structure', 'Standard English Conventions', 'Expression of Ideas'];
  const { data: categories } = useQuery({
    queryKey: ['question-categories-math'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('question_categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data?.filter(cat => !englishCategories.includes(cat.name)) || [];
    }
  });

  // Get next CB question ID
  const { data: nextQuestionId } = useQuery({
    queryKey: ['next-cb-question-id'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('question_id')
        .eq('question_set', 'CollegeBoard')
        .eq('is_original', true)
        .order('question_id', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return 'CB0001';
      }
      
      const lastId = data[0].question_id;
      const numMatch = lastId.match(/\d+$/);
      const lastNum = numMatch ? parseInt(numMatch[0]) : 0;
      const nextNum = lastNum + 1;
      return `CB${nextNum.toString().padStart(4, '0')}`;
    },
    enabled: !editingQuestion
  });

  const form = useForm<CBQuestionFormData>({
    resolver: zodResolver(cbQuestionSchema),
    defaultValues: {
      question_id: '',
      original_cb_id: '',
      question_text: '',
      category_id: '',
      subtopic: '',
      difficulty_level: '',
      question_type: 'multiple_choice',
      answer: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      rationale: '',
      video_url: '',
      alternate_answers: [],
    }
  });

  const { fields: alternateFields, append: appendAlternate, remove: removeAlternate } = useFieldArray({
    control: form.control,
    name: 'alternate_answers',
  });

  const questionType = form.watch('question_type');

  // Set form values when editing or when nextQuestionId changes
  useEffect(() => {
    if (editingQuestion) {
      const options = editingQuestion.multiple_choice_options || {};
      const existingAlternates = (editingQuestion.alternate_answers as string[] | null) || [];
      form.reset({
        question_id: editingQuestion.question_id,
        original_cb_id: editingQuestion.original_cb_id || '',
        question_text: editingQuestion.question_text,
        category_id: editingQuestion.category_id,
        subtopic: editingQuestion.subtopic || '',
        difficulty_level: editingQuestion.difficulty_level || '',
        question_type: editingQuestion.question_type,
        answer: editingQuestion.answer,
        option_a: options.A || '',
        option_b: options.B || '',
        option_c: options.C || '',
        option_d: options.D || '',
        rationale: editingQuestion.rationale || '',
        video_url: editingQuestion.video_url || '',
        alternate_answers: existingAlternates.map(a => ({ value: a })),
      });
      if (editingQuestion.question_image_url) {
        setImagePreview(editingQuestion.question_image_url);
      }
      // Load existing choice images
      const ci = editingQuestion.choice_images as Record<string, string> | null;
      if (ci) {
        setChoiceImagePreviews({ A: ci.A || null, B: ci.B || null, C: ci.C || null, D: ci.D || null });
      }
    } else if (nextQuestionId) {
      form.setValue('question_id', nextQuestionId);
    }
  }, [editingQuestion, nextQuestionId, form]);

  // Upload image
  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `cb-${Date.now()}.${fileExt}`;
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

  const uploadChoiceImage = async (file: File, letter: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `choice-${letter}-${Date.now()}.${fileExt}`;
    const filePath = `choices/${fileName}`;

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
    mutationFn: async (data: CBQuestionFormData) => {
      setIsUploading(true);
      
      let imageUrl = editingQuestion?.question_image_url || null;
      
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      // Upload choice images
      const choiceImages: Record<string, string | null> = { A: null, B: null, C: null, D: null };
      let hasAnyChoiceImage = false;
      for (const letter of ['A', 'B', 'C', 'D']) {
        if (choiceImageFiles[letter]) {
          choiceImages[letter] = await uploadChoiceImage(choiceImageFiles[letter]!, letter);
          hasAnyChoiceImage = true;
        } else if (choiceImagePreviews[letter]) {
          choiceImages[letter] = choiceImagePreviews[letter];
          hasAnyChoiceImage = true;
        }
      }

      // Filter out empty alternate answers
      const alternateAnswers = data.alternate_answers
        .map(a => a.value.trim())
        .filter(v => v.length > 0);

      const questionData: any = {
        question_id: data.question_id,
        original_cb_id: data.original_cb_id || null,
        question_text: data.question_text,
        category_id: data.category_id,
        subtopic: data.subtopic || null,
        difficulty_level: data.difficulty_level || null,
        question_type: data.question_type,
        answer: data.answer,
        question_image_url: imageUrl,
        rationale: data.rationale || null,
        video_url: data.video_url || null,
        multiple_choice_options: data.question_type === 'multiple_choice' 
          ? { A: data.option_a, B: data.option_b, C: data.option_c, D: data.option_d }
          : null,
        alternate_answers: data.question_type === 'fill_blank' && alternateAnswers.length > 0 
          ? alternateAnswers 
          : null,
        is_original: true,
        is_active: true,
        question_set: 'CollegeBoard',
        choice_images: hasAnyChoiceImage ? choiceImages : null,
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
    },
    onSuccess: () => {
      toast({
        title: editingQuestion ? 'Question updated' : 'CB Question created',
        description: 'The CollegeBoard question has been saved successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['cb-questions-count'] });
      queryClient.invalidateQueries({ queryKey: ['next-cb-question-id'] });
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
      original_cb_id: '',
      question_text: '',
      category_id: '',
      subtopic: '',
      difficulty_level: '',
      question_type: 'multiple_choice',
      answer: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      rationale: '',
      video_url: '',
      alternate_answers: [],
    });
    setImageFile(null);
    setImagePreview(null);
    setChoiceImageFiles({ A: null, B: null, C: null, D: null });
    setChoiceImagePreviews({ A: null, B: null, C: null, D: null });
    onOpenChange(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingOriginalFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropperSrc(reader.result as string);
        setCropperTarget('main');
        setCropperOpen(true);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleChoiceImageChange = (letter: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingOriginalFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropperSrc(reader.result as string);
        setCropperTarget(letter);
        setCropperOpen(true);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const removeChoiceImage = (letter: string) => {
    setChoiceImageFiles(prev => ({ ...prev, [letter]: null }));
    setChoiceImagePreviews(prev => ({ ...prev, [letter]: null }));
  };

  const handleCropComplete = (croppedFile: File) => {
    setPendingOriginalFile(null);
    if (cropperTarget === 'main') {
      setImageFile(croppedFile);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(croppedFile);
    } else {
      const letter = cropperTarget;
      setChoiceImageFiles(prev => ({ ...prev, [letter]: croppedFile }));
      const reader = new FileReader();
      reader.onloadend = () => setChoiceImagePreviews(prev => ({ ...prev, [letter]: reader.result as string }));
      reader.readAsDataURL(croppedFile);
    }
  };

  const handleCropperClose = (open: boolean) => {
    if (!open && pendingOriginalFile) {
      if (cropperTarget === 'main') {
        setImageFile(pendingOriginalFile);
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(pendingOriginalFile);
      } else {
        const letter = cropperTarget;
        setChoiceImageFiles(prev => ({ ...prev, [letter]: pendingOriginalFile }));
        const reader = new FileReader();
        reader.onloadend = () => setChoiceImagePreviews(prev => ({ ...prev, [letter]: reader.result as string }));
        reader.readAsDataURL(pendingOriginalFile);
      }
      setPendingOriginalFile(null);
    }
    setCropperOpen(open);
  };

  const watchedValues = form.watch();

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'Easy': return 'bg-green-500/20 text-green-700 border-green-500/30';
      case 'Medium': return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30';
      case 'Hard': return 'bg-red-500/20 text-red-700 border-red-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-[95vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {editingQuestion ? 'Edit CB Question' : 'Add CollegeBoard Question'}
            <Badge variant="secondary" className="bg-purple-500/20 text-purple-700">CollegeBoard</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Side - Form */}
          <ScrollArea className="flex-1 px-6 border-r">
            <Form {...form}>
              <form id="cb-question-form" onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4 py-4">
                {/* ID Row */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="question_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Question ID</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="CB0001" disabled={!!editingQuestion} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="original_cb_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Original CB ID (optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., PT1-M2-Q15" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Category & Subtopic */}
                <div className="grid grid-cols-2 gap-4">
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

                  <FormField
                    control={form.control}
                    name="subtopic"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subtopic (optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Linear equations in one variable" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Difficulty & Question Type */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="difficulty_level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Difficulty Level</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select difficulty" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Easy">Easy</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                            <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Image Upload */}
                <div className="border rounded-lg p-4">
                  <Label className="text-sm font-medium mb-2 block">
                    Question Image (for graphs, tables, figures)
                  </Label>
                  {imagePreview ? (
                    <div className="relative w-full">
                      <img 
                        src={imagePreview} 
                        alt="Question figure" 
                        className="rounded-lg border w-full max-h-48 object-contain bg-white"
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
                    <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        id="cb-image-upload"
                      />
                      <label htmlFor="cb-image-upload" className="cursor-pointer">
                        <div className="text-muted-foreground text-sm">
                          <p className="font-medium">Click to upload image</p>
                          <p className="text-xs">PNG, JPG - for graphs, tables, diagrams</p>
                        </div>
                      </label>
                    </div>
                  )}
                </div>

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
                          placeholder="Enter the question text..."
                          minHeight="100px"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Multiple Choice Options */}
                {questionType === 'multiple_choice' && (
                  <div className="grid grid-cols-2 gap-3">
                    {['option_a', 'option_b', 'option_c', 'option_d'].map((option, idx) => {
                      const letter = String.fromCharCode(65 + idx);
                      return (
                        <FormField
                          key={option}
                          control={form.control}
                          name={option as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center justify-between">
                                <span>Option {letter}</span>
                                {/* Choice image upload button */}
                                <label htmlFor={`cb-choice-img-${letter}`} className="cursor-pointer">
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                                    <ImagePlus className="h-3.5 w-3.5" />
                                    <span>{choiceImagePreviews[letter] ? 'Change' : 'Image'}</span>
                                  </div>
                                  <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleChoiceImageChange(letter, e)}
                                    className="hidden"
                                    id={`cb-choice-img-${letter}`}
                                  />
                                </label>
                              </FormLabel>
                              {choiceImagePreviews[letter] && (
                                <div className="relative mb-1">
                                  <img
                                    src={choiceImagePreviews[letter]!}
                                    alt={`Choice ${letter}`}
                                    className="rounded border w-full max-h-24 object-contain bg-white"
                                  />
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-1 right-1 h-6 w-6"
                                    onClick={() => removeChoiceImage(letter)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                              <FormControl>
                                <Input {...field} placeholder={`Option ${letter}`} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Answer */}
                <FormField
                  control={form.control}
                  name="answer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correct Answer</FormLabel>
                      <FormControl>
                        {questionType === 'multiple_choice' ? (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select correct answer" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="A">A</SelectItem>
                              <SelectItem value="B">B</SelectItem>
                              <SelectItem value="C">C</SelectItem>
                              <SelectItem value="D">D</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input {...field} placeholder="Enter the correct answer" />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Alternate Answers Section - only for fill_blank */}
                {questionType === 'fill_blank' && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-4 py-3 border-b flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium">Alternate Correct Answers</span>
                        <p className="text-xs text-muted-foreground">Add equivalent answers (e.g., 0.5 and 1/2)</p>
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => appendAlternate({ value: '' })}
                        disabled={alternateFields.length >= 4}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Alternate
                      </Button>
                    </div>

                    {alternateFields.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <p className="text-sm">No alternate answers added</p>
                        <p className="text-xs mt-1">Students can answer with any equivalent form</p>
                      </div>
                    ) : (
                      <div className="p-4 space-y-2">
                        {alternateFields.map((field, index) => (
                          <div key={field.id} className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                            <FormField
                              control={form.control}
                              name={`alternate_answers.${index}.value`}
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <FormControl>
                                    <Input {...field} placeholder="e.g., 1/2 or .5" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeAlternate(index)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Rationale */}
                <FormField
                  control={form.control}
                  name="rationale"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rationale / Explanation (optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Explain why the correct answer is correct..."
                          className="min-h-[80px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Video URL */}
                <FormField
                  control={form.control}
                  name="video_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>YouTube Video URL (optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://youtube.com/watch?v=..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Form Actions */}
                <div className="flex gap-2 pt-4 sticky bottom-0 bg-background py-4 border-t">
                  <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1"
                    disabled={saveMutation.isPending || isUploading}
                  >
                    {(saveMutation.isPending || isUploading) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingQuestion ? 'Update Question' : 'Save Question'}
                  </Button>
                </div>
              </form>
            </Form>
          </ScrollArea>

          {/* Right Side - Preview */}
          <ScrollArea className="flex-1 px-6 bg-muted/30">
            <div className="py-4">
              <h3 className="font-semibold mb-4">Live Preview</h3>
              
              <div className="bg-background rounded-lg border p-4 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono bg-purple-500/20 text-purple-700 px-2 py-0.5 rounded">
                      {watchedValues.question_id || 'CB0000'}
                    </span>
                    {watchedValues.difficulty_level && (
                      <Badge variant="outline" className={getDifficultyColor(watchedValues.difficulty_level)}>
                        {watchedValues.difficulty_level}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {categories?.find(c => c.id === watchedValues.category_id)?.name || 'Category'}
                  </span>
                </div>

                {watchedValues.subtopic && (
                  <p className="text-xs text-muted-foreground">
                    Subtopic: {watchedValues.subtopic}
                  </p>
                )}

                {/* Image Preview */}
                {imagePreview && (
                  <div className="border rounded-lg overflow-hidden bg-white">
                    <img 
                      src={imagePreview} 
                      alt="Question" 
                      className="w-full max-h-40 object-contain"
                    />
                  </div>
                )}

                {/* Question Text */}
                <div className="prose prose-sm max-w-none">
                  {watchedValues.question_text ? (
                    <MathText text={watchedValues.question_text} />
                  ) : (
                    <p className="text-muted-foreground italic">Question text will appear here...</p>
                  )}
                </div>

                {/* Options with choice images */}
                {questionType === 'multiple_choice' && (
                  <div className="space-y-2">
                    {['A', 'B', 'C', 'D'].map((letter) => {
                      const optionValue = watchedValues[`option_${letter.toLowerCase()}` as keyof typeof watchedValues] as string;
                      const isCorrect = watchedValues.answer === letter;
                      const choiceImg = choiceImagePreviews[letter];
                      return (
                        <div 
                          key={letter}
                          className={`p-2 rounded border text-sm ${
                            isCorrect 
                              ? 'bg-green-500/20 border-green-500/50 text-green-700' 
                              : 'bg-muted/50'
                          }`}
                        >
                          <span className="font-medium mr-2">{letter}.</span>
                          {choiceImg && (
                            <img src={choiceImg} alt={`Choice ${letter}`} className="rounded border max-h-20 object-contain bg-white my-1" />
                          )}
                          {optionValue || <span className="text-muted-foreground italic">Option {letter}</span>}
                          {isCorrect && <span className="ml-2 text-xs">(Correct)</span>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Rationale Preview */}
                {watchedValues.rationale && (
                  <div className="border-t pt-3 mt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Rationale:</p>
                    <p className="text-sm text-muted-foreground">{watchedValues.rationale}</p>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>

    <ImageCropper
      open={cropperOpen}
      onOpenChange={handleCropperClose}
      imageSrc={cropperSrc}
      onCropComplete={handleCropComplete}
      fileName={cropperTarget === 'main' ? 'cb-question-image.png' : `choice-${cropperTarget}.png`}
    />
    </>
  );
}
