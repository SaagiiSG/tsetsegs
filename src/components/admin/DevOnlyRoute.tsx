import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Lock } from 'lucide-react';
import { useIsDevAccount } from '@/lib/devAccount';

export function DevOnlyRoute({ children }: { children: ReactNode }) {
  const isDev = useIsDevAccount();

  if (!isDev) {
    return (
      <Card className="max-w-md mx-auto mt-16">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <Lock className="h-8 w-8 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Restricted area</h1>
          <p className="text-sm text-muted-foreground">
            This section is limited to the developer account.
          </p>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
