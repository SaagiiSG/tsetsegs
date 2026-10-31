import { useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { CenterContext, useCenterBrand, type Center, type CenterRole } from './centerContext';
import { ContactSupport } from './ContactSupport';
import CenterJoin from './CenterJoin';
import { finishPendingGoogle } from './centerGoogle';
import CenterSignIn from './CenterSignIn';
import CenterAdminPortal from './CenterAdminPortal';
import CenterTeacherPortal from './CenterTeacherPortal';
import CenterStudentPortal from './CenterStudentPortal';
import CenterGoogleGate from './CenterGoogleGate';

const AFTER_SIGNIN = 'center-after-signin';
const afterSignIn = () => { try { return sessionStorage.getItem(AFTER_SIGNIN); } catch { return null; } };

// A proctor link: students go straight in; a signed-out visitor signs in first and is sent back here.
function ProctorEntry({ role, signedIn }: { role: CenterRole | null; signedIn: boolean }) {
  const { code } = useParams();
  const target = `/student/proctor/${code}`;
  useEffect(() => { if (!role) try { sessionStorage.setItem(AFTER_SIGNIN, target); } catch { /* Private mode: they just land on home. */ } }, [role, target]);
  return role === 'student' ? <Navigate to={target} replace /> : role ? <Navigate to="/" replace /> : <CenterSignIn signedInWithoutAccess={signedIn} />;
}

export default function CenterPortalApp({ slug }: { slug: string }) {
  const [center, setCenter] = useState<Center | null | undefined>(undefined);
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [role, setRole] = useState<CenterRole | null | undefined>(undefined);
  const [memberName, setMemberName] = useState('');
  const [access, setAccess] = useState<{ blocked: boolean; warnings: number } | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [canContact, setCanContact] = useState(false);
  const [staffSignIn, setStaffSignIn] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const googleFinish = useRef<Promise<void> | null>(null);

  // The remembered proctor link is used once, by `home` on the render where the role first appears.
  useEffect(() => { if (role) try { sessionStorage.removeItem(AFTER_SIGNIN); } catch { /* ignore */ } }, [role]);
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
      // Finish a claim/link step parked before the Google redirect, once, before deciding who this is.
      googleFinish.current ??= finishPendingGoogle(center).then((m) => { if (m) toast.error(m); }, () => { toast.error('Could not finish signing in with Google. Try again.'); });
      await googleFinish.current;
      if (cancelled) return;
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

  // A blocked center hides staff rows from the browser, so ask the server whether this login is staff.
  useEffect(() => {
    setCanContact(false);
    if (access?.blocked && center && session) supabase.rpc('support_can_contact', { _institution: center.id }).then(({ data }) => setCanContact(!!data));
  }, [access?.blocked, center, session]);

  // Clear the cache so the next student on a shared device never sees this one's data.
  const signOut = async () => { try { sessionStorage.removeItem('center-google-later'); } catch { /* storage blocked */ } await supabase.auth.signOut(); queryClient.clear(); setRole(null); navigate('/'); };

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

  // Signed-out staff may open the sign-in page, then land back here with the contact form.
  if (access?.blocked && !window.location.pathname.startsWith('/join') && !(staffSignIn && !session)) {
    return (
      <main className="min-h-screen grid place-items-center p-6 text-center">
        <div className="max-w-sm space-y-2">
          <h1 className="font-chillax text-2xl font-semibold">Access paused</h1>
          <p className="text-sm text-muted-foreground">This portal is paused because of an overdue payment. {canContact ? 'To settle your bill, contact FlowersOS.' : 'Please contact your center.'}</p>
          {canContact && <ContactSupport centerId={center.id} />}
          {!session && <Button variant="link" size="sm" onClick={() => setStaffSignIn(true)}>Center staff: sign in to contact FlowersOS</Button>}
          {session && <button className="text-sm underline text-muted-foreground" onClick={signOut}>Sign out</button>}
        </div>
      </main>
    );
  }

  const home = role === 'center_admin' ? '/admin' : role === 'teacher' ? '/teacher' : role === 'student' ? (afterSignIn() ?? '/student') : '/';
  return (
    <CenterContext.Provider value={{ center, role: role ?? null, name: memberName, userId: session?.user.id ?? null, signOut, reloadCenter: loadCenter }}>
      {role === 'center_admin' && (access?.warnings ?? 0) > 0 && (
        <div role="alert" className="relative z-50 bg-status-risk/10 text-status-risk text-sm text-center px-4 py-2 border-b border-status-risk/20">
          Payment overdue — warning {access!.warnings} of 3. After 3 warnings, access to this portal can be paused. To settle your bill, <ContactSupport centerId={center.id} variant="link" className="h-auto p-0 text-status-risk underline" />.
        </div>
      )}
      {recovering ? <CenterSignIn signedInWithoutAccess={false} recovering onRecovered={() => setRecovering(false)} /> : <Routes>
        <Route path="/join/:code" element={<CenterJoin />} />
        <Route path="/proctor/:code" element={<ProctorEntry role={role ?? null} signedIn={!!session} />} />
        <Route path="/" element={role ? <Navigate to={home} replace /> : <CenterSignIn signedInWithoutAccess={!!session} />} />
        <Route path="/admin/*" element={role === 'center_admin' ? <CenterAdminPortal /> : <Navigate to={home} replace />} />
        <Route path="/teacher/*" element={role === 'teacher' || role === 'center_admin' ? <CenterTeacherPortal /> : <Navigate to={home} replace />} />
        <Route path="/student/*" element={role === 'student' ? <CenterGoogleGate><CenterStudentPortal /></CenterGoogleGate> : <Navigate to={home} replace />} />
        <Route path="*" element={<Navigate to={home} replace />} />
      </Routes>}
    </CenterContext.Provider>
  );
}
