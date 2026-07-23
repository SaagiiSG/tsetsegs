import { useState } from "react";
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
import { Plus, Loader2, ImagePlus, X, Calculator } from "lucide-react";
import { RichTextEditor } from "@/components/admin/questions/RichTextEditor";
import MathQuillEditor from "@/components/admin/questions/MathQuillEditor";

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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }
    setImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
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
    <div className="space-y-4">
      {/* Passage */}
      <div className="space-y-2">
        <Label htmlFor="passage">Passage (optional)</Label>
        <Textarea
          id="passage"
          placeholder="Enter passage text if this is a reading-based question..."
          value={passage}
          onChange={(e) => setPassage(e.target.value)}
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
          <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
            <ImagePlus className="h-6 w-6 text-muted-foreground mb-1" />
            <p className="text-xs text-muted-foreground">Click to upload (PNG/JPG, ≤5MB)</p>
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
      <div className="space-y-2">
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
