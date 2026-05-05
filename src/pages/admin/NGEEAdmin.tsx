import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format, isAfter, isBefore } from 'date-fns';
import { CheckCircle2, QrCode, Copy, Loader2, RefreshCw, Undo2, Search } from 'lucide-react';
import QRCode from 'react-qr-code';
import { cn } from '@/lib/utils';

export default function NGEEAdmin() {
  const qc = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [showQR, setShowQR] = useState(false);
  const [search, setSearch] = useState('');
  const [code, setCode] = useState('');
  const codeInputRef = useRef<HTMLInputElement>(null);
  const [recentCheckins, setRecentCheckins] = useState<Array<{ id: string; name: string; seat: number; time: Date; alreadyChecked: boolean }>>([]);

  const { data: course } = useQuery({
    queryKey: ['ngee-admin-course'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ngee_courses').select('*').eq('is_active', true).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: sessions } = useQuery({
    queryKey: ['ngee-admin-sessions', course?.id],
    enabled: !!course?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from('ngee_sessions').select('*')
        .eq('course_id', course!.id).order('session_date', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Auto-select today's or next upcoming session
  useEffect(() => {
    if (!selectedSessionId && sessions?.length) {
      const now = new Date();
      const today = sessions.find(s => {
        const start = new Date(s.session_date);
        const end = new Date(s.session_end_date);
        return start.toDateString() === now.toDateString() || (now >= start && now <= end);
      }) ?? sessions.find(s => isAfter(new Date(s.session_end_date), now)) ?? sessions[sessions.length - 1];
      if (today) setSelectedSessionId(today.id);
    }
  }, [sessions, selectedSessionId]);

  const activeSession = sessions?.find(s => s.id === selectedSessionId) || null;

  const { data: bookings, refetch: refetchBookings } = useQuery({
    queryKey: ['ngee-admin-bookings', selectedSessionId],
    enabled: !!selectedSessionId,
    queryFn: async () => {
      const { data, error } = await supabase.from('ngee_bookings').select('*')
        .eq('session_id', selectedSessionId).order('booked_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  const activeBookings = useMemo(() => bookings?.filter(b => !b.cancelled_at) || [], [bookings]);
  const checkedInCount = activeBookings.filter(b => b.attended).length;

  const filteredBookings = useMemo(() => {
    if (!search) return activeBookings;
    const q = search.toLowerCase();
    return activeBookings.filter(b =>
      `${b.first_name} ${b.last_name}`.toLowerCase().includes(q)
      || b.phone.includes(q)
      || b.check_in_code.toLowerCase().includes(q)
      || String(b.seat_number) === q
    );
  }, [activeBookings, search]);

  const checkInMutation = useMutation({
    mutationFn: async (c: string) => {
      const { data, error } = await supabase.rpc('ngee_check_in_by_code', {
        p_session_id: selectedSessionId, p_code: c.trim().toUpperCase(),
      });
      if (error) throw new Error(error.message);
      return data?.[0];
    },
    onSuccess: (r) => {
      if (!r) { toast.error('No result'); return; }
      const name = `${r.first_name} ${r.last_name}`;
      if (r.already_checked) {
        toast.warning(`${name} already checked in at ${format(new Date(r.checked_in_at), 'HH:mm')}`);
      } else {
        toast.success(`✓ ${name} • Seat #${r.seat_number}`);
      }
      setRecentCheckins(prev => [{ id: r.id, name, seat: r.seat_number, time: new Date(), alreadyChecked: r.already_checked }, ...prev].slice(0, 10));
      setCode('');
      codeInputRef.current?.focus();
      refetchBookings();
    },
    onError: (e: any) => { toast.error(e.message); setCode(''); codeInputRef.current?.focus(); },
  });

  const undoMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase.rpc('ngee_undo_check_in', { p_booking_id: bookingId });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Check-in undone'); refetchBookings(); },
  });

  const toggleAttended = useMutation({
    mutationFn: async ({ id, attended }: { id: string; attended: boolean }) => {
      const { error } = await supabase.from('ngee_bookings').update({
        attended, checked_in_at: attended ? new Date().toISOString() : null,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => refetchBookings(),
  });

  const cancelBooking = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ngee_bookings').update({ cancelled_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Booking cancelled'); refetchBookings(); qc.invalidateQueries({ queryKey: ['ngee-taken-seats'] }); },
  });

  const regenerate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('generate_ngee_sessions', { p_course_id: course!.id, p_weeks_ahead: 12 });
      if (error) throw error;
      return data;
    },
    onSuccess: (n) => { toast.success(`Generated ${n} new sessions`); qc.invalidateQueries({ queryKey: ['ngee-admin-sessions'] }); },
  });

  const exportCSV = () => {
    if (!activeBookings.length) return;
    const rows = [
      ['First name','Last name','Phone','Seat','Code','Attended','Booked at','Checked in at'],
      ...activeBookings.map(b => [b.first_name, b.last_name, b.phone, b.seat_number, b.check_in_code, b.attended ? 'Yes' : 'No', b.booked_at, b.checked_in_at || ''])
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ngee-bookings-${format(new Date(activeSession!.session_date), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const publicUrl = 'https://flowersos.co/ngee';

  if (!course) return <div className="p-8 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{course.name}</h1>
          <p className="text-sm text-muted-foreground">Wed & Fri • {course.start_time.slice(0,5)}–{course.end_time.slice(0,5)} • Room {course.room}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success('Link copied'); }}>
            <Copy className="h-4 w-4 mr-2" />Copy link
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowQR(true)}>
            <QrCode className="h-4 w-4 mr-2" />QR
          </Button>
        </div>
      </div>

      {/* Session picker */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
          <SelectTrigger className="w-full sm:w-80"><SelectValue placeholder="Select a session" /></SelectTrigger>
          <SelectContent>
            {sessions?.map(s => {
              const past = isBefore(new Date(s.session_end_date), new Date());
              return (
                <SelectItem key={s.id} value={s.id}>
                  {format(new Date(s.session_date), 'EEE, MMM d • HH:mm')} {past && '(past)'}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => regenerate.mutate()} disabled={regenerate.isPending}>
          <RefreshCw className={cn("h-4 w-4 mr-2", regenerate.isPending && "animate-spin")} />Generate +12 weeks
        </Button>
      </div>

      <div className="space-y-4">
        {/* CHECK-IN */}
        {activeSession && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Today's Check-In</span>
                <Badge variant="secondary" className="text-base font-mono">{checkedInCount} / {activeBookings.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={e => { e.preventDefault(); if (code.trim()) checkInMutation.mutate(code); }}
                    className="flex gap-2">
                <Input ref={codeInputRef} autoFocus value={code} onChange={e => setCode(e.target.value.toUpperCase().slice(0, 4))}
                  placeholder="ENTER CODE"
                  className="font-mono text-3xl h-16 text-center tracking-widest uppercase" maxLength={4} />
                <Button type="submit" size="lg" className="h-16 px-8" disabled={checkInMutation.isPending || code.length < 4}>
                  {checkInMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Check in'}
                </Button>
              </form>
              <div className="space-y-1.5">
                {recentCheckins.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No check-ins yet</p>}
                {recentCheckins.map((c, i) => (
                  <div key={`${c.id}-${i}`} className={cn("flex items-center justify-between rounded-lg border p-2.5", c.alreadyChecked ? "bg-amber-500/5 border-amber-500/20" : "bg-primary/5 border-primary/20")}>
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className={cn("h-4 w-4", c.alreadyChecked ? "text-amber-500" : "text-primary")} />
                      <span className="font-medium text-sm">{c.name}</span>
                      <Badge variant="outline" className="text-xs">Seat #{c.seat}</Badge>
                      {c.alreadyChecked && <Badge variant="outline" className="text-xs text-amber-600 border-amber-500/30">already in</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{format(c.time, 'HH:mm:ss')}</span>
                      {!c.alreadyChecked && (Date.now() - c.time.getTime() < 30000) && (
                        <Button variant="ghost" size="sm" className="h-7" onClick={() => undoMutation.mutate(c.id)}>
                          <Undo2 className="h-3 w-3 mr-1" />Undo
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* BOOKINGS */}
        <div className="flex items-center gap-2 flex-wrap pt-2">
          <h2 className="text-lg font-semibold mr-auto">Bookings ({activeBookings.length})</h2>
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by name, phone, code or seat #" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!activeBookings.length}>Export CSV</Button>
        </div>
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Seat</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Booked</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No bookings yet</TableCell></TableRow>
                )}
                {filteredBookings.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono font-bold">#{b.seat_number}</TableCell>
                    <TableCell>{b.first_name} {b.last_name}</TableCell>
                    <TableCell className="font-mono text-xs">{b.phone}</TableCell>
                    <TableCell className="font-mono font-bold tracking-widest text-primary">{b.check_in_code}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(b.booked_at), 'MMM d HH:mm')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant={b.attended ? 'default' : 'outline'}
                          onClick={() => toggleAttended.mutate({ id: b.id, attended: !b.attended })}>
                          {b.attended ? '✓ Present' : 'Mark present'}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm('Cancel this booking?')) cancelBooking.mutate(b.id); }}>×</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* QR dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Public booking QR</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center gap-4 p-4">
            <div className="bg-white p-4 rounded-xl">
              <QRCode value={publicUrl} size={220} />
            </div>
            <code className="text-xs text-muted-foreground break-all text-center">{publicUrl}</code>
            <Button variant="outline" onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success('Copied'); }}>
              <Copy className="h-4 w-4 mr-2" />Copy link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
