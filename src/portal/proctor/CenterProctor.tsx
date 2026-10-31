import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Play, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCenter } from '../centerContext';
import { ProctorLobby, ProctorMonitor } from './ProctorRooms';

type Cls = { id: string; name: string };
type Test = { id: string; name: string; test_month: string | number | null; test_year: number | null; modules: number; questions: number; minutes: number };
type Row = { id: string; class_id: string | null; title: string | null; join_code: string; status: string; created_at: string };
const rpc = (name: string, args: object) => supabase.rpc(name as never, args as never);

function StartDialog({ open, onOpenChange, classes, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; classes: Cls[]; onCreated: (id: string) => void }) {
  const { center } = useCenter();
  const [testId, setTestId] = useState('');
  const [classId, setClassId] = useState('');
  const [creating, setCreating] = useState(false);
  const tests = useQuery({
    queryKey: ['center-proctor-tests', center.id], enabled: open,
    queryFn: async () => { const { data, error } = await rpc('tenant_proctor_tests', { _institution: center.id }); if (error) throw error; return (data ?? []) as Test[]; },
  });
  useEffect(() => { if (open) { setTestId(''); setClassId(''); } }, [open]);

  const create = async () => {
    setCreating(true);
    const { data, error } = await rpc('tenant_proctor_create', { _institution: center.id, _class: classId, _test: testId });
    setCreating(false);
    if (error || !data) return toast.error('Could not open the lobby. Try again.');
    onOpenChange(false);
    onCreated(data as unknown as string);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Start a proctored test</DialogTitle>
          <DialogDescription>Pick a test and a class. Students scan the QR, you read out the unlock code, they take the oath, then everyone starts together.</DialogDescription>
        </DialogHeader>
        {tests.isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          : tests.isError ? <p role="alert" className="text-sm py-4">Could not load the tests.</p> : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="proctor-test" className="text-xs">Practice test</Label>
                <Select value={testId} onValueChange={setTestId}>
                  <SelectTrigger id="proctor-test"><SelectValue placeholder={tests.data?.length ? 'Choose a test' : 'No tests available yet'} /></SelectTrigger>
                  <SelectContent>
                    {(tests.data ?? []).map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}{t.test_year ? ` · ${t.test_month ?? ''}/${t.test_year}` : ''} · {t.minutes} min</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="proctor-class" className="text-xs">Class</Label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger id="proctor-class"><SelectValue placeholder="Choose a class" /></SelectTrigger>
                  <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={create} disabled={creating || !testId || !classId}>
            {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Open lobby
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CenterProctor({ classes }: { classes: Cls[] }) {
  const { center } = useCenter();
  const [dialog, setDialog] = useState(false);
  const [lobbyId, setLobbyId] = useState<string | null>(null);
  const [monitorId, setMonitorId] = useState<string | null>(null);
  const open = !!(lobbyId || monitorId);
  const classIds = classes.map(c => c.id);
  const sessions = useQuery({
    queryKey: ['center-proctor-sessions', center.id, classIds.join(','), open, dialog],
    queryFn: async () => {
      const { data, error } = await supabase.from('tenant_proctor_sessions' as any).select('id, class_id, title, join_code, status, created_at')
        .eq('institution_id', center.id).in('class_id', classIds).order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
    enabled: !open && classIds.length > 0,
  });

  if (lobbyId) return <ProctorLobby sessionId={lobbyId} onBack={() => setLobbyId(null)} onStarted={() => { setMonitorId(lobbyId); setLobbyId(null); }} />;
  if (monitorId) return <ProctorMonitor sessionId={monitorId} onBack={() => setMonitorId(null)} />;

  const className = (id: string | null) => classes.find(c => c.id === id)?.name ?? '';
  return (
    <div className="space-y-4">
      <div className="admin-glass-card admin-glass-liquid admin-glass-neutral rounded-3xl border p-5 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">Proctored test</h3></div>
          <p className="text-xs text-muted-foreground mt-1">Pick a test and a class, show the QR, read out the unlock code, run the oath, then start everyone at once.</p>
        </div>
        <Button className="gap-2 shrink-0" onClick={() => setDialog(true)} disabled={classes.length === 0}><Play className="h-4 w-4" /> New session</Button>
      </div>
      <div>
        <div className="text-xs font-semibold text-muted-foreground mb-2">Recent sessions</div>
        <div className="admin-glass-card admin-glass-neutral rounded-3xl border divide-y overflow-hidden">
          {sessions.isError ? <p role="alert" className="p-8 text-center text-sm text-muted-foreground">Could not load sessions.</p>
            : !sessions.data?.length ? <div className="p-8 text-center text-sm text-muted-foreground">{sessions.isLoading ? 'Loading…' : 'No proctored sessions yet.'}</div>
            : sessions.data.map(s => (
              <button key={s.id} onClick={() => (s.status === 'lobby' ? setLobbyId(s.id) : setMonitorId(s.id))} className="w-full text-left p-3 flex items-center gap-3 hover:bg-muted/40 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{className(s.class_id)} · {s.title ?? 'Proctored test'}</div>
                  <div className="text-[11px] text-muted-foreground font-mono truncate">{s.join_code} · {new Date(s.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <Badge variant={s.status === 'finished' ? 'secondary' : 'default'} className="text-[10px] uppercase shrink-0">{s.status}</Badge>
              </button>
            ))}
        </div>
      </div>
      <StartDialog open={dialog} onOpenChange={setDialog} classes={classes} onCreated={setLobbyId} />
    </div>
  );
}
