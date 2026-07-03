import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Clock, Crown, X } from 'lucide-react';
import { useChallenge } from '@/hooks/useChallenge';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { FORMAT_LABELS } from '@/lib/challengeScoring';
import { toast } from 'sonner';

export default function ChallengeLobby() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { student } = useStudentAuth();
  const { challenge, participants, setReady, startChallenge, cancelChallenge } = useChallenge(id ?? null);

  const myPart = participants.find((p) => p.student_account_id === student?.id);
  const isHost = challenge?.host_account_id === student?.id;
  const allReady = participants.length >= 2 && participants.every((p) => p.ready_at);

  useEffect(() => {
    if (challenge?.status === 'active') {
      if (challenge.format === 'fixed_set') {
        navigate(`/practice/challenges/${id}/play`);
      } else {
        // Ambient formats: student practices normally, HUD tracks progress
        navigate(challenge.subject === 'english' ? '/english-practice' : '/practice');
      }
    }
    if (challenge?.status === 'finished') navigate(`/practice/challenges/${id}/results`);
    if (challenge?.status === 'cancelled') {
      toast('Challenge cancelled');
      navigate('/practice/challenges');
    }
  }, [challenge?.status, challenge?.format, challenge?.subject, id, navigate]);

  if (!challenge) {
    return <div className="container max-w-xl py-10 text-center text-muted-foreground">Loading lobby…</div>;
  }

  const handleStart = async () => {
    const { error } = await startChallenge();
    if (error) toast.error(error);
  };

  return (
    <div className="container max-w-xl py-6 space-y-5">
      <header>
        <h1 className="text-2xl font-bold">{FORMAT_LABELS[challenge.format]}</h1>
        <p className="text-sm text-muted-foreground">
          {challenge.subject.toUpperCase()} • {challenge.question_set} •{' '}
          {challenge.format === 'time_sprint' ? `${(challenge.duration_seconds ?? 0) / 60} min` : `target ${challenge.target_value}`}
        </p>
      </header>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold text-sm text-muted-foreground">Players ({participants.length}/{challenge.max_players})</h2>
        {participants.map((p) => (
          <div key={p.id} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {p.student_account_id === challenge.host_account_id && <Crown className="h-4 w-4 text-amber-500" />}
              <span className="font-medium">{p.display_name ?? 'Player'}</span>
              {p.student_account_id === student?.id && <span className="text-xs text-muted-foreground">(you)</span>}
            </div>
            {p.ready_at ? (
              <span className="text-xs text-emerald-600 flex items-center gap-1">
                <Check className="h-3 w-3" /> Ready
              </span>
            ) : (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Waiting
              </span>
            )}
          </div>
        ))}
      </Card>

      <div className="flex flex-col gap-2">
        {myPart && !myPart.ready_at && (
          <Button size="lg" onClick={() => setReady(true)}>
            <Check className="h-4 w-4" /> I'm ready
          </Button>
        )}
        {myPart && myPart.ready_at && !isHost && (
          <Button variant="outline" size="lg" onClick={() => setReady(false)}>
            Cancel ready
          </Button>
        )}
        {isHost && (
          <Button size="lg" onClick={handleStart} disabled={!allReady}>
            Start race {!allReady && '(waiting for all)'}
          </Button>
        )}
        {isHost && (
          <Button variant="ghost" onClick={cancelChallenge}>
            <X className="h-4 w-4" /> Cancel challenge
          </Button>
        )}
      </div>
    </div>
  );
}
