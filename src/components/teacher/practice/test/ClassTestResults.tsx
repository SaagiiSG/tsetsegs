import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MathText } from '@/components/MathText';
import { cn } from '@/lib/utils';
import { ArrowLeft, EyeOff, Loader2 } from 'lucide-react';

interface QuestionRow {
  id: string;
  question_id: string | number | null;
  question_text: string | null;
  question_image_url: string | null;
  multiple_choice_options: any;
  choice_images: any;
  answer: string | null;
  question_type: string | null;
  passage_text: string | null;
}


interface ParticipantRow {
  id: string;
  display_name: string;
  submitted_at: string | null;
  correct_count: number;
  answered_count: number;
  focus_violations: number;
}
interface AnswerRow {
  participant_id: string;
  question_id: string;
  is_correct: boolean;
  time_ms: number;
}

export function ClassTestResults({ testId, onBack }: { testId: string; onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('Test results');
  const [questionIds, setQuestionIds] = useState<string[]>([]);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [zoomId, setZoomId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: t }, { data: p }, { data: a }] = await Promise.all([
        supabase.from('class_tests').select('title, question_ids').eq('id', testId).maybeSingle(),
        supabase.from('class_test_participants').select('id, display_name, submitted_at, correct_count, answered_count, focus_violations').eq('test_id', testId),
        supabase.from('class_test_answers').select('participant_id, question_id, is_correct, time_ms').eq('test_id', testId),
      ]);
      const qids = t && Array.isArray(t.question_ids) ? (t.question_ids as string[]) : [];
      if (t) {
        setTitle(t.title);
        setQuestionIds(qids);
      }
      if (qids.length) {
        const { data: q } = await supabase
          .from('questions')
          .select('id, question_id, question_text, question_image_url, multiple_choice_options, choice_images, answer, question_type, passage_text')
          .in('id', qids);
        setQuestions((q ?? []) as QuestionRow[]);
      }
      setParticipants((p ?? []) as ParticipantRow[]);
      setAnswers((a ?? []) as AnswerRow[]);
      setLoading(false);
    })();
  }, [testId]);


  const total = questionIds.length || 22;

  const perStudent = useMemo(
    () =>
      participants
        .map((p) => {
          const mine = answers.filter((a) => a.participant_id === p.id);
          const avgMs = mine.length ? mine.reduce((s, a) => s + a.time_ms, 0) / mine.length : 0;
          const accuracy = mine.length ? (mine.filter((a) => a.is_correct).length / mine.length) * 100 : 0;
          return { ...p, avgSeconds: Math.round(avgMs / 1000), accuracy: Math.round(accuracy) };
        })
        .sort((a, b) => b.correct_count - a.correct_count),
    [participants, answers],
  );

  const classAvgScore = perStudent.length
    ? perStudent.reduce((s, p) => s + p.correct_count, 0) / perStudent.length
    : 0;
  const classAccuracy = perStudent.length
    ? Math.round(perStudent.reduce((s, p) => s + p.accuracy, 0) / perStudent.length)
    : 0;
  const classSpeed = perStudent.length
    ? Math.round(perStudent.reduce((s, p) => s + p.avgSeconds, 0) / perStudent.length)
    : 0;

  const questionMap = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);

  const perQuestion = useMemo(
    () =>
      questionIds.map((qid, i) => {
        const mine = answers.filter((a) => a.question_id === qid);
        const acc = mine.length ? Math.round((mine.filter((a) => a.is_correct).length / mine.length) * 100) : 0;
        const avgS = mine.length ? Math.round(mine.reduce((s, a) => s + a.time_ms, 0) / mine.length / 1000) : 0;
        return { id: qid, index: i + 1, accuracy: acc, avgSeconds: avgS, answers: mine.length, question: questionMap.get(qid) };
      }),
    [questionIds, answers, questionMap],
  );

  const zoomed = zoomId ? questionMap.get(zoomId) : undefined;
  const zoomedIndex = zoomId ? questionIds.indexOf(zoomId) + 1 : 0;


  if (loading) {
    return <div className="p-10 text-center"><Loader2 className="h-5 w-5 mx-auto animate-spin opacity-60" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-semibold">{title} · results</div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3">
          <div className="text-[10px] uppercase text-muted-foreground">Class average</div>
          <div className="font-mono text-xl font-bold">{classAvgScore.toFixed(1)}<span className="text-xs text-muted-foreground">/{total}</span></div>
        </Card>
        <Card className="p-3">
          <div className="text-[10px] uppercase text-muted-foreground">Accuracy</div>
          <div className="font-mono text-xl font-bold">{classAccuracy}%</div>
        </Card>
        <Card className="p-3">
          <div className="text-[10px] uppercase text-muted-foreground">Avg speed</div>
          <div className="font-mono text-xl font-bold">{classSpeed}s</div>
        </Card>
      </div>

      <Tabs defaultValue="students">
        <TabsList className="grid grid-cols-2 w-full h-9">
          <TabsTrigger value="students" className="text-xs">Per student</TabsTrigger>
          <TabsTrigger value="questions" className="text-xs">Per question</TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          <Card className="divide-y">
            {perStudent.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No students took this test.</div>
            ) : (
              perStudent.map((p) => (
                <div key={p.id} className="p-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate flex items-center gap-2">
                      {p.display_name}
                      {p.focus_violations > 0 && (
                        <Badge variant="destructive" className="gap-1 text-[10px]">
                          <EyeOff className="h-3 w-3" /> {p.focus_violations}
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {p.accuracy}% accuracy · {p.avgSeconds}s avg
                      {' · '}
                      <span className={cn(p.correct_count >= classAvgScore ? 'text-emerald-500' : 'text-destructive')}>
                        {p.correct_count >= classAvgScore ? 'above' : 'below'} class avg
                      </span>
                    </div>
                  </div>
                  <div className="font-mono text-lg font-bold shrink-0">
                    {p.correct_count}<span className="text-xs text-muted-foreground">/{total}</span>
                  </div>
                </div>
              ))
            )}
          </Card>
        </TabsContent>

        <TabsContent value="questions">
          <Card className="divide-y">
            {perQuestion.map((q) => (
              <div key={q.index} className="p-3 flex items-center gap-3">
                <span className="font-mono text-xs w-6 text-muted-foreground">{q.index}</span>
                <Progress value={q.accuracy} className="h-2 flex-1" />
                <span className="font-mono text-xs w-10 text-right">{q.accuracy}%</span>
                <span className="font-mono text-xs w-10 text-right text-muted-foreground">{q.avgSeconds}s</span>
              </div>
            ))}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
