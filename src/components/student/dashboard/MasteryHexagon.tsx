import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Hexagon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';

interface Axis { area: string; score: number; fullMark: number }

export function MasteryHexagon() {
  const { student } = useStudentAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['mastery-hexagon', student?.id],
    enabled: !!student?.id,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<Axis[]> => {
      if (!student?.id) return [];

      // Pull student's math attempts WITH the joined question (saves us from
      // hitting the 1000-row default cap on the questions table).
      const { data: attempts } = await supabase
        .from('student_attempts')
        .select('question_id, is_correct, time_spent_seconds, attempt_number, attempted_at, questions!inner(id, subject, subtopic, is_active, question_categories(name))')
        .eq('student_account_id', student.id)
        .eq('questions.is_active', true)
        .ilike('questions.subject', 'math')
        .order('attempted_at', { ascending: true })
        .limit(5000);

      const buckets = {
        'Advanced Math': { c: 0, t: 0 },
        'Algebra': { c: 0, t: 0 },
        'Geo & Trig': { c: 0, t: 0 },
        'Problem Solving': { c: 0, t: 0 },
      };

      const classify = (q: any): keyof typeof buckets => {
        const cat = (q?.question_categories?.name || '').toLowerCase();
        const sub = (q?.subtopic || '').toLowerCase();
        if (cat.includes('advanced') || sub.match(/advanced|quadratic|polynomial|exponential|function|nonlinear/)) return 'Advanced Math';
        if (cat.includes('geometry') || cat.includes('trig') || sub.match(/geometry|trig|circle|angle|triangle|area|volume/)) return 'Geo & Trig';
        if (cat.includes('problem') || cat.includes('data') || sub.match(/data|problem|ratio|percent|probability|statistics/)) return 'Problem Solving';
        return 'Algebra';
      };

      // first attempt per question for accuracy
      const seen = new Set<string>();
      (attempts || []).forEach((a: any) => {
        if (seen.has(a.question_id)) return;
        seen.add(a.question_id);
        const b = buckets[classify(a.questions)];
        b.t++;
        if (a.is_correct) b.c++;
      });

      // speed: avg time on correct first attempts; target 20s = 100
      const times = (attempts || [])
        .filter((a: any) => a.is_correct && a.attempt_number === 1 && a.time_spent_seconds)
        .map((a: any) => a.time_spent_seconds as number);
      const avgTime = times.length ? times.reduce((x, y) => x + y, 0) / times.length : 0;
      const speedScore = times.length === 0
        ? 0
        : Math.max(0, Math.min(100, Math.round(100 - ((avgTime - 20) / 40) * 100)));

      // vocab (math only)
      const { count: vocabTotal } = await supabase
        .from('vocabulary_words')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('subject', 'math');
      const { data: learned } = await supabase
        .from('student_vocabulary_progress')
        .select('word_id, vocabulary_words!inner(subject)')
        .eq('student_account_id', student.id)
        .eq('vocabulary_words.subject', 'math');
      const vocabScore = vocabTotal && vocabTotal > 0
        ? Math.round(((learned?.length ?? 0) / vocabTotal) * 100)
        : 0;

      const acc = (b: { c: number; t: number }) => (b.t > 0 ? Math.round((b.c / b.t) * 100) : 0);
      return [
        { area: 'Advanced', score: acc(buckets['Advanced Math']), fullMark: 100 },
        { area: 'Algebra', score: acc(buckets['Algebra']), fullMark: 100 },
        { area: 'Geo/Trig', score: acc(buckets['Geo & Trig']), fullMark: 100 },
        { area: 'Problem', score: acc(buckets['Problem Solving']), fullMark: 100 },
        { area: 'Speed', score: speedScore, fullMark: 100 },
        { area: 'Vocab', score: vocabScore, fullMark: 100 },
      ];
    },
  });

  return (
    <Card className="h-full">
      <CardContent className="p-3 sm:p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Hexagon className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Mastery</span>
          </div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Math focus</span>
        </div>
        <div className="flex-1 min-h-[260px]">
          {data && data.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="h-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={data} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="area" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="Mastery"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.35}
                    strokeWidth={2}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                    formatter={(v: any) => [`${v}%`, 'Mastery']}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </motion.div>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
              {isLoading ? 'Loading…' : 'Practice more to unlock your hexagon'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
