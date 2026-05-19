import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Send, RefreshCw, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface SmsLog {
  id: string;
  created_at: string;
  kind: string;
  recipient_role: string;
  to_phone: string;
  body: string;
  student_id: string | null;
  session_number: number | null;
  status: string | null;
  twilio_sid: string | null;
  twilio_status: string;
  error: string | null;
}

const statusColor = (s: string) => {
  if (s === 'sent' || s === 'queued' || s === 'delivered') return 'default';
  if (s === 'failed' || s === 'undelivered') return 'destructive';
  return 'secondary';
};

export default function SmsLog() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [kindFilter, setKindFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [resending, setResending] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    let q = supabase
      .from('sms_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (kindFilter !== 'all') q = q.eq('kind', kindFilter);
    const { data, error } = await q;
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      setLogs(data as SmsLog[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [kindFilter]);

  const filtered = logs.filter(
    (l) =>
      !search ||
      l.to_phone.includes(search) ||
      l.body.toLowerCase().includes(search.toLowerCase()),
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayLogs = logs.filter((l) => new Date(l.created_at) >= today);
  const failures = logs.filter((l) =>
    ['failed', 'undelivered'].includes(l.twilio_status),
  );

  const resend = async (log: SmsLog) => {
    setResending(log.id);
    try {
      const { error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: log.to_phone,
          body: log.body,
          kind: 'manual',
          recipient_role: log.recipient_role,
          student_id: log.student_id,
        },
      });
      if (error) throw error;
      toast({ title: 'SMS resent' });
      fetchLogs();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Resend failed', description: e.message });
    } finally {
      setResending(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <MessageSquare className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">SMS Log</h1>
          <p className="text-sm text-muted-foreground">
            Auto-sent SMS to parents (absence) and students (welcome) via Twilio.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total (last 500)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{logs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center gap-2">
              {todayLogs.length}
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Failures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center gap-2">
              {failures.length}
              {failures.length > 0 && (
                <AlertCircle className="h-5 w-5 text-destructive" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Select value={kindFilter} onValueChange={setKindFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All kinds</SelectItem>
                <SelectItem value="absence">Absence</SelectItem>
                <SelectItem value="welcome">Welcome</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Search phone or body..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Body</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {loading ? 'Loading...' : 'No SMS yet'}
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs whitespace-nowrap" title={format(new Date(log.created_at), 'PPpp')}>
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {log.kind}
                      {log.session_number ? ` · S${log.session_number}` : ''}
                      {log.status ? ` · ${log.status}` : ''}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{log.to_phone}</TableCell>
                  <TableCell className="max-w-md">
                    <div className="text-xs line-clamp-2">{log.body}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColor(log.twilio_status) as any}>
                      {log.twilio_status}
                    </Badge>
                    {log.error && (
                      <div className="text-xs text-destructive mt-1 line-clamp-1" title={log.error}>
                        {log.error}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => resend(log)}
                      disabled={resending === log.id}
                    >
                      <Send className={`h-3.5 w-3.5 ${resending === log.id ? 'animate-pulse' : ''}`} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
