import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Loader2, ImagePlus, X, Calculator, Eye, EyeOff } from "lucide-react";
import { RichTextEditor } from "@/components/admin/questions/RichTextEditor";
import MathQuillEditor from "@/components/admin/questions/MathQuillEditor";
import { MathText } from "@/components/MathText";

interface CustomQuestionFormProps {
  moduleId: string;
  section: "reading_writing" | "math";
  currentCount: number;
  onAdded: () => void;
}

const CustomQuestionForm = ({
  moduleId,
  section,
  currentCount,
  onAdded,
}: CustomQuestionFormProps) => {
  const queryClient = useQueryClient();
  const subjectFilter = section === "reading_writing" ? "english" : "math";

  const [questionText, setQuestionText] = useState("");
  const [answer, setAnswer] = useState("");
  const [passage, setPassage] = useState("");
  const [options, setOptions] = useState({ A: "", B: "", C: "", D: "" });
  const [questionType, setQuestionType] = useState<"multiple_choice" | "fill_in">(
    "multiple_choice"
  );
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mathOnlyMode, setMathOnlyMode] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  // Track the last focused text field so PDF text insertions target it
  const lastFocusedRef = useRef<"passage" | "question" | "answer" | "option-A" | "option-B" | "option-C" | "option-D">("passage");

  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      if (!text) return;
      const target = lastFocusedRef.current;
      if (target === "passage") setPassage((p) => (p ? p + " " + text : text));
      else if (target === "question") setQuestionText((p) => (p ? p + " " + text : text));
      else if (target === "answer") setAnswer((p) => (p ? p + " " + text : text));
      else if (target.startsWith("option-")) {
        const key = target.split("-")[1] as "A" | "B" | "C" | "D";
        setOptions((prev) => ({ ...prev, [key]: prev[key] ? prev[key] + " " + text : text }));
      }
    };
    window.addEventListener("reference-pdf:insert-text", handler);
    return () => window.removeEventListener("reference-pdf:insert-text", handler);
  }, []);

  const reset = () => {
    setQuestionText("");
    setAnswer("");
    setPassage("");
    setOptions({ A: "", B: "", C: "", D: "" });
    setQuestionType("multiple_choice");
    setImage(null);
    setImagePreview(null);
    setMathOnlyMode(false);
  };

  const ingestImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are supported");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }
    setImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) ingestImageFile(file);
  };

  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) ingestImageFile(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          ingestImageFile(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      // Generate BBK-prefixed ID
      const { data: last } = await supabase
        .from("questions")
        .select("question_id")
        .ilike("question_id", "BBK%")
        .order("question_id", { ascending: false })
        .limit(1)
        .maybeSingle();

      let next = 1;
      if (last?.question_id) {
        const m = last.question_id.match(/BBK(\d+)/);
        if (m) next = parseInt(m[1], 10) + 1;
      }
      const newQid = `BBK${String(next).padStart(4, "0")}`;

      let imageUrl: string | null = null;
      if (image) {
        const ext = image.name.split(".").pop();
        const fileName = `${newQid}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("question-images")
          .upload(fileName, image);
        if (upErr) throw upErr;
        const {
          data: { publicUrl },
        } = supabase.storage.from("question-images").getPublicUrl(fileName);
        imageUrl = publicUrl;
      }

      const mcOptions =
        questionType === "multiple_choice"
          ? { A: options.A, B: options.B, C: options.C, D: options.D }
          : null;

      const dbType = questionType === "fill_in" ? "fill_blank" : "multiple_choice";

      const { data: newQ, error: qErr } = await supabase
        .from("questions")
        .insert({
          question_id: newQid,
          question_text: questionText,
          answer: answer.trim(),
          passage_text: passage || null,
          multiple_choice_options: mcOptions,
          difficulty_level: "medium",
          question_type: dbType,
          subject: subjectFilter,
          question_image_url: imageUrl,
          is_active: true,
          is_original: true,
        })
        .select()
        .single();
      if (qErr) throw qErr;

      const { error: mErr } = await supabase
        .from("bluebook_module_questions")
        .insert({
          module_id: moduleId,
          question_id: newQ.id,
          order_index: currentCount,
        });
      if (mErr) throw mErr;

      return newQ;
    },
    onSuccess: () => {
      toast.success("Question created and added");
      reset();
      queryClient.invalidateQueries({ queryKey: ["bluebook-module-questions", moduleId] });
      queryClient.invalidateQueries({ queryKey: ["bluebook-question-pool"] });
      onAdded();
    },
    onError: (e: any) => {
      console.error(e);
      toast.error(e?.message || "Failed to create custom question");
    },
  });

  const handleSubmit = () => {
    if (!questionText.trim()) {
      toast.error("Please enter question text");
      return;
    }
    if (!answer.trim()) {
      toast.error("Please enter the correct answer");
      return;
    }
    if (questionType === "multiple_choice") {
      const allFilled = Object.values(options).every((v) => v.trim());
      if (!allFilled) {
        toast.error("Please fill in all answer choices");
        return;
      }
    }
    createMutation.mutate();
  };

  return (
    <div className="space-y-3">
      {/* Live preview */}
      <div className="rounded-lg border bg-gradient-to-br from-primary/5 to-accent/5">
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="flex items-center gap-1.5">
            {showPreview ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            Live preview
          </span>
          <span className="text-[10px] uppercase tracking-wider">
            {showPreview ? "Hide" : "Show"}
          </span>
        </button>
        {showPreview && (
          <div className="px-4 pb-4 pt-1 space-y-3">
            {!questionText && !passage && !imagePreview ? (
              <p className="text-xs text-muted-foreground italic text-center py-6">
                Start typing below to see a live preview of your question.
              </p>
            ) : (
              <>
                {passage && (
                  <div className="text-sm bg-background/60 rounded-md p-3 border-l-2 border-primary/40">
                    <MathText text={passage} />
                  </div>
                )}
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Question"
                    className="max-h-40 rounded-md border object-contain mx-auto"
                  />
                )}
                {questionText && (
                  <div className="text-sm font-medium">
                    <MathText text={questionText.replace(/<[^>]+>/g, " ")} />
                  </div>
                )}
                {questionType === "multiple_choice" ? (
                  <div className="grid gap-1.5">
                    {(["A", "B", "C", "D"] as const).map((letter) => {
                      const isCorrect = answer === letter;
                      const val = options[letter];
                      return (
                        <div
                          key={letter}
                          className={`flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-xs ${
                            isCorrect
                              ? "border-emerald-500/50 bg-emerald-500/10"
                              : "border-border bg-background/40"
                          }`}
                        >
                          <Badge
                            variant={isCorrect ? "default" : "outline"}
                            className={`shrink-0 h-5 w-5 p-0 flex items-center justify-center text-[10px] ${
                              isCorrect ? "bg-emerald-600 hover:bg-emerald-600" : ""
                            }`}
                          >
                            {letter}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            {val ? (
                              <MathText text={val.replace(/<[^>]+>/g, " ")} />
                            ) : (
                              <span className="text-muted-foreground italic">empty</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs">
                    <span className="text-muted-foreground">Answer: </span>
                    {answer ? (
                      <span className="font-mono font-semibold text-emerald-600">
                        <MathText text={answer} />
                      </span>
                    ) : (
                      <span className="italic text-muted-foreground">not set</span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Passage */}
      <div className="space-y-2">
        <Label htmlFor="passage">Passage (optional)</Label>
        <Textarea
          id="passage"
          placeholder="Enter passage text if this is a reading-based question..."
          value={passage}
          onChange={(e) => setPassage(e.target.value)}
          onFocus={() => (lastFocusedRef.current = "passage")}
          rows={3}
        />
      </div>

      {/* Image */}
      <div className="space-y-2">
        <Label>Question Image (optional)</Label>
        {imagePreview ? (
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt="Question preview"
              className="max-w-full max-h-48 rounded-lg border object-contain"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6"
              onClick={() => {
                setImage(null);
                setImagePreview(null);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <label
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(false);
            }}
            onPaste={handlePaste}
            tabIndex={0}
            className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer transition-colors outline-none ${
              isDragging
                ? "border-primary bg-primary/10"
                : "hover:bg-muted/50 focus:bg-muted/50"
            }`}
          >
            <ImagePlus className="h-6 w-6 text-muted-foreground mb-1" />
            <p className="text-xs text-muted-foreground">
              {isDragging
                ? "Drop image here"
                : "Click, drag & drop, or paste screenshot (PNG/JPG, ≤5MB)"}
            </p>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleImageSelect}
            />
          </label>
        )}
      </div>

      {/* Question text */}
      <div
        className="space-y-2"
        onFocusCapture={() => (lastFocusedRef.current = "question")}
      >
        <Label>Question Text *</Label>
        <RichTextEditor
          value={questionText}
          onChange={setQuestionText}
          placeholder="Enter the question text..."
          minHeight="100px"
        />
      </div>

      {/* Question type */}
      <div className="space-y-2">
        <Label>Question Type</Label>
        <Select
          value={questionType}
          onValueChange={(v) => setQuestionType(v as "multiple_choice" | "fill_in")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
            <SelectItem value="fill_in">Fill in the Blank</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Options */}
      {questionType === "multiple_choice" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Answer Choices *</Label>
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="math-mode" className="text-xs font-normal text-muted-foreground">
                Desmos math
              </Label>
              <Switch
                id="math-mode"
                checked={mathOnlyMode}
                onCheckedChange={setMathOnlyMode}
              />
            </div>
          </div>
          <div className="space-y-3">
            {(["A", "B", "C", "D"] as const).map((letter) => (
              <div key={letter} className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="shrink-0">{letter}</Badge>
                </div>
                {mathOnlyMode ? (
                  <MathQuillEditor
                    value={options[letter].replace(/^\$|\$$/g, "")}
                    onChange={(latex) =>
                      setOptions((p) => ({ ...p, [letter]: latex ? `$${latex}$` : "" }))
                    }
                    placeholder={`Math for ${letter}...`}
                    minHeight="48px"
                  />
                ) : (
                  <RichTextEditor
                    value={options[letter]}
                    onChange={(v) => setOptions((p) => ({ ...p, [letter]: v }))}
                    placeholder={`Enter option ${letter}...`}
                    minHeight="56px"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Answer */}
      <div className="space-y-2">
        <Label htmlFor="answer">Correct Answer *</Label>
        {questionType === "multiple_choice" ? (
          <Select value={answer} onValueChange={setAnswer}>
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
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onFocus={() => (lastFocusedRef.current = "answer")}
          />
        )}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={createMutation.isPending}
        className="w-full gap-2"
      >
        {createMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        Create & Add to Module
      </Button>
    </div>
  );
};

export default CustomQuestionForm;
