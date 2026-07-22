import { useEffect, useMemo, useState, useCallback, useRef } from "react";
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
  const initialLoadedRef = useRef(false);
  const debounceTimerRef = useRef<number | null>(null);

  const load = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!teacherId) return;
      if (!opts.silent) setLoading(true);
      let q = supabase
        .from("teaching_checklist_progress")
        .select("item_key, checked_at, note")
        .eq("teacher_id", teacherId);
      q = batchId ? q.eq("batch_id", batchId) : q.is("batch_id", null);
      const { data } = await q;
      setRows((data as ChecklistRow[]) ?? []);
      if (!opts.silent) setLoading(false);
      initialLoadedRef.current = true;
    },
    [teacherId, batchId]
  );

  useEffect(() => {
    initialLoadedRef.current = false;
    load();
  }, [load]);

  // Realtime — silent, debounced sync (no skeleton flash on every tap)
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
          const matches = batchId ? row?.batch_id === batchId : row?.batch_id === null;
          if (!matches) return;
          if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = window.setTimeout(() => {
            load({ silent: true });
          }, 300);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
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
        let existQ = supabase
          .from("teaching_checklist_progress")
          .select("id")
          .eq("teacher_id", teacherId)
          .eq("item_key", itemKey)
          .limit(1);
        existQ = batchId ? existQ.eq("batch_id", batchId) : existQ.is("batch_id", null);
        const { data: existing } = await existQ;
        if (!existing || existing.length === 0) {
          await supabase.from("teaching_checklist_progress").insert({
            teacher_id: teacherId,
            batch_id: batchId,
            item_key: itemKey,
          });
        }
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
