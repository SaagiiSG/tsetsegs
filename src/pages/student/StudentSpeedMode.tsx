import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { 
  Zap, Play, Trophy, Award
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

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
    <div className="flex flex-col items-center min-w-[100px]">
      <span className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">{label}</span>
      <div className="relative h-[132px] w-24 overflow-hidden rounded-xl">
        {/* Selection indicator */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-11 bg-primary/10 border-y border-primary/20 pointer-events-none z-10 rounded-lg mx-1" />
        
        {/* Gradient overlays */}
        <div className="absolute inset-x-0 top-0 h-11 bg-gradient-to-b from-card to-transparent pointer-events-none z-20" />
        <div className="absolute inset-x-0 bottom-0 h-11 bg-gradient-to-t from-card to-transparent pointer-events-none z-20" />
        
        {/* Scrollable list */}
        <div
          ref={containerRef}
          className="h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory"
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

// Generate time values (10s to 10min)
const timeValues = [
  { value: 10, label: '10s' },
  { value: 20, label: '20s' },
  { value: 30, label: '30s' },
  { value: 45, label: '45s' },
  { value: 60, label: '1m' },
  { value: 90, label: '1m 30s' },
  { value: 120, label: '2m' },
  { value: 180, label: '3m' },
  { value: 240, label: '4m' },
  { value: 300, label: '5m' },
  { value: 420, label: '7m' },
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

export default function StudentSpeedMode() {
  const { student, logActivity } = useStudentAuth();
  const navigate = useNavigate();
  
  const [sessionDuration, setSessionDuration] = useState(120);
  const [questionCount, setQuestionCount] = useState(15);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

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

  // Fetch speed session history (last 7 days)
  const { data: speedHistory } = useQuery({
    queryKey: ['speed-history', student?.id],
    queryFn: async () => {
      if (!student?.id) return [];
      const weekAgo = subDays(new Date(), 7);
      
      const { data: sessions } = await supabase
        .from('student_activity_logs')
        .select('metadata, created_at')
        .eq('student_account_id', student.id)
        .eq('activity_type', 'speed_mode_complete')
        .gte('created_at', weekAgo.toISOString())
        .order('created_at', { ascending: true });
      
      if (!sessions?.length) return [];

      return sessions.map(s => {
        const meta = s.metadata as { total?: number; correct?: number; avgTimePerQuestion?: number } | null;
        const total = meta?.total || 0;
        const correct = meta?.correct || 0;
        return {
          date: format(new Date(s.created_at), 'EEE'),
          fullDate: format(new Date(s.created_at), 'MMM d'),
          total,
          correct,
          accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
          timePerProblem: meta?.avgTimePerQuestion || 0
        };
      });
    },
    enabled: !!student?.id
  });

  // Fetch stats (best score + total sessions)
  const { data: stats } = useQuery({
    queryKey: ['speed-stats', student?.id],
    queryFn: async () => {
      if (!student?.id) return { bestScore: null, totalSessions: 0 };
      
      const { data: completedSessions } = await supabase
        .from('student_activity_logs')
        .select('metadata')
        .eq('student_account_id', student.id)
        .eq('activity_type', 'speed_mode_complete');
      
      if (!completedSessions?.length) return { bestScore: null, totalSessions: 0 };
      
      const sessions = completedSessions.map(s => {
        const meta = s.metadata as { total?: number; correct?: number; avgTimePerQuestion?: number } | null;
        const total = meta?.total || 0;
        const correct = meta?.correct || 0;
        return {
          accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
          avgTime: meta?.avgTimePerQuestion || 0
        };
      });
      
      const best = sessions.reduce((prev, curr) => 
        curr.accuracy > prev.accuracy ? curr : prev
      , sessions[0]);
      
      return { bestScore: best, totalSessions: sessions.length };
    },
    enabled: !!student?.id
  });

  const lastSession = useMemo(() => {
    if (!speedHistory?.length) return null;
    return speedHistory[speedHistory.length - 1];
  }, [speedHistory]);

  const startSpeedMode = () => {
    logActivity('speed_mode_start', { 
      duration: sessionDuration,
      questionCount,
      category: selectedCategory 
    });
    
    const params = new URLSearchParams({
      duration: String(sessionDuration),
      questions: String(questionCount),
      category: selectedCategory
    });
    
    navigate(`/practice/speed/session?${params.toString()}`);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 select-none">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="h-6 w-6 text-yellow-500" />
          Speed Practice
        </h1>
        <p className="text-sm text-muted-foreground">
          Challenge yourself with timed practice sessions
        </p>
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
        <Card className="lg:w-[30%] w-full flex flex-col justify-center">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">Last Session</p>
            <div className="relative inline-block">
              <span className="text-5xl font-bold text-primary">
                {lastSession?.timePerProblem ? Math.round(lastSession.timePerProblem) : '--'}
                <span className="text-2xl">s</span>
              </span>
              <span className="absolute -top-1 -right-12 text-sm text-muted-foreground">
                {lastSession?.accuracy !== undefined ? `${lastSession.accuracy}%` : '--'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              per problem
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Session Builder Island - All in one row */}
      <Card className="shadow-lg border-2 bg-card/80 backdrop-blur-sm">
        <CardContent className="py-10 px-8 sm:px-16">
          <div className="flex flex-col sm:flex-row items-center justify-evenly gap-12 sm:gap-20">
            {/* Duration Picker */}
            <ScrollPicker
              values={timeValues}
              selectedValue={sessionDuration}
              onChange={setSessionDuration}
              label="Duration"
            />

            {/* Divider */}
            <div className="hidden sm:block w-px h-32 bg-border/40" />
            <div className="sm:hidden w-40 h-px bg-border/40" />

            {/* Question Count Picker */}
            <ScrollPicker
              values={questionValues}
              selectedValue={questionCount}
              onChange={setQuestionCount}
              label="Questions"
            />

            {/* Divider */}
            <div className="hidden sm:block w-px h-32 bg-border/40" />
            <div className="sm:hidden w-40 h-px bg-border/40" />

            {/* Category Selector */}
            <div className="flex flex-col items-center min-w-[160px]">
              <span className="text-xs text-muted-foreground mb-4 font-medium uppercase tracking-wider">Category</span>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48 h-12 text-base">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Mixed</SelectItem>
                  
                  {categories?.math && categories.math.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Math</SelectLabel>
                      {categories.math.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  
                  {categories?.english && categories.english.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>English</SelectLabel>
                      {categories.english.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Start Button */}
      <Button 
        onClick={startSpeedMode}
        size="lg" 
        className="w-full h-14 text-lg gap-2"
      >
        <Play className="h-5 w-5" />
        Start Session
      </Button>

      {/* Bottom Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Best Score */}
        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-yellow-600 mb-2">
              <Trophy className="h-4 w-4" />
              <span className="font-medium text-sm">Best Score</span>
            </div>
            <p className="text-2xl font-bold">{stats?.bestScore?.accuracy ?? '--'}%</p>
            <p className="text-xs text-muted-foreground">
              {stats?.bestScore?.avgTime ? `${Math.round(stats.bestScore.avgTime)}s avg` : 'No sessions yet'}
            </p>
          </CardContent>
        </Card>
        
        {/* Session Count */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-primary mb-2">
              <Zap className="h-4 w-4" />
              <span className="font-medium text-sm">Sessions</span>
            </div>
            <p className="text-2xl font-bold">{stats?.totalSessions ?? '--'}</p>
            <p className="text-xs text-muted-foreground">total completed</p>
          </CardContent>
        </Card>
        
        {/* Badge Placeholder */}
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-purple-600 mb-2">
              <Award className="h-4 w-4" />
              <span className="font-medium text-sm">Badge</span>
            </div>
            <p className="text-lg font-bold text-muted-foreground">Coming Soon</p>
            <p className="text-xs text-muted-foreground">Earn badges!</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
