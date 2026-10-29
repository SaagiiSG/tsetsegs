export type PracticeTest = {
  id: string; name: string; test_month: number | null; test_year: number | null;
  modules: number; questions: number; minutes: number; last_score: number | null; open_attempt: string | null;
};

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

export const testCardLine = (t: PracticeTest) => `${plural(t.modules, 'module')} · ${plural(t.questions, 'question')} · ${plural(t.minutes, 'minute')}`;

export const testCardAction = (t: PracticeTest): 'Start' | 'Resume' => (t.open_attempt ? 'Resume' : 'Start');
