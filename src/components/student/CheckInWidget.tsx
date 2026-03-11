import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format, isToday, isAfter, subHours, addHours } from 'date-fns';
import { CheckCircle2, KeyRound, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CheckInWidgetProps {
  variant: 'sidebar' | 'banner';
}

export function CheckInWidget({ variant }: CheckInWidgetProps) {
  const { student } = useStudentAuth();
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [dismissed, setDismissed] = useState(false);

  // Find today's booked sessions that haven't been checked in
  const { data: todayBooking } = useQuery({
    queryKey: ['today-checkin-booking', student?.id],
    enabled: !!student?.id,
    refetchInterval: 60000, // refresh every minute
    queryFn: async () => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

      const { data, error } = await supabase
        .from('seat_bookings')
        .select('*, review_session:review_sessions(*)')
        .eq('student_account_id', student!.id)
        .is('cancelled_at', null)
        .is('checked_in_at', null);
      if (error) throw error;

      // Filter to today's sessions only
      const todayBookings = data?.filter(b => {
        const sessionDate = new Date((b.review_session as any)?.session_date);
        return isToday(sessionDate);
      });

      return todayBookings?.[0] || null;
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!todayBooking) throw new Error('No booking found');
      const session = todayBooking.review_session as any;
      
      // Verify the code matches
      const { data: sessionData, error: fetchError } = await supabase
        .from('review_sessions')
        .select('check_in_code')
        .eq('id', session.id)
        .single();
      
      if (fetchError) throw fetchError;
      if (!sessionData?.check_in_code) throw new Error('Check-in code not yet available. Ask your teacher.');
      if (code.toUpperCase() !== sessionData.check_in_code.toUpperCase()) throw new Error('Invalid code. Please try again.');

      // Update booking with check-in timestamp
      const { error } = await supabase
        .from('seat_bookings')
        .update({ checked_in_at: new Date().toISOString() })
        .eq('id', todayBooking.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['today-checkin-booking'] });
      toast.success('Checked in successfully!');
      setCode('');
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!todayBooking || dismissed) return null;

  const session = todayBooking.review_session as any;

  if (variant === 'banner') {
    return (
      <div className="bg-primary/10 border-b border-primary/20 px-4 py-2.5 flex items-center gap-3 justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <KeyRound className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="text-xs font-medium truncate">
            Check in: {session?.title} ({format(new Date(session?.session_date), 'HH:mm')})
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="CODE"
            className="h-7 w-24 text-xs font-mono uppercase px-2"
            maxLength={6}
          />
          <Button 
            size="sm" 
            className="h-7 px-2 text-xs"
            onClick={() => checkInMutation.mutate()}
            disabled={code.length !== 6 || checkInMutation.isPending}
          >
            {checkInMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Go'}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDismissed(true)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  // Sidebar variant
  return (
    <div className="mx-2 mb-2 rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold">Check In</span>
      </div>
      <p className="text-[11px] text-muted-foreground leading-tight">
        {session?.title} • {format(new Date(session?.session_date), 'HH:mm')}
      </p>
      <div className="flex gap-1.5">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="6-digit code"
          className="h-8 text-xs font-mono uppercase"
          maxLength={6}
        />
        <Button 
          size="sm" 
          className="h-8 px-3"
          onClick={() => checkInMutation.mutate()}
          disabled={code.length !== 6 || checkInMutation.isPending}
        >
          {checkInMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}
