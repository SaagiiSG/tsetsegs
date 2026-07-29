import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';

export interface ClassTest {
  id: string;
  batch_id: string;
  teacher_name: string | null;
  title: string;
  question_set: string;
  question_ids: string[];
  duration_seconds: number;
  starts_at: string;
  status: 'scheduled' | 'active' | 'finished' | 'cancelled';
  created_at: string;
  finished_at: string | null;
}

export interface ClassTestParticipant {
  id: string;
  test_id: string;
  student_account_id: string;
  display_name: string;
  joined_at: string;
  submitted_at: string | null;
  correct_count: number;
  answered_count: number;
  total_time_ms: number;
  focus_violations: number;
}

function normalize(row: any): ClassTest {
  return {
    ...row,
    question_ids: Array.isArray(row.question_ids) ? row.question_ids : [],
  } as ClassTest;
}

/** Watches for a live (scheduled or active) test for the signed-in student's class. */
export function useStudentActiveClassTest() {
  const { student } = useStudentAuth();
  const batchId = student?.linked_student?.batch_id ?? null;
  const [test, setTest] = useState<ClassTest | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!batchId) {
      setTest(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('class_tests')
      .select('*')
      .eq('batch_id', batchId)
      .in('status', ['scheduled', 'active'])
      .order('created_at', { ascending: false })
      .limit(1);
    setTest(data && data.length > 0 ? normalize(data[0]) : null);
    setLoading(false);
  }, [batchId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!batchId) return;
    const channel = supabase
      .channel(`class-tests-${batchId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'class_tests', filter: `batch_id=eq.${batchId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [batchId, load]);

  return { test, loading, refresh: load };
}

/** Teacher-side live view of a test + its participants. */
export function useClassTestMonitor(testId: string | null) {
  const [test, setTest] = useState<ClassTest | null>(null);
  const [participants, setParticipants] = useState<ClassTestParticipant[]>([]);

  const load = useCallback(async () => {
    if (!testId) return;
    const [{ data: t }, { data: p }] = await Promise.all([
      supabase.from('class_tests').select('*').eq('id', testId).maybeSingle(),
      supabase.from('class_test_participants').select('*').eq('test_id', testId),
    ]);
    if (t) setTest(normalize(t));
    setParticipants((p ?? []) as ClassTestParticipant[]);
  }, [testId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!testId) return;
    const channel = supabase
      .channel(`class-test-monitor-${testId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_test_participants', filter: `test_id=eq.${testId}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_tests', filter: `id=eq.${testId}` }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [testId, load]);

  return { test, participants, refresh: load };
}
