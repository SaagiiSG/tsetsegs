import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

/**
 * A seat belongs to the first phone that joined with that number, so a student who switched phones is told
 * "This exam is open on another phone". Releasing lets the next phone that joins with their number take the seat.
 */
export function ReleaseSeatButton({ participantId, name }: { participantId: string; name: string }) {
  const release = async () => {
    const { error } = await supabase.rpc('class_test_release_seat', { p_participant: participantId });
    if (error) toast.error(error.message);
    else toast.success(`${name} can join again on the new phone`);
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground">
          Release seat
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Release {name}'s seat?</AlertDialogTitle>
          <AlertDialogDescription>
            Only for a student who switched phones. The next phone that joins with their number takes the seat, with
            their saved answers. The old phone stops working.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={release}>Release seat</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
