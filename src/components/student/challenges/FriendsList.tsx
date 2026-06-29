import { FriendRow } from '@/hooks/useFriends';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check, X, UserMinus, Phone } from 'lucide-react';

interface Props {
  friends: FriendRow[];
  incoming: FriendRow[];
  outgoing: FriendRow[];
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onRemove: (id: string) => void;
  onChallenge?: (friendAccountId: string) => void;
}

export function FriendsList({ friends, incoming, outgoing, onAccept, onDecline, onRemove, onChallenge }: Props) {
  return (
    <div className="space-y-6">
      {incoming.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Incoming requests</h3>
          <div className="space-y-2">
            {incoming.map((r) => (
              <Card key={r.id} className="p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{r.friend_name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {r.friend_phone}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => onAccept(r.id)}>
                    <Check className="h-4 w-4" /> Accept
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onDecline(r.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Friends ({friends.length})</h3>
        {friends.length === 0 ? (
          <p className="text-sm text-muted-foreground">No friends yet. Add one by phone number to start challenging.</p>
        ) : (
          <div className="space-y-2">
            {friends.map((r) => (
              <Card key={r.id} className="p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{r.friend_name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {r.friend_phone}
                  </div>
                </div>
                <div className="flex gap-2">
                  {onChallenge && (
                    <Button size="sm" onClick={() => onChallenge(r.friend_account_id)}>
                      Challenge
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => onRemove(r.id)} aria-label="Remove friend">
                    <UserMinus className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {outgoing.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Sent requests</h3>
          <div className="space-y-2">
            {outgoing.map((r) => (
              <Card key={r.id} className="p-3 flex items-center justify-between opacity-70">
                <div>
                  <div className="font-medium">{r.friend_name}</div>
                  <div className="text-xs text-muted-foreground">Waiting to accept</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => onRemove(r.id)}>
                  Cancel
                </Button>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
