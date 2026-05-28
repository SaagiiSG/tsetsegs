import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';

export interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  audience: 'all' | 'batch' | 'tier';
  audience_batch_id: string | null;
  audience_tier: string | null;
  published_at: string | null;
  created_at: string;
}

/**
 * Returns published announcements visible to the current student, plus
 * read state and unread count. Audience filtering happens client-side
 * (RLS only enforces `published_at IS NOT NULL`).
 */
export function useStudentAnnouncements() {
  const { student } = useStudentAuth();
  const accountId = student?.id ?? null;
  const batchId = student?.linked_student?.batch_id ?? null;

  return useQuery({
    queryKey: ['student-announcements', accountId, batchId],
    enabled: !!accountId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data: anns } = await supabase
        .from('announcements')
        .select('*')
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false })
        .limit(100);

      // Look up the student's current tier (most recent ranking row) for tier audiences
      const { data: latestRank } = await supabase
        .from('student_sprint_rankings')
        .select('current_tier')
        .eq('student_account_id', accountId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const tier = (latestRank as any)?.current_tier ?? null;

      const visible = (anns ?? []).filter((a: any) => {
        if (a.audience === 'all') return true;
        if (a.audience === 'batch') return a.audience_batch_id && a.audience_batch_id === batchId;
        if (a.audience === 'tier') return a.audience_tier && a.audience_tier === tier;
        return false;
      }) as AnnouncementRow[];

      const ids = visible.map((a) => a.id);
      let readIds: Set<string> = new Set();
      if (ids.length) {
        const { data: reads } = await supabase
          .from('announcement_reads')
          .select('announcement_id')
          .eq('student_account_id', accountId!)
          .in('announcement_id', ids);
        readIds = new Set((reads ?? []).map((r: any) => r.announcement_id));
      }

      const items = visible.map((a) => ({ ...a, read: readIds.has(a.id) }));
      const unreadCount = items.filter((i) => !i.read).length;
      return { items, unreadCount };
    },
  });
}

export async function markAnnouncementRead(announcementId: string, studentAccountId: string) {
  await supabase
    .from('announcement_reads')
    .upsert({ announcement_id: announcementId, student_account_id: studentAccountId }, {
      onConflict: 'announcement_id,student_account_id',
    });
}
