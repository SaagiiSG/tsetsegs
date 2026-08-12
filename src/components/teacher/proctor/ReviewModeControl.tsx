import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Eye } from "lucide-react";
import { toast } from "sonner";

type Mode = "off" | "correctness" | "explanations";

const OPTIONS: Array<{ value: Mode; label: string; hint: string }> = [
  { value: "off", label: "Score only", hint: "Students see their raw score and module breakdown." },
  { value: "correctness", label: "Right / wrong per question", hint: "They see which questions they missed — no answers." },
  { value: "explanations", label: "Answers + explanations", hint: "Full review: correct answer and the written solution." },
];

interface Props {
  sessionId: string;
  /** Rendered inside the lobby (before start) or the live monitor. */
  className?: string;
}

export function ReviewModeControl({ sessionId, className }: Props) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase
      .from("proctor_sessions")
      .select("review_mode")
      .eq("id", sessionId)
      .maybeSingle()
      .then(({ data }) => {
        if (alive) setMode(((data?.review_mode as Mode) ?? "off"));
      });
    return () => {
      alive = false;
    };
  }, [sessionId]);

  const update = async (next: Mode) => {
    const prev = mode;
    setMode(next);
    setSaving(true);
    const { error } = await supabase.from("proctor_sessions").update({ review_mode: next }).eq("id", sessionId);
    setSaving(false);
    if (error) {
      setMode(prev);
      return toast.error(error.message);
    }
    toast.success(next === "off" ? "Review locked" : "Review unlocked for students");
  };

  return (
    <Card className={className ? `p-4 space-y-3 ${className}` : "p-4 space-y-3"}>
      <div className="flex items-center gap-2 text-xs font-semibold">
        <Eye className="h-4 w-4 text-primary" /> After the test — what students can see
      </div>
      <RadioGroup
        value={mode ?? "off"}
        onValueChange={(v) => update(v as Mode)}
        disabled={saving || mode === null}
        className="gap-2"
      >
        {OPTIONS.map((o) => (
          <label
            key={o.value}
            htmlFor={`review-${sessionId}-${o.value}`}
            className="flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 hover:bg-muted/40"
          >
            <RadioGroupItem id={`review-${sessionId}-${o.value}`} value={o.value} className="mt-0.5" />
            <div className="space-y-0.5">
              <Label htmlFor={`review-${sessionId}-${o.value}`} className="cursor-pointer text-xs font-medium">
                {o.label}
              </Label>
              <p className="text-[11px] leading-snug text-muted-foreground">{o.hint}</p>
            </div>
          </label>
        ))}
      </RadioGroup>
      <p className="text-[11px] text-muted-foreground">
        Review only opens once a student has submitted, or after you end the session. You can change this at any time.
      </p>
    </Card>
  );
}
