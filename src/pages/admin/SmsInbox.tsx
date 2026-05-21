import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Inbox, RefreshCw, Search, MessageSquare, User } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface InboxMsg {
  id: string;
  created_at: string;
  from_phone: string;
  to_phone: string;
  body: string | null;
  num_media: number;
  media_urls: string[] | null;
  matched_student_id: string | null;
  matched_role: 'parent' | 'student' | 'unknown';
  read_at: string | null;
}

interface SentMsg {
  id: string;
  created_at: string;
  to_phone: string;
  from_phone: string;
  body: string;
  twilio_status: string;
}

interface StudentLite {
  id: string;
  name: string;
  phone: string | null;
  parent_phone: string | null;
}

export default function SmsInbox() {
  const [messages, setMessages] = useState<InboxMsg[]>([]);
  const [students, setStudents] = useState<Record<string, StudentLite>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activePhone, setActivePhone] = useState<string | null>(null);
  const [thread, setThread] = useState<Array<InboxMsg | (SentMsg & { _kind: 'sent' })>>([]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('sms_inbox')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    const list = (data ?? []) as InboxMsg[];
    setMessages(list);

    const ids = Array.from(new Set(list.map((m) => m.matched_student_id).filter(Boolean) as string[]));
    if (ids.length) {
      const { data: studs } = await supabase
        .from('students')
        .select('id,name,phone,parent_phone')
        .in('id', ids);
      const map: Record<string, StudentLite> = {};
      (studs ?? []).forEach((s: any) => { map[s.id] = s; });
      setStudents(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel('sms_inbox_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sms_inbox' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Group by from_phone (conversation)
  const conversations = useMemo(() => {
    const map = new Map<string, { phone: string; last: InboxMsg; count: number; unread: number; studentId: string | null }>();
    messages.forEach((m) => {
      const cur = map.get(m.from_phone);
      if (!cur) {
        map.set(m.from_phone, {
          phone: m.from_phone,
          last: m,
          count: 1,
          unread: m.read_at ? 0 : 1,
          studentId: m.matched_student_id,
        });
      } else {
        cur.count++;
        if (!m.read_at) cur.unread++;
      }
    });
    const arr = Array.from(map.values());
    if (search.trim()) {
      const q = search.toLowerCase();
      return arr.filter((c) => {
        const s = c.studentId ? students[c.studentId] : null;
        return (
          c.phone.toLowerCase().includes(q) ||
          c.last.body?.toLowerCase().includes(q) ||
          s?.name.toLowerCase().includes(q)
        );
      });
    }
    return arr;
  }, [messages, students, search]);

  // Load thread when conversation selected
  useEffect(() => {
    if (!activePhone) { setThread([]); return; }
    (async () => {
      const inbound = messages.filter((m) => m.from_phone === activePhone);
      const { data: sent } = await supabase
        .from('sms_logs')
        .select('id,created_at,to_phone,from_phone,body,twilio_status')
        .eq('to_phone', activePhone)
        .order('created_at', { ascending: false })
        .limit(200);
      const sentTyped = (sent ?? []).map((s: any) => ({ ...s, _kind: 'sent' as const }));
      const combined = [...inbound, ...sentTyped].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
      setThread(combined);

      // Mark inbound as read
      const unreadIds = inbound.filter((m) => !m.read_at).map((m) => m.id);
      if (unreadIds.length) {
        await supabase.from('sms_inbox').update({ read_at: new Date().toISOString() }).in('id', unreadIds);
        load();
      }
    })();
  }, [activePhone, messages]);

  const activeStudent = useMemo(() => {
    const conv = conversations.find((c) => c.phone === activePhone);
    return conv?.studentId ? students[conv.studentId] : null;
  }, [activePhone, conversations, students]);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Inbox className="w-6 h-6" /> SMS Inbox
            {totalUnread > 0 && <Badge variant="destructive">{totalUnread} new</Badge>}
          </h1>
          <p className="text-sm text-muted-foreground">Incoming replies from parents and students</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] gap-4 h-[calc(100vh-220px)] min-h-[500px]">
        {/* Conversation list */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="pb-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, phone, text…"
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              {conversations.length === 0 && !loading && (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No incoming messages yet.
                </div>
              )}
              {conversations.map((c) => {
                const s = c.studentId ? students[c.studentId] : null;
                const active = c.phone === activePhone;
                return (
                  <button
                    key={c.phone}
                    onClick={() => setActivePhone(c.phone)}
                    className={cn(
                      'w-full text-left px-4 py-3 border-b hover:bg-accent/50 transition-colors',
                      active && 'bg-accent',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="font-medium text-sm truncate flex items-center gap-1.5">
                        {s ? s.name : c.phone}
                        {c.last.matched_role === 'parent' && (
                          <Badge variant="outline" className="text-[10px] py-0">parent</Badge>
                        )}
                      </div>
                      {c.unread > 0 && <Badge variant="destructive" className="text-[10px]">{c.unread}</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {c.last.body || (c.last.num_media ? `📎 ${c.last.num_media} media` : '—')}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(c.last.created_at), { addSuffix: true })} · {c.phone}
                    </div>
                  </button>
                );
              })}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Thread */}
        <Card className="flex flex-col overflow-hidden">
          {!activePhone ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Select a conversation</p>
              </div>
            </div>
          ) : (
            <>
              <CardHeader className="border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {activeStudent ? activeStudent.name : activePhone}
                  <span className="text-xs font-normal text-muted-foreground">{activePhone}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-full p-4">
                  <div className="space-y-3">
                    {thread.map((m) => {
                      const isSent = '_kind' in m && m._kind === 'sent';
                      return (
                        <div
                          key={m.id}
                          className={cn('flex', isSent ? 'justify-end' : 'justify-start')}
                        >
                          <div
                            className={cn(
                              'max-w-[75%] rounded-2xl px-4 py-2 shadow-sm',
                              isSent
                                ? 'bg-primary text-primary-foreground rounded-br-sm'
                                : 'bg-muted rounded-bl-sm',
                            )}
                          >
                            <div className="text-sm whitespace-pre-wrap break-words">
                              {m.body || '—'}
                            </div>
                            {!isSent && (m as InboxMsg).media_urls?.map((u, i) => (
                              <a key={i} href={u} target="_blank" rel="noreferrer" className="text-xs underline block mt-1">
                                📎 media {i + 1}
                              </a>
                            ))}
                            <div className={cn('text-[10px] mt-1 opacity-70', isSent && 'text-right')}>
                              {format(new Date(m.created_at), 'MMM d, HH:mm')}
                              {isSent && ` · ${(m as SentMsg).twilio_status}`}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {thread.length === 0 && (
                      <div className="text-center text-sm text-muted-foreground py-8">No messages yet.</div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
              <div className="border-t p-3 bg-muted/30 text-xs text-muted-foreground text-center">
                Outbound replying from this UI is disabled. View-only inbox.
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
