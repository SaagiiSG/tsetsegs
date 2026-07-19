import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTeacherAuth } from "@/contexts/TeacherAuthContext";

export interface ChecklistRow {
  item_key: string;
  checked_at: string;
  note: string | null;
}

export function useTeachingChecklist(batchId: string | null) {
  const { user } = useTeacherAuth();
  const teacherId = user?.id ?? null;
  const [rows, setRows] = useState<ChecklistRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!teacherId) return;
    setLoading(true);
    let q = supabase
      .from("teaching_checklist_progress")
      .select("item_key, checked_at, note")
      .eq("teacher_id", teacherId);
    q = batchId ? q.eq("batch_id", batchId) : q.is("batch_id", null);
    const { data } = await q;
    setRows((data as ChecklistRow[]) ?? []);
    setLoading(false);
  }, [teacherId, batchId]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime — sync between desktop popup and phone
  useEffect(() => {
    if (!teacherId) return;
    const channel = supabase
      .channel(`teaching-checklist-${teacherId}-${batchId ?? "global"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "teaching_checklist_progress",
          filter: `teacher_id=eq.${teacherId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as { batch_id: string | null } | undefined;
          // filter for the current view (batch or global)
          const matches = batchId ? row?.batch_id === batchId : row?.batch_id === null;
          if (matches) load();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [teacherId, batchId, load]);

  const checkedSet = useMemo(() => new Set(rows.map((r) => r.item_key)), [rows]);

  const toggle = useCallback(
    async (itemKey: string, checked: boolean) => {
      if (!teacherId) return;
      // optimistic
      setRows((prev) =>
        checked
          ? [...prev.filter((r) => r.item_key !== itemKey), { item_key: itemKey, checked_at: new Date().toISOString(), note: null }]
          : prev.filter((r) => r.item_key !== itemKey)
      );
      if (checked) {
        await supabase.from("teaching_checklist_progress").upsert(
          { teacher_id: teacherId, batch_id: batchId, item_key: itemKey, checked_at: new Date().toISOString() },
          { onConflict: "teacher_id,batch_id,item_key" }
        );
      } else {
        let del = supabase
          .from("teaching_checklist_progress")
          .delete()
          .eq("teacher_id", teacherId)
          .eq("item_key", itemKey);
        del = batchId ? del.eq("batch_id", batchId) : del.is("batch_id", null);
        await del;
      }
    },
    [teacherId, batchId]
  );

  return { rows, checkedSet, loading, toggle, reload: load };
}
