import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  batchId: string | null;
  currentNickname: string | null;
  fallbackName: string;
  onOpenChange: (open: boolean) => void;
}

export function RenameClassDialog({ batchId, currentNickname, fallbackName, onOpenChange }: Props) {
  const [value, setValue] = useState(currentNickname ?? "");
  const qc = useQueryClient();

  useEffect(() => {
    setValue(currentNickname ?? "");
  }, [currentNickname, batchId]);

  const save = useMutation({
    mutationFn: async (nickname: string | null) => {
      if (!batchId) return;
      const { error } = await supabase.rpc("set_batch_nickname", {
        p_batch_id: batchId,
        p_nickname: nickname,
      });
      if (error) throw error;
    },
    onSuccess: (_d, nickname) => {
      qc.invalidateQueries({ queryKey: ["teacher-dashboard-v2"] });
      toast.success(nickname ? "Class renamed" : "Nickname cleared");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save"),
  });

  return (
    <Dialog open={!!batchId} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Rename class</DialogTitle>
          <p className="text-xs text-muted-foreground pt-1">Auto name: {fallbackName}</p>
        </DialogHeader>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, 40))}
          placeholder="e.g. Rocket Squad 🚀"
          autoFocus
        />
        <div className="text-[10px] text-muted-foreground text-right">{value.length}/40</div>
        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => save.mutate(null)}
            disabled={save.isPending || !currentNickname}
          >
            Clear
          </Button>
          <Button
            onClick={() => save.mutate(value.trim() || null)}
            disabled={save.isPending}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
