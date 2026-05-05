import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { SeatGrid } from '@/components/student/SeatGrid';
import { toast } from 'sonner';
import { format, isAfter, isBefore, formatDistanceToNow } from 'date-fns';
import { Clock, MapPin, Armchair, CheckCircle2, Copy, Loader2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { z } from 'zod';

const bookingSchema = z.object({
  first_name: z.string().trim().min(1, 'Required').max(50),
  last_name: z.string().trim().min(1, 'Required').max(50),
  phone: z.string().trim().min(8, 'Phone must be at least 8 digits').max(20),
});

function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('976')) return '+' + digits;
  if (digits.length === 8) return '+976' + digits;
  return '+' + digits;
}

export default function NGEEBooking() {
  const qc = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '' });
  const [success, setSuccess] = useState<{ seat: number; code: string; sessionTitle: string } | null>(null);
  const [showSessionList, setShowSessionList] = useState(false);

  const { data: course } = useQuery({
    queryKey: ['ngee-course'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ngee_courses').select('*').eq('is_active', true).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: sessions } = useQuery({
    queryKey: ['ngee-sessions', course?.id],
    enabled: !!course?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ngee_sessions').select('*')
        .eq('course_id', course!.id).eq('is_cancelled', false)
        .gt('session_end_date', new Date().toISOString())
        .order('session_date', { ascending: true }).limit(20);
      if (error) throw error;
      return data;
    },
  });

  const { data: takenSeatsAll } = useQuery({
    queryKey: ['ngee-taken-seats'],
    enabled: !!sessions?.length,
    queryFn: async () => {
      const { data, error } = await supabase.from('ngee_session_taken_seats').select('*');
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });

  const activeSession = useMemo(() => {
    if (!sessions?.length) return null;
    return sessions.find(s => s.id === selectedSessionId) || sessions[0];
  }, [sessions, selectedSessionId]);

  const sessionTakenSeats = useMemo(
    () => takenSeatsAll?.filter(t => t.session_id === activeSession?.id).map(t => t.seat_number) || [],
    [takenSeatsAll, activeSession]
  );

  const now = new Date();
  const isOpen = activeSession && isAfter(now, new Date(activeSession.booking_opens_at)) && isBefore(now, new Date(activeSession.booking_closes_at));
  const notYetOpen = activeSession && isBefore(now, new Date(activeSession.booking_opens_at));
  const isClosed = activeSession && isAfter(now, new Date(activeSession.booking_closes_at));
  const available = activeSession ? activeSession.total_seats - sessionTakenSeats.length : 0;

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!activeSession || selectedSeat == null) throw new Error('Pick a seat');
      const parsed = bookingSchema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      const phone = normalizePhone(form.phone);
      const { data, error } = await supabase.from('ngee_bookings').insert({
        session_id: activeSession.id,
        first_name: parsed.data.first_name,
        last_name: parsed.data.last_name,
        phone,
        seat_number: selectedSeat,
        check_in_code: '', // trigger replaces
      }).select('seat_number, check_in_code').single();
      if (error) {
        if (error.message.includes('idx_ngee_unique_seat')) throw new Error('This seat was just taken — pick another.');
        if (error.message.includes('idx_ngee_unique_phone')) throw new Error('This phone already booked a seat for this session.');
        throw new Error(error.message);
      }
      return data;
    },
    onSuccess: (d) => {
      setSuccess({ seat: d.seat_number, code: d.check_in_code, sessionTitle: format(new Date(activeSession!.session_date), 'EEE, MMM d • HH:mm') });
      setShowForm(false);
      setSelectedSeat(null);
      setForm({ first_name: '', last_name: '', phone: '' });
      qc.invalidateQueries({ queryKey: ['ngee-taken-seats'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!course) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-primary/20">
          <CardContent className="p-8 text-center space-y-6">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Booking Confirmed</h1>
              <p className="text-sm text-muted-foreground mt-1">{success.sessionTitle} • Room {course.room}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border bg-card p-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Seat</div>
                <div className="font-mono text-3xl font-bold mt-1">#{success.seat}</div>
              </div>
              <div className="rounded-xl border-2 border-primary bg-primary/5 p-4">
                <div className="text-xs text-primary uppercase tracking-wider font-medium">Check-in code</div>
                <div className="font-mono text-3xl font-bold mt-1 text-primary tracking-widest">{success.code}</div>
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 p-4 text-sm text-left space-y-1">
              <p className="font-medium">📌 Save this code</p>
              <p className="text-muted-foreground">Багшид энэ кодыг хэлснээр ирц бүртгүүлнэ. Show this code to the teacher when you arrive.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => {
                navigator.clipboard.writeText(`Seat #${success.seat} • Code ${success.code}`);
                toast.success('Copied');
              }}>
                <Copy className="h-4 w-4 mr-2" /> Copy
              </Button>
              <Button className="flex-1" onClick={() => setSuccess(null)}>Done</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-5">
        {/* Header */}
        <div className="text-center pt-4">
          <Badge variant="secondary" className="mb-2">Free Course</Badge>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{course.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">Wed & Fri • {course.start_time.slice(0,5)}–{course.end_time.slice(0,5)} • Room {course.room}</p>
        </div>

        {!sessions?.length && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No upcoming sessions</CardContent></Card>
        )}

        {activeSession && (
          <>
            {/* Session selector */}
            {sessions && sessions.length > 1 && (
              <div className="relative">
                <Button variant="outline" className="w-full justify-between" onClick={() => setShowSessionList(!showSessionList)}>
                  <span>{format(new Date(activeSession.session_date), 'EEE, MMM d • HH:mm')}</span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", showSessionList && "rotate-180")} />
                </Button>
                {showSessionList && (
                  <div className="absolute z-50 w-full mt-1 rounded-lg border bg-popover shadow-lg overflow-hidden max-h-72 overflow-y-auto">
                    {sessions.map(s => {
                      const taken = takenSeatsAll?.filter(t => t.session_id === s.id).length || 0;
                      const avail = s.total_seats - taken;
                      return (
                        <button key={s.id}
                          className={cn("w-full px-4 py-3 text-left hover:bg-accent/50 flex items-center justify-between border-b last:border-b-0", s.id === activeSession.id && "bg-primary/5")}
                          onClick={() => { setSelectedSessionId(s.id); setSelectedSeat(null); setShowSessionList(false); }}>
                          <span className="text-sm">{format(new Date(s.session_date), 'EEE, MMM d • HH:mm')}</span>
                          <Badge variant={avail > 0 ? 'secondary' : 'outline'} className="text-xs"><Armchair className="h-3 w-3 mr-1" />{avail}/{s.total_seats}</Badge>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Status banner */}
            <Card className={cn(notYetOpen && "border-amber-500/30 bg-amber-500/5", isClosed && "border-destructive/30 bg-destructive/5", isOpen && "border-primary/20")}>
              <CardContent className="p-4 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{format(new Date(activeSession.session_date), 'EEEE, MMM d')}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      {format(new Date(activeSession.session_date), 'HH:mm')}–{format(new Date(activeSession.session_end_date), 'HH:mm')}
                      <span>•</span><MapPin className="h-3 w-3" />Room {course.room}
                    </div>
                  </div>
                </div>
                <Badge variant="secondary"><Armchair className="h-3 w-3 mr-1" />{available}/{activeSession.total_seats}</Badge>
              </CardContent>
              {notYetOpen && (
                <div className="border-t px-4 py-2.5 text-xs text-amber-600 dark:text-amber-400">
                  Booking opens in {formatDistanceToNow(new Date(activeSession.booking_opens_at))}
                </div>
              )}
              {isClosed && (
                <div className="border-t px-4 py-2.5 text-xs text-destructive">Booking closed (2 hours before class)</div>
              )}
              {isOpen && (
                <div className="border-t px-4 py-2.5 text-xs text-muted-foreground">
                  Booking closes {formatDistanceToNow(new Date(activeSession.booking_closes_at), { addSuffix: true })}
                </div>
              )}
            </Card>

            {/* Seat grid */}
            <Card>
              <CardContent className="p-4 md:p-6">
                <SeatGrid
                  totalSeats={activeSession.total_seats}
                  takenSeats={sessionTakenSeats}
                  selectedSeat={selectedSeat}
                  onSelectSeat={(s) => { setSelectedSeat(s); setShowForm(true); }}
                  disabled={!isOpen}
                />
              </CardContent>
            </Card>
          </>
        )}

        {/* Booking form modal */}
        <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); setSelectedSeat(null); }}}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Book Seat #{selectedSeat}</DialogTitle>
              <DialogDescription>Enter your details to reserve this seat.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>First name</Label>
                  <Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} maxLength={50} autoFocus />
                </div>
                <div>
                  <Label>Last name</Label>
                  <Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} maxLength={50} />
                </div>
              </div>
              <div>
                <Label>Phone (Mongolia)</Label>
                <Input type="tel" inputMode="tel" placeholder="9999 0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} maxLength={20} />
                <p className="text-[11px] text-muted-foreground mt-1">+976 prefix added automatically for 8-digit numbers</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowForm(false); setSelectedSeat(null); }}>Cancel</Button>
              <Button onClick={() => bookMutation.mutate()} disabled={bookMutation.isPending}>
                {bookMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirm booking
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
