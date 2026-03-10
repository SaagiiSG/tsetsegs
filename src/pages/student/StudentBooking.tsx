import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { SeatGrid } from '@/components/student/SeatGrid';
import { toast } from 'sonner';
import { format, isBefore, isAfter, formatDistanceToNow } from 'date-fns';
import { Calendar, Clock, MapPin, Armchair, Ban, AlertTriangle, CheckCircle2, X } from 'lucide-react';

export default function StudentBooking() {
  const { student } = useStudentAuth();
  const queryClient = useQueryClient();
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
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
      if (!selectedSession || !selectedSeat || !student) throw new Error('Missing data');
      const { error } = await supabase.from('seat_bookings').insert({
        review_session_id: selectedSession.id,
        student_account_id: student.id,
        seat_number: selectedSeat,
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
      toast.success(`Seat #${selectedSeat} booked!`);
      setShowConfirm(false);
      setSelectedSession(null);
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

  // Ban banner
  if (activeBan) {
    return (
      <div className="space-y-6">
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
    <div className="space-y-6">
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

      {/* Upcoming Sessions */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-2">Upcoming Sessions</h2>
        {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {sessions?.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No upcoming review sessions</p>}
        <div className="grid gap-3">
          {sessions?.map(session => {
            const takenSeats = getSessionBookings(session.id);
            const myBooking = getMyBookingForSession(session.id);
            const isClosed = isBefore(new Date(session.booking_closes_at), now);
            const available = session.total_seats - takenSeats.length;

            return (
              <Card key={session.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => {
                if (!myBooking) {
                  setSelectedSession(session);
                  setSelectedSeat(null);
                }
              }}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[50px]">
                        <div className="text-2xl font-bold">{format(new Date(session.session_date), 'd')}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(session.session_date), 'MMM')}</div>
                      </div>
                      <div>
                        <div className="font-semibold">{session.title}</div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(session.session_date), 'HH:mm')}</span>
                          {session.room && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{session.room}</span>}
                          <span className="flex items-center gap-1"><Armchair className="h-3 w-3" />{available} left</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {myBooking ? (
                        <Badge className="bg-primary/10 text-primary border-primary/20">Booked • Seat #{myBooking.seat_number}</Badge>
                      ) : isClosed ? (
                        <Badge variant="outline" className="text-amber-600 border-amber-300"><AlertTriangle className="h-3 w-3 mr-1" />Closed</Badge>
                      ) : available === 0 ? (
                        <Badge variant="destructive">Full</Badge>
                      ) : (
                        <Badge variant="secondary">Book Now</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Seat Selection Dialog */}
      <Dialog open={!!selectedSession} onOpenChange={(open) => { if (!open) { setSelectedSession(null); setSelectedSeat(null); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedSession?.title}</DialogTitle>
            <DialogDescription>
              {selectedSession && format(new Date(selectedSession.session_date), 'EEEE, MMMM d • HH:mm')}
              {selectedSession?.room && ` • ${selectedSession.room}`}
            </DialogDescription>
          </DialogHeader>

          {selectedSession && (
            <>
              {isBefore(new Date(selectedSession.booking_closes_at), now) ? (
                <div className="py-6 text-center">
                  <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Booking has closed for this session</p>
                </div>
              ) : (
                <SeatGrid
                  totalSeats={selectedSession.total_seats}
                  takenSeats={getSessionBookings(selectedSession.id)}
                  selectedSeat={selectedSeat}
                  onSelectSeat={setSelectedSeat}
                />
              )}
            </>
          )}

          {selectedSeat && !isBefore(new Date(selectedSession?.booking_closes_at), now) && (
            <DialogFooter>
              <Button className="w-full" onClick={() => setShowConfirm(true)}>
                <Armchair className="h-4 w-4 mr-2" />
                Book Seat #{selectedSeat}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Booking</DialogTitle>
            <DialogDescription>
              You're booking <span className="font-semibold">Seat #{selectedSeat}</span> for{' '}
              <span className="font-semibold">{selectedSession?.title}</span>.
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
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button onClick={() => bookMutation.mutate()} disabled={bookMutation.isPending}>
              {bookMutation.isPending ? 'Booking...' : 'Confirm Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
