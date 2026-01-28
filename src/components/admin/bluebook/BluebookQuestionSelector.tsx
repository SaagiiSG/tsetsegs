import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Minus,
  Loader2,
  GripVertical,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MathText } from "@/components/MathText";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  // Add questions mutation
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
            Select questions to add to this module. Currently has {module.questions.length} questions.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Current Questions */}
          <div className="flex flex-col min-h-0">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              Current Questions
              <Badge variant="secondary">{module.questions.length}</Badge>
            </h3>
            <ScrollArea className="flex-1 border rounded-lg p-2">
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

            <ScrollArea className="flex-1 border rounded-lg p-2">
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

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BluebookQuestionSelector;
