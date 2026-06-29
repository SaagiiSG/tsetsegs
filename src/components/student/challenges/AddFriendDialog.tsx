import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useFriends } from '@/hooks/useFriends';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function AddFriendDialog({ open, onOpenChange }: Props) {
  const { sendRequest } = useFriends();
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async () => {
    setSending(true);
    const { error } = await sendRequest(phone);
    setSending(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Friend request sent');
      setPhone('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a friend</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Type your friend's phone number. They have to be enrolled in SAT and have signed in at least once.
        </p>
        <Input
          placeholder="88112233"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={sending || !phone.trim()}>
            {sending ? 'Sending…' : 'Send request'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
