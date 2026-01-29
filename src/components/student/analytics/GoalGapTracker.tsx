import { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingUp, Crosshair, Settings2, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ActionBox } from './ActionBox';
import type { TopicAccuracy } from '@/hooks/useStudentAnalytics';

interface GoalGapTrackerProps {
  currentScore: number;
  targetScore: number;
  topicAccuracy: TopicAccuracy[];
}

type GoalType = 'full' | 'math-only';

export function GoalGapTracker({ currentScore, targetScore: initialTarget, topicAccuracy }: GoalGapTrackerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [goalType, setGoalType] = useState<GoalType>('full');
  const [customTarget, setCustomTarget] = useState(initialTarget);
  const [savedGoalType, setSavedGoalType] = useState<GoalType>('full');
  const [savedTarget, setSavedTarget] = useState(initialTarget);

  const targetScore = savedTarget;
  const isMathOnly = savedGoalType === 'math-only';

  const gap = targetScore - currentScore;
  const maxScore = isMathOnly ? 800 : 1600;
  const progressPercent = Math.min(100, Math.round((currentScore / targetScore) * 100));

  // Calculate gap by subject
  const mathTopics = topicAccuracy.filter((t) => t.subject === 'Math');
  const englishTopics = topicAccuracy.filter((t) => t.subject === 'English');

  const mathAvgAccuracy = mathTopics.length > 0
    ? Math.round(mathTopics.reduce((sum, t) => sum + t.accuracy, 0) / mathTopics.length)
    : 0;
  const englishAvgAccuracy = englishTopics.length > 0
    ? Math.round(englishTopics.reduce((sum, t) => sum + t.accuracy, 0) / englishTopics.length)
    : 0;

  // Estimate points from each subject (rough: 800 per section)
  const mathScore = Math.round((mathAvgAccuracy / 100) * 800);
  const englishScore = Math.round((englishAvgAccuracy / 100) * 800);
  
  // For math-only, target is out of 800; for full SAT, target ~700 per section
  const mathTarget = isMathOnly ? targetScore : 700;
  const mathGap = mathTarget - Math.min(mathTarget, mathScore);
  const englishGap = isMathOnly ? 0 : 700 - Math.min(700, englishScore);

  // Find top skill blockers (lowest accuracy topics with high potential impact)
  const relevantTopics = isMathOnly 
    ? topicAccuracy.filter((t) => t.subject === 'Math')
    : topicAccuracy;
  
  const blockers = relevantTopics
    .filter((t) => t.accuracy < 85 && t.questionsAttempted > 3)
    .slice(0, 3)
    .map((t) => ({
      name: t.topicName,
      accuracy: t.accuracy,
      potentialPoints: Math.round((85 - t.accuracy) * (isMathOnly ? 0.25 : 0.5)), // Adjust for math-only
    }));

  const hasData = topicAccuracy.length > 0;

  let actionMessage = '';
  let actionText = '';

  if (!hasData) {
    actionMessage = 'Set your target score and start practicing!';
    actionText = 'Complete 20+ questions to see gap analysis.';
  } else if (gap <= 0) {
    actionMessage = '🎉 You\'ve reached your target! Consider setting a higher goal.';
    actionText = isMathOnly ? 'Push for 800 Math by mastering all topics.' : 'Push for 1500+ by mastering all topics.';
  } else if (blockers.length > 0) {
    if (isMathOnly) {
      actionMessage = `Target: ${targetScore} | Current: ${mathScore} | Gap: ${mathGap} pts.`;
      actionText = `Master ${blockers[0].name} to close the gap faster.`;
    } else {
      actionMessage = `Target: ${targetScore} | Current: ${currentScore} | Gap: ${gap} pts. ${mathGap > englishGap ? 'Math gap' : 'English gap'}: ${Math.max(mathGap, englishGap)} pts (focus here first).`;
      actionText = `Master ${blockers[0].name} = close ~${blockers.length >= 2 ? `${Math.round((blockers[0].potentialPoints + blockers[1].potentialPoints) / gap * 100)}%` : `${Math.round(blockers[0].potentialPoints / gap * 100)}%`} of the gap.`;
    }
  } else {
    actionMessage = `Gap: ${gap} pts. Keep practicing to close it.`;
    actionText = 'Focus on consistency and avoid careless mistakes.';
  }

  const handleSaveGoal = () => {
    setSavedGoalType(goalType);
    setSavedTarget(customTarget);
    setIsOpen(false);
  };

  const displayCurrentScore = isMathOnly ? mathScore : currentScore;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35 }}
    >
      <Card className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-5 w-5 text-indigo-500" />
                Goal Gap Tracker
                {isMathOnly && (
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-normal">
                    Math Only
                  </span>
                )}
              </CardTitle>
              <CardDescription>How close are you to your target?</CardDescription>
            </div>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Set Your Goal</DialogTitle>
                  <DialogDescription>
                    Choose your SAT goal type and target score
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-3">
                    <Label>Goal Type</Label>
                    <RadioGroup value={goalType} onValueChange={(v) => {
                      setGoalType(v as GoalType);
                      // Adjust default target based on type
                      if (v === 'math-only' && customTarget > 800) {
                        setCustomTarget(700);
                      } else if (v === 'full' && customTarget <= 800) {
                        setCustomTarget(1400);
                      }
                    }}>
                      <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                        <RadioGroupItem value="full" id="full" />
                        <Label htmlFor="full" className="flex-1 cursor-pointer">
                          <div className="font-medium">Full SAT Score</div>
                          <div className="text-xs text-muted-foreground">
                            Combined Math + Reading/Writing (800-1600)
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                        <RadioGroupItem value="math-only" id="math-only" />
                        <Label htmlFor="math-only" className="flex-1 cursor-pointer">
                          <div className="font-medium">Math Section Only</div>
                          <div className="text-xs text-muted-foreground">
                            For students focusing only on Math (200-800)
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="target">Target Score</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="target"
                        type="number"
                        min={goalType === 'math-only' ? 200 : 400}
                        max={goalType === 'math-only' ? 800 : 1600}
                        step={10}
                        value={customTarget}
                        onChange={(e) => setCustomTarget(Number(e.target.value))}
                        className="w-32"
                      />
                      <span className="text-sm text-muted-foreground">
                        / {goalType === 'math-only' ? '800' : '1600'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {goalType === 'math-only' ? (
                        <>
                          <Button variant="outline" size="sm" onClick={() => setCustomTarget(700)}>700</Button>
                          <Button variant="outline" size="sm" onClick={() => setCustomTarget(750)}>750</Button>
                          <Button variant="outline" size="sm" onClick={() => setCustomTarget(800)}>800</Button>
                        </>
                      ) : (
                        <>
                          <Button variant="outline" size="sm" onClick={() => setCustomTarget(1200)}>1200</Button>
                          <Button variant="outline" size="sm" onClick={() => setCustomTarget(1350)}>1350</Button>
                          <Button variant="outline" size="sm" onClick={() => setCustomTarget(1400)}>1400</Button>
                          <Button variant="outline" size="sm" onClick={() => setCustomTarget(1500)}>1500</Button>
                        </>
                      )}
                    </div>
                  </div>

                  <Button onClick={handleSaveGoal} className="w-full">
                    <Check className="h-4 w-4 mr-2" />
                    Save Goal
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Score display */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="text-center"
            >
              <p className="text-xs text-muted-foreground mb-1">Current</p>
              <p className="text-4xl font-bold">{displayCurrentScore}</p>
            </motion.div>
            
            <div className="flex flex-col items-center">
              <TrendingUp className="h-6 w-6 text-muted-foreground" />
              <p className={`text-sm font-semibold ${gap > 100 ? 'text-amber-500' : gap > 0 ? 'text-emerald-500' : 'text-emerald-500'}`}>
                {gap > 0 ? `+${gap}` : 'Goal reached!'}
              </p>
            </div>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
              className="text-center"
            >
              <p className="text-xs text-muted-foreground mb-1">Target</p>
              <p className="text-4xl font-bold text-primary">{targetScore}</p>
            </motion.div>
          </div>

          {/* Progress ring visualization */}
          <div className="relative mb-6">
            <Progress value={progressPercent} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0</span>
              <span className="font-medium">{progressPercent}% there</span>
              <span>{targetScore}</span>
            </div>
          </div>

          {/* Subject gap breakdown - hide English for math-only */}
          {hasData && (
            <div className={`grid ${isMathOnly ? 'grid-cols-1' : 'grid-cols-2'} gap-3 mb-4`}>
              <div className={`p-3 rounded-lg border ${!isMathOnly && mathGap > englishGap ? 'bg-red-500/10 border-red-500/30' : 'bg-muted/50'}`}>
                <p className="text-xs text-muted-foreground">Math {isMathOnly ? 'Score' : 'Gap'}</p>
                <p className={`text-xl font-bold ${!isMathOnly && mathGap > englishGap ? 'text-red-500' : ''}`}>
                  {isMathOnly ? mathScore : (mathGap > 0 ? `+${mathGap}` : '✓')}
                </p>
                <p className="text-xs text-muted-foreground">{mathAvgAccuracy}% avg accuracy</p>
              </div>
              {!isMathOnly && (
                <div className={`p-3 rounded-lg border ${englishGap > mathGap ? 'bg-red-500/10 border-red-500/30' : 'bg-muted/50'}`}>
                  <p className="text-xs text-muted-foreground">English Gap</p>
                  <p className={`text-xl font-bold ${englishGap > mathGap ? 'text-red-500' : ''}`}>
                    {englishGap > 0 ? `+${englishGap}` : '✓'}
                  </p>
                  <p className="text-xs text-muted-foreground">{englishAvgAccuracy}% avg</p>
                </div>
              )}
            </div>
          )}

          {/* Top blockers */}
          {blockers.length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Crosshair className="h-3 w-3" /> Top Skill Blockers {isMathOnly && '(Math)'}
              </p>
              {blockers.map((blocker, i) => (
                <div 
                  key={blocker.name}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <span className="text-sm">{i + 1}. {blocker.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ~{blocker.potentialPoints} pts potential
                  </span>
                </div>
              ))}
            </div>
          )}

          <ActionBox
            message={actionMessage}
            action={actionText}
            link="/practice/dashboard"
            variant={gap > 100 ? 'urgent' : gap > 0 ? 'default' : 'success'}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}
