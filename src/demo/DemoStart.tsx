import { useEffect, useRef, useState } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { withSource } from '@/lib/educatorLanding';
import { demoEntry, loadDemo, saveDemo, startDemo } from './demoStore';

export default function DemoStart() {
  const entry = demoEntry(window.location.search);
  const ended = new URLSearchParams(window.location.search).get('ended') === '1';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const auto = useRef(false);

  const start = async () => {
    setBusy(true); setError('');
    try {
      const copy = await startDemo(entry);
      saveDemo(copy);
      window.location.assign(`/demo/${entry.role}/`);
    } catch (e) { setError((e as Error).message); setBusy(false); }
  };

  useEffect(() => {
    if (ended || auto.current) return;
    auto.current = true;
    if (loadDemo()) window.location.assign(`/demo/${entry.role}/`);
    else if (entry.autoStart) void start();
  }, []);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-6">
        <p className="text-sm font-semibold">flowersos</p>
        <h1 className="text-3xl font-chillax font-semibold">{ended ? 'Your demo has ended' : 'FlowersOS demo'}</h1>
        {ended
          ? <p className="text-muted-foreground">Your sample changes have been deleted. Start a new demo, or book a call to talk about your center.</p>
          : <>
            <p className="text-muted-foreground">Explore the student, teacher and center admin experiences with fictional sample progress. Your changes are saved in an isolated session for 15 minutes, then automatically deleted.</p>
            <div className="flex gap-2 flex-wrap">{['Student', 'Teacher', 'Center admin', '15 minutes'].map(t => <Badge key={t} variant="outline">{t}</Badge>)}</div>
          </>}
        {error && <p role="alert" className="text-destructive">{error}</p>}
        {ended
          ? <div className="flex gap-3 flex-wrap">
            <Button size="lg" disabled={busy} onClick={() => void start()}>{busy ? 'Starting…' : 'Start a new demo'}<RotateCcw className="h-4 w-4" /></Button>
            <Button asChild size="lg" variant="outline"><a href={`${withSource(`/educators?lang=${entry.lang}`, entry.ref)}#book`}>Book a call<ArrowRight className="h-4 w-4" /></a></Button>
          </div>
          : <Button size="lg" disabled={busy} onClick={() => void start()}>{busy ? 'Starting…' : error ? 'Try again' : 'Start demo'}<ArrowRight className="h-4 w-4" /></Button>}
        <p className="text-xs text-muted-foreground">No account needed. No real customer data. Sample analytics are not AI-generated.</p>
      </div>
    </main>
  );
}
