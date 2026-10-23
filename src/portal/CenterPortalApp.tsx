import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { CenterContext, useCenterBrand, type Center, type CenterRole } from './centerContext';
import CenterJoin from './CenterJoin';
import CenterSignIn from './CenterSignIn';
import CenterAdminPortal from './CenterAdminPortal';
import CenterTeacherPortal from './CenterTeacherPortal';
import CenterStudentPortal from './CenterStudentPortal';

export default function CenterPortalApp({ slug }: { slug: string }) {
  const [center, setCenter] = useState<Center | null | undefined>(undefined);
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [role, setRole] = useState<CenterRole | null | undefined>(undefined);
  const [memberName, setMemberName] = useState('');
  const [access, setAccess] = useState<{ blocked: boolean; warnings: number } | null>(null);
  const [recovering, setRecovering] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add('admin-theme');
    return () => document.body.classList.remove('admin-theme');
  }, []);

  const loadCenter = () => supabase.rpc('tenant_lookup', { _slug: slug }).then(({ data }) => setCenter((data?.[0] as Center) ?? null));
  useCenterBrand(center);
  useEffect(() => {
    loadCenter();
    supabase.rpc('tenant_access_status', { _slug: slug }).then(({ data }) => setAccess((data as { blocked: boolean; warnings: number } | null) ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((e, s) => { setSession(s); if (e === 'PASSWORD_RECOVERY') setRecovering(true); });
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

  // Center login security: students and teachers are signed out when their sign-in is older than the
  // center's session length or predates an admin "sign everyone out". Center admins are never forced out.
  useEffect(() => {
    if (!center || !session || (role !== 'student' && role !== 'teacher')) return;
    const ps = center.portal_settings ?? {};
    const signedIn = new Date(session.user.last_sign_in_at ?? 0).getTime();
    const tooOld = ps.session_days ? Date.now() - signedIn > ps.session_days * 864e5 : false;
    const revoked = ps.signout_before ? signedIn < new Date(ps.signout_before).getTime() : false;
    if (tooOld || revoked) void signOut();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center, session, role]);

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

  if (access?.blocked && !window.location.pathname.startsWith('/join')) {
    return (
      <main className="min-h-screen grid place-items-center p-6 text-center">
        <div className="max-w-sm space-y-2">
          <h1 className="font-chillax text-2xl font-semibold">Access paused</h1>
          <p className="text-sm text-muted-foreground">This portal is paused because of an overdue payment. Please contact your center, or your center admin can contact FlowersOS.</p>
          {session && <button className="text-sm underline text-muted-foreground" onClick={signOut}>Sign out</button>}
        </div>
      </main>
    );
  }

  const home = role === 'center_admin' ? '/admin' : role === 'teacher' ? '/teacher' : role === 'student' ? '/student' : '/';
  return (
    <CenterContext.Provider value={{ center, role: role ?? null, name: memberName, userId: session?.user.id ?? null, signOut, reloadCenter: loadCenter }}>
      {role === 'center_admin' && (access?.warnings ?? 0) > 0 && (
        <div role="alert" className="relative z-50 bg-status-risk/10 text-status-risk text-sm text-center px-4 py-2 border-b border-status-risk/20">
          Payment overdue — warning {access!.warnings} of 3. After 3 warnings, access to this portal can be paused. Please contact FlowersOS to settle your bill.
        </div>
      )}
      {recovering ? <CenterSignIn signedInWithoutAccess={false} recovering onRecovered={() => setRecovering(false)} /> : <Routes>
        <Route path="/join/:code" element={<CenterJoin />} />
        <Route path="/" element={role ? <Navigate to={home} replace /> : <CenterSignIn signedInWithoutAccess={!!session} />} />
        <Route path="/admin/*" element={role === 'center_admin' ? <CenterAdminPortal /> : <Navigate to={home} replace />} />
        <Route path="/teacher/*" element={role === 'teacher' || role === 'center_admin' ? <CenterTeacherPortal /> : <Navigate to={home} replace />} />
        <Route path="/student/*" element={role === 'student' ? <CenterStudentPortal /> : <Navigate to={home} replace />} />
        <Route path="*" element={<Navigate to={home} replace />} />
      </Routes>}
    </CenterContext.Provider>
  );
}
