import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State = 'loading' | 'valid' | 'already' | 'invalid' | 'submitting' | 'done' | 'error';

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState<State>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setState('invalid');
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON } }
        );
        const data = await res.json();
        if (res.ok && data.valid) setState('valid');
        else if (data.reason === 'already_unsubscribed') setState('already');
        else setState('invalid');
      } catch {
        setState('invalid');
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState('submitting');
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (res.ok && data.success) setState('done');
      else if (data.reason === 'already_unsubscribed') setState('already');
      else {
        setErrorMsg(data.error || 'Something went wrong');
        setState('error');
      }
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Network error');
      setState('error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-md w-full p-8 space-y-6 text-center">
        <h1 className="text-2xl font-bold">Email preferences</h1>

        {state === 'loading' && (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p>Checking your link…</p>
          </div>
        )}

        {state === 'valid' && (
          <>
            <p className="text-muted-foreground">
              Click below to unsubscribe from announcement emails from Tsetsegs SAT Prep.
              You'll still see announcements inside the app.
            </p>
            <Button onClick={confirm} className="w-full">Confirm unsubscribe</Button>
          </>
        )}

        {state === 'submitting' && (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p>Unsubscribing…</p>
          </div>
        )}

        {state === 'done' && (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 className="h-10 w-10 text-primary" />
            <p>You've been unsubscribed. We won't email you anymore.</p>
          </div>
        )}

        {state === 'already' && (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 className="h-10 w-10 text-primary" />
            <p>You're already unsubscribed.</p>
          </div>
        )}

        {state === 'invalid' && (
          <div className="flex flex-col items-center gap-3">
            <XCircle className="h-10 w-10 text-destructive" />
            <p>This unsubscribe link is invalid or has expired.</p>
          </div>
        )}

        {state === 'error' && (
          <div className="flex flex-col items-center gap-3">
            <XCircle className="h-10 w-10 text-destructive" />
            <p>{errorMsg}</p>
            <Button variant="outline" onClick={confirm}>Try again</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
