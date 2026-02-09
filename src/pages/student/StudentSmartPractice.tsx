import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { useAdaptivePractice } from '@/hooks/useAdaptivePractice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Brain, 
  Target, 
  Zap, 
  ArrowRight, 
  BarChart3, 
  TrendingDown,
  Loader2,
  Sparkles,
  HelpCircle,
  PlayCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Subject = 'math' | 'english';
type QuestionSet = '68' | 'CB';

export default function StudentSmartPractice() {
  const navigate = useNavigate();
  const { student, logActivity } = useStudentAuth();
  const [subject, setSubject] = useState<Subject>('math');
  const [questionSet, setQuestionSet] = useState<QuestionSet>('68');
  const [sessionSize, setSessionSize] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);

  const {
    questionsLoading,
    topicPerformance,
    weakCategories,
    overallAccuracy,
    sessionQuestions,
    generateSession,
  } = useAdaptivePractice(subject, questionSet);

  useEffect(() => {
    if (student) {
      logActivity('smart_practice_view');
    }
  }, [student]);

  const handleStartSession = () => {
    setIsGenerating(true);
    generateSession(sessionSize);
    setTimeout(() => {
      setIsGenerating(false);
    }, 500);
  };

  const handleBeginPractice = () => {
    if (sessionQuestions.length > 0) {
      // Store session in sessionStorage for the practice page
      sessionStorage.setItem('smartPracticeSession', JSON.stringify(sessionQuestions));
      navigate('/practice/smart/session');
    }
  };

  const accuracyPercent = Math.round(overallAccuracy * 100);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto select-none">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Smart Practice</h1>
            <p className="text-muted-foreground text-sm">AI-powered adaptive question selection</p>
          </div>
        </div>
      </div>

      {/* Performance Overview */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Your Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Overall Accuracy</span>
            <span className={cn(
              "font-bold text-lg",
              accuracyPercent >= 80 ? "text-green-500" :
              accuracyPercent >= 60 ? "text-yellow-500" :
              "text-orange-500"
            )}>
              {accuracyPercent}%
            </span>
          </div>
          <Progress value={accuracyPercent} className="h-2" />
          
          {/* Weak Categories */}
          {weakCategories.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingDown className="h-4 w-4 text-orange-500" />
                Areas needing attention
              </div>
              <div className="flex flex-wrap gap-2">
                {weakCategories.slice(0, 3).map((cat, i) => (
                  <Badge key={i} variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                    {cat.subtopic || 'General'} ({Math.round(cat.accuracy * 100)}%)
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4" />
            Configure Session
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Subject Toggle */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Subject</Label>
            <div className="flex rounded-lg border bg-muted/50 p-1 w-fit">
              <Button
                variant={subject === 'math' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSubject('math')}
              >
                Math
              </Button>
              <Button
                variant={subject === 'english' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSubject('english')}
              >
                English
              </Button>
            </div>
          </div>

          {/* Question Set Toggle (Math only) */}
          {subject === 'math' && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Question Set</Label>
              <div className="flex rounded-lg border bg-muted/50 p-1 w-fit">
                <Button
                  variant={questionSet === '68' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setQuestionSet('68')}
                >
                  68 Problems
                </Button>
                <Button
                  variant={questionSet === 'CB' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setQuestionSet('CB')}
                >
                  CollegeBoard
                </Button>
              </div>
            </div>
          )}

          {/* Session Size */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted-foreground">Session Size</Label>
              <span className="font-medium">{sessionSize} questions</span>
            </div>
            <Slider
              value={[sessionSize]}
              onValueChange={([val]) => setSessionSize(val)}
              min={5}
              max={25}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>5 (Quick)</span>
              <span>15 (Standard)</span>
              <span>25 (Deep)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generate Session Button */}
      <motion.div layout>
        <Button 
          className="w-full h-14 text-lg gap-2"
          onClick={handleStartSession}
          disabled={questionsLoading || isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Generating Smart Session...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Generate Smart Session
            </>
          )}
        </Button>
      </motion.div>

      {/* Session Preview */}
      <AnimatePresence>
        {sessionQuestions.length > 0 && !isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-2 border-green-500/30 bg-green-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-600">
                  <Zap className="h-4 w-4" />
                  Session Ready
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {sessionQuestions.length} questions selected based on your performance patterns
                </p>
                
                {/* Question Preview */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {sessionQuestions.slice(0, 5).map((q, i) => (
                    <div 
                      key={q.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">#{i + 1}</span>
                        <span className="font-medium text-sm">{q.question_id}</span>
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="text-xs gap-1">
                              <HelpCircle className="h-3 w-3" />
                              {q.reason}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Why this question was selected</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  ))}
                  {sessionQuestions.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{sessionQuestions.length - 5} more questions
                    </p>
                  )}
                </div>

                <Button 
                  className="w-full gap-2"
                  onClick={handleBeginPractice}
                >
                  <PlayCircle className="h-5 w-5" />
                  Begin Practice
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
