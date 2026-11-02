// Dev-only sample test for /dev/bluebook: a full four-module test, so Reading & Writing and the
// R&W → Math break can be checked before real full-length tests exist. Never shipped (see App.tsx).
import type { SessionModule, SessionQuestion } from '@/components/bluebook-test/BluebookSession';

export const FIXTURE_MODULES: SessionModule[] = [
  { id: 'rw1', section: 'reading_writing', module_number: 1, time_limit_minutes: 2 },
  { id: 'rw2', section: 'reading_writing', module_number: 2, time_limit_minutes: 2 },
  { id: 'm1', section: 'math', module_number: 1, time_limit_minutes: 2 },
  { id: 'm2', section: 'math', module_number: 2, time_limit_minutes: 2 },
];

const q = (id: string, p: Partial<SessionQuestion>): SessionQuestion => ({
  id, question_id: id.toUpperCase(), question_text: '', question_image_url: null, question_image_url_2: null,
  figure_svg: null, figure_description: null, question_type: 'multiple_choice', multiple_choice_options: null,
  choice_images: null, passage_text: null, ...p,
});

const AXES = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 160"><rect width="220" height="160" fill="#fff"/><path d="M20 140H210M30 150V10" stroke="#000"/><path d="M30 130 70 100 110 85 150 50 190 30" fill="none" stroke="#000" stroke-width="2"/><text x="200" y="155" font-size="12">x</text><text x="12" y="18" font-size="12">y</text></svg>';

export const FIXTURE_QUESTIONS: Record<string, SessionQuestion[]> = {
  rw1: [
    q('rw1-1', {
      passage_text: 'The following text is adapted from a 1913 novel. The narrator has just arrived in a small coastal town.\n\nThe harbor was *quieter* than I had expected. Boats lay at anchor in neat rows, and the few people on the pier moved slowly, as if the morning itself were in no hurry to begin.',
      question_text: 'Which choice best describes the overall structure of the text?',
      multiple_choice_options: { A: 'It describes a setting and then the mood it creates.', B: 'It presents an argument and then a counterargument.', C: 'It lists events in the order they happened.', D: 'It compares two towns the narrator has visited.' },
    }),
    q('rw1-2', {
      passage_text: 'Botanist Ynes Mexia collected more than 145,000 plant specimens, a body of work that ____ researchers studying the flora of the Americas.',
      question_text: 'Which choice completes the text with the most logical and precise word or phrase?',
      multiple_choice_options: { A: 'continues to benefit', B: 'was doubted by', C: 'was unrelated to', D: 'remains hidden from' },
    }),
    q('rw1-3', {
      passage_text: 'While researching a topic, a student has taken the following notes:\n\n• The Great Wall of China is more than 21,000 km long.\n• Construction began in the 7th century BCE.\n• Most of the existing wall was built during the Ming dynasty.',
      question_text: 'The student wants to emphasize the age of the wall. Which choice most effectively uses relevant information from the notes to accomplish this goal?',
      multiple_choice_options: { A: 'The wall is more than 21,000 km long.', B: 'Construction of the wall began in the 7th century BCE.', C: 'Most of the wall was built during the Ming dynasty.', D: 'The wall is in China.' },
    }),
  ],
  rw2: [
    q('rw2-1', {
      passage_text: 'Researchers studying honeybees found that foragers returning from a rich food source perform a longer waggle dance than foragers returning from a poor one.',
      question_text: 'Which choice best states the main idea of the text?',
      multiple_choice_options: { A: 'Dance length signals how good a food source is.', B: 'Honeybees only dance at night.', C: 'Foragers never return to poor sources.', D: 'Researchers cannot study honeybee dances.' },
    }),
    q('rw2-2', {
      passage_text: 'The museum’s new wing, which opened in May, ____ more than 300 works by local artists.',
      question_text: 'Which choice completes the text so that it conforms to the conventions of Standard English?',
      multiple_choice_options: { A: 'houses', B: 'house', C: 'housing', D: 'to house' },
    }),
    q('rw2-3', {
      passage_text: 'In 2019, a team of astronomers captured the first image of a black hole. ____ the image confirmed predictions made decades earlier by general relativity.',
      question_text: 'Which choice completes the text with the most logical transition?',
      multiple_choice_options: { A: 'Remarkably,', B: 'In contrast,', C: 'For example,', D: 'Instead,' },
    }),
  ],
  m1: [
    q('m1-1', {
      question_text: 'A certain bird species can fly at an average speed of $16$ meters per second. At this rate, how many meters would this bird fly in $4$ seconds?',
      multiple_choice_options: { A: '$64$', B: '$20$', C: '$16$', D: '$12$' },
    }),
    q('m1-2', { question_type: 'spr', question_text: 'If $3x + 5 = 14$, what is the value of $x$?' }),
    q('m1-3', {
      figure_svg: AXES, figure_description: 'A line rising from left to right on labeled axes.',
      question_text: 'The graph shows the relationship between $x$ and $y$. Which statement is true?',
      multiple_choice_options: { A: '$y$ increases as $x$ increases.', B: '$y$ decreases as $x$ increases.', C: '$y$ is constant.', D: '$y$ is always negative.' },
    }),
  ],
  m2: [
    q('m2-1', {
      question_text: 'Which expression is equivalent to $(x + 2)^2$?',
      multiple_choice_options: { A: '$x^2 + 4$', B: '$x^2 + 4x + 4$', C: '$x^2 + 2x + 4$', D: '$2x + 4$' },
    }),
    q('m2-2', { question_type: 'spr', question_text: 'What is the value of $\\frac{3}{4} + \\frac{1}{4}$?' }),
    q('m2-3', {
      question_text: 'A circle has radius $5$. What is its area?',
      multiple_choice_options: { A: '$10\\pi$', B: '$25\\pi$', C: '$5\\pi$', D: '$50\\pi$' },
    }),
  ],
};
