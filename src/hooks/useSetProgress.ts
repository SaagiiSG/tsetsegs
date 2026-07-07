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

async function countSet(
  studentAccountId: string,
  questionSet: string | { exclude: string[]; subject?: 'math' | 'english' },
): Promise<SetCounts> {
  // Collect ALL matching question ids (Supabase caps rows at ~1000 per request),
  // so we page through until we have everything.
  const ids: string[] = [];
  const pageSize = 1000;
  let from = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let q = supabase
      .from('questions')
      .select('id')
      .eq('is_active', true)
      .range(from, from + pageSize - 1);
    if (typeof questionSet === 'string') {
      q = q.eq('question_set', questionSet);
    } else {
      // "CB" bucket: every active question EXCEPT the two standalone sets,
      // optionally scoped to a single subject (math-only for the CB tile).
      q = q.not('question_set', 'in', `(${questionSet.exclude.map((s) => `"${s}"`).join(',')})`);
      if (questionSet.subject) q = q.eq('subject', questionSet.subject);
    }
    const { data, error } = await q;
    if (error || !data) break;
    ids.push(...data.map((d) => d.id));
    if (data.length < pageSize) break;
    from += pageSize;
  }
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
        countSet(student.id, { exclude: ['68', 'SATMathTraining800'], subject: 'math' }),
      ]);
      return { s68, s150, cb };
    },
  });
}
