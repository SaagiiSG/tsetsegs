import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCenter } from './centerContext';
import { SprintLeaderboard, useCenterSprints } from './admin/ToolPages';

export function StudentAnnouncements({ studentId }: { studentId: string }) {
  const { center } = useCenter();
  const list = useQuery({
    queryKey: ['center-student-ann', center.id, studentId],
    queryFn: async () => {
      const [a, r] = await Promise.all([
        supabase.from('tenant_announcements').select('id, title, body, created_at').eq('institution_id', center.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('tenant_announcement_reads').select('announcement_id').eq('student_id', studentId),
      ]);
      const read = new Set(r.data?.map(x => x.announcement_id));
      return (a.data ?? []).map(x => ({ ...x, unread: !read.has(x.id) }));
    },
  });
  // Seeing the list counts as reading it.
  useEffect(() => {
    const unread = list.data?.filter(a => a.unread) ?? [];
    if (unread.length) supabase.from('tenant_announcement_reads').upsert(unread.map(a => ({ announcement_id: a.id, student_id: studentId, institution_id: center.id })), { ignoreDuplicates: true }).then(() => {});
  }, [list.data, studentId, center.id]);
  if (!list.data?.length) return null;
  return (
    <section aria-label="Announcements" className="space-y-2">
      <p className="text-xs text-muted-foreground">Announcements</p>
      <ul className="space-y-3">{list.data.slice(0, 4).map(a => (
        <li key={a.id} className="rounded-md border p-3 text-sm space-y-1">
          <p className="font-medium flex items-center gap-2">{a.unread && <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-label="New" />}{a.title}</p>
          {a.body && <p className="text-muted-foreground whitespace-pre-wrap text-xs">{a.body}</p>}
          <p className="text-[11px] text-muted-foreground font-mono">{new Date(a.created_at).toLocaleDateString()}</p>
        </li>
      ))}</ul>
    </section>
  );
}

export function StudentSprint({ studentId }: { studentId: string }) {
  const sprints = useCenterSprints();
  const s = sprints.data?.find(x => x.status === 'active') ?? sprints.data?.find(x => x.status !== 'paused');
  if (!s) return null;
  return (
    <section aria-label="Sprint leaderboard" className="space-y-2">
      <p className="text-xs text-muted-foreground">{s.status === 'finished' ? 'Last sprint' : 'Sprint'} · <span className="text-foreground font-medium">{s.name}</span> <span className="font-mono">until {s.ends_on}</span></p>
      <SprintLeaderboard sprintId={s.id} highlight={studentId} limit={10} />
    </section>
  );
}
