import { useNavigate, useSearchParams } from 'react-router-dom';
import { Swords } from 'lucide-react';
import NewChallengeForm from '@/components/student/challenges/NewChallengeForm';

export default function NewChallenge() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preselectFriend = params.get('friend');

  return (
    <div className="container max-w-2xl py-6 space-y-5">
      <header className="flex items-center gap-3">
        <Swords className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">New challenge</h1>
      </header>
      <NewChallengeForm
        preselectFriend={preselectFriend}
        onCreated={(id) => navigate(`/practice/challenges/${id}/lobby`)}
      />
    </div>
  );
}
