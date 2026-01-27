import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
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

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
};

const chartConfig = {
  timePerProblem: { label: "Time/Problem (s)", color: "hsl(var(--primary))" },
  accuracy: { label: "Accuracy (%)", color: "hsl(var(--chart-2))" }
};

export default function StudentSpeedMode() {
  const { student, logActivity } = useStudentAuth();
  const navigate = useNavigate();
  
  const [sessionDuration, setSessionDuration] = useState(120); // 2 min default
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

      {/* Session Builder Island */}
      <Card className="shadow-lg border-2">
        <CardContent className="p-6 space-y-6">
          {/* Duration Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">Session Duration</Label>
              <span className="text-sm font-mono font-bold text-primary">
                {formatDuration(sessionDuration)}
              </span>
            </div>
            <Slider
              value={[sessionDuration]}
              onValueChange={([val]) => setSessionDuration(val)}
              min={10}
              max={600}
              step={10}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>10s</span>
              <span>10min</span>
            </div>
          </div>

          {/* Question Count Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">Questions to Solve</Label>
              <span className="text-sm font-mono font-bold text-primary">
                {questionCount} questions
              </span>
            </div>
            <Slider
              value={[questionCount]}
              onValueChange={([val]) => setQuestionCount(val)}
              min={5}
              max={50}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>5</span>
              <span>50</span>
            </div>
          </div>

          {/* Category Selector */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Category</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories (Mixed)</SelectItem>
                
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
