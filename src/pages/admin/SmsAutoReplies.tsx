import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, MessageSquare } from "lucide-react";

type Rule = {
  id: string;
  flow_key: string;
  keyword: string;
  reply_template: string;
  enabled: boolean;
  sent_count: number;
  last_fired_at: string | null;
};

const FLOWS = [
  { key: "global", label: "Any (Global)" },
  { key: "welcome", label: "Welcome SMS" },
  { key: "batch_start", label: "Batch Start Reminder" },
  { key: "fee_paid", label: "Fee Paid" },
  { key: "absence", label: "Absence Notice" },
  { key: "broadcast", label: "Manual Broadcast" },
  { key: "manual", label: "Manual Send" },
];

export default function SmsAutoReplies() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newRule, setNewRule] = useState({ flow_key: "global", keyword: "", reply_template: "" });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sms_auto_replies" as any)
      .select("*")
      .order("flow_key")
      .order("keyword");
    if (error) toast.error(error.message);
    setRules((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    const kw = newRule.keyword.trim();
    if (!kw || !newRule.reply_template.trim()) {
      toast.error("Keyword and reply are required");
      return;
    }
    const { error } = await supabase.from("sms_auto_replies" as any).insert({
      flow_key: newRule.flow_key,
      keyword: kw,
      reply_template: newRule.reply_template.trim(),
    });
    if (error) return toast.error(error.message);
    toast.success("Rule created");
    setNewRule({ flow_key: "global", keyword: "", reply_template: "" });
    setCreating(false);
    load();
  };

  const update = async (id: string, patch: Partial<Rule>) => {
    const { error } = await supabase.from("sms_auto_replies" as any).update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this rule?")) return;
    const { error } = await supabase.from("sms_auto_replies" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">SMS Auto-Replies</h1>
          <p className="text-muted-foreground mt-1">
            When a parent/student replies with an exact keyword, we send back a configured message.
            Rules tied to a specific flow only match if the user is replying to that flow's outbound (within 48h).
            Use <Badge variant="outline">Any (Global)</Badge> for catch-all keywords.
          </p>
        </div>
        <Button onClick={() => setCreating((c) => !c)}>
          <Plus className="w-4 h-4 mr-2" /> New Rule
        </Button>
      </div>

      {creating && (
        <Card>
          <CardHeader>
            <CardTitle>New Auto-Reply Rule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Flow Context</label>
                <Select value={newRule.flow_key} onValueChange={(v) => setNewRule({ ...newRule, flow_key: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FLOWS.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Keyword (exact, case-insensitive)</label>
                <Input
                  placeholder="e.g. 1, YES, STOP"
                  value={newRule.keyword}
                  onChange={(e) => setNewRule({ ...newRule, keyword: e.target.value })}
                  maxLength={40}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Reply Message (Mongolian)</label>
              <Textarea
                rows={3}
                placeholder="e.g. Баярлалаа! Та хичээлд ирэхээ баталгаажууллаа."
                value={newRule.reply_template}
                onChange={(e) => setNewRule({ ...newRule, reply_template: e.target.value })}
                maxLength={480}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
              <Button onClick={create}>Create</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">No auto-reply rules yet. Create one above.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rules.map((r) => {
            const flow = FLOWS.find((f) => f.key === r.flow_key);
            return (
              <Card key={r.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={r.flow_key === "global" ? "outline" : "default"}>
                        {flow?.label ?? r.flow_key}
                      </Badge>
                      <code className="px-2 py-0.5 rounded bg-muted text-sm font-mono">{r.keyword}</code>
                    </div>
                    <CardDescription>
                      Fired {r.sent_count}× {r.last_fired_at ? `· last ${new Date(r.last_fired_at).toLocaleString()}` : ""}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={r.enabled}
                      onCheckedChange={(v) => update(r.id, { enabled: v })}
                    />
                    <Button variant="ghost" size="icon" onClick={() => remove(r.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    rows={2}
                    defaultValue={r.reply_template}
                    onBlur={(e) => {
                      if (e.target.value !== r.reply_template) {
                        update(r.id, { reply_template: e.target.value });
                      }
                    }}
                    maxLength={480}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
