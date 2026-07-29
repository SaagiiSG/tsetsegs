import { useEffect, useState } from 'react';
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

  const startsAt = test ? new Date(test.starts_at).getTime() : 0;
  const endsAt = test ? startsAt + test.duration_seconds * 1000 : 0;
  const secondsToStart = useCountdown(startsAt);

  // Teachers/admins previewing the student portal are never pulled into a test.
  if (!student || teacherName) return null;
  if (!test) return null;
  if (Date.now() > endsAt) return null;

  if (secondsToStart > 0) {
    return (
      <div className="fixed inset-0 z-[75] bg-background/95 backdrop-blur-md flex flex-col items-center justify-center gap-5 text-center px-6">
        <Timer className="h-9 w-9 text-primary" />
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Your teacher started a test</div>
          <h2 className="text-xl font-semibold mt-1">{test.title}</h2>
        </div>
        <div className="font-mono text-6xl font-bold tabular-nums">{secondsToStart}</div>
        <p className="text-sm text-muted-foreground max-w-xs">
          {test.question_ids.length} questions · {Math.round(test.duration_seconds / 60)} minutes. Stay on this screen —
          the test opens automatically.
        </p>
      </div>
    );
  }

  return <ClassTestRunner test={test} />;
}
