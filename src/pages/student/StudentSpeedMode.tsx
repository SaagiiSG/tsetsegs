import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Zap, Timer, Clock, Play, Target, Trophy
} from 'lucide-react';

type TimerMode = 'question' | 'session';
type QuestionTimer = 30 | 60 | 90;
type SessionTimer = 10 | 20 | 30;

export default function StudentSpeedMode() {
  const { student, logActivity } = useStudentAuth();
  const navigate = useNavigate();
  const [timerMode, setTimerMode] = useState<TimerMode>('question');
  const [questionTimer, setQuestionTimer] = useState<QuestionTimer>(60);
  const [sessionTimer, setSessionTimer] = useState<SessionTimer>(10);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const { data: categories } = useQuery({
    queryKey: ['question-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('question_categories')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!student
  });

  const { data: questionCounts } = useQuery({
    queryKey: ['question-counts-by-category'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('category_id')
        .eq('is_original', true)
        .eq('is_active', true);
      if (error) throw error;
      
      const counts: Record<string, number> = { all: data.length };
      data.forEach(q => {
        if (q.category_id) {
          counts[q.category_id] = (counts[q.category_id] || 0) + 1;
        }
      });
      return counts;
    },
    enabled: !!student
  });

  const startSpeedMode = () => {
    logActivity('speed_mode_start', { 
      mode: timerMode, 
      timer: timerMode === 'question' ? questionTimer : sessionTimer,
      category: selectedCategory 
    });
    
    const params = new URLSearchParams({
      mode: timerMode,
      timer: String(timerMode === 'question' ? questionTimer : sessionTimer),
      category: selectedCategory
    });
    
    navigate(`/practice/speed/session?${params.toString()}`);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 select-none">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="h-6 w-6 text-yellow-500" />
          Speed Practice
        </h1>
        <p className="text-muted-foreground">
          Challenge yourself with timed practice sessions
        </p>
      </div>

      {/* Timer Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timer Mode</CardTitle>
          <CardDescription>Choose how you want to be timed</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={timerMode} onValueChange={(v) => setTimerMode(v as TimerMode)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="question" className="gap-2">
                <Timer className="h-4 w-4" />
                Per Question
              </TabsTrigger>
              <TabsTrigger value="session" className="gap-2">
                <Clock className="h-4 w-4" />
                Session Timer
              </TabsTrigger>
            </TabsList>

            <TabsContent value="question" className="mt-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Each question has a countdown. Answer before time runs out!
                </p>
                <RadioGroup 
                  value={String(questionTimer)} 
                  onValueChange={(v) => setQuestionTimer(Number(v) as QuestionTimer)}
                  className="grid grid-cols-3 gap-4"
                >
                  {[30, 60, 90].map((seconds) => (
                    <Label
                      key={seconds}
                      htmlFor={`q-${seconds}`}
                      className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        questionTimer === seconds 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <RadioGroupItem value={String(seconds)} id={`q-${seconds}`} className="sr-only" />
                      <span className="text-2xl font-bold">{seconds}s</span>
                      <span className="text-xs text-muted-foreground">
                        {seconds === 30 ? 'Hard' : seconds === 60 ? 'Normal' : 'Easy'}
                      </span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>
            </TabsContent>

            <TabsContent value="session" className="mt-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Answer as many questions as you can within the time limit!
                </p>
                <RadioGroup 
                  value={String(sessionTimer)} 
                  onValueChange={(v) => setSessionTimer(Number(v) as SessionTimer)}
                  className="grid grid-cols-3 gap-4"
                >
                  {[10, 20, 30].map((minutes) => (
                    <Label
                      key={minutes}
                      htmlFor={`s-${minutes}`}
                      className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        sessionTimer === minutes 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <RadioGroupItem value={String(minutes)} id={`s-${minutes}`} className="sr-only" />
                      <span className="text-2xl font-bold">{minutes}</span>
                      <span className="text-xs text-muted-foreground">minutes</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Category Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Category
          </CardTitle>
          <CardDescription>Focus on a specific topic or practice all</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup 
            value={selectedCategory} 
            onValueChange={setSelectedCategory}
            className="grid grid-cols-1 sm:grid-cols-2 gap-2"
          >
            <Label
              htmlFor="cat-all"
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                selectedCategory === 'all' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="all" id="cat-all" />
                <span className="font-medium">All Categories</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {questionCounts?.all || 68} questions
              </span>
            </Label>
            {categories?.map(cat => (
              <Label
                key={cat.id}
                htmlFor={`cat-${cat.id}`}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedCategory === cat.id 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value={cat.id} id={`cat-${cat.id}`} />
                  <span className="font-medium">{cat.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {questionCounts?.[cat.id] || 0} questions
                </span>
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Start Button */}
      <Button 
        onClick={startSpeedMode}
        size="lg" 
        className="w-full h-14 text-lg gap-2"
      >
        <Play className="h-5 w-5" />
        Start Speed Practice
      </Button>

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-yellow-600 mb-2">
              <Trophy className="h-4 w-4" />
              <span className="font-medium text-sm">Best Score</span>
            </div>
            <p className="text-2xl font-bold">--</p>
            <p className="text-xs text-muted-foreground">Coming soon</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-primary mb-2">
              <Zap className="h-4 w-4" />
              <span className="font-medium text-sm">Sessions</span>
            </div>
            <p className="text-2xl font-bold">--</p>
            <p className="text-xs text-muted-foreground">Coming soon</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
