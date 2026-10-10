import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { CenterContext, type Center, type CenterRole } from './centerContext';
import CenterSignIn from './CenterSignIn';
import CenterAdminPortal from './CenterAdminPortal';
import CenterTeacherPortal from './CenterTeacherPortal';
import CenterStudentPortal from './CenterStudentPortal';

export default function CenterPortalApp({ slug }: { slug: string }) {
  const [center, setCenter] = useState<Center | null | undefined>(undefined);
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [role, setRole] = useState<CenterRole | null | undefined>(undefined);
  const [memberName, setMemberName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add('admin-theme');
    return () => document.body.classList.remove('admin-theme');
  }, []);

  useEffect(() => {
    supabase.rpc('tenant_lookup', { _slug: slug }).then(({ data }) => setCenter(data?.[0] ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return () => sub.subscription.unsubscribe();
  }, [slug]);

  useEffect(() => {
    if (!center || session === undefined) return;
    if (!session) { setRole(null); return; }
    let cancelled = false;
    (async () => {
      const uid = session.user.id;
      const [{ data: member }, { data: student }] = await Promise.all([
        supabase.from('tenant_members').select('role, display_name, active').eq('institution_id', center.id).eq('user_id', uid).maybeSingle(),
        supabase.from('tenant_students').select('name, active').eq('institution_id', center.id).eq('user_id', uid).maybeSingle(),
      ]);
      if (cancelled) return;
      if (member?.active) { setRole(member.role as CenterRole); setMemberName(member.display_name); }
      else if (student?.active) { setRole('student'); setMemberName(student.name); }
      else setRole(null);
    })();
    return () => { cancelled = true; };
  }, [center, session]);

  const signOut = async () => { await supabase.auth.signOut(); setRole(null); navigate('/'); };

  if (center === undefined || session === undefined || (session && role === undefined)) {
    return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!center) {
    return (
      <main className="min-h-screen grid place-items-center p-6 text-center">
        <div className="max-w-sm space-y-2">
          <h1 className="font-chillax text-2xl font-semibold">Portal not available</h1>
          <p className="text-sm text-muted-foreground">This course center portal isn't active yet. Please contact your center.</p>
        </div>
      </main>
    );
  }

  const home = role === 'center_admin' ? '/admin' : role === 'teacher' ? '/teacher' : role === 'student' ? '/student' : '/';
  return (
    <CenterContext.Provider value={{ center, role: role ?? null, name: memberName, userId: session?.user.id ?? null, signOut }}>
      <Routes>
        <Route path="/" element={role ? <Navigate to={home} replace /> : <CenterSignIn signedInWithoutAccess={!!session} />} />
        <Route path="/admin/*" element={role === 'center_admin' ? <CenterAdminPortal /> : <Navigate to={home} replace />} />
        <Route path="/teacher/*" element={role === 'teacher' || role === 'center_admin' ? <CenterTeacherPortal /> : <Navigate to={home} replace />} />
        <Route path="/student/*" element={role === 'student' ? <CenterStudentPortal /> : <Navigate to={home} replace />} />
        <Route path="*" element={<Navigate to={home} replace />} />
      </Routes>
    </CenterContext.Provider>
  );
}
