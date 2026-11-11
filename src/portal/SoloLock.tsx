import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/** What a free solo student sees in place of a Premium feature. Until checkout exists, the button opens the pricing section. */
export function SoloLock({ title }: { title: string }) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 p-6 text-center">
      <Lock className="h-6 w-6 text-muted-foreground" aria-hidden />
      <p className="font-semibold">{title}</p>
      {/* A plain link: the solo portal's router lives under /solo, and pricing is on the site root. */}
      <Button asChild><a href="/?lang=eng#pricing">Try Premium free for 7 days</a></Button>
    </Card>
  );
}
