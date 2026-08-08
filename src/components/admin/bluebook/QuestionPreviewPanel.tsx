import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MathText } from "@/components/MathText";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface QuestionPreviewPanelProps {
  questionId: string;
  onClose: () => void;
}

export default function QuestionPreviewPanel({ questionId, onClose }: QuestionPreviewPanelProps) {
  const { data: question, isLoading } = useQuery({
    queryKey: ["bluebook-question-preview", questionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("id", questionId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!questionId,
  });

  const options: string[] = Array.isArray(question?.multiple_choice_options)
    ? (question!.multiple_choice_options as string[])
    : [];
  const choiceImages: Record<string, string> =
    question?.choice_images && typeof question.choice_images === "object"
      ? (question.choice_images as Record<string, string>)
      : {};
  const letters = ["A", "B", "C", "D", "E"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 sticky top-0 bg-card z-10 pb-2 border-b">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-sm">#{question?.question_id ?? "…"}</span>
          {question?.difficulty_level && (
            <Badge variant="secondary" className="capitalize">
              {question.difficulty_level}
            </Badge>
          )}
          {question?.question_set && (
            <Badge variant="outline" className="truncate max-w-[180px]">
              {question.question_set}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" className="gap-1" onClick={onClose}>
          <X className="h-4 w-4" /> Close preview
        </Button>
      </div>

      {isLoading || !question ? (
        <div className="space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          {question.passage && (
            <div className="p-3 rounded-lg bg-muted/40 text-sm leading-relaxed">
              <MathText text={question.passage} />
            </div>
          )}

          <div className="text-base leading-relaxed">
            <MathText text={question.question_text ?? ""} />
          </div>

          <QuestionFigures
            url1={question.question_image_url}
            url2={question.question_image_url_2}
            className="justify-start"
            imgClassName="max-h-72 rounded-lg border object-contain"
            alt={`Question ${question.question_id} figure`}
          />


          {options.length > 0 ? (
            <div className="space-y-2">
              {options.map((opt, i) => {
                const letter = letters[i] ?? String(i + 1);
                const isCorrect =
                  question.answer &&
                  (question.answer === letter ||
                    question.answer === opt ||
                    question.answer?.toString().trim().toUpperCase() === letter);
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border text-sm",
                      isCorrect ? "border-primary bg-primary/5" : "border-border"
                    )}
                  >
                    <span className="font-mono font-semibold">{letter}.</span>
                    <div className="flex-1 space-y-2">
                      <MathText text={opt} />
                      {choiceImages[letter] && (
                        <img
                          src={choiceImages[letter]}
                          alt={`Choice ${letter}`}
                          className="max-h-40 rounded border object-contain"
                          loading="lazy"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm">
              <span className="text-muted-foreground">Answer: </span>
              <span className="font-mono font-semibold">{question.answer ?? "—"}</span>
            </div>
          )}

          {question.explanation && (
            <div className="p-3 rounded-lg bg-muted/30 text-sm">
              <p className="font-medium mb-1">Explanation</p>
              <MathText text={question.explanation} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
