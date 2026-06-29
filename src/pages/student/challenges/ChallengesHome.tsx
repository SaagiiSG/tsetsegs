import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Swords, UserPlus, Users, X } from 'lucide-react';
import { useFriends } from '@/hooks/useFriends';
import { useMyChallenges } from '@/hooks/useChallenge';
import { FriendsList } from '@/components/student/challenges/FriendsList';
import { AddFriendDialog } from '@/components/student/challenges/AddFriendDialog';
import { FORMAT_LABELS } from '@/lib/challengeScoring';
import NewChallengeForm from '@/components/student/challenges/NewChallengeForm';
import { cn } from '@/lib/utils';

export default function ChallengesHome() {
  const navigate = useNavigate();
  const { accepted, incoming, outgoing, respond, remove } = useFriends();
  const { rows: myChallenges } = useMyChallenges();
  const [addOpen, setAddOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [preselectFriend, setPreselectFriend] = useState<string | null>(null);

  const active = myChallenges.filter((r) => r.challenge.status === 'lobby' || r.challenge.status === 'active');
  const recent = myChallenges.filter((r) => r.challenge.status === 'finished' || r.challenge.status === 'cancelled').slice(0, 10);
  const hasActive = active.length > 0;

  const goToChallenge = (id: string, status: string) => {
    if (status === 'lobby') navigate(`/practice/challenges/${id}/lobby`);
    else if (status === 'active') navigate(`/practice/challenges/${id}/play`);
    else navigate(`/practice/challenges/${id}/results`);
  };

  const openNewChallenge = (friend?: string) => {
    if (hasActive) {
      goToChallenge(active[0].challenge.id, active[0].challenge.status);
      return;
    }
    setPreselectFriend(friend ?? null);
    setDrawerOpen(true);
  };

  return (
    <>
      <div
        className={cn(
          'py-6 space-y-6 px-4 transition-all duration-300',
          drawerOpen ? 'max-w-3xl ml-0 mr-auto lg:ml-8' : 'container max-w-3xl',
        )}
      >
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Swords className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Challenges</h1>
              <p className="text-sm text-muted-foreground">Race your friends. First to the line wins.</p>
            </div>
          </div>
          <Button onClick={() => openNewChallenge()} disabled={drawerOpen}>
            <Swords className="h-4 w-4" /> New challenge
          </Button>
        </header>

        <Tabs defaultValue="active">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="active">
              Active {active.length > 0 && <Badge variant="secondary" className="ml-2">{active.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="friends">
              Friends {incoming.length > 0 && <Badge className="ml-2">{incoming.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-3 mt-4">
            {active.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No active challenges. Start one!
              </Card>
            ) : (
              active.map(({ challenge, participants }) => (
                <Card
                  key={challenge.id}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/40"
                  onClick={() => goToChallenge(challenge.id, challenge.status)}
                >
                  <div>
                    <div className="font-semibold">{FORMAT_LABELS[challenge.format]}</div>
                    <div className="text-xs text-muted-foreground">
                      {challenge.subject.toUpperCase()} • {challenge.question_set} •{' '}
                      {challenge.target_value ? `target ${challenge.target_value}` : `${challenge.duration_seconds}s`} •{' '}
                      {participants} player{participants > 1 ? 's' : ''}
                    </div>
                  </div>
                  <Badge variant={challenge.status === 'active' ? 'default' : 'secondary'}>{challenge.status}</Badge>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="friends" className="mt-4">
            <div className="flex justify-end mb-3">
              <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
                <UserPlus className="h-4 w-4" /> Add friend
              </Button>
            </div>
            <FriendsList
              friends={accepted}
              incoming={incoming}
              outgoing={outgoing}
              onAccept={(id) => respond(id, true)}
              onDecline={(id) => respond(id, false)}
              onRemove={(id) => remove(id)}
              onChallenge={(accountId) => openNewChallenge(accountId)}
            />
          </TabsContent>

          <TabsContent value="history" className="space-y-3 mt-4">
            {recent.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground">No past challenges yet.</Card>
            ) : (
              recent.map(({ challenge, my }) => (
                <Card
                  key={challenge.id}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/40"
                  onClick={() => navigate(`/practice/challenges/${challenge.id}/results`)}
                >
                  <div>
                    <div className="font-semibold">{FORMAT_LABELS[challenge.format]}</div>
                    <div className="text-xs text-muted-foreground">
                      {challenge.subject.toUpperCase()} • {challenge.question_set}
                    </div>
                  </div>
                  <Badge variant={my.place === 1 ? 'default' : 'secondary'}>
                    {my.place ? `#${my.place}` : challenge.status}
                  </Badge>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        <AddFriendDialog open={addOpen} onOpenChange={setAddOpen} />
      </div>

      {/* Right-side drawer */}
      <aside
        className={cn(
          'fixed top-0 right-0 h-full w-full sm:w-[480px] bg-background border-l shadow-2xl z-40 overflow-y-auto transition-transform duration-300',
          drawerOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none',
        )}
        aria-hidden={!drawerOpen}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b bg-background/95 backdrop-blur">
          <div className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">New challenge</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-5">
          {drawerOpen && (
            <NewChallengeForm
              preselectFriend={preselectFriend}
              onCreated={(id) => {
                setDrawerOpen(false);
                navigate(`/practice/challenges/${id}/lobby`);
              }}
            />
          )}
        </div>
      </aside>
    </>
  );
}
