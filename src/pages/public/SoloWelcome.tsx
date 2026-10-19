import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ArrowRight, Lock, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { usePublicLanguage } from '@/hooks/usePublicLanguage';
import { SoloAuthPanel } from '@/components/auth/SoloAuthPanel';
import { BrandMark } from '@/components/BrandMark';

type Solo = { name: string; plan: string; premium_until: string | null };

/** Landing spot after solo sign-up: makes sure the free solo account exists, then shows what's included. */
export default function SoloWelcome() {
  const { text, lang } = usePublicLanguage();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [solo, setSolo] = useState<Solo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const u = session.user;
      const { data } = await supabase.from('solo_students').select('name, plan, premium_until').eq('user_id', u.id).maybeSingle();
      if (data) { setSolo(data); return; }
      const name = (u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || '').toString().slice(0, 80);
      const { data: created, error: err } = await supabase.from('solo_students').insert({ user_id: u.id, name, email: u.email ?? null, provider: u.app_metadata?.provider ?? 'email' }).select('name, plan, premium_until').single();
      if (err) setError(err.message); else setSolo(created);
    })();
  }, [session]);

  const free = [text('Дасгалын бүх багц', 'All practice sets'), text('Хурдны горим', 'Speed mode'), text('Алдаагаа давтах', 'Review mistakes'), text('Шинжилгээ ба SAT таамаглал', 'Analytics & SAT prediction'), text('Лиг, зэрэг, тэмдэг', 'League, ranks & badges')];
  const paid = [text('Ойлголтын видео', 'Concept videos'), text('Сурах төлөвлөгөө (удахгүй)', 'Study planner (coming soon)')];

  return (
    <main className="landing-v2 min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-2"><BrandMark className="h-7 w-7" /><span className="font-semibold">flowersos</span></div>
        {session === undefined ? <p className="text-sm text-muted-foreground">{text('Ачаалж байна…', 'Loading…')}</p> : !session ? (
          <><h1 className="lv-h2">{text('Үнэгүй эхлэх', 'Start free')}</h1><SoloAuthPanel /></>
        ) : (
          <>
            <h1 className="lv-h2">{text(`Тавтай морил${solo?.name ? `, ${solo.name}` : ''}!`, `Welcome${solo?.name ? `, ${solo.name}` : ''}!`)}</h1>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="lv-card p-5 space-y-2"><p className="font-semibold">{text('Үнэгүй багцад багтсан', 'Included free')}</p>{free.map(f => <p key={f} className="text-sm">✓ {f}</p>)}</div>
            <div className="lv-card p-5 space-y-2"><p className="font-semibold">{text('Premium', 'Premium')}</p>{paid.map(f => <p key={f} className="text-sm flex items-center gap-2"><Lock className="h-3.5 w-3.5" />{f}</p>)}</div>
            <p className="text-sm text-muted-foreground">{text('Таны бие даан суралцах портал бэлтгэгдэж байна — удахгүй энд нээгдэнэ.', 'Your solo practice portal is being prepared and will open here soon.')}</p>
            <div className="flex gap-2 flex-wrap"><Button asChild className="rounded-full"><a href={`/demo?signup=practice&lang=${lang}`}>{text('Порталыг үзэх', 'Explore the portal')}<ArrowRight className="h-4 w-4" /></a></Button><Button variant="ghost" className="rounded-full" onClick={() => void supabase.auth.signOut()}><LogOut className="h-4 w-4" />{text('Гарах', 'Sign out')}</Button></div>
          </>
        )}
      </div>
    </main>
  );
}
