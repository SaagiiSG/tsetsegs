import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Swords, UserPlus, Users } from 'lucide-react';
import { useFriends } from '@/hooks/useFriends';
import { useMyChallenges } from '@/hooks/useChallenge';
import { FriendsList } from '@/components/student/challenges/FriendsList';
import { AddFriendDialog } from '@/components/student/challenges/AddFriendDialog';
import { FORMAT_LABELS } from '@/lib/challengeScoring';

export default function ChallengesHome() {
  const navigate = useNavigate();
  const { accepted, incoming, outgoing, respond, remove } = useFriends();
  const { rows: myChallenges } = useMyChallenges();
  const [addOpen, setAddOpen] = useState(false);

  const active = myChallenges.filter((r) => r.challenge.status === 'lobby' || r.challenge.status === 'active');
  const recent = myChallenges.filter((r) => r.challenge.status === 'finished' || r.challenge.status === 'cancelled').slice(0, 10);

  const goToChallenge = (id: string, status: string) => {
    if (status === 'lobby') navigate(`/practice/challenges/${id}/lobby`);
    else if (status === 'active') navigate(`/practice/challenges/${id}/play`);
    else navigate(`/practice/challenges/${id}/results`);
  };

  return (
    <div className="container max-w-3xl py-6 space-y-6">
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
        <Button onClick={() => navigate('/practice/challenges/new')}>
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
            onChallenge={(accountId) => navigate(`/practice/challenges/new?friend=${accountId}`)}
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
  );
}
