import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type SearchScope = 'admin' | 'teacher' | 'student';

export interface QuestionSearchFilters {
  subject: 'all' | 'math' | 'english';
  set: string;
  difficulty: string;
  categoryId: string;
}

export interface QuestionSearchResult {
  id: string;
  question_id: string;
  question_text: string;
  question_image_url: string | null;
  difficulty_level: string | null;
  question_type: string;
  subject: string | null;
  question_set: string | null;
  category_name: string | null;
  is_active: boolean;
  hide_from_practice: boolean;
  total_count: number;
}

export const PAGE_SIZE = 60;

export const QUESTION_SET_OPTIONS: { value: string; label: string; scopes?: SearchScope[] }[] = [
  { value: 'all', label: 'All sets' },
  { value: '68', label: '68 Problems' },
  { value: 'cb', label: 'CollegeBoard' },
  { value: '150_hard', label: '150 Hard' },
  { value: 'anp', label: 'New 120 (Aug 3rd)' },
  { value: 'ext', label: 'External bank (EXT)' },
  { value: 'english', label: 'English' },
  { value: 'bbk', label: 'Practice tests (BBK)', scopes: ['admin'] },
];

export const DIFFICULTY_OPTIONS = [
  { value: 'all', label: 'All levels' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

/** Debounce any value. */
export function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function useQuestionSearch(
  query: string,
  filters: QuestionSearchFilters,
  scope: SearchScope,
  page: number,
) {
  const trimmed = query.trim();
  const enabled = trimmed.length >= 2;

  const result = useQuery({
    queryKey: ['question-search', scope, trimmed, filters, page],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_questions', {
        p_query: trimmed,
        p_scope: scope,
        p_subject: filters.subject,
        p_set: filters.set,
        p_difficulty: filters.difficulty,
        p_category: filters.categoryId === 'all' ? null : filters.categoryId,
        p_limit: PAGE_SIZE,
        p_offset: page * PAGE_SIZE,
      });
      if (error) throw error;
      return (data ?? []) as unknown as QuestionSearchResult[];
    },
  });

  const rows = result.data ?? [];
  return {
    ...result,
    rows,
    totalCount: rows.length ? Number(rows[0].total_count) : 0,
    enabled,
  };
}

export function useQuestionCategories() {
  return useQuery({
    queryKey: ['question-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('question_categories')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}
