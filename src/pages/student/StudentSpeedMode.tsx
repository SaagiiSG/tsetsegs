import { useState, useMemo, useRef, useEffect } from 'react';
import { SATCountdownWidget } from '@/components/student/SATCountdownWidget';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { 
  Zap, Play, Trophy, Award, Lock, History, Clock, Target, ChevronRight
} from 'lucide-react';
import { useBadges } from '@/hooks/useBadges';
import { Progress } from '@/components/ui/progress';
import { format, subDays, parseISO, differenceInDays, differenceInHours } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';

// iOS-style scroll picker component
interface ScrollPickerProps {
  values: { value: number; label: string }[];
  selectedValue: number;
  onChange: (value: number) => void;
  label: string;
}

function ScrollPicker({ values, selectedValue, onChange, label }: ScrollPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemHeight = 44;
  
  const selectedIndex = values.findIndex(v => v.value === selectedValue);

  useEffect(() => {
    if (containerRef.current && selectedIndex >= 0) {
      containerRef.current.scrollTop = selectedIndex * itemHeight;
    }
  }, []);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const scrollTop = containerRef.current.scrollTop;
    const newIndex = Math.round(scrollTop / itemHeight);
    const clampedIndex = Math.max(0, Math.min(newIndex, values.length - 1));
    if (values[clampedIndex]?.value !== selectedValue) {
      onChange(values[clampedIndex].value);
    }
  };

  const scrollToIndex = (index: number) => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: index * itemHeight,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="flex flex-col items-center flex-1 min-w-[80px]">
      <span className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">{label}</span>
      <div className="relative h-[132px] w-full max-w-[100px] overflow-hidden rounded-xl">
        {/* Selection indicator */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-11 bg-primary/10 border-y border-primary/20 pointer-events-none z-10 rounded-lg mx-1" />
        
        {/* Gradient overlays */}
        <div className="absolute inset-x-0 top-0 h-11 bg-gradient-to-b from-card to-transparent pointer-events-none z-20" />
        <div className="absolute inset-x-0 bottom-0 h-11 bg-gradient-to-t from-card to-transparent pointer-events-none z-20" />
        
        {/* Scrollable list */}
        <div
          ref={containerRef}
          className="h-full overflow-y-auto overflow-x-hidden scrollbar-hide snap-y snap-mandatory"
          onScroll={handleScroll}
          style={{ 
            paddingTop: itemHeight,
            paddingBottom: itemHeight,
            scrollSnapType: 'y mandatory'
          }}
        >
          {values.map((item, index) => {
            const isSelected = item.value === selectedValue;
            return (
              <div
                key={item.value}
                className={cn(
                  "h-11 flex items-center justify-center cursor-pointer transition-all duration-200 snap-center",
                  isSelected 
                    ? "text-primary font-bold text-xl scale-105" 
                    : "text-muted-foreground/70 text-base"
                )}
                onClick={() => scrollToIndex(index)}
              >
                {item.label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Generate time values (1min to 10min)
const timeValues = [
  { value: 60, label: '1m' },
  { value: 90, label: '1m 30s' },
  { value: 120, label: '2m' },
  { value: 150, label: '2m 30s' },
  { value: 180, label: '3m' },
  { value: 240, label: '4m' },
  { value: 300, label: '5m' },
  { value: 360, label: '6m' },
  { value: 420, label: '7m' },
  { value: 480, label: '8m' },
  { value: 540, label: '9m' },
  { value: 600, label: '10m' },
];

// Generate question count values
const questionValues = [
  { value: 5, label: '5' },
  { value: 10, label: '10' },
  { value: 15, label: '15' },
  { value: 20, label: '20' },
  { value: 25, label: '25' },
  { value: 30, label: '30' },
  { value: 40, label: '40' },
  { value: 50, label: '50' },
];

const chartConfig = {
  timePerProblem: { label: "Time/Problem (s)", color: "hsl(var(--primary))" },
  accuracy: { label: "Accuracy (%)", color: "hsl(var(--chart-2))" }
};

// SAT countdown now uses shared widget (imported at top)

// Session Builder Component
interface SessionBuilderProps {
  sessionDuration: number;
  setSessionDuration: (v: number) => void;
  questionCount: number;
  setQuestionCount: (v: number) => void;
  selectedCategory: string;
  setSelectedCategory: (v: string) => void;
  selectedSubject: 'math' | 'english';
  setSelectedSubject: (v: 'math' | 'english') => void;
  categories: { math: {id:string;name:string}[]; english: {id:string;name:string}[] } | undefined;
}

function SessionBuilder({
  sessionDuration,
  setSessionDuration,
  questionCount,
  setQuestionCount,
  selectedCategory,
  setSelectedCategory,
  selectedSubject,
  setSelectedSubject,
  categories,
}: SessionBuilderProps) {
  return (
    <Card className="shadow-lg border-2 bg-card/80 backdrop-blur-sm">
      <CardContent className="py-8 px-6 sm:px-12">
        <div className="flex flex-col sm:flex-row items-center gap-8 sm:gap-6">
          {/* Both Pickers Container - 40% total */}
          <div className="flex items-center justify-center gap-6 w-full sm:w-[40%]">
            <ScrollPicker
              values={timeValues}
              selectedValue={sessionDuration}
              onChange={setSessionDuration}
              label="Duration"
            />
            
            <div className="w-px h-24 bg-border/30" />
            
            <ScrollPicker
              values={questionValues}
              selectedValue={questionCount}
              onChange={setQuestionCount}
              label="Questions"
            />
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-32 bg-border/30" />
          <div className="sm:hidden w-48 h-px bg-border/30" />

          {/* Category Badge Selector - 60% */}
          <div className="flex flex-col items-center w-full sm:w-[60%]">
            <span className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wider">Category</span>

            {/* Subject Tabs */}
            <div className="flex rounded-lg border bg-muted/40 p-0.5 mb-3">
              {(['math', 'english'] as const).map((subj) => (
                <button
                  key={subj}
                  type="button"
                  onClick={() => {
                    setSelectedSubject(subj);
                    setSelectedCategory('all');
                  }}
                  className={cn(
                    "px-4 py-1.5 text-xs font-semibold rounded-md transition-all capitalize",
                    selectedSubject === subj
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {subj}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-2 max-h-[120px] overflow-y-auto px-2">
              <Badge
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                className={cn(
                  "cursor-pointer px-4 py-2 text-sm transition-all",
                  selectedCategory === 'all' 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-primary/10"
                )}
                onClick={() => setSelectedCategory('all')}
              >
                All Mixed
              </Badge>
              
              {(selectedSubject === 'math' ? categories?.math : categories?.english)?.map(cat => (
                <Badge
                  key={cat.id}
                  variant={selectedCategory === cat.id ? 'default' : 'outline'}
                  className={cn(
                    "cursor-pointer px-4 py-2 text-sm transition-all",
                    selectedCategory === cat.id 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-primary/10"
                  )}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function StudentSpeedMode() {
  const { student, logActivity } = useStudentAuth();
  const navigate = useNavigate();
  
  const [sessionDuration, setSessionDuration] = useState(120); // 2 min default (first reasonable option)
  const [questionCount, setQuestionCount] = useState(15);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<'math' | 'english'>('math');

  // Fetch categories grouped by subject
  const { data: categories } = useQuery({
    queryKey: ['question-categories-grouped'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('category_id, subject, category:question_categories(id, name)')
        .eq('is_original', true)
        .eq('is_active', true);
      if (error) throw error;

      const mathCategories: { id: string; name: string }[] = [];
      const englishCategories: { id: string; name: string }[] = [];
      const seen = new Set<string>();

      data.forEach((q) => {
        if (q.category && q.category_id && !seen.has(q.category_id)) {
          seen.add(q.category_id);
          const cat = { id: q.category_id, name: (q.category as { name: string }).name };
          if (q.subject === 'math') {
            mathCategories.push(cat);
          } else if (q.subject === 'english') {
            englishCategories.push(cat);
          }
        }
      });

      return { math: mathCategories, english: englishCategories };
    },
    enabled: !!student
  });

  // Fetch all speed sessions ONCE, derive the three views from it. Cached for 60s.
  const { data: speedData } = useQuery({
    queryKey: ['speed-sessions-all', student?.id],
    queryFn: async () => {
      if (!student?.id) return { history: [], stats: { bestScore: null as { accuracy: number; avgTime: number } | null, totalSessions: 0 }, all: [] };

      const { data: sessions } = await supabase
        .from('student_activity_logs')
        .select('metadata, created_at')
        .eq('student_account_id', student.id)
        .eq('activity_type', 'speed_mode_complete')
        .order('created_at', { ascending: false })
        .limit(500);

      if (!sessions?.length) return { history: [], stats: { bestScore: null, totalSessions: 0 }, all: [] };

      // Normalize once
      const normalized = sessions.map((s) => {
        const meta = s.metadata as { total?: number; correct?: number; avgTimePerQuestion?: number; duration?: number } | null;
        const total = meta?.total || 0;
        const correct = meta?.correct || 0;
        const avgTime = meta?.avgTimePerQuestion || 0;
        return {
          createdAt: s.created_at,
          total,
          correct,
          accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
          avgTime,
          duration: meta?.duration || 0,
        };
      });

      // Last 7 days history (oldest → newest for chart)
      const weekAgoMs = subDays(new Date(), 7).getTime();
      const history = normalized
        .filter((n) => new Date(n.createdAt).getTime() >= weekAgoMs)
        .slice()
        .reverse()
        .map((n) => ({
          date: format(new Date(n.createdAt), 'EEE'),
          fullDate: format(new Date(n.createdAt), 'MMM d'),
          total: n.total,
          correct: n.correct,
          accuracy: n.accuracy,
          timePerProblem: n.avgTime,
        }));

      // Stats: best by accuracy across all sessions
      const best = normalized.reduce((prev, curr) => (curr.accuracy > prev.accuracy ? curr : prev), normalized[0]);
      const stats = {
        bestScore: { accuracy: best.accuracy, avgTime: best.avgTime },
        totalSessions: normalized.length,
      };

      // Full history list for drawer
      const all = normalized.map((n) => ({
        date: format(parseISO(n.createdAt), 'MMM d, yyyy'),
        time: format(parseISO(n.createdAt), 'h:mm a'),
        total: n.total,
        correct: n.correct,
        accuracy: n.accuracy,
        avgTime: Math.round(n.avgTime),
        duration: n.duration,
      }));

      return { history, stats, all };
    },
    enabled: !!student?.id,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const speedHistory = speedData?.history;
  const stats = speedData?.stats;
  const allSessions = speedData?.all;

  const [historyOpen, setHistoryOpen] = useState(false);

  const lastSession = useMemo(() => {
    if (!speedHistory?.length) return null;
    return speedHistory[speedHistory.length - 1];
  }, [speedHistory]);

  // Get performance rating based on avg time
  const getPerformanceRating = (avgTime: number) => {
    if (avgTime <= 15) return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-500/10' };
    if (avgTime <= 25) return { label: 'Great', color: 'text-emerald-600', bg: 'bg-emerald-500/10' };
    if (avgTime <= 40) return { label: 'Good', color: 'text-yellow-600', bg: 'bg-yellow-500/10' };
    if (avgTime <= 60) return { label: 'Average', color: 'text-orange-600', bg: 'bg-orange-500/10' };
    return { label: 'Needs Work', color: 'text-red-600', bg: 'bg-red-500/10' };
  };

  const startSpeedMode = () => {
    logActivity('speed_mode_start', { 
      duration: sessionDuration,
      questionCount,
      category: selectedCategory,
      subject: selectedSubject,
    });
    
    const params = new URLSearchParams({
      duration: String(sessionDuration),
      questions: String(questionCount),
      category: selectedCategory,
      subject: selectedSubject,
    });
    
    navigate(`/practice/speed/session?${params.toString()}`);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 select-none">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
            <Zap className="h-5 w-5 text-yellow-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight">Speed Practice</h1>
            <p className="text-xs text-muted-foreground">Challenge yourself with timed sessions</p>
          </div>
        </div>
        <div className="hidden lg:flex items-center gap-2">
          <div className="px-3 py-2 rounded-xl bg-gradient-to-br from-yellow-500/15 to-yellow-500/5 border border-yellow-500/30 flex flex-col items-center min-w-[88px]">
            <span className="text-[10px] uppercase tracking-wider text-yellow-700 dark:text-yellow-500/90 font-semibold">Best Acc</span>
            <span className="text-lg font-bold font-mono text-yellow-700 dark:text-yellow-400">
              {stats?.bestScore ? `${stats.bestScore.accuracy}%` : '—'}
            </span>
          </div>
          <div className="px-3 py-2 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/30 flex flex-col items-center min-w-[88px]">
            <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">Sessions</span>
            <span className="text-lg font-bold font-mono text-primary">{stats?.totalSessions ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Mobile: Session Builder at top */}
      <div className="lg:hidden">
        <SessionBuilder
          sessionDuration={sessionDuration}
          setSessionDuration={setSessionDuration}
          questionCount={questionCount}
          setQuestionCount={setQuestionCount}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedSubject={selectedSubject}
          setSelectedSubject={setSelectedSubject}
          categories={categories}
        />
      </div>


      {/* SAT Countdown Widget */}
      <SATCountdownWidget variant="sidebar" />

      {/* Mobile: Compact Stats Row */}
      <div className="lg:hidden grid grid-cols-3 gap-2">
        <div className="px-3 py-2 rounded-xl bg-gradient-to-br from-yellow-500/15 to-yellow-500/5 border border-yellow-500/30 flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-wider text-yellow-700 dark:text-yellow-500/90 font-semibold">Best Acc</span>
          <span className="text-lg font-bold font-mono text-yellow-700 dark:text-yellow-400">
            {stats?.bestScore ? `${stats.bestScore.accuracy}%` : '—'}
          </span>
        </div>
        <div className="px-3 py-2 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/30 flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">Sessions</span>
          <span className="text-lg font-bold font-mono text-primary">{stats?.totalSessions ?? 0}</span>
        </div>
        <div className="px-3 py-2 rounded-xl bg-gradient-to-br from-blue-500/15 to-blue-500/5 border border-blue-500/30 flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-wider text-blue-700 dark:text-blue-500/90 font-semibold">Last</span>
          <span className="text-lg font-bold font-mono text-blue-700 dark:text-blue-400">
            {lastSession ? `${Math.round(lastSession.timePerProblem)}s` : '—'}
          </span>
          {lastSession && (
            <span className="text-[10px] text-muted-foreground">{lastSession.accuracy}% • {lastSession.total}Q</span>
          )}
        </div>
      </div>

      {/* Top Row - Chart + Last Session */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Area Chart (70%) */}
        <Card className="lg:w-[70%] w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Last 7 Days Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {speedHistory && speedHistory.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={speedHistory} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="timeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} 
                      axisLine={false}
                      tickLine={false}
                      width={30}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area 
                      type="monotone" 
                      dataKey="timePerProblem" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      fill="url(#timeGradient)" 
                      name="Time/Problem (s)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No sessions in the last 7 days</p>
                  <p className="text-xs">Complete sessions to see your progress</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Last Session Stats (30%) */}
        <Card className="hidden lg:flex lg:w-[30%] w-full flex-col">
          <CardContent className="p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-muted-foreground">Last Session</p>
              <Drawer open={historyOpen} onOpenChange={setHistoryOpen} direction="right">
                <DrawerTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                    <History className="h-3.5 w-3.5" />
                    History
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="fixed right-0 top-0 bottom-0 left-auto h-full w-[400px] rounded-l-[10px] rounded-r-none mt-0">
                  <DrawerHeader>
                    <DrawerTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Speed Session History
                    </DrawerTitle>
                    <DrawerDescription>
                      All your completed speed practice sessions
                    </DrawerDescription>
                  </DrawerHeader>
                  <ScrollArea className="flex-1 px-4">
                    <div className="space-y-3 pb-4">
                      {allSessions && allSessions.length > 0 ? (
                        allSessions.map((session, i) => {
                          const rating = getPerformanceRating(session.avgTime);
                          return (
                            <div 
                              key={i} 
                              className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                <div className={cn("p-2 rounded-lg", rating.bg)}>
                                  <Clock className={cn("h-5 w-5", rating.color)} />
                                </div>
                                <div>
                                  <p className="font-medium">{session.date}</p>
                                  <p className="text-xs text-muted-foreground">{session.time}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-6 text-right">
                                <div>
                                  <p className="text-sm font-medium">{session.total} questions</p>
                                  <p className="text-xs text-muted-foreground">{session.accuracy}% accuracy</p>
                                </div>
                                <div className="min-w-[70px]">
                                  <p className={cn("text-lg font-bold", rating.color)}>{session.avgTime}s</p>
                                  <p className="text-xs text-muted-foreground">per problem</p>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <Zap className="h-12 w-12 mx-auto mb-3 opacity-30" />
                          <p>No sessions yet</p>
                          <p className="text-sm">Complete a speed session to see it here</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  <DrawerFooter>
                    <DrawerClose asChild>
                      <Button variant="outline">Close</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center">
              {lastSession ? (
                <>
                  <div className="text-center">
                    <span className="text-5xl font-bold text-primary">
                      {Math.round(lastSession.timePerProblem)}
                      <span className="text-2xl">s</span>
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">per problem</p>
                  </div>
                  
                  {/* Performance indicator */}
                  <div className="mt-4 space-y-2 w-full">
                    {(() => {
                      const rating = getPerformanceRating(lastSession.timePerProblem);
                      return (
                        <Badge variant="outline" className={cn("w-full justify-center py-1", rating.bg, rating.color)}>
                          {rating.label}
                        </Badge>
                      );
                    })()}
                    <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        {lastSession.accuracy}%
                      </span>
                      <span>•</span>
                      <span>{lastSession.total} questions</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center text-muted-foreground">
                  <span className="text-4xl font-bold">--</span>
                  <p className="text-xs mt-1">No sessions yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Desktop: Session Builder */}
      <div className="hidden lg:block">
        <SessionBuilder
          sessionDuration={sessionDuration}
          setSessionDuration={setSessionDuration}
          questionCount={questionCount}
          setQuestionCount={setQuestionCount}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedSubject={selectedSubject}
          setSelectedSubject={setSelectedSubject}
          categories={categories}
        />
      </div>

      {/* Start Button */}
      <Button 
        onClick={startSpeedMode}
        size="lg" 
        className="w-full h-14 text-lg gap-2"
      >
        <Play className="h-5 w-5" />
        Start Session
      </Button>

    </div>
  );
}

// Speed Badges Card Component
function SpeedBadgesCard({ studentId }: { studentId?: string }) {
  const { badges, isLoading } = useBadges();
  
  // Find Lightning Strike and Speedster badges
  const lightningStrike = badges.find(b => b.badge.name === 'Lightning Strike');
  const speedster = badges.find(b => b.badge.name === 'Speedster');
  
  // Get best session stats from progress
  const getBestSession = (badge: typeof lightningStrike) => {
    if (!badge?.requirementsProgress) return null;
    const progress = badge.requirementsProgress as { 
      best_questions?: number; 
      best_accuracy?: number;
      best_time?: number;
    };
    return {
      questions: progress.best_questions || 0,
      accuracy: progress.best_accuracy || 0,
      time: progress.best_time || 0
    };
  };

  const lightningBest = getBestSession(lightningStrike);
  const speedsterBest = getBestSession(speedster);

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-20" />
            <div className="h-6 bg-muted rounded w-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-purple-600 mb-1">
          <Award className="h-4 w-4" />
          <span className="font-medium text-sm">Speed Badges</span>
        </div>
        
        {/* Lightning Strike */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium flex items-center gap-1">
              {lightningStrike?.isUnlocked ? (
                <Zap className="h-3 w-3 text-yellow-500" />
              ) : (
                <Lock className="h-3 w-3 text-muted-foreground" />
              )}
              Lightning Strike
            </span>
            {lightningStrike?.isUnlocked && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-yellow-500/20 text-yellow-600">
                Unlocked!
              </Badge>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            10+ Qs in &lt;5min with 80%+ acc
          </p>
          {!lightningStrike?.isUnlocked && lightningBest && lightningBest.questions > 0 && (
            <div className="text-[10px] text-muted-foreground/70">
              Best: {lightningBest.questions}Q, {lightningBest.accuracy}%, {Math.round(lightningBest.time)}s
            </div>
          )}
        </div>

        {/* Speedster */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium flex items-center gap-1">
              {speedster?.isUnlocked ? (
                <Zap className="h-3 w-3 text-purple-500" />
              ) : (
                <Lock className="h-3 w-3 text-muted-foreground" />
              )}
              Speedster
            </span>
            {speedster?.isUnlocked && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-purple-500/20 text-purple-600">
                Unlocked!
              </Badge>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            20+ Qs in &lt;5min with 90%+ acc
          </p>
          {!speedster?.isUnlocked && speedsterBest && speedsterBest.questions > 0 && (
            <div className="text-[10px] text-muted-foreground/70">
              Best: {speedsterBest.questions}Q, {speedsterBest.accuracy}%, {Math.round(speedsterBest.time)}s
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
