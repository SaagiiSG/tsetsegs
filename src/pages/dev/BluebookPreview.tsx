// Dev-only: runs BluebookSession on fixture data, no database. /dev/bluebook?test=full or ?test=math.
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BluebookSession } from '@/components/bluebook-test/BluebookSession';
import { FIXTURE_MODULES, FIXTURE_QUESTIONS } from './bluebookFixtures';

type Answers = Record<string, { answer_submitted: string | null; is_marked: boolean }>;

export default function BluebookPreview() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const modules = params.get('test') === 'math' ? FIXTURE_MODULES.filter(m => m.section === 'math') : FIXTURE_MODULES;
  const [moduleId, setModuleId] = useState(modules[0].id);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const set = (id: string, change: Partial<Answers[string]>) =>
    setAnswers(a => ({ ...a, [id]: { answer_submitted: null, is_marked: false, ...a[id], ...change } }));

  return (
    <BluebookSession
      attemptId="preview"
      studentName="Preview Student"
      modules={modules}
      module={modules.find(m => m.id === moduleId) ?? null}
      questions={FIXTURE_QUESTIONS[moduleId]}
      answers={answers}
      startedAt={startedAt}
      onStartClock={async () => setStartedAt(new Date().toISOString())}
      onAnswer={(id, value) => set(id, { answer_submitted: value })}
      onToggleMark={id => set(id, { is_marked: !answers[id]?.is_marked })}
      onAdvance={async id => { setStartedAt(null); setModuleId(id); }}
      onFinish={async () => ({ totalScore: 1200, rwScaled: 600, mathScaled: 600, rwRaw: 3, mathRaw: 3, rwTotal: 6, mathTotal: 6, questions: [] })}
      onExit={() => navigate('/')}
    />
  );
}
