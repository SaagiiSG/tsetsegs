import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { BluebookSession, type SessionModule, type SessionQuestion } from '@/components/bluebook-test/BluebookSession';
import { buildBluebookResults } from '@/lib/bluebookReview';
import { createSaveQueue, leaveWhenSaved, startModuleClock, unsavedGuard } from '@/lib/bluebookTest';

interface ModuleQuestion {
  id: string;
  order_index: number;
  question: SessionQuestion;
}

interface Answer {
  answer_submitted: string | null;
  is_marked: boolean;
  time_spent_seconds: number;
}

// The page owns the data (Supabase reads and writes); BluebookSession owns the test experience.
export default function StudentBluebookTest() {
  const { attemptId } = useParams();
  const { student, logActivity } = useStudentAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [answersModule, setAnswersModule] = useState<string | null>(null);
  const answersRef = useRef(answers);
  const questionStart = useRef(Date.now());
  const finishing = useRef(false);

  const { data: attempt, error: attemptError } = useQuery({
    queryKey: ['bluebook-attempt', attemptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bluebook_attempts')
        .select(`
          *,
          test:bluebook_tests(id, name, description)
        `)
        .eq('id', attemptId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!attemptId && !!student
  });
  const moduleId = attempt?.current_module_id ?? null;

  const { data: modules } = useQuery({
    queryKey: ['bluebook-test-modules', attempt?.test_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bluebook_modules')
        .select('id, section, module_number, time_limit_minutes')
        .eq('test_id', attempt.test_id);

      if (error) throw error;
      return data as SessionModule[];
    },
    enabled: !!attempt?.test_id
  });

  const { data: moduleQuestions } = useQuery({
    queryKey: ['bluebook-module-questions', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bluebook_module_questions')
        .select(`
          id,
          order_index,
          question:questions(
            id, question_id, question_text, question_image_url, question_image_url_2,
            figure_svg, figure_description,
            question_type, multiple_choice_options, choice_images, passage_text
          )
        `)
        .eq('module_id', moduleId)
        .order('order_index');

      if (error) throw error;
      return data as ModuleQuestion[];
    },
    enabled: !!moduleId
  });

  const { data: existingAnswers, isFetchedAfterMount: answersFresh } = useQuery({
    queryKey: ['bluebook-answers', attemptId, moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bluebook_answers')
        .select('*')
        .eq('attempt_id', attemptId)
        .eq('module_id', moduleId);

      if (error) throw error;
      return data;
    },
    enabled: !!attemptId && !!moduleId
  });

  // Load saved answers once per module, from a fresh read. Later refetches (window focus) must not
  // overwrite what the student has typed since.
  useEffect(() => {
    if (!existingAnswers || !answersFresh || !moduleId || answersModule === moduleId) return;
    const map: Record<string, Answer> = {};
    existingAnswers.forEach(a => {
      map[a.question_id!] = {
        answer_submitted: a.answer_submitted,
        is_marked: a.is_marked || false,
        time_spent_seconds: a.time_spent_seconds || 0
      };
    });
    answersRef.current = map;
    setAnswers(map);
    setAnswersModule(moduleId);
  }, [existingAnswers, answersFresh, moduleId, answersModule]);

  // A finished attempt (back button, refresh after finishing) goes back to the test list.
  useEffect(() => {
    if (attempt?.status === 'completed' && !finishing.current) navigate('/practice/bluebook', { replace: true });
  }, [attempt?.status, navigate]);

  // One save in flight per question, latest value wins, failures retry (see createSaveQueue).
  const queue = useMemo(() => createSaveQueue(async row => {
    const { error } = await supabase
      .from('bluebook_answers')
      .upsert({
        attempt_id: attemptId,
        module_id: row.moduleId,
        question_id: row.questionId,
        answer_submitted: row.answer,
        is_marked: row.isMarked,
        time_spent_seconds: row.timeSpent,
        answered_at: new Date().toISOString()
      }, {
        onConflict: 'attempt_id,question_id'
      });

    if (error) throw error;
  }), [attemptId]);

  // Closing or refreshing the tab while answers are still saving asks first.
  useEffect(() => {
    const guard = unsavedGuard(queue.pending);
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [queue]);

  const saveAnswer = useCallback((questionId: string, change: Partial<Answer>) => {
    if (!moduleId) return;
    const current = answersRef.current[questionId];
    const next: Answer = {
      answer_submitted: current?.answer_submitted ?? null,
      is_marked: current?.is_marked ?? false,
      time_spent_seconds: current?.time_spent_seconds ?? 0,
      ...change
    };
    answersRef.current = { ...answersRef.current, [questionId]: next };
    setAnswers(answersRef.current);
    queue.push({ questionId, moduleId, answer: next.answer_submitted, isMarked: next.is_marked, timeSpent: next.time_spent_seconds });
  }, [moduleId, queue]);

  const onAnswer = useCallback((questionId: string, value: string) => {
    const spent = Math.floor((Date.now() - questionStart.current) / 1000);
    questionStart.current = Date.now();
    saveAnswer(questionId, {
      answer_submitted: value,
      time_spent_seconds: (answersRef.current[questionId]?.time_spent_seconds || 0) + spent
    });
  }, [saveAnswer]);

  const onToggleMark = useCallback((questionId: string) => {
    saveAnswer(questionId, { is_marked: !answersRef.current[questionId]?.is_marked });
  }, [saveAnswer]);

  const onStartClock = useCallback(async () => {
    const started = await startModuleClock(supabase, attemptId);
    // A refetch still in flight (window focus) would otherwise write the old null start back over this one.
    await queryClient.cancelQueries({ queryKey: ['bluebook-attempt', attemptId] });
    queryClient.setQueryData(['bluebook-attempt', attemptId], (a: typeof attempt) => a && { ...a, module_started_at: started });
  }, [attemptId, queryClient]);

  // Move the attempt to the next module once every answer is saved (a failure throws, and the session retries).
  // The next module's clock stays unset until its questions are on screen.
  const onAdvance = useCallback(async (nextModuleId: string) => {
    await queue.flush();
    const { error } = await supabase
      .from('bluebook_attempts')
      .update({
        current_module_id: nextModuleId,
        current_module: (attempt?.current_module || 1) + 1,
        module_started_at: null
      })
      .eq('id', attemptId);

    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey: ['bluebook-attempt', attemptId] });
  }, [attempt?.current_module, attemptId, queryClient, queue]);

  // Stand By: every answer must be saved before scoring. Rejecting shows "Try again".
  const onFinish = useCallback(async () => {
    finishing.current = true;
    await queue.flush();

    // Build results from the test's module question list so skipped questions
    // still count against the section totals and appear in the review.
    const results = await buildBluebookResults(attemptId, attempt.test_id);

    const { error } = await supabase
      .from('bluebook_attempts')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        rw_raw_score: results.rwRaw,
        math_raw_score: results.mathRaw,
        rw_scaled_score: results.rwScaled,
        math_scaled_score: results.mathScaled,
        total_score: results.totalScore
      })
      .eq('id', attemptId);

    if (error) throw error;

    logActivity('bluebook_test_complete', { attemptId, totalScore: results.totalScore });
    return results;
  }, [attempt?.test_id, attemptId, logActivity, queue]);

  // Save and Exit, and closing the results. Answers save as they're typed, so this only waits for the last ones;
  // if they can't be saved, the student stays on the test (it keeps retrying) instead of losing them.
  const onExit = useCallback(async () => {
    await leaveWhenSaved(queue.flush, () => {
      // Invalidate dashboard caches so scores sync automatically
      queryClient.invalidateQueries({ queryKey: ['student-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['bluebook-attempts'] });
      queryClient.invalidateQueries({ queryKey: ['bluebook-tests'] });
      navigate('/practice/bluebook');
    }, () => toast.error("Some answers haven't saved yet. Check your connection, then try Save and Exit again."));
  }, [navigate, queryClient, queue]);

  if (attemptError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-lg">This test couldn't be opened.</p>
        <Button onClick={() => navigate('/practice/bluebook')}>Back to practice tests</Button>
      </div>
    );
  }

  const module = modules?.find(m => m.id === moduleId) ?? null;
  return (
    <BluebookSession
      attemptId={attemptId}
      studentName={[student?.linked_student?.first_name, student?.linked_student?.last_name].filter(Boolean).join(' ')}
      modules={modules ?? []}
      module={module}
      questions={moduleQuestions && answersModule === moduleId ? moduleQuestions.map(mq => mq.question) : undefined}
      answers={answers}
      startedAt={attempt?.module_started_at ?? null}
      onStartClock={onStartClock}
      onAnswer={onAnswer}
      onToggleMark={onToggleMark}
      onAdvance={onAdvance}
      onFinish={onFinish}
      onExit={onExit}
    />
  );
}
