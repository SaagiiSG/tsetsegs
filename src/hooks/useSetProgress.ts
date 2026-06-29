import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';

export interface SetCounts {
  total: number;
  completed: number;
  pct: number;
}

export interface SetProgress {
  s68: SetCounts;
  s150: SetCounts;
  cb: SetCounts;
}

const empty = (): SetCounts => ({ total: 0, completed: 0, pct: 0 });

async function countSet(studentAccountId: string, questionSet: string): Promise<SetCounts> {
  const { data: qs } = await supabase
    .from('questions')
    .select('id')
    .eq('question_set', questionSet)
    .eq('is_active', true);
  const ids = qs?.map((q) => q.id) ?? [];
  if (ids.length === 0) return empty();

  // Chunk for safety (Postgres `in` accepts large lists but be conservative)
  const chunkSize = 500;
  const correct = new Set<string>();
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { data: attempts } = await supabase
      .from('student_attempts')
      .select('question_id')
      .eq('student_account_id', studentAccountId)
      .eq('is_correct', true)
      .in('question_id', chunk);
    (attempts || []).forEach((a) => correct.add(a.question_id));
  }
  return {
    total: ids.length,
    completed: correct.size,
    pct: ids.length > 0 ? Math.round((correct.size / ids.length) * 100) : 0,
  };
}

export function useSetProgress() {
  const { student } = useStudentAuth();
  return useQuery({
    queryKey: ['set-progress', student?.id],
    enabled: !!student?.id,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<SetProgress> => {
      if (!student?.id) return { s68: empty(), s150: empty(), cb: empty() };
      const [s68, s150, cb] = await Promise.all([
        countSet(student.id, '68'),
        countSet(student.id, 'SATMathTraining800'),
        countSet(student.id, 'CollegeBoard'),
      ]);
      return { s68, s150, cb };
    },
  });
}
