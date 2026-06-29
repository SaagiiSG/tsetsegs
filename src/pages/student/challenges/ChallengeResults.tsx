import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Home, Swords } from 'lucide-react';
import { useChallenge } from '@/hooks/useChallenge';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { FORMAT_LABELS } from '@/lib/challengeScoring';

export default function ChallengeResults() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { student } = useStudentAuth();
  const { challenge, participants } = useChallenge(id ?? null);

  if (!challenge) {
    return <div className="container max-w-xl py-10 text-center text-muted-foreground">Loading…</div>;
  }

  const sorted = [...participants].sort((a, b) => {
    if (a.place && b.place) return a.place - b.place;
    return b.score - a.score || b.correct_count - a.correct_count || a.total_time_ms - b.total_time_ms;
  });

  const myPart = participants.find((p) => p.student_account_id === student?.id);
  const won = myPart?.place === 1;

  return (
    <div className="container max-w-xl py-6 space-y-5">
      <header className="text-center space-y-2">
        <Trophy className={`h-12 w-12 mx-auto ${won ? 'text-amber-500' : 'text-muted-foreground/40'}`} />
        <h1 className="text-2xl font-bold">{won ? 'You won!' : 'Race finished'}</h1>
        <p className="text-sm text-muted-foreground">
          {FORMAT_LABELS[challenge.format]} • {challenge.subject.toUpperCase()} • {challenge.question_set}
        </p>
      </header>

      <Card className="p-4 space-y-3">
        {sorted.map((p, i) => {
          const placeNum = p.place ?? i + 1;
          const medal = placeNum === 1 ? '🥇' : placeNum === 2 ? '🥈' : placeNum === 3 ? '🥉' : `#${placeNum}`;
          return (
            <div
              key={p.id}
              className={`flex items-center justify-between p-2 rounded ${
                p.student_account_id === student?.id ? 'bg-primary/10' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl w-8 text-center">{medal}</span>
                <div>
                  <div className="font-medium">{p.display_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.correct_count} correct • {Math.round(p.total_time_ms / 1000)}s
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold tabular-nums">{p.score}</div>
                <div className="text-xs text-muted-foreground">points</div>
              </div>
            </div>
          );
        })}
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => navigate('/practice/challenges')}>
          <Home className="h-4 w-4" /> Back
        </Button>
        <Button className="flex-1" onClick={() => navigate('/practice/challenges/new')}>
          <Swords className="h-4 w-4" /> New challenge
        </Button>
      </div>
    </div>
  );
}
