import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Send, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const TIERS = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];

export default function AdminAnnouncements() {
  const [list, setList] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<'all' | 'batch' | 'tier'>('all');
  const [audienceBatch, setAudienceBatch] = useState<string>('');
  const [audienceTier, setAudienceTier] = useState<string>('bronze');
  const [sendEmail, setSendEmail] = useState(true);
  const [busy, setBusy] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);

  const refresh = async () => {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setList(data ?? []);
  };

  useEffect(() => {
    refresh();
    supabase.from('batches').select('id, name, course_type').order('name').then(({ data }) => setBatches(data ?? []));
  }, []);

  useEffect(() => {
    (async () => {
      let q = supabase.from('student_accounts').select('id', { count: 'exact', head: true });
      if (audience === 'batch' && audienceBatch) {
        const { data: stu } = await supabase.from('students').select('id').eq('batch_id', audienceBatch);
        const ids = (stu ?? []).map((s: any) => s.id);
        if (!ids.length) { setRecipientCount(0); return; }
        const { count } = await supabase
          .from('student_accounts')
          .select('id', { count: 'exact', head: true })
          .in('linked_student_id', ids);
        setRecipientCount(count ?? 0);
      } else if (audience === 'tier') {
        const { data: rks } = await supabase
          .from('student_sprint_rankings')
          .select('student_account_id')
          .eq('current_tier', audienceTier);
        const uniq = new Set((rks ?? []).map((r: any) => r.student_account_id));
        setRecipientCount(uniq.size);
      } else {
        const { count } = await q;
        setRecipientCount(count ?? 0);
      }
    })();
  }, [audience, audienceBatch, audienceTier]);

  const publish = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Title and body are required');
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from('announcements')
      .insert({
        title: title.trim(),
        body: body.trim(),
        audience,
        audience_batch_id: audience === 'batch' ? audienceBatch || null : null,
        audience_tier: audience === 'tier' ? audienceTier : null,
        send_email: sendEmail,
        published_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Announcement published');
    setTitle(''); setBody('');
    refresh();
    // Email blast will be wired once email domain is configured. Inbox works now.
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this announcement?')) return;
    await supabase.from('announcements').delete().eq('id', id);
    refresh();
  };

  return (
    <div className="container max-w-5xl py-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Megaphone className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Announcements</h1>
          <p className="text-sm text-muted-foreground">Send updates to students in-app (and via email)</p>
        </div>
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium"><Plus className="h-4 w-4" /> New announcement</div>
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Schedule change for Saturday" />
          </div>
          <div>
            <Label>Body</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your announcement…" rows={6} />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label>Audience</Label>
              <Select value={audience} onValueChange={(v: any) => setAudience(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All students</SelectItem>
                  <SelectItem value="batch">Specific batch</SelectItem>
                  <SelectItem value="tier">By tier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {audience === 'batch' && (
              <div className="sm:col-span-2">
                <Label>Batch</Label>
                <Select value={audienceBatch} onValueChange={setAudienceBatch}>
                  <SelectTrigger><SelectValue placeholder="Pick a batch" /></SelectTrigger>
                  <SelectContent>
                    {batches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name} ({b.course_type})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {audience === 'tier' && (
              <div>
                <Label>Tier</Label>
                <Select value={audienceTier} onValueChange={setAudienceTier}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIERS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Switch checked={sendEmail} onCheckedChange={setSendEmail} id="send-email" />
              <Label htmlFor="send-email" className="text-sm">Also send by email (when email is configured)</Label>
            </div>
            <div className="text-sm text-muted-foreground">
              Estimated recipients: <b>{recipientCount ?? '…'}</b>
            </div>
          </div>
          <Button onClick={publish} disabled={busy} className="gap-2">
            <Send className="h-4 w-4" /> Publish
          </Button>
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <div className="text-sm font-medium">Past announcements</div>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">No announcements yet.</p>
        ) : (
          <div className="space-y-2">
            {list.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium truncate">{a.title}</h4>
                    <Badge variant="outline" className="text-xs">{a.audience}</Badge>
                    {!a.published_at && <Badge variant="secondary">draft</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{a.body}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(a.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
