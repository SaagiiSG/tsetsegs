import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import type { TopicAccuracy } from '@/hooks/useStudentAnalytics';

interface PriorityAlertCardProps {
  weakestTopic: TopicAccuracy | null;
}

export function PriorityAlertCard({ weakestTopic }: PriorityAlertCardProps) {
  const navigate = useNavigate();

  if (!weakestTopic) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-emerald-500/20">
                <Target className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-emerald-600">You're on track!</h2>
                <p className="text-muted-foreground">Start practicing to see your analytics</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const isUrgent = weakestTopic.accuracy < 50;
  const targetAccuracy = 85;
  const gap = targetAccuracy - weakestTopic.accuracy;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className={`relative overflow-hidden ${
        isUrgent 
          ? 'bg-gradient-to-br from-red-500/20 via-red-500/10 to-background border-red-500/40' 
          : 'bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-background border-amber-500/40'
      }`}>
        {/* Animated pulse border effect */}
        <motion.div
          className={`absolute inset-0 border-2 rounded-lg ${isUrgent ? 'border-red-500' : 'border-amber-500'}`}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        
        <CardContent className="p-6 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2.5 rounded-full ${isUrgent ? 'bg-red-500/20' : 'bg-amber-500/20'}`}>
                  <AlertTriangle className={`h-6 w-6 ${isUrgent ? 'text-red-500' : 'text-amber-500'}`} />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Priority Focus Area
                  </p>
                  <h2 className="text-xl font-bold">{weakestTopic.topicName}</h2>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 rounded-lg bg-background/50">
                  <p className={`text-2xl font-bold ${isUrgent ? 'text-red-500' : 'text-amber-500'}`}>
                    {weakestTopic.accuracy}%
                  </p>
                  <p className="text-xs text-muted-foreground">Current</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-background/50">
                  <p className="text-2xl font-bold text-emerald-500">{targetAccuracy}%</p>
                  <p className="text-xs text-muted-foreground">Target</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-background/50">
                  <p className={`text-2xl font-bold ${isUrgent ? 'text-red-500' : 'text-amber-500'}`}>
                    +{gap}%
                  </p>
                  <p className="text-xs text-muted-foreground">Gap</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress to target</span>
                  <span>{Math.round((weakestTopic.accuracy / targetAccuracy) * 100)}%</span>
                </div>
                <Progress 
                  value={(weakestTopic.accuracy / targetAccuracy) * 100} 
                  className="h-2"
                />
              </div>

              <p className="text-sm text-muted-foreground mt-3">
                You've attempted <span className="font-semibold">{weakestTopic.questionsAttempted}</span> questions 
                with <span className="font-semibold">{weakestTopic.correctAnswers}</span> correct answers.
              </p>
            </div>

            <div className="md:ml-4">
              <Button 
                size="lg"
                className={`w-full md:w-auto gap-2 ${
                  isUrgent 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-amber-500 hover:bg-amber-600 text-black'
                }`}
                onClick={() => navigate('/practice/dashboard')}
              >
                Start Practice
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
