import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/** Opens the checkout page (SoloPremium). No day count: early birds get 14, everyone else 7. */
const TryPremium = () => <Button asChild><Link to="/student/premium">Try Premium free</Link></Button>;

/** What a free solo student sees in place of a Premium feature. */
export function SoloLock({ title }: { title: string }) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 p-6 text-center">
      <Lock className="h-6 w-6 text-muted-foreground" aria-hidden />
      <p className="font-semibold">{title}</p>
      <TryPremium />
    </Card>
  );
}

/** A free solo student who solved every free question in a subject, shown in place of the next question. */
export function FreeSectionDone({ subject }: { subject: 'math' | 'english' }) {
  const name = subject === 'math' ? 'Math' : 'English';
  return (
    <Card className="text-center">
      <CardHeader>
        <CardTitle>You finished the free {name} section</CardTitle>
        <CardDescription>You solved every free {name} question. That's real work.</CardDescription>
      </CardHeader>
      <CardContent><TryPremium /></CardContent>
    </Card>
  );
}
