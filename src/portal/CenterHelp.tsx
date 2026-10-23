import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Circle, CircleCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SUPPORT_EMAIL, useCenter } from './centerContext';
import { useCenterAdminData } from './admin/useCenterAdminData';
import { useCenterSprints } from './admin/ToolPages';
import { PageHeader } from './admin/ui';
import { gettingStartedSteps } from './helpChecklist';

const Mail = ({ to }: { to: string }) => <a className="font-medium underline" href={`mailto:${to}`}>{to}</a>;

function HelpCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">{title}</CardTitle>{description && <CardDescription>{description}</CardDescription>}</CardHeader>
      <CardContent className="space-y-3 text-sm">{children}</CardContent>
    </Card>
  );
}

function GettingStarted() {
  const { center } = useCenter();
  const { data } = useCenterAdminData();
  const sprints = useCenterSprints();
  const announcements = useQuery({
    queryKey: ['center-help-announcements', center.id],
    queryFn: async () => {
      const { count, error } = await supabase.from('tenant_announcements').select('id', { count: 'exact', head: true }).eq('institution_id', center.id);
      if (error) throw error;
      return count ?? 0;
    },
  });
  const steps = gettingStartedSteps({
    classes: data?.classes.length,
    teachers: data?.members.filter(m => m.role === 'teacher').length,
    students: data?.students.length,
    // shortcut: the admin data only holds the last 30 days of attendance; fine for a setup checklist.
    attendance: data?.attendance.length,
    announcements: announcements.data,
    sprints: sprints.data?.length,
  });
  return (
    <HelpCard title="Getting started" description="Set up your center in this order. Steps tick themselves once they're done.">
      <ol className="space-y-1">{steps.map(s => (
        <li key={s.to}>
          <Link to={s.to} className="flex items-center gap-3 rounded-md p-2 hover:bg-muted">
            {s.done ? <CircleCheck aria-hidden className="h-5 w-5 shrink-0 text-status-healthy" /> : <Circle aria-hidden className="h-5 w-5 shrink-0 text-muted-foreground" />}
            <span className={s.done ? 'text-muted-foreground' : ''}>{s.done && <span className="sr-only">Done: </span>}{s.label}</span>
          </Link>
        </li>
      ))}</ol>
    </HelpCard>
  );
}

/** Help for every portal role. Point rules mirror guard_tenant_attempt, guard_tenant_speed_run and tenant_student_board. */
export function CenterHelpPage() {
  const { center, role } = useCenter();
  const contact = center.portal_settings?.contact_email;
  const staff = role === 'teacher' || role === 'center_admin';
  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader title="Help" description={role === 'center_admin' ? 'Setting up your center, and how to reach FlowersOS.' : staff ? 'How points work, and how to reach FlowersOS.' : 'Common questions, and who to ask.'} />
      {role === 'center_admin' && <GettingStarted />}
      {staff ? (
        <HelpCard title="Contact FlowersOS">
          <p>Something not working, or a question about your plan or billing? Email <Mail to={SUPPORT_EMAIL} />.</p>
          {role === 'teacher' && <p>Forgot your password, or missing a batch? Ask your center admin.</p>}
        </HelpCard>
      ) : (
        <HelpCard title="Need help?">
          <p><span className="font-medium">Forgot your password?</span> Ask your center to reset it. The next time you sign in with your phone number, you'll create a new one.</p>
          <p><span className="font-medium">Other questions?</span> {contact ? <>Email your center at <Mail to={contact} />.</> : 'Ask your teacher or your center.'}</p>
        </HelpCard>
      )}
      <HelpCard title="How points, streaks and the leaderboard work">
        <p><span className="font-medium">Practice.</span> A correct answer earns 10 points on your first try, 5 on your second and 2 on your third. Wrong answers, a fourth try or later, and questions you've already solved earn 0.</p>
        <p>Only your first answer each time you open a question is scored. If you open the explanation before answering, that question isn't scored.</p>
        <p><span className="font-medium">Speed mode.</span> Each answer is scored like practice. Every answer that earns practice points also adds 10 speed points.</p>
        <p><span className="font-medium">Streaks.</span> Answer at least one question a day to keep your streak. Every 7 days in a row earns a streak freezer (you can hold 3), and a freezer covers one missed day.</p>
        <p><span className="font-medium">Leaderboard.</span> Your score is practice points plus speed points. A sprint counts points from its first day to its last. If two scores tie, the student who answered more questions ranks higher.</p>
        <p><span className="font-medium">Tiers.</span> When a sprint ends, the top students in each tier move up one: the top 20 in Unranked and Bronze, 15 in Silver, 10 in Gold, 5 in Emerald and 1 in Diamond. Everyone else, and anyone with 0 points, moves down one. The top Ruby student stays Ruby.</p>
      </HelpCard>
    </div>
  );
}
