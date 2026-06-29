import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingDown, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStudentAnalytics } from '@/hooks/useStudentAnalytics';
import { cn } from '@/lib/utils';

export function WeaknessIsland() {
  const { topicAccuracy, isLoading } = useStudentAnalytics('all');
  const navigate = useNavigate();

  // Bottom 5 weakest with attempts
  const weakest = topicAccuracy.filter((t) => t.questionsAttempted >= 3).slice(0, 5);

  const colorFor = (acc: number) => {
    if (acc < 60) return 'hsl(0, 84%, 60%)';
    if (acc < 80) return 'hsl(35, 92%, 55%)';
    return 'hsl(142, 71%, 45%)';
  };

  return (
    <Card className="h-full">
      <CardContent className="p-3 sm:p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <TrendingDown className="h-4 w-4 text-amber-500" />
            </div>
            <span className="text-sm font-semibold">Weakest Topics</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => navigate('/practice/stats')}
          >
            All <ArrowRight className="h-3 w-3 ml-0.5" />
          </Button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">Loading…</div>
        ) : weakest.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 px-4">
            <span className="text-3xl">💪</span>
            <p className="text-xs text-muted-foreground">
              Not enough data yet. Keep practicing — your weakest topics will show up here.
            </p>
          </div>
        ) : (
          <div className="flex-1 space-y-2">
            {weakest.map((t, i) => {
              const color = colorFor(t.accuracy);
              return (
                <motion.button
                  key={t.topicName}
                  type="button"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigate('/practice/dashboard')}
                  className="w-full text-left rounded-lg border bg-card/40 p-2.5 hover:border-primary/40 hover:bg-muted/30 transition-all group/topic"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium truncate pr-2 group-hover/topic:text-foreground">
                      {t.topicName}
                    </span>
                    <span
                      className={cn('text-xs font-mono font-bold shrink-0')}
                      style={{ color }}
                    >
                      {t.accuracy}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${t.accuracy}%` }}
                      transition={{ duration: 0.7, delay: i * 0.05, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: color }}
                    />
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                    {t.correctAnswers}/{t.questionsAttempted} correct
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
