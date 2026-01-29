import { motion } from 'framer-motion';
import { Target, TrendingUp, Crosshair } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ActionBox } from './ActionBox';
import type { TopicAccuracy } from '@/hooks/useStudentAnalytics';

interface GoalGapTrackerProps {
  currentScore: number;
  targetScore: number;
  topicAccuracy: TopicAccuracy[];
}

export function GoalGapTracker({ currentScore, targetScore, topicAccuracy }: GoalGapTrackerProps) {
  const gap = targetScore - currentScore;
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
  const mathGap = 700 - Math.min(700, mathScore); // Target ~700 per section
  const englishGap = 700 - Math.min(700, englishScore);

  // Find top skill blockers (lowest accuracy topics with high potential impact)
  const blockers = topicAccuracy
    .filter((t) => t.accuracy < 85 && t.questionsAttempted > 3)
    .slice(0, 3)
    .map((t) => ({
      name: t.topicName,
      accuracy: t.accuracy,
      potentialPoints: Math.round((85 - t.accuracy) * 0.5), // Rough points estimate
    }));

  const totalBlockerPoints = blockers.reduce((sum, b) => sum + b.potentialPoints, 0);

  const hasData = topicAccuracy.length > 0;

  let actionMessage = '';
  let actionText = '';

  if (!hasData) {
    actionMessage = 'Set your target score and start practicing!';
    actionText = 'Complete 20+ questions to see gap analysis.';
  } else if (gap <= 0) {
    actionMessage = '🎉 You\'ve reached your target! Consider setting a higher goal.';
    actionText = 'Push for 1500+ by mastering all topics.';
  } else if (blockers.length > 0) {
    actionMessage = `Target: ${targetScore} | Current: ${currentScore} | Gap: ${gap} pts. ${mathGap > englishGap ? 'Math gap' : 'English gap'}: ${Math.max(mathGap, englishGap)} pts (focus here first).`;
    actionText = `Master ${blockers[0].name} = close ~${blockers.length >= 2 ? `${Math.round((blockers[0].potentialPoints + blockers[1].potentialPoints) / gap * 100)}%` : `${Math.round(blockers[0].potentialPoints / gap * 100)}%`} of the gap.`;
  } else {
    actionMessage = `Gap: ${gap} pts. Keep practicing to close it.`;
    actionText = 'Focus on consistency and avoid careless mistakes.';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35 }}
    >
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5 text-indigo-500" />
            Goal Gap Tracker
          </CardTitle>
          <CardDescription>How close are you to your target?</CardDescription>
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
              <p className="text-4xl font-bold">{currentScore}</p>
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

          {/* Subject gap breakdown */}
          {hasData && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className={`p-3 rounded-lg border ${mathGap > englishGap ? 'bg-red-500/10 border-red-500/30' : 'bg-muted/50'}`}>
                <p className="text-xs text-muted-foreground">Math Gap</p>
                <p className={`text-xl font-bold ${mathGap > englishGap ? 'text-red-500' : ''}`}>
                  {mathGap > 0 ? `+${mathGap}` : '✓'}
                </p>
                <p className="text-xs text-muted-foreground">{mathAvgAccuracy}% avg</p>
              </div>
              <div className={`p-3 rounded-lg border ${englishGap > mathGap ? 'bg-red-500/10 border-red-500/30' : 'bg-muted/50'}`}>
                <p className="text-xs text-muted-foreground">English Gap</p>
                <p className={`text-xl font-bold ${englishGap > mathGap ? 'text-red-500' : ''}`}>
                  {englishGap > 0 ? `+${englishGap}` : '✓'}
                </p>
                <p className="text-xs text-muted-foreground">{englishAvgAccuracy}% avg</p>
              </div>
            </div>
          )}

          {/* Top blockers */}
          {blockers.length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Crosshair className="h-3 w-3" /> Top Skill Blockers
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
