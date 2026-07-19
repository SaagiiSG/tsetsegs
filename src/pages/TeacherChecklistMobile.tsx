import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChecklistView } from "@/components/teacher/checklist/ChecklistView";
import { ClassPickerDialog } from "@/components/teacher/checklist/ClassPickerDialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TeacherChecklistMobile() {
  const { batchId } = useParams<{ batchId?: string }>();
  const navigate = useNavigate();
  const [pickerFor, setPickerFor] = useState<number | null>(null);

  const { data: batch } = useQuery({
    queryKey: ["checklist-batch", batchId],
    enabled: !!batchId,
    queryFn: async () => {
      const { data } = await supabase
        .from("batches")
        .select("id, batch_name, nickname")
        .eq("id", batchId as string)
        .maybeSingle();
      return data as { id: string; batch_name: string; nickname: string | null } | null;
    },
  });

  const title = batchId
    ? batch?.nickname || batch?.batch_name || "Class"
    : "Handbook";

  const handleStart = (sessionNumber: number) => {
    if (batchId) {
      navigate(`/teacher/session/${batchId}/${sessionNumber}`);
    } else {
      setPickerFor(sessionNumber);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b px-3 py-2 flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Handbook</div>
          <div className="text-sm font-semibold truncate">{title}</div>
        </div>
      </div>
      <div className="flex-1">
        <ChecklistView batchId={batchId ?? null} onStartSession={handleStart} />
      </div>

      <ClassPickerDialog
        open={pickerFor !== null}
        onOpenChange={(v) => !v && setPickerFor(null)}
        title={`Start Session ${pickerFor ?? ""} · pick a class`}
        onPick={(pickedBatchId) => {
          const s = pickerFor;
          setPickerFor(null);
          if (s !== null) navigate(`/teacher/session/${pickedBatchId}/${s}`);
        }}
      />
    </div>
  );
}
