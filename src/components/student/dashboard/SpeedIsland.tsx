import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format, parseISO, subDays } from 'date-fns';
import { Zap, Play, Timer, Target, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { cn } from '@/lib/utils';

type Range = 7 | 14 | 30;

interface SpeedSession {
  createdAt: string;
  total: number;
  correct: number;
  accuracy: number;
  timePerProblem: number;
  duration: number;
  category: string;
  subject: string;
}

export function SpeedIsland() {
  const { student } = useStudentAuth();
  const navigate = useNavigate();
  const [range, setRange] = useState<Range>(7);

  const { data: sessions } = useQuery({
    queryKey: ['dashboard-speed-sessions', student?.id],
    enabled: !!student?.id,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<SpeedSession[]> => {
      if (!student?.id) return [];
      const sinceIso = subDays(new Date(), 30).toISOString();
      const { data } = await supabase
        .from('student_activity_logs')
        .select('metadata, created_at')
        .eq('student_account_id', student.id)
        .eq('activity_type', 'speed_mode_complete')
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false })
        .limit(200);

      return (data || []).map((s) => {
        const meta = (s.metadata as any) || {};
        const total = meta.total || 0;
        const correct = meta.correct || 0;
        return {
          createdAt: s.created_at,
          total, correct,
          accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
          timePerProblem: Math.round(meta.avgTimePerQuestion || 0),
          duration: meta.duration || 120,
          category: meta.category || 'all',
          subject: meta.subject || 'math',
        };
      });
    },
  });

  const recent10 = sessions?.slice(0, 10) ?? [];
  const avgTime = recent10.length > 0
    ? Math.round(recent10.reduce((a, s) => a + s.timePerProblem, 0) / recent10.length)
    : null;
  const avgAcc = recent10.length > 0
    ? Math.round(recent10.reduce((a, s) => a + s.accuracy, 0) / recent10.length)
    : null;

  const chartData = useMemo(() => {
    if (!sessions?.length) return [];
    const cutoff = subDays(new Date(), range).getTime();
    return sessions
      .filter((s) => new Date(s.createdAt).getTime() >= cutoff)
      .slice()
      .reverse()
      .map((s) => ({
        date: range === 7 ? format(parseISO(s.createdAt), 'EEE') : format(parseISO(s.createdAt), 'MMM d'),
        timePerProblem: s.timePerProblem,
        accuracy: s.accuracy,
      }));
  }, [sessions, range]);

  const lastSession = sessions?.[0];

  const handleQuickStart = () => {
    if (!lastSession) {
      navigate('/practice/speed');
      return;
    }
    const params = new URLSearchParams({
      duration: String(lastSession.duration),
      questions: '15',
      category: lastSession.category,
      subject: lastSession.subject,
    });
    navigate(`/practice/speed/session?${params.toString()}`);
  };

  return (
    <Card className="h-full overflow-hidden">
      <CardContent className="p-3 sm:p-4 h-full">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Zap className="h-4 w-4 text-yellow-500" />
            </div>
            <span className="text-sm font-semibold">Speed</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => navigate('/practice/speed')}
          >
            All sessions <ChevronRight className="h-3 w-3 ml-0.5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-[calc(100%-2.5rem)]">
          {/* LEFT: stats + last sessions */}
          <div className="flex flex-col gap-3 min-h-0">
            <div className="grid grid-cols-2 gap-2">
              <Stat
                icon={<Timer className="h-3.5 w-3.5" />}
                label="Avg Speed"
                value={avgTime !== null ? `${avgTime}s` : '—'}
                hint="per question"
                tint="text-amber-600"
              />
              <Stat
                icon={<Target className="h-3.5 w-3.5" />}
                label="Avg Accuracy"
                value={avgAcc !== null ? `${avgAcc}%` : '—'}
                hint="last 10"
                tint="text-emerald-600"
              />
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                Last sessions
              </div>
              <div className="space-y-1 overflow-y-auto max-h-[140px] pr-1">
                {recent10.slice(0, 4).map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-md bg-muted/30">
                    <span className="text-muted-foreground font-mono">
                      {format(parseISO(s.createdAt), 'MMM d')}
                    </span>
                    <span className="font-mono">{s.timePerProblem}s</span>
                    <span className={cn('font-mono font-semibold', s.accuracy >= 80 ? 'text-emerald-600' : s.accuracy >= 60 ? 'text-amber-600' : 'text-red-500')}>
                      {s.accuracy}%
                    </span>
                  </div>
                ))}
                {recent10.length === 0 && (
                  <div className="text-xs text-muted-foreground italic py-2 text-center">
                    No sessions yet
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: graph + quick start (group enables hover button) */}
          <div className="group/right relative flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Speed trend
              </div>
              <div className="inline-flex rounded-md border bg-muted/30 p-0.5">
                {([7, 14, 30] as Range[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={cn(
                      'px-2 py-0.5 text-[10px] font-semibold rounded transition-all',
                      range === r ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {r}d
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-h-[140px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 4, right: 4, left: -25, bottom: 0 }}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.3} vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 8,
                        fontSize: 11,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="timePerProblem"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
                  No data in range
                </div>
              )}
            </div>
            {/* Quick start floating button (always visible on touch, fades in on hover for desktop) */}
            <motion.div
              initial={false}
              className="absolute bottom-1 right-1 opacity-100 md:opacity-0 md:group-hover/right:opacity-100 transition-opacity"
            >
              <Button
                size="sm"
                className="h-7 text-xs shadow-md"
                onClick={handleQuickStart}
                title={lastSession ? 'Repeat last session' : 'Start a speed session'}
              >
                <Play className="h-3 w-3 mr-1" />
                Quick Start
              </Button>
            </motion.div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  icon, label, value, hint, tint,
}: { icon: React.ReactNode; label: string; value: string; hint: string; tint: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-2.5">
      <div className={cn('flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide', tint)}>
        {icon}
        {label}
      </div>
      <div className="font-mono font-bold text-xl mt-1">{value}</div>
      <div className="text-[10px] text-muted-foreground">{hint}</div>
    </div>
  );
}
