import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { startGoogle } from './centerGoogle';
import { localDate } from './centerApi';
import { useCenter } from './centerContext';
import { daysLeft, gateState } from './googleGate';

const LATER = 'center-google-later';
const readLater = () => { try { return sessionStorage.getItem(LATER) === '1'; } catch { return false; } };

type Row = { google_email: string | null; google_due_on: string } | null;

// Students without a connected Google account see this before the portal.
export default function CenterGoogleGate({ children }: { children: ReactNode }) {
  const { center, userId, signOut } = useCenter();
  const [row, setRow] = useState<Row | undefined>(undefined);
  const [later, setLater] = useState(readLater);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase.from('tenant_students' as any).select('google_email, google_due_on').eq('institution_id', center.id).eq('user_id', userId).maybeSingle()
      // A failed read (columns not there yet) must never block a student.
      .then(({ data, error }) => { if (!cancelled) setRow(error ? null : (data as unknown as Row) ?? null); });
    return () => { cancelled = true; };
  }, [center.id, userId]);

  if (row === undefined) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading…</div>;
  const today = localDate();
  const state = gateState(row, today, later);
  if (state === 'off') return <>{children}</>;

  const connect = async () => {
    setBusy(true);
    const { data: token, error } = await supabase.rpc('tenant_google_link_start' as any, { _institution: center.id });
    const msg = error ? error.message : await startGoogle({ kind: 'link', token: token as string }, '/student');
    if (msg) { toast.error(msg); setBusy(false); }
  };
  const n = daysLeft(row!.google_due_on, today);

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-4 p-6 text-center">
          <h1 className="font-chillax text-2xl font-semibold">Connect your Google account</h1>
          <p className="text-sm text-muted-foreground">
            {state === 'required' ? 'Your center needs you to connect Google. ' : ''}
            Then you can sign in without a password, and your center can email you.
          </p>
          <div className="space-y-2">
            <Button className="w-full" disabled={busy} onClick={connect}>Connect Google</Button>
            {state === 'ask'
              ? <Button variant="ghost" className="w-full" onClick={() => { try { sessionStorage.setItem(LATER, '1'); } catch { /* storage blocked: Later lasts until reload */ } setLater(true); }}>Later ({n} {n === 1 ? 'day' : 'days'} left)</Button>
              : <Button variant="ghost" className="w-full" onClick={signOut}>Sign out</Button>}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
