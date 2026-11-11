import { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import type { Session } from '@supabase/supabase-js';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { deviceLanguage } from '@/lib/publicLanguage';
import CenterPortalApp from '@/portal/CenterPortalApp';
import SoloSignIn, { SoloBlocked, SoloShell } from './SoloSignIn';

type Joined = 'pending' | 'ok' | string;

export default function SoloPortal() {
  const [queryClient] = useState(() => new QueryClient());
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [joined, setJoined] = useState<Joined>('pending');
  const [haveAccount, setHaveAccount] = useState(false);
  const userId = session?.user.id;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session)).catch(() => setSession(null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) { setJoined('pending'); return; }
    let live = true;
    // Safe to repeat: solo_join() returns the same student on every call.
    supabase.rpc('solo_join')
      .then(
        ({ error }) => live && setJoined(error ? error.message || 'Could not open your solo account.' : 'ok'),
        e => live && setJoined((e as Error)?.message || 'Could not open your solo account.'),
      );
    return () => { live = false; };
  }, [userId]);

  const signOut = () => void supabase.auth.signOut();
  const loading = <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading…</div>;

  let body;
  if (session === undefined) body = loading;
  else if (!session) body = deviceLanguage() === 'mon' && !haveAccount ? <SoloBlocked onHaveAccount={() => setHaveAccount(true)} /> : <SoloSignIn />;
  else if (joined === 'pending') body = loading;
  else if (joined !== 'ok') {
    body = /mongolia/i.test(joined) ? <SoloBlocked onSignOut={signOut} /> : (
      <SoloShell>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">Can't open solo</h1>
          <p role="alert" className="text-sm text-muted-foreground">{joined}</p>
        </div>
        <Button variant="outline" className="w-full h-12 rounded-full bg-card" onClick={signOut}>Sign out</Button>
      </SoloShell>
    );
  } else {
    body = <BrowserRouter basename="/solo"><CenterPortalApp slug="solo" /></BrowserRouter>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" storageKey="theme-solo">
        <TooltipProvider><Toaster /><Sonner />{body}</TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
