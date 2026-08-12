import { supabase } from '@/integrations/supabase/client';
import { isAcceptedFillBlankAnswer } from '@/lib/utils';

export interface BluebookQuestionResult {
  id: string;
  question_id: string;
  question_text: string;
  question_image_url: string | null;
  question_image_url_2: string | null;
  question_type: string;
  multiple_choice_options: any;
  choice_images: any;
  rationale: string | null;
  passage_text: string | null;
  correct_answer: string;
  user_answer: string | null;
  is_correct: boolean;
  order_index: number;
  section: 'reading_writing' | 'math';
  module_number: number;
}

export interface BluebookResultsData {
  totalScore: number;
  rwScaled: number;
  mathScaled: number;
  rwRaw: number;
  mathRaw: number;
  rwTotal: number;
  mathTotal: number;
  questions: BluebookQuestionResult[];
}

/** SAT scores are reported in 10-point increments. */
export const roundToTen = (n: number) => Math.round(n / 10) * 10;

/**
 * Scale a raw section score to the 200-800 band, rounded to the nearest 10.
 * `total` must be the number of questions in the section (not answered count).
 */
export function scaleSectionScore(correct: number, total: number): number {
  if (!total) return 200;
  const raw = 200 + (correct / total) * 600;
  return Math.min(800, Math.max(200, roundToTen(raw)));
}

const QUESTION_FIELDS =
  'id, question_id, question_text, question_image_url, question_image_url_2, question_type, multiple_choice_options, choice_images, rationale, passage_text, answer, alternate_answers';

/**
 * Build the full review payload for an attempt.
 *
 * Questions come from the test's module question list (not from the answer
 * rows) so skipped questions still appear — in the right position — as
 * "Omitted", and section totals reflect the real question count.
 */
export async function buildBluebookResults(
  attemptId: string,
  testId: string,
): Promise<BluebookResultsData> {
  const [{ data: modulesData }, { data: answerRows }] = await Promise.all([
    supabase
      .from('bluebook_modules')
      .select(
        `id, section, module_number,
         bluebook_module_questions(order_index, question_id, question:questions(${QUESTION_FIELDS}))`,
      )
      .eq('test_id', testId),
    supabase
      .from('bluebook_answers')
      .select('question_id, answer_submitted')
      .eq('attempt_id', attemptId),
  ]);

  const answerMap = new Map<string, string | null>(
    (answerRows ?? []).map((a: any) => [a.question_id, a.answer_submitted]),
  );

  const sortedModules = [...(modulesData ?? [])].sort((a: any, b: any) => {
    if (a.section !== b.section) return a.section === 'reading_writing' ? -1 : 1;
    return a.module_number - b.module_number;
  });

  const questions: BluebookQuestionResult[] = [];
  let rwCorrect = 0;
  let mathCorrect = 0;
  let rwTotal = 0;
  let mathTotal = 0;

  sortedModules.forEach((m: any) => {
    const section = m.section as 'reading_writing' | 'math';
    const mqs = [...(m.bluebook_module_questions ?? [])].sort(
      (a: any, b: any) => a.order_index - b.order_index,
    );

    mqs.forEach((mq: any) => {
      const q = mq.question;
      if (!q) return;

      const userAnswer = answerMap.get(mq.question_id) ?? null;
      const isCorrect =
        !!userAnswer &&
        isAcceptedFillBlankAnswer(
          userAnswer,
          q.answer ?? '',
          (q.alternate_answers as string[] | null) ?? null,
        );

      if (section === 'reading_writing') {
        rwTotal++;
        if (isCorrect) rwCorrect++;
      } else {
        mathTotal++;
        if (isCorrect) mathCorrect++;
      }

      questions.push({
        id: q.id,
        question_id: q.question_id,
        question_text: q.question_text,
        question_image_url: q.question_image_url,
        question_image_url_2: q.question_image_url_2,
        question_type: q.question_type,
        multiple_choice_options: q.multiple_choice_options,
        choice_images: q.choice_images,
        rationale: q.rationale ?? null,
        passage_text: q.passage_text,
        correct_answer: q.answer,
        user_answer: userAnswer,
        is_correct: isCorrect,
        order_index: mq.order_index ?? 0,
        section,
        module_number: m.module_number ?? 1,
      });
    });
  });

  const rwScaled = rwTotal ? scaleSectionScore(rwCorrect, rwTotal) : 0;
  const mathScaled = mathTotal ? scaleSectionScore(mathCorrect, mathTotal) : 0;

  return {
    totalScore: rwScaled + mathScaled,
    rwScaled,
    mathScaled,
    rwRaw: rwCorrect,
    mathRaw: mathCorrect,
    rwTotal,
    mathTotal,
    questions,
  };
}

/**
 * Normalise the option map of a question into an ordered [letter, text, imageUrl] list.
 * Handles object ({A: "..."}), array and JSON-string storage plus image-only choices.
 */
export function normaliseChoices(
  rawOptions: any,
  choiceImages: any,
): Array<{ letter: string; text: string; image: string | null }> {
  let entries: Array<[string, string]> = [];

  let parsed = rawOptions;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = null;
    }
  }

  if (Array.isArray(parsed)) {
    entries = parsed.map((v, i) => [String.fromCharCode(65 + i), String(v ?? '')]);
  } else if (parsed && typeof parsed === 'object') {
    entries = Object.keys(parsed)
      .sort()
      .map((k) => [k.toUpperCase(), String((parsed as any)[k] ?? '')]);
  }

  const images: Record<string, string> =
    choiceImages && typeof choiceImages === 'object' && !Array.isArray(choiceImages)
      ? Object.fromEntries(
          Object.entries(choiceImages as Record<string, any>).map(([k, v]) => [
            k.toUpperCase(),
            String(v ?? ''),
          ]),
        )
      : {};

  // Image-only questions may have no option map at all.
  if (entries.length === 0 && Object.keys(images).length > 0) {
    entries = Object.keys(images)
      .sort()
      .map((k) => [k, '']);
  }

  return entries.map(([letter, text]) => ({
    letter,
    text,
    image: images[letter] || null,
  }));
}
