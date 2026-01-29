import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Loader2,
  GripVertical,
  Trash2,
  FileText,
  ImagePlus,
  X,
  Calculator,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MathText } from "@/components/MathText";
import { RichTextEditor } from "@/components/admin/questions/RichTextEditor";
import MathQuillEditor from "@/components/admin/questions/MathQuillEditor";

interface Module {
  id: string;
  section: "reading_writing" | "math";
  module_number: number;
  questions: ModuleQuestion[];
}

interface ModuleQuestion {
  id: string;
  question_id: string;
  order_index: number;
  question?: {
    id: string;
    question_id: string;
    question_text: string;
    subject: string;
  };
}

interface Question {
  id: string;
  question_id: string;
  question_text: string;
  subject: string | null;
  difficulty_level: string | null;
  category: { name: string } | null;
}

interface BluebookQuestionSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: Module;
  onQuestionsAdded: () => void;
}

const BluebookQuestionSelector = ({
  open,
  onOpenChange,
  module,
  onQuestionsAdded,
}: BluebookQuestionSelectorProps) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"existing" | "custom">("existing");

  // Custom question form state
  const [customQuestionText, setCustomQuestionText] = useState("");
  const [customAnswer, setCustomAnswer] = useState("");
  const [customPassage, setCustomPassage] = useState("");
  const [customOptions, setCustomOptions] = useState({ A: "", B: "", C: "", D: "" });
  const [customDifficulty, setCustomDifficulty] = useState<string>("medium");
  const [questionType, setQuestionType] = useState<"multiple_choice" | "fill_in">("multiple_choice");
  const [questionImage, setQuestionImage] = useState<File | null>(null);
  const [questionImagePreview, setQuestionImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  // Math-only mode uses Desmos-style MathQuill editor instead of rich text
  const [mathOnlyMode, setMathOnlyMode] = useState(false);

  // Get already-added question IDs
  const existingQuestionIds = new Set(
    module.questions.map((q) => q.question_id)
  );

  // Determine subject filter based on module section
  const subjectFilter = module.section === "reading_writing" ? "english" : "math";

  // Fetch available questions
  const { data: questions, isLoading } = useQuery({
    queryKey: ["available-questions", subjectFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("questions")
        .select(
          `
          id,
          question_id,
          question_text,
          subject,
          difficulty_level,
          category:question_categories(name)
        `
        )
        .eq("is_active", true)
        .ilike("subject", `%${subjectFilter}%`)
        .order("question_id");

      if (searchQuery) {
        query = query.or(
          `question_id.ilike.%${searchQuery}%,question_text.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as Question[];
    },
  });

  // Add existing questions mutation
  const addQuestionsMutation = useMutation({
    mutationFn: async (questionIds: string[]) => {
      const startIndex = module.questions.length;
      const questionsToAdd = questionIds.map((qId, idx) => ({
        module_id: module.id,
        question_id: qId,
        order_index: startIndex + idx,
      }));

      const { error } = await supabase
        .from("bluebook_module_questions")
        .insert(questionsToAdd);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Questions added");
      setSelectedIds(new Set());
      onQuestionsAdded();
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to add questions");
    },
  });

  // Create custom question mutation
  const createCustomQuestionMutation = useMutation({
    mutationFn: async () => {
      // Generate a unique question ID (BBK prefix for Bluebook custom)
      const { data: lastQuestion } = await supabase
        .from("questions")
        .select("question_id")
        .ilike("question_id", "BBK%")
        .order("question_id", { ascending: false })
        .limit(1)
        .maybeSingle();

      let nextNumber = 1;
      if (lastQuestion?.question_id) {
        const match = lastQuestion.question_id.match(/BBK(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
      const newQuestionId = `BBK${String(nextNumber).padStart(4, "0")}`;

      // Upload image if provided
      let questionImageUrl: string | null = null;
      if (questionImage) {
        const fileExt = questionImage.name.split('.').pop();
        const fileName = `${newQuestionId}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('question-images')
          .upload(fileName, questionImage);
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('question-images')
          .getPublicUrl(fileName);
        
        questionImageUrl = publicUrl;
      }

      // Build multiple choice options if applicable
      const mcOptions = questionType === "multiple_choice" 
        ? {
            A: customOptions.A,
            B: customOptions.B,
            C: customOptions.C,
            D: customOptions.D,
          }
        : null;

      // Insert new question
      const { data: newQuestion, error: questionError } = await supabase
        .from("questions")
        .insert({
          question_id: newQuestionId,
          question_text: customQuestionText,
          answer: customAnswer,
          passage_text: customPassage || null,
          multiple_choice_options: mcOptions,
          difficulty_level: customDifficulty,
          question_type: questionType,
          subject: subjectFilter,
          question_image_url: questionImageUrl,
          is_active: true,
          is_original: true,
        })
        .select()
        .single();

      if (questionError) throw questionError;

      // Add to module
      const { error: moduleError } = await supabase
        .from("bluebook_module_questions")
        .insert({
          module_id: module.id,
          question_id: newQuestion.id,
          order_index: module.questions.length,
        });

      if (moduleError) throw moduleError;

      return newQuestion;
    },
    onSuccess: () => {
      toast.success("Custom question created and added");
      resetCustomForm();
      queryClient.invalidateQueries({ queryKey: ["available-questions"] });
      onQuestionsAdded();
      setActiveTab("existing");
    },
    onError: (error) => {
      console.error("Error creating custom question:", error);
      toast.error("Failed to create custom question");
    },
  });

  // Remove question mutation
  const removeQuestionMutation = useMutation({
    mutationFn: async (moduleQuestionId: string) => {
      const { error } = await supabase
        .from("bluebook_module_questions")
        .delete()
        .eq("id", moduleQuestionId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Question removed");
      onQuestionsAdded();
    },
    onError: () => {
      toast.error("Failed to remove question");
    },
  });

  const resetCustomForm = () => {
    setCustomQuestionText("");
    setCustomAnswer("");
    setCustomPassage("");
    setCustomOptions({ A: "", B: "", C: "", D: "" });
    setCustomDifficulty("medium");
    setQuestionType("multiple_choice");
    setQuestionImage(null);
    setQuestionImagePreview(null);
    setMathOnlyMode(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setQuestionImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setQuestionImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setQuestionImage(null);
    setQuestionImagePreview(null);
  };

  const toggleQuestion = (questionId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId);
    } else {
      newSelected.add(questionId);
    }
    setSelectedIds(newSelected);
  };

  const handleAddSelected = () => {
    if (selectedIds.size === 0) return;
    addQuestionsMutation.mutate(Array.from(selectedIds));
  };

  const handleCreateCustom = () => {
    if (!customQuestionText.trim()) {
      toast.error("Please enter question text");
      return;
    }
    if (!customAnswer.trim()) {
      toast.error("Please enter the correct answer");
      return;
    }
    if (questionType === "multiple_choice") {
      const hasAllOptions = Object.values(customOptions).every(v => v.trim());
      if (!hasAllOptions) {
        toast.error("Please fill in all answer choices");
        return;
      }
    }
    createCustomQuestionMutation.mutate();
  };

  // Filter out already-added questions
  const availableQuestions = questions?.filter(
    (q) => !existingQuestionIds.has(q.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Manage Questions - {module.section === "reading_writing" ? "Reading & Writing" : "Math"} Module {module.module_number}
          </DialogTitle>
          <DialogDescription>
            Select existing questions or create custom ones. Currently has {module.questions.length} questions.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "existing" | "custom")} className="flex-1 min-h-0 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="existing" className="gap-2">
              <Search className="h-4 w-4" />
              Existing Questions
            </TabsTrigger>
            <TabsTrigger value="custom" className="gap-2">
              <FileText className="h-4 w-4" />
              Create Custom
            </TabsTrigger>
          </TabsList>

          {/* Existing Questions Tab */}
          <TabsContent value="existing" className="flex-1 min-h-0 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
              {/* Current Questions */}
              <div className="flex flex-col min-h-0">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  Current Questions
                  <Badge variant="secondary">{module.questions.length}</Badge>
                </h3>
                <ScrollArea className="flex-1 border rounded-lg p-2 max-h-[300px]">
                  {module.questions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No questions added yet
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {module.questions
                        .sort((a, b) => a.order_index - b.order_index)
                        .map((mq, idx) => (
                          <div
                            key={mq.id}
                            className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 group"
                          >
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                            <span className="text-sm font-mono text-muted-foreground w-6">
                              {idx + 1}.
                            </span>
                            <span className="text-sm font-mono font-medium">
                              #{mq.question?.question_id}
                            </span>
                            <div className="flex-1 text-sm text-muted-foreground truncate">
                              <MathText text={mq.question?.question_text?.slice(0, 60) + "..." || ""} />
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeQuestionMutation.mutate(mq.id)}
                              disabled={removeQuestionMutation.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        ))}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Available Questions */}
              <div className="flex flex-col min-h-0">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  Available Questions
                  <Badge variant="secondary">{availableQuestions?.length || 0}</Badge>
                </h3>
                
                {/* Search */}
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search questions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <ScrollArea className="flex-1 border rounded-lg p-2 max-h-[250px]">
                  {isLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : availableQuestions?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No questions available
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {availableQuestions?.map((q) => (
                        <div
                          key={q.id}
                          className={cn(
                            "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                            selectedIds.has(q.id)
                              ? "bg-primary/10 border border-primary/30"
                              : "bg-muted/50 hover:bg-muted"
                          )}
                          onClick={() => toggleQuestion(q.id)}
                        >
                          <Checkbox
                            checked={selectedIds.has(q.id)}
                            onCheckedChange={() => toggleQuestion(q.id)}
                          />
                          <span className="text-sm font-mono font-medium shrink-0">
                            #{q.question_id}
                          </span>
                          <div className="flex-1 text-sm text-muted-foreground truncate">
                            <MathText text={q.question_text?.slice(0, 80) + "..." || ""} />
                          </div>
                          {q.category?.name && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              {q.category.name}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </TabsContent>

          {/* Custom Question Tab */}
          <TabsContent value="custom" className="flex-1 min-h-0 mt-0">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {/* Passage (optional) */}
                <div className="space-y-2">
                  <Label htmlFor="passage">Passage (optional)</Label>
                  <Textarea
                    id="passage"
                    placeholder="Enter passage text if this is a reading-based question..."
                    value={customPassage}
                    onChange={(e) => setCustomPassage(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Question Image Upload */}
                <div className="space-y-2">
                  <Label>Question Image (optional)</Label>
                  <p className="text-xs text-muted-foreground">
                    Upload graphs, diagrams, or visual content for the question
                  </p>
                  {questionImagePreview ? (
                    <div className="relative inline-block">
                      <img
                        src={questionImagePreview}
                        alt="Question preview"
                        className="max-w-full max-h-48 rounded-lg border object-contain"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={removeImage}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <ImagePlus className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload image
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG up to 5MB
                        </p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageSelect}
                      />
                    </label>
                  )}
                </div>

                {/* Question Text */}
                <div className="space-y-2">
                  <Label>Question Text *</Label>
                  <RichTextEditor
                    value={customQuestionText}
                    onChange={setCustomQuestionText}
                    placeholder="Enter the question text..."
                    minHeight="100px"
                  />
                </div>

                {/* Question Type & Difficulty */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Question Type</Label>
                    <Select value={questionType} onValueChange={(v) => setQuestionType(v as "multiple_choice" | "fill_in")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                        <SelectItem value="fill_in">Fill in the Blank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Difficulty</Label>
                    <Select value={customDifficulty} onValueChange={setCustomDifficulty}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Multiple Choice Options */}
                {questionType === "multiple_choice" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Answer Choices *</Label>
                      <div className="flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor="math-mode" className="text-sm font-normal text-muted-foreground">
                          Desmos-style math editor
                        </Label>
                        <Switch
                          id="math-mode"
                          checked={mathOnlyMode}
                          onCheckedChange={setMathOnlyMode}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {mathOnlyMode 
                        ? "Type naturally: / for fractions, sqrt for √, ^ for exponents, pi for π"
                        : "Use the rich text editor with optional math. Toggle above for Desmos-style input."}
                    </p>
                    <div className="space-y-4">
                      {(["A", "B", "C", "D"] as const).map((letter) => (
                        <div key={letter} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="shrink-0">{letter}</Badge>
                            <span className="text-sm text-muted-foreground">Option {letter}</span>
                          </div>
                          {mathOnlyMode ? (
                            <MathQuillEditor
                              value={customOptions[letter].replace(/^\$|\$$/g, '')}
                              onChange={(latex) =>
                                setCustomOptions((prev) => ({
                                  ...prev,
                                  [letter]: latex ? `$${latex}$` : '',
                                }))
                              }
                              placeholder={`Type math for option ${letter}...`}
                              minHeight="48px"
                            />
                          ) : (
                            <RichTextEditor
                              value={customOptions[letter]}
                              onChange={(value) =>
                                setCustomOptions((prev) => ({
                                  ...prev,
                                  [letter]: value,
                                }))
                              }
                              placeholder={`Enter option ${letter}...`}
                              minHeight="60px"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Correct Answer */}
                <div className="space-y-2">
                  <Label htmlFor="answer">Correct Answer *</Label>
                  {questionType === "multiple_choice" ? (
                    <Select value={customAnswer} onValueChange={setCustomAnswer}>
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
                    <Input
                      id="answer"
                      placeholder="Enter the correct answer"
                      value={customAnswer}
                      onChange={(e) => setCustomAnswer(e.target.value)}
                    />
                  )}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {activeTab === "existing" ? (
            <Button
              onClick={handleAddSelected}
              disabled={selectedIds.size === 0 || addQuestionsMutation.isPending}
              className="gap-2"
            >
              {addQuestionsMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add {selectedIds.size} Question{selectedIds.size !== 1 ? "s" : ""}
            </Button>
          ) : (
            <Button
              onClick={handleCreateCustom}
              disabled={createCustomQuestionMutation.isPending}
              className="gap-2"
            >
              {createCustomQuestionMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create & Add Question
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BluebookQuestionSelector;
