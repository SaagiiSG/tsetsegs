import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Send, MessageSquare, Save, Megaphone, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

type Flow = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  template_mn: string;
  recipient_role: string;
  trigger_type: string;
  last_fired_at: string | null;
  sent_count: number;
};

const TRIGGER_LABEL: Record<string, string> = {
  event: 'Шинээр илгээгдэх үед',
  cron: 'Өдөр бүр (01:00)',
  manual: 'Гараар илгээх',
};

const TEST_TEACHERS = ['Saran-Ochir', 'Enguun', 'Dulguun', 'Udval', 'Brody'];
const TEST_MESSAGE = 'Hello tsetsegs iin basgh nara';

export default function SmsFlows() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editTpl, setEditTpl] = useState<Record<string, string>>({});

  const [bcOpen, setBcOpen] = useState(false);
  const [bcBody, setBcBody] = useState('');
  const [bcAudience, setBcAudience] = useState<'teachers' | 'students' | 'parents' | 'custom'>('teachers');
  const [bcCustom, setBcCustom] = useState('');
  const [bcSending, setBcSending] = useState(false);

  const [testSending, setTestSending] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('sms_flows').select('*').order('key');
    if (error) toast.error(error.message);
    else {
      setFlows(data as Flow[]);
      const init: Record<string, string> = {};
      (data as Flow[]).forEach((f) => (init[f.id] = f.template_mn));
      setEditTpl(init);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (flow: Flow, enabled: boolean) => {
    const { error } = await supabase.from('sms_flows').update({ enabled }).eq('id', flow.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`${flow.name} ${enabled ? 'идэвхжүүлсэн' : 'идэвхгүй болсон'}`);
      setFlows((p) => p.map((f) => (f.id === flow.id ? { ...f, enabled } : f)));
    }
  };

  const saveTemplate = async (flow: Flow) => {
    setSavingId(flow.id);
    const { error } = await supabase.from('sms_flows').update({ template_mn: editTpl[flow.id] ?? '' }).eq('id', flow.id);
    if (error) toast.error(error.message);
    else toast.success('Загвар хадгалагдлаа');
    setSavingId(null);
  };

  const sendTestToTeachers = async () => {
    setTestSending(true);
    try {
      const { data: teachers, error } = await supabase
        .from('teachers')
        .select('name, phone')
        .in('name', TEST_TEACHERS);
      if (error) throw error;

      const recipients = (teachers ?? []).filter((t) => t.phone).map((t) => ({ phone: t.phone as string, name: t.name as string }));
      if (!recipients.length) {
        toast.error('Багш олдсонгүй');
        return;
      }

      const { data, error: invErr } = await supabase.functions.invoke('send-broadcast-sms', {
        body: { recipients, body: TEST_MESSAGE, kind: 'manual', recipient_role: 'other', dedupe_prefix: `test-teachers:${Date.now()}` },
      });
      if (invErr) throw invErr;
      const okCount = (data as any)?.results?.filter((r: any) => r.ok).length ?? 0;
      toast.success(`Тестийн SMS илгээгдлээ (${okCount}/${recipients.length})`);
    } catch (err: any) {
      toast.error(err.message ?? 'Алдаа гарлаа');
    } finally {
      setTestSending(false);
    }
  };

  const sendBroadcast = async () => {
    if (!bcBody.trim()) {
      toast.error('Мессеж бичнэ үү');
      return;
    }
    setBcSending(true);
    try {
      let recipients: { phone: string; name?: string }[] = [];
      if (bcAudience === 'teachers') {
        const { data } = await supabase.from('teachers').select('name, phone');
        recipients = (data ?? []).filter((t) => t.phone).map((t) => ({ phone: t.phone as string, name: t.name as string }));
      } else if (bcAudience === 'students') {
        const { data } = await supabase.from('students').select('first_name, last_name, phone');
        recipients = (data ?? []).filter((s) => s.phone).map((s) => ({ phone: s.phone as string, name: `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim() }));
      } else if (bcAudience === 'parents') {
        const { data } = await supabase.from('students').select('first_name, last_name, parent_phone');
        recipients = (data ?? []).filter((s) => s.parent_phone).map((s) => ({ phone: s.parent_phone as string, name: `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim() }));
      } else {
        recipients = bcCustom.split(/[,\n\s]+/).map((p) => p.trim()).filter(Boolean).map((p) => ({ phone: p }));
      }
      if (!recipients.length) {
        toast.error('Хүлээн авагч олдсонгүй');
        return;
      }

      const { data, error } = await supabase.functions.invoke('send-broadcast-sms', {
        body: { recipients, body: bcBody, kind: 'broadcast', recipient_role: 'other', dedupe_prefix: `bcast:${Date.now()}` },
      });
      if (error) throw error;
      const okCount = (data as any)?.results?.filter((r: any) => r.ok).length ?? 0;
      toast.success(`SMS илгээгдлээ (${okCount}/${recipients.length})`);
      setBcOpen(false);
      setBcBody('');
      setBcCustom('');
    } catch (err: any) {
      toast.error(err.message ?? 'Алдаа гарлаа');
    } finally {
      setBcSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-primary" />
            SMS Flows
          </h1>
          <p className="text-muted-foreground">Бүх автомат SMS урсгалуудыг удирдах</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/sms"><ExternalLink className="h-4 w-4 mr-2" />SMS Log</Link>
          </Button>
          <Button variant="outline" onClick={sendTestToTeachers} disabled={testSending}>
            {testSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Test → 5 багш
          </Button>
          <Dialog open={bcOpen} onOpenChange={setBcOpen}>
            <DialogTrigger asChild>
              <Button><Megaphone className="h-4 w-4 mr-2" />Гараар илгээх</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Гараар SMS илгээх</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Хүлээн авагч</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {(['teachers', 'students', 'parents', 'custom'] as const).map((a) => (
                      <Button key={a} type="button" variant={bcAudience === a ? 'default' : 'outline'} size="sm" onClick={() => setBcAudience(a)}>
                        {a === 'teachers' ? 'Бүх багш' : a === 'students' ? 'Бүх сурагч' : a === 'parents' ? 'Бүх эцэг эх' : 'Гараар'}
                      </Button>
                    ))}
                  </div>
                </div>
                {bcAudience === 'custom' && (
                  <div>
                    <Label>Утасны дугаар (таслалаар тусгаарлана)</Label>
                    <Textarea value={bcCustom} onChange={(e) => setBcCustom(e.target.value)} placeholder="+97699112233, +97688994455" />
                  </div>
                )}
                <div>
                  <Label>Мессеж</Label>
                  <Textarea rows={5} value={bcBody} onChange={(e) => setBcBody(e.target.value)} placeholder="Сайн байна уу..." />
                  <p className="text-xs text-muted-foreground mt-1">{`{name}` } placeholder ашиглаж болно.</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setBcOpen(false)}>Болих</Button>
                <Button onClick={sendBroadcast} disabled={bcSending}>
                  {bcSending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Илгээх
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {flows.map((flow) => (
            <Card key={flow.id} className={flow.enabled ? '' : 'opacity-60'}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{flow.name}</CardTitle>
                    <CardDescription>{flow.description}</CardDescription>
                    <div className="flex gap-2 pt-1">
                      <Badge variant="secondary">{TRIGGER_LABEL[flow.trigger_type] ?? flow.trigger_type}</Badge>
                      <Badge variant="outline">{flow.recipient_role}</Badge>
                    </div>
                  </div>
                  <Switch checked={flow.enabled} onCheckedChange={(v) => toggle(flow, v)} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {flow.key !== 'broadcast' && (
                  <>
                    <Label>Загвар (Монгол хэл)</Label>
                    <Textarea
                      rows={4}
                      value={editTpl[flow.id] ?? ''}
                      onChange={(e) => setEditTpl((p) => ({ ...p, [flow.id]: e.target.value }))}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Placeholder: <code>{'{name}'}</code>
                      {flow.key === 'absence' && <> <code>{'{date}'}</code> <code>{'{status_mn}'}</code></>}
                      {flow.key === 'welcome' && <> <code>{'{phone}'}</code> <code>{'{password}'}</code></>}
                      {flow.key === 'batch_start' && <> <code>{'{batch}'}</code> <code>{'{date}'}</code></>}
                    </p>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>Сүүлд: {flow.last_fired_at ? new Date(flow.last_fired_at).toLocaleString() : '—'} · Илгээсэн: {flow.sent_count}</span>
                      <Button size="sm" onClick={() => saveTemplate(flow)} disabled={savingId === flow.id || (editTpl[flow.id] ?? '') === flow.template_mn}>
                        {savingId === flow.id ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Save className="h-3 w-3 mr-2" />}Хадгалах
                      </Button>
                    </div>
                  </>
                )}
                {flow.key === 'broadcast' && (
                  <p className="text-sm text-muted-foreground">Дээр байрлах "Гараар илгээх" товчоор ашиглана.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
