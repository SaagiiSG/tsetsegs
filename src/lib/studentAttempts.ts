import { supabase } from '@/integrations/supabase/client';
import type { QuestionTable } from '@/lib/questionTable';

export interface StudentAttemptRow {
  question_id: string;
  is_correct: boolean;
  attempt_number: number;
  question?: { parent_question_id: string | null; question_set: string | null } | null;
}

/**
 * Loads a student's FULL answer history page by page. The database returns at
 * most 1000 rows per request, so a single read silently drops older answers
 * and makes solved problems look unsolved for active students.
 */
export async function fetchAllStudentAttempts(studentId: string, qTable: QuestionTable = 'questions'): Promise<StudentAttemptRow[]> {
  const pageSize = 1000;
  const all: StudentAttemptRow[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('student_attempts')
      .select(`question_id, is_correct, attempt_number, question:${qTable}(parent_question_id, question_set)`)
      .eq('student_account_id', studentId)
      .order('attempted_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as any[]).map((r) => ({
      ...r,
      question: Array.isArray(r.question) ? r.question[0] ?? null : r.question,
    })));
    if (data.length < pageSize) break;
  }
  return all;
}
