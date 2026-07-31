import { useEffect, useRef, useState } from 'react';
import { useStudentActiveClassTest } from '@/hooks/useClassTest';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { useTeacherAuth } from '@/contexts/TeacherAuthContext';
import { ClassTestRunner } from './ClassTestRunner';
import { Timer } from 'lucide-react';

function useCountdown(target: number) {
  const [left, setLeft] = useState(() => Math.max(0, Math.ceil((target - Date.now()) / 1000)));
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, Math.ceil((target - Date.now()) / 1000))), 250);
    return () => clearInterval(t);
  }, [target]);
  return left;
}

/**
 * Mounted globally in the student shell: pushes the whole class into a teacher-started
 * test from whatever page they are on.
 */
export function ActiveClassTestWatcher() {
  const { student } = useStudentAuth();
  const { teacherName } = useTeacherAuth();
  const { test } = useStudentActiveClassTest();

  // Sticky copy of the test the student was pulled into. The live `test` row
  // disappears the moment the teacher ends it (status -> finished) or the clock
  // runs out; without this the runner — and the score screen it renders after
  // submitting — would be unmounted before the student can read their result.
  const [activeTest, setActiveTest] = useState(test);
  const dismissedRef = useRef<string | null>(null);

  useEffect(() => {
    if (test && dismissedRef.current !== test.id) setActiveTest(test);
  }, [test]);

  const shown = activeTest;
  const startsAt = shown ? new Date(shown.starts_at).getTime() : 0;
  const endsAt = shown ? startsAt + shown.duration_seconds * 1000 : 0;
  const secondsToStart = useCountdown(startsAt);
  // Teacher ended it early (row no longer live) or time is up.
  const ended = !!shown && (!test || Date.now() > endsAt);

  // Teachers/admins previewing the student portal are never pulled into a test.
  if (!student || teacherName) return null;
  if (!shown) return null;

  // Never started for this student — nothing worth showing a score for.
  if (secondsToStart > 0) {
    if (!test) return null;
    return (
      <div className="fixed inset-0 z-[75] bg-background/95 backdrop-blur-md flex flex-col items-center justify-center gap-5 text-center px-6">
        <Timer className="h-9 w-9 text-primary" />
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Your teacher started a test</div>
          <h2 className="text-xl font-semibold mt-1">{shown.title}</h2>
        </div>
        <div className="font-mono text-6xl font-bold tabular-nums">{secondsToStart}</div>
        <p className="text-sm text-muted-foreground max-w-xs">
          {shown.question_ids.length} questions · {Math.round(shown.duration_seconds / 60)} minutes. Stay on this screen —
          the test opens automatically.
        </p>
      </div>
    );
  }

  return (
    <ClassTestRunner
      test={shown}
      ended={ended}
      onExit={() => {
        dismissedRef.current = shown.id;
        setActiveTest(null);
      }}
    />
  );
}
