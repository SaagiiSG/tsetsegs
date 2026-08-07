import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTeacherAuth } from "@/contexts/TeacherAuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function makeCode(len = 6) {
  return Array.from({ length: len }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
}

interface TestOption {
  id: string;
  label: string;
  moduleCount: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (sessionId: string) => void;
}

export function ProctorStartDialog({ open, onOpenChange, onCreated }: Props) {
  const { teacherName } = useTeacherAuth();
  const [tests, setTests] = useState<TestOption[]>([]);
  const [testId, setTestId] = useState("");
  const [batches, setBatches] = useState<Array<{ id: string; label: string }>>([]);
  const [batchId, setBatchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      const [{ data: testRows }, { data: moduleRows }, { data: batchRows }] = await Promise.all([
        supabase
          .from("bluebook_tests")
          .select("id, name, section_type, test_month, test_year, variant, is_published")
          .eq("is_published", true)
          .order("created_at", { ascending: false }),
        supabase.from("bluebook_modules").select("id, test_id"),
        teacherName
          ? supabase
              .from("batches")
              .select("id, batch_name, nickname, course_type")
              .eq("course_type", "SAT")
              .ilike("teacher", `%${teacherName}%`)
              .order("start_date", { ascending: false })
          : Promise.resolve({ data: [] as never[] }),
      ]);

      const counts = new Map<string, number>();
      (moduleRows ?? []).forEach((m) => {
        if (!m.test_id) return;
        counts.set(m.test_id, (counts.get(m.test_id) ?? 0) + 1);
      });

      setTests(
        (testRows ?? [])
          .map((t) => ({
            id: t.id,
            label: [t.name, t.variant, t.test_year ? `${t.test_month ?? ""}/${t.test_year}` : null]
              .filter(Boolean)
              .join(" · "),
            moduleCount: counts.get(t.id) ?? 0,
          }))
          .filter((t) => t.moduleCount > 0),
      );
      setBatches(
        (batchRows ?? []).map((b: { id: string; batch_name: string | null; nickname: string | null }) => ({
          id: b.id,
          label: b.nickname || b.batch_name || "Class",
        })),
      );
      setLoading(false);
    })();
  }, [open, teacherName]);

  const create = async () => {
    const test = tests.find((t) => t.id === testId);
    if (!test) {
      toast.error("Pick a finished practice test first");
      return;
    }
    setCreating(true);
    const { data, error } = await supabase
      .from("proctor_sessions")
      .insert({
        test_id: test.id,
        title: test.label,
        teacher_username: teacherName ?? null,
        batch_id: batchId || null,
        join_code: makeCode(6),
        unlock_code: makeCode(6),
        status: "lobby",
      })
      .select("id")
      .single();
    setCreating(false);
    if (error || !data) {
      toast.error(error?.message ?? "Could not create the session");
      return;
    }
    onOpenChange(false);
    setTestId("");
    setBatchId("");
    onCreated(data.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Start a proctored Bluebook test</DialogTitle>
          <DialogDescription>
            Pick a finished practice test. Students scan the QR, you read out the unlock code, they take the oath, then
            everyone starts together.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Practice test</Label>
              <Select value={testId} onValueChange={setTestId}>
                <SelectTrigger>
                  <SelectValue placeholder={tests.length ? "Choose a test" : "No published tests yet"} />
                </SelectTrigger>
                <SelectContent>
                  {tests.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label} · {t.moduleCount} modules
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Class (optional)</Label>
              <Select value={batchId} onValueChange={setBatchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Any student with a phone on file" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={create} disabled={creating || !testId}>
            {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Open lobby
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
