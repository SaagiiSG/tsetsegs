import { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import type { Session } from '@supabase/supabase-js';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import CenterPortalApp from '@/portal/CenterPortalApp';
import { DemoBar } from './DemoBar';
import { finishDemo, loadDemo, setPortalLanguage } from './demoStore';
import type { DemoRole } from './storageKey';

export default function DemoPortal({ role }: { role: DemoRole }) {
  const [copy] = useState(loadDemo);
  const [queryClient] = useState(() => new QueryClient());
  const [session, setSession] = useState<Session | null>(null);
  const [ending, setEnding] = useState(false);

  // Hides the portal at once so its own sign-in page never shows while the copy is being removed.
  const end = () => { setEnding(true); setSession(null); void finishDemo(copy, role); };

  useEffect(() => {
    if (!copy) { void finishDemo(null); return; }
    setPortalLanguage(copy.lang);
    // A new tab or reload keeps the role's stored session; otherwise sign in with this copy's login.
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) return setSession(data.session);
      const { data: r, error } = await supabase.auth.signInWithPassword(copy.logins[role]);
      if (error || !r.session) end(); else setSession(r.session);
    }).catch(end);
    const { data: sub } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === 'SIGNED_OUT') end(); else if (s) setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!copy || ending || !session) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">{ending || !copy ? 'Ending demo…' : 'Loading…'}</div>;
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <DemoBar role={role} practiceOnly={copy.practiceOnly} expiresAt={copy.expiresAt} onSwitch={r => window.location.assign(`/demo/${r}/`)} onEnd={end} />
          <BrowserRouter basename={`/demo/${role}`}><CenterPortalApp slug={copy.slug} /></BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
