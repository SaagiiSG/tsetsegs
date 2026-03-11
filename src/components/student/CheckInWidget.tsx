import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { Badge } from '@/components/ui/badge';
import { format, isAfter } from 'date-fns';
import { KeyRound, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CheckInWidgetProps {
  variant: 'sidebar' | 'banner';
}

export function CheckInWidget({ variant }: CheckInWidgetProps) {
  const { student } = useStudentAuth();

  // Find upcoming booked sessions with check-in codes
  const { data: upcomingBooking } = useQuery({
    queryKey: ['checkin-code-booking', student?.id],
    enabled: !!student?.id,
    refetchInterval: 60000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seat_bookings')
        .select('*, review_session:review_sessions(*)')
        .eq('student_account_id', student!.id)
        .is('cancelled_at', null)
        .is('checked_in_at', null);
      if (error) throw error;

      const now = new Date();
      const upcoming = data?.filter(b => {
        const session = b.review_session as any;
        if (!session) return false;
        const sessionEnd = session.session_end_date
          ? new Date(session.session_end_date)
          : new Date(new Date(session.session_date).getTime() + 2 * 60 * 60 * 1000);
        return isAfter(sessionEnd, now);
      });

      return upcoming?.sort((a, b) =>
        new Date((a.review_session as any).session_date).getTime() -
        new Date((b.review_session as any).session_date).getTime()
      )[0] || null;
    },
  });

  if (!upcomingBooking) return null;

  const session = upcomingBooking.review_session as any;
  const code = (upcomingBooking as any).check_in_code;

  if (!code) return null;

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied!');
  };

  if (variant === 'banner') {
    return (
      <div className="bg-primary/10 border-b border-primary/20 px-4 py-2.5 flex items-center gap-3 justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <KeyRound className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="text-xs font-medium truncate">
            Your check-in code for {session?.title}:
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge className="font-mono text-sm tracking-widest bg-primary/10 text-primary border-primary/20">
            {code}
          </Badge>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={copyCode}>
            <Copy className="h-3 w-3" />
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
        <span className="text-xs font-semibold">Your Check-in Code</span>
      </div>
      <p className="text-[11px] text-muted-foreground leading-tight">
        {session?.title} • {format(new Date(session?.session_date), 'MMM d, HH:mm')}
      </p>
      <div className="flex items-center gap-2">
        <Badge className="font-mono text-lg tracking-widest bg-primary/10 text-primary border-primary/20 px-3 py-1">
          {code}
        </Badge>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={copyCode}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">Show this code to your teacher</p>
    </div>
  );
}
