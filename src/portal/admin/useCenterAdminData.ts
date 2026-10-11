import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCenter } from '../centerContext';

const DAYS = 30;

/** All center-scoped records the admin workspace needs. Every read is filtered by institution_id (and RLS). */
export function useCenterAdminData() {
  const { center } = useCenter();
  const id = center.id;
  return useQuery({
    queryKey: ['center-data', id],
    queryFn: async () => {
      const since = new Date(Date.now() - DAYS * 864e5);
      const sinceDate = since.toISOString().slice(0, 10);
      const [members, classes, students, dues, attempts, attendance, regs] = await Promise.all([
        supabase.from('tenant_members').select('*').eq('institution_id', id).order('created_at'),
        supabase.from('tenant_classes').select('*').eq('institution_id', id).order('created_at'),
        supabase.from('tenant_students').select('*').eq('institution_id', id).order('name').limit(5000),
        supabase.from('institution_payment_dues').select('*').eq('customer_id', id).order('due_date'),
        supabase.from('tenant_attempts').select('student_id, question_id, is_correct, created_at').eq('institution_id', id)
          .gte('created_at', since.toISOString()).order('created_at', { ascending: false }).limit(20000),
        supabase.from('tenant_attendance').select('student_id, class_id, session_date, status').eq('institution_id', id)
          .gte('session_date', sinceDate).limit(20000),
        supabase.from('tenant_registrations').select('id', { count: 'exact', head: true }).eq('institution_id', id).eq('status', 'pending'),
      ]);
      for (const r of [members, classes, students, dues, attempts, attendance]) if (r.error) throw r.error;
      return {
        members: members.data!, classes: classes.data!, students: students.data!, dues: dues.data!,
        attempts: attempts.data!, attendance: attendance.data!, pendingRegistrations: regs.count ?? 0,
      };
    },
  });
}

export type CenterAdminData = NonNullable<ReturnType<typeof useCenterAdminData>['data']>;

export function useRefreshCenter() {
  const { center } = useCenter();
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['center-data', center.id] });
}

/** Topic info for attempted questions (shared bank, read-only). */
export function useQuestionTopics(ids: string[]) {
  const unique = Array.from(new Set(ids)).sort();
  return useQuery({
    queryKey: ['center-q-topics', unique.length, unique[0], unique[unique.length - 1]],
    enabled: unique.length > 0,
    queryFn: async () => {
      const map = new Map<string, { subject: string; topic: string }>();
      for (let i = 0; i < unique.length; i += 300) {
        const { data } = await supabase.from('intl_questions').select('id, subject, subtopic, skill').in('id', unique.slice(i, i + 300));
        data?.forEach(q => map.set(q.id, { subject: (q.subject ?? 'math').toLowerCase(), topic: q.subtopic || q.skill || 'Other' }));
      }
      return map;
    },
  });
}

export const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : '—');
export const money = (amount: number | string, currency: string) =>
  new Intl.NumberFormat('en', { style: 'currency', currency }).format(Number(amount));
