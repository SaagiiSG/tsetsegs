import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Plus, Loader2, ImagePlus, X, Calculator, Eye, EyeOff, Save, Pencil, Trash2 } from "lucide-react";
import { RichTextEditor } from "@/components/admin/questions/RichTextEditor";
import MathQuillEditor from "@/components/admin/questions/MathQuillEditor";
import { MathText } from "@/components/MathText";

interface CustomQuestionFormProps {
  moduleId: string;
  section: "reading_writing" | "math";
  currentCount: number;
  onAdded: () => void;
  /** When set, the form edits this existing question instead of creating a new one */
  editQuestionId?: string | null;
  onCancelEdit?: () => void;
}

const CustomQuestionForm = ({
  moduleId,
  section,
  currentCount,
  onAdded,
  editQuestionId,
  onCancelEdit,
}: CustomQuestionFormProps) => {
  const queryClient = useQueryClient();
  const subjectFilter = section === "reading_writing" ? "english" : "math";
  const isEditing = !!editQuestionId;


  const [questionText, setQuestionText] = useState("");
  const [answer, setAnswer] = useState("");
  const [alternateAnswers, setAlternateAnswers] = useState<string[]>([]);
  const [passage, setPassage] = useState("");
  const [options, setOptions] = useState({ A: "", B: "", C: "", D: "" });
  const [questionType, setQuestionType] = useState<"multiple_choice" | "fill_in">(
    "multiple_choice"
  );
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [image2, setImage2] = useState<File | null>(null);
  const [imagePreview2, setImagePreview2] = useState<string | null>(null);

  type Letter = "A" | "B" | "C" | "D";
  const [choiceImages, setChoiceImages] = useState<Record<Letter, File | null>>({
    A: null, B: null, C: null, D: null,
  });
  const [choiceImagePreviews, setChoiceImagePreviews] = useState<Record<Letter, string | null>>({
    A: null, B: null, C: null, D: null,
  });
  const [draggingChoice, setDraggingChoice] = useState<Letter | null>(null);
  const [mathOnlyMode, setMathOnlyMode] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  // URLs of already-stored images (kept unless the admin clears them)
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [existingImageUrl2, setExistingImageUrl2] = useState<string | null>(null);

  const [existingChoiceImageUrls, setExistingChoiceImageUrls] = useState<Record<Letter, string | null>>({
    A: null, B: null, C: null, D: null,
  });
  const [editMeta, setEditMeta] = useState<{ question_id: string } | null>(null);

  // Load the question being edited
  const { data: editingQuestion, isLoading: editLoading } = useQuery({
    queryKey: ["bluebook-edit-question", editQuestionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("id", editQuestionId!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!editQuestionId,
  });


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
    setAlternateAnswers([]);
    setPassage("");
    setOptions({ A: "", B: "", C: "", D: "" });
    setQuestionType("multiple_choice");
    setImage(null);
    setImagePreview(null);
    setImage2(null);
    setImagePreview2(null);
    setExistingImageUrl2(null);

    setChoiceImages({ A: null, B: null, C: null, D: null });
    setChoiceImagePreviews({ A: null, B: null, C: null, D: null });
    setExistingImageUrl(null);
    setExistingChoiceImageUrls({ A: null, B: null, C: null, D: null });
    setEditMeta(null);
    setMathOnlyMode(false);
  };

  // Hydrate the form when an existing question is selected for editing
  useEffect(() => {
    if (!editQuestionId) {
      reset();
      return;
    }
    if (!editingQuestion) return;
    const q = editingQuestion;
    setEditMeta({ question_id: q.question_id });
    setQuestionText(q.question_text ?? "");
    setPassage(q.passage_text ?? "");
    setAnswer(q.answer ?? "");
    setAlternateAnswers(
      Array.isArray(q.alternate_answers)
        ? (q.alternate_answers as any[]).map((a) => String(a))
        : []
    );
    const isFill = q.question_type === "fill_blank" || q.question_type === "fill_in";
    setQuestionType(isFill ? "fill_in" : "multiple_choice");

    const raw = q.multiple_choice_options;
    const next: Record<Letter, string> = { A: "", B: "", C: "", D: "" };
    if (Array.isArray(raw)) {
      raw.forEach((v: any, i: number) => {
        const letter = String.fromCharCode(65 + i) as Letter;
        if (next[letter] !== undefined)
          next[letter] = typeof v === "string" ? v : v?.text ?? v?.value ?? "";
      });
    } else if (raw && typeof raw === "object") {
      Object.entries(raw).forEach(([k, v]: any) => {
        const letter = k.toUpperCase() as Letter;
        if (next[letter] !== undefined)
          next[letter] = typeof v === "string" ? v : v?.text ?? v?.value ?? "";
      });
    }
    setOptions(next);

    setImage(null);
    setExistingImageUrl(q.question_image_url ?? null);
    setImagePreview(q.question_image_url ?? null);
    setImage2(null);
    setExistingImageUrl2(q.question_image_url_2 ?? null);
    setImagePreview2(q.question_image_url_2 ?? null);


    const ci = (q.choice_images ?? {}) as Record<string, string>;
    const nextCi: Record<Letter, string | null> = { A: null, B: null, C: null, D: null };
    Object.entries(ci).forEach(([k, v]) => {
      const letter = k.toUpperCase() as Letter;
      if (nextCi[letter] !== undefined) nextCi[letter] = v as string;
    });
    setExistingChoiceImageUrls(nextCi);
    setChoiceImagePreviews(nextCi);
    setChoiceImages({ A: null, B: null, C: null, D: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editQuestionId, editingQuestion]);


  const validateImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are supported");
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return false;
    }
    return true;
  };

  const ingestImageFile = (file: File) => {
    if (!validateImageFile(file)) return;
    setImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const ingestImageFile2 = (file: File) => {
    if (!validateImageFile(file)) return;
    setImage2(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview2(reader.result as string);
    reader.readAsDataURL(file);
  };


  const ingestChoiceImage = (letter: Letter, file: File) => {
    if (!validateImageFile(file)) return;
    setChoiceImages((p) => ({ ...p, [letter]: file }));
    const reader = new FileReader();
    reader.onloadend = () =>
      setChoiceImagePreviews((p) => ({ ...p, [letter]: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const clearChoiceImage = (letter: Letter) => {
    setChoiceImages((p) => ({ ...p, [letter]: null }));
    setChoiceImagePreviews((p) => ({ ...p, [letter]: null }));
    setExistingChoiceImageUrls((p) => ({ ...p, [letter]: null }));
  };


  const handleChoiceDrop = (letter: Letter) => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingChoice(null);
    const file = e.dataTransfer.files?.[0];
    if (file) ingestChoiceImage(letter, file);
  };

  const handleChoicePaste = (letter: Letter) => (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          ingestChoiceImage(letter, file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) ingestImageFile(file);
  };

  const handleImageSelect2 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) ingestImageFile2(file);
  };

  const [isDragging, setIsDragging] = useState(false);
  const [isDragging2, setIsDragging2] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) ingestImageFile(file);
  };

  const handleDrop2 = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging2(false);
    const file = e.dataTransfer.files?.[0];
    if (file) ingestImageFile2(file);
  };

  const pasteHandler = (ingest: (f: File) => void) => (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          ingest(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const handlePaste = pasteHandler(ingestImageFile);
  const handlePaste2 = pasteHandler(ingestImageFile2);


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

      let imageUrl2: string | null = null;
      if (image2) {
        const ext = image2.name.split(".").pop();
        const fileName = `${newQid}-fig2-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("question-images")
          .upload(fileName, image2);
        if (upErr) throw upErr;
        imageUrl2 = supabase.storage.from("question-images").getPublicUrl(fileName).data.publicUrl;
      }


      // Upload per-choice figures
      const choiceImageUrls: Record<string, string> = {};
      if (questionType === "multiple_choice") {
        for (const letter of ["A", "B", "C", "D"] as Letter[]) {
          const f = choiceImages[letter];
          if (!f) continue;
          const ext = f.name.split(".").pop();
          const fileName = `${newQid}-choice-${letter}-${Date.now()}.${ext}`;
          const { error: cErr } = await supabase.storage
            .from("question-images")
            .upload(fileName, f);
          if (cErr) throw cErr;
          const {
            data: { publicUrl },
          } = supabase.storage.from("question-images").getPublicUrl(fileName);
          choiceImageUrls[letter] = publicUrl;
        }
      }

      const mcOptions =
        questionType === "multiple_choice"
          ? { A: options.A, B: options.B, C: options.C, D: options.D }
          : null;

      const dbType = questionType === "fill_in" ? "fill_blank" : "multiple_choice";

      const cleanedAlternates =
        questionType === "fill_in"
          ? alternateAnswers.map((a) => a.trim()).filter(Boolean)
          : [];

      const { data: newQ, error: qErr } = await supabase
        .from("questions")
        .insert({
          question_id: newQid,
          question_text: questionText,
          answer: answer.trim(),
          alternate_answers: cleanedAlternates.length ? cleanedAlternates : null,
          passage_text: passage || null,
          multiple_choice_options: mcOptions,
          choice_images: Object.keys(choiceImageUrls).length ? choiceImageUrls : null,
          difficulty_level: "medium",
          question_type: dbType,
          subject: subjectFilter,
          question_image_url: imageUrl,
          question_image_url_2: imageUrl2,

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

  const updateMutation = useMutation({
    mutationFn: async () => {
      const qid = editMeta?.question_id ?? "Q";

      let imageUrl: string | null = existingImageUrl;
      if (image) {
        const ext = image.name.split(".").pop();
        const fileName = `${qid}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("question-images")
          .upload(fileName, image);
        if (upErr) throw upErr;
        imageUrl = supabase.storage.from("question-images").getPublicUrl(fileName).data.publicUrl;
      }

      let imageUrl2: string | null = existingImageUrl2;
      if (image2) {
        const ext = image2.name.split(".").pop();
        const fileName = `${qid}-fig2-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("question-images")
          .upload(fileName, image2);
        if (upErr) throw upErr;
        imageUrl2 = supabase.storage.from("question-images").getPublicUrl(fileName).data.publicUrl;
      }


      const choiceImageUrls: Record<string, string> = {};
      if (questionType === "multiple_choice") {
        for (const letter of ["A", "B", "C", "D"] as Letter[]) {
          const f = choiceImages[letter];
          if (f) {
            const ext = f.name.split(".").pop();
            const fileName = `${qid}-choice-${letter}-${Date.now()}.${ext}`;
            const { error: cErr } = await supabase.storage
              .from("question-images")
              .upload(fileName, f);
            if (cErr) throw cErr;
            choiceImageUrls[letter] = supabase.storage
              .from("question-images")
              .getPublicUrl(fileName).data.publicUrl;
          } else if (existingChoiceImageUrls[letter]) {
            choiceImageUrls[letter] = existingChoiceImageUrls[letter]!;
          }
        }
      }

      const mcOptions =
        questionType === "multiple_choice"
          ? { A: options.A, B: options.B, C: options.C, D: options.D }
          : null;

      const cleanedAlternates =
        questionType === "fill_in"
          ? alternateAnswers.map((a) => a.trim()).filter(Boolean)
          : [];

      const { error } = await supabase
        .from("questions")
        .update({
          question_text: questionText,
          answer: answer.trim(),
          alternate_answers: cleanedAlternates.length ? cleanedAlternates : null,
          passage_text: passage || null,
          multiple_choice_options: mcOptions,
          choice_images: Object.keys(choiceImageUrls).length ? choiceImageUrls : null,
          question_type: questionType === "fill_in" ? "fill_blank" : "multiple_choice",
          question_image_url: imageUrl,
          question_image_url_2: imageUrl2,

        })
        .eq("id", editQuestionId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Question updated");
      queryClient.invalidateQueries({ queryKey: ["bluebook-module-questions", moduleId] });
      queryClient.invalidateQueries({ queryKey: ["bluebook-question-pool"] });
      queryClient.invalidateQueries({ queryKey: ["bluebook-edit-question", editQuestionId] });
    },
    onError: (e: any) => {
      console.error(e);
      toast.error(e?.message || "Failed to update question");
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
      const allFilled = (["A", "B", "C", "D"] as Letter[]).every(
        (l) => options[l].trim() || choiceImages[l] || existingChoiceImageUrls[l]
      );
      if (!allFilled) {
        toast.error("Each answer choice needs text or an image");
        return;
      }
    }
    if (isEditing) updateMutation.mutate();
    else createMutation.mutate();
  };

  if (isEditing && editLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading question…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {isEditing && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2">
          <div className="flex items-center gap-2 text-sm">
            <Pencil className="h-4 w-4 text-primary" />
            <span className="font-medium">Editing</span>
            <Badge variant="outline" className="font-mono text-[11px]">
              #{editMeta?.question_id ?? "…"}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onCancelEdit?.()}>
            Done
          </Button>
        </div>
      )}

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
            {!questionText && !passage && !imagePreview && !imagePreview2 ? (

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
                          <div className="flex-1 min-w-0 space-y-1.5">
                            {val ? (
                              <MathText text={val.replace(/<[^>]+>/g, " ")} />
                            ) : !choiceImagePreviews[letter] ? (
                              <span className="text-muted-foreground italic">empty</span>
                            ) : null}
                            {choiceImagePreviews[letter] && (
                              <img
                                src={choiceImagePreviews[letter]!}
                                alt={`Choice ${letter}`}
                                className="max-h-28 rounded border object-contain"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-1">
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
                    {alternateAnswers.filter((a) => a.trim()).length > 0 && (
                      <div className="text-xs flex flex-wrap items-center gap-1">
                        <span className="text-muted-foreground">Also accepted: </span>
                        {alternateAnswers
                          .filter((a) => a.trim())
                          .map((a, i) => (
                            <Badge key={i} variant="outline" className="font-mono text-[10px]">
                              <MathText text={a} />
                            </Badge>
                          ))}
                      </div>
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

      {/* Figures */}
      <div className="space-y-2">
        <Label>Figures (optional) — add a second figure to show side by side</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          {([
            {
              key: "1" as const,
              label: "Figure 1",
              preview: imagePreview,
              dragging: isDragging,
              setDragging: setIsDragging,
              onDrop: handleDrop,
              onPaste: handlePaste,
              onSelect: handleImageSelect,
              clear: () => {
                setImage(null);
                setImagePreview(null);
                setExistingImageUrl(null);
              },
            },
            {
              key: "2" as const,
              label: "Figure 2",
              preview: imagePreview2,
              dragging: isDragging2,
              setDragging: setIsDragging2,
              onDrop: handleDrop2,
              onPaste: handlePaste2,
              onSelect: handleImageSelect2,
              clear: () => {
                setImage2(null);
                setImagePreview2(null);
                setExistingImageUrl2(null);
              },
            },
          ]).map((slot) => (
            <div key={slot.key} className="space-y-1.5">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {slot.label}
              </div>
              {slot.preview ? (
                <div className="relative inline-block">
                  <img
                    src={slot.preview}
                    alt={`${slot.label} preview`}
                    className="max-w-full max-h-48 rounded-lg border object-contain"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={slot.clear}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <label
                  onDrop={slot.onDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    slot.setDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    slot.setDragging(false);
                  }}
                  onPaste={slot.onPaste}
                  tabIndex={0}
                  className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer transition-colors outline-none ${
                    slot.dragging
                      ? "border-primary bg-primary/10"
                      : "hover:bg-muted/50 focus:bg-muted/50"
                  }`}
                >
                  <ImagePlus className="h-6 w-6 text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground text-center px-2">
                    {slot.dragging
                      ? "Drop image here"
                      : "Click, drag & drop, or paste (PNG/JPG, ≤5MB)"}
                  </p>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={slot.onSelect}
                  />
                </label>
              )}
            </div>
          ))}
        </div>
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
              <div
                key={letter}
                className="space-y-1"
                onFocusCapture={() => (lastFocusedRef.current = `option-${letter}` as any)}
              >
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

                {/* Per-choice figure */}
                {choiceImagePreviews[letter] ? (
                  <div className="relative inline-block">
                    <img
                      src={choiceImagePreviews[letter]!}
                      alt={`Choice ${letter}`}
                      className="max-h-32 rounded-md border object-contain"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-5 w-5"
                      onClick={() => clearChoiceImage(letter)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <label
                    onDrop={handleChoiceDrop(letter)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDraggingChoice(letter);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDraggingChoice(null);
                    }}
                    onPaste={handleChoicePaste(letter)}
                    tabIndex={0}
                    className={`flex items-center justify-center gap-2 w-full h-10 border border-dashed rounded-md cursor-pointer text-[11px] text-muted-foreground transition-colors outline-none ${
                      draggingChoice === letter
                        ? "border-primary bg-primary/10 text-primary"
                        : "hover:bg-muted/50 focus:bg-muted/50"
                    }`}
                  >
                    <ImagePlus className="h-3.5 w-3.5" />
                    {draggingChoice === letter
                      ? `Drop figure for ${letter}`
                      : `Add figure for ${letter} (click, drop, or paste)`}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) ingestChoiceImage(letter, f);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
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

      {/* Alternate accepted answers (fill-in only) */}
      {questionType === "fill_in" && (
        <div className="rounded-lg border overflow-hidden">
          <div className="bg-muted/50 px-3 py-2 border-b flex items-center justify-between gap-2">
            <div>
              <span className="text-sm font-medium">Alternate Correct Answers</span>
              <p className="text-xs text-muted-foreground">
                Equivalent forms students may type (e.g. 0.5 and 1/2)
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1"
              disabled={alternateAnswers.length >= 4}
              onClick={() => setAlternateAnswers((prev) => [...prev, ""])}
            >
              <Plus className="h-3 w-3" /> Add
            </Button>
          </div>

          {alternateAnswers.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No alternates — only the exact answer above will be accepted.
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {alternateAnswers.map((val, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4">{index + 1}.</span>
                  <Input
                    placeholder="e.g. 1/2 or .5"
                    value={val}
                    onChange={(e) =>
                      setAlternateAnswers((prev) =>
                        prev.map((v, i) => (i === index ? e.target.value : v))
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() =>
                      setAlternateAnswers((prev) => prev.filter((_, i) => i !== index))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}


      <div className="flex gap-2">
        {isEditing && (
          <Button variant="outline" className="flex-1" onClick={() => onCancelEdit?.()}>
            Cancel
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          disabled={createMutation.isPending || updateMutation.isPending}
          className="flex-1 gap-2"
        >
          {createMutation.isPending || updateMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isEditing ? (
            <Save className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {isEditing ? "Save changes" : "Create & Add to Module"}
        </Button>
      </div>

    </div>
  );
};

export default CustomQuestionForm;
