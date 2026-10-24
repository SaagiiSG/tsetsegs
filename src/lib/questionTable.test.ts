import { describe, expect, it, vi } from 'vitest';

const selects: string[] = [];
vi.mock('@/integrations/supabase/client', () => {
  const chain: any = {
    select: (s: string) => { selects.push(s); return chain; },
    eq: () => chain, order: () => chain,
    range: async () => ({ data: [], error: null }),
  };
  return { supabase: { from: () => chain } };
});

import { questionEmbedFor, questionTableFor } from './questionTable';
import { fetchAllStudentAttempts } from './studentAttempts';

describe('question bank routing', () => {
  it('Mongolian (and unknown) students keep the questions bank and embed', () => {
    for (const c of ['mn', undefined, null, '']) {
      expect(questionTableFor(c)).toBe('questions');
      expect(questionEmbedFor(c)).toBe('questions');
    }
  });

  it('intl students embed intl_questions under the questions key', () => {
    expect(questionTableFor('intl')).toBe('intl_questions');
    expect(questionEmbedFor('intl')).toBe('questions:intl_questions');
  });

  it('fetchAllStudentAttempts sends today\'s select for Mongolian students', async () => {
    selects.length = 0;
    await fetchAllStudentAttempts('s1');
    await fetchAllStudentAttempts('s1', questionTableFor('mn'));
    await fetchAllStudentAttempts('s1', questionTableFor('intl'));
    expect(selects).toEqual([
      'question_id, is_correct, attempt_number, question:questions(parent_question_id, question_set)',
      'question_id, is_correct, attempt_number, question:questions(parent_question_id, question_set)',
      'question_id, is_correct, attempt_number, question:intl_questions(parent_question_id, question_set)',
    ]);
  });
});
