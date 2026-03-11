import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { SeatGrid } from '@/components/student/SeatGrid';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { format, isBefore, isAfter, formatDistanceToNow } from 'date-fns';
import { Calendar, Clock, MapPin, Armchair, Ban, AlertTriangle, CheckCircle2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StudentBooking() {
  const { student } = useStudentAuth();
  const queryClient = useQueryClient();
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [confirmSessionData, setConfirmSessionData] = useState<{ session: any; seat: number } | null>(null);
  const now = new Date();

  // Check if student is banned
  const { data: activeBan } = useQuery({
    queryKey: ['booking-ban', student?.id],
    enabled: !!student?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_bans')
        .select('*')
        .eq('student_account_id', student!.id)
        .gt('banned_until', new Date().toISOString())
        .order('banned_until', { ascending: false })
        .limit(1);
      if (error) throw error;
      return data?.[0] || null;
    },
  });

  // Fetch upcoming sessions
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['student-review-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('review_sessions')
        .select('*')
        .eq('is_active', true)
        .gt('session_date', new Date().toISOString())
        .order('session_date', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch all bookings for display
  const { data: allBookings } = useQuery({
    queryKey: ['all-session-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seat_bookings')
        .select('review_session_id, seat_number, student_account_id, cancelled_at')
        .is('cancelled_at', null);
      if (error) throw error;
      return data;
    },
  });

  // Fetch my bookings
  const { data: myBookings } = useQuery({
    queryKey: ['my-bookings', student?.id],
    enabled: !!student?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seat_bookings')
        .select('*, review_session:review_sessions(*)')
        .eq('student_account_id', student!.id)
        .is('cancelled_at', null)
        .order('booked_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!confirmSessionData || !student) throw new Error('Missing data');
      const { error } = await supabase.from('seat_bookings').insert({
        review_session_id: confirmSessionData.session.id,
        student_account_id: student.id,
        seat_number: confirmSessionData.seat,
      });
      if (error) {
        if (error.message.includes('idx_unique_seat_per_session')) throw new Error('This seat was just taken! Pick another.');
        if (error.message.includes('idx_unique_student_per_session')) throw new Error('You already have a booking for this session.');
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-session-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      toast.success(`Seat #${confirmSessionData?.seat} booked!`);
      setShowConfirm(false);
      setConfirmSessionData(null);
      setConfirmText('');
      setExpandedSession(null);
      setSelectedSeat(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase.from('seat_bookings')
        .update({ cancelled_at: new Date().toISOString() })
        .eq('id', bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-session-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      toast.success('Booking cancelled');
    },
  });

  const getSessionBookings = (sessionId: string) => {
    return allBookings?.filter(b => b.review_session_id === sessionId).map(b => b.seat_number) || [];
  };

  const getMyBookingForSession = (sessionId: string) => {
    return myBookings?.find(b => (b.review_session as any)?.id === sessionId);
  };

  const handleBookSeat = (session: any, seat: number) => {
    setConfirmSessionData({ session, seat });
    setConfirmText('');
    setShowConfirm(true);
  };

  const getExpectedConfirmText = () => {
    if (!confirmSessionData) return '';
    return `I understand that I am booking #${confirmSessionData.seat} on ${format(new Date(confirmSessionData.session.session_date), 'd MMM')} and not showing to the session will result in 2 week ban from booking review session`;
  };

  // Ban banner
  if (activeBan) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <h1 className="text-2xl font-bold">Book a Seat</h1>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <Ban className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-destructive">Booking Suspended</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  You missed a review session without cancelling your booking. Your booking privileges are suspended until{' '}
                  <span className="font-medium text-foreground">{format(new Date(activeBan.banned_until), 'MMMM d, yyyy')}</span>.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Time remaining: <span className="font-medium">{formatDistanceToNow(new Date(activeBan.banned_until))}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-bold">Book a Seat</h1>

      {/* My Upcoming Bookings */}
      {myBookings && myBookings.filter(b => isAfter(new Date((b.review_session as any)?.session_date), now)).length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">My Bookings</h2>
          <div className="grid gap-2">
            {myBookings.filter(b => isAfter(new Date((b.review_session as any)?.session_date), now)).map(b => {
              const session = b.review_session as any;
              const canCancel = isBefore(now, new Date(session?.booking_closes_at));
              return (
                <Card key={b.id} className="border-primary/20 bg-primary/5">
                  <CardContent className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{session?.title}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{format(new Date(session?.session_date), 'MMM d, HH:mm')}{session?.session_end_date ? ` – ${format(new Date(session.session_end_date), 'HH:mm')}` : ''}</span>
                          <span>•</span>
                          <span>Seat #{b.seat_number}</span>
                          {session?.room && <><span>•</span><span>{session.room}</span></>}
                        </div>
                      </div>
                    </div>
                    {canCancel && (
                      <Button variant="ghost" size="sm" onClick={() => cancelMutation.mutate(b.id)} className="text-destructive hover:text-destructive">
                        <X className="h-4 w-4 mr-1" /> Cancel
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Sessions - Full Width Primary + Dropdown */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Upcoming Sessions</h2>
        {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {sessions?.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No upcoming review sessions</p>}
        
        {sessions && sessions.length > 0 && (() => {
          const activeSession = selectedSessionId 
            ? sessions.find(s => s.id === selectedSessionId) || sessions[0]
            : sessions[0];
          const otherSessions = sessions.filter(s => s.id !== activeSession.id).slice(0, 10);
          const takenSeats = getSessionBookings(activeSession.id);
          const myBooking = getMyBookingForSession(activeSession.id);
          const isClosed = isBefore(new Date(activeSession.booking_closes_at), now);
          const available = activeSession.total_seats - takenSeats.length;

          return (
            <div className="space-y-3">
              {/* Session Selector Dropdown */}
              {otherSessions.length > 0 && (
                <div className="relative" ref={dropdownRef}>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => setShowSessionDropdown(!showSessionDropdown)}
                  >
                    <span className="truncate">{activeSession.title} — {format(new Date(activeSession.session_date), 'MMM d, HH:mm')}</span>
                    <ChevronDown className={cn("h-4 w-4 ml-2 transition-transform", showSessionDropdown && "rotate-180")} />
                  </Button>
                  {showSessionDropdown && (
                    <div className="absolute z-50 w-full mt-1 rounded-lg border bg-popover shadow-lg overflow-hidden">
                      {/* Current session */}
                      <button
                        className="w-full px-4 py-3 text-left hover:bg-accent/50 flex items-center gap-3 bg-primary/5 border-l-2 border-primary"
                        onClick={() => setShowSessionDropdown(false)}
                      >
                        <div className="text-center min-w-[36px]">
                          <div className="text-sm font-bold text-primary">{format(new Date(activeSession.session_date), 'd')}</div>
                          <div className="text-[9px] font-medium text-primary/70 uppercase">{format(new Date(activeSession.session_date), 'MMM')}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{activeSession.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(activeSession.session_date), 'HH:mm')}{activeSession.session_end_date ? `–${format(new Date(activeSession.session_end_date), 'HH:mm')}` : ''}
                            {activeSession.room ? ` • ${activeSession.room}` : ''}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex-shrink-0">Current</Badge>
                      </button>
                      {/* Other sessions */}
                      {otherSessions.map(s => {
                        const sTaken = getSessionBookings(s.id);
                        const sMyBooking = getMyBookingForSession(s.id);
                        const sAvailable = s.total_seats - sTaken.length;
                        return (
                          <button
                            key={s.id}
                            className="w-full px-4 py-3 text-left hover:bg-accent/50 flex items-center gap-3 border-t border-border/50"
                            onClick={() => {
                              setSelectedSessionId(s.id);
                              setShowSessionDropdown(false);
                              setSelectedSeat(null);
                              setExpandedSession(null);
                            }}
                          >
                            <div className="text-center min-w-[36px]">
                              <div className="text-sm font-bold text-primary">{format(new Date(s.session_date), 'd')}</div>
                              <div className="text-[9px] font-medium text-primary/70 uppercase">{format(new Date(s.session_date), 'MMM')}</div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{s.title}</div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(s.session_date), 'HH:mm')}{s.session_end_date ? `–${format(new Date(s.session_end_date), 'HH:mm')}` : ''}
                                {s.room ? ` • ${s.room}` : ''}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                <Armchair className="h-2.5 w-2.5 mr-0.5" />{sAvailable}/{s.total_seats}
                              </Badge>
                              {sMyBooking && (
                                <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5 py-0">
                                  <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />#{sMyBooking.seat_number}
                                </Badge>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Full-width Session Card */}
              <Card className={cn(
                "w-full transition-all",
                myBooking && "border-primary/20 bg-primary/5"
              )}>
                <CardContent className="p-5 md:p-6">
                  {/* Session Header */}
                  <div className="flex items-start gap-4 mb-5">
                    <div className="text-center min-w-[56px] bg-primary/5 rounded-xl p-3">
                      <div className="text-2xl font-bold text-primary">{format(new Date(activeSession.session_date), 'd')}</div>
                      <div className="text-xs font-medium text-primary/70 uppercase">{format(new Date(activeSession.session_date), 'MMM')}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-lg">{activeSession.title}</div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{format(new Date(activeSession.session_date), 'HH:mm')}{activeSession.session_end_date ? `–${format(new Date(activeSession.session_end_date), 'HH:mm')}` : ''}</span>
                        {activeSession.room && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{activeSession.room}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs px-2 py-0.5">
                          <Armchair className="h-3 w-3 mr-1" />{available}/{activeSession.total_seats}
                        </Badge>
                        {activeSession.subject && <Badge variant="outline" className="text-xs px-2 py-0.5">{activeSession.subject}</Badge>}
                        {myBooking && (
                          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs px-2 py-0.5">
                            <CheckCircle2 className="h-3 w-3 mr-1" />Seat #{myBooking.seat_number}
                          </Badge>
                        )}
                        {isClosed && !myBooking && (
                          <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs px-2 py-0.5">Closed</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Full Seat Grid */}
                  <div className="rounded-lg border bg-muted/10 p-4">
                    <SeatGrid
                      totalSeats={activeSession.total_seats}
                      takenSeats={takenSeats}
                      selectedSeat={selectedSeat}
                      onSelectSeat={(seat) => {
                        if (myBooking || isClosed || available === 0) return;
                        setExpandedSession(activeSession.id);
                        setSelectedSeat(seat);
                      }}
                      disabled={!!myBooking || isClosed || available === 0}
                      myBookedSeat={myBooking?.seat_number}
                    />
                  </div>

                  {/* Book button */}
                  {selectedSeat && !myBooking && !isClosed && available > 0 && expandedSession === activeSession.id && (
                    <Button className="mt-4 w-full" size="lg" onClick={() => handleBookSeat(activeSession, selectedSeat)}>
                      <Armchair className="h-4 w-4 mr-2" />Book Seat #{selectedSeat}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })()}
      </div>

      {/* Typed Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={(open) => { if (!open) { setShowConfirm(false); setConfirmText(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Booking</DialogTitle>
            <DialogDescription>
              You're booking <span className="font-semibold">Seat #{confirmSessionData?.seat}</span> for{' '}
              <span className="font-semibold">{confirmSessionData?.session?.title}</span>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3">
            <div className="flex gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-amber-700 dark:text-amber-400">
                If you don't attend without cancelling, you'll be banned from booking for <strong>2 weeks</strong>.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              To confirm, type the following sentence exactly:
            </p>
            <div className="rounded-md bg-muted/50 border p-3 text-sm font-medium select-all">
              {getExpectedConfirmText()}
            </div>
            <Textarea
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type the sentence above..."
              className="min-h-[80px] text-sm"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => { setShowConfirm(false); setConfirmText(''); }}>Cancel</Button>
            <Button 
              onClick={() => bookMutation.mutate()} 
              disabled={bookMutation.isPending || confirmText !== getExpectedConfirmText()}
            >
              {bookMutation.isPending ? 'Booking...' : 'Confirm Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
