import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, TrendingUp, TrendingDown, Target, Sparkles, 
  Home, RotateCcw, ArrowRight, Clock, CheckCircle2, XCircle,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SessionResult {
  questionId: string;
  correct: boolean;
  timeSpent: number; // in milliseconds
  subtopic?: string;
  category?: 'math' | 'english';
}

interface WeakArea {
  name: string;
  category: 'math' | 'english';
  incorrectCount: number;
}

interface SessionRecapModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: SessionResult[];
  sessionType: 'practice' | 'speed' | 'review' | 'bluebook';
  previousAccuracy?: number; // To show improvement
  studentAccountId?: string;
  onAddToReview?: (questionIds: string[]) => void;
}

export function SessionRecapModal({
  isOpen,
  onClose,
  results,
  sessionType,
  previousAccuracy,
  studentAccountId,
  onAddToReview
}: SessionRecapModalProps) {
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(false);
  const [isAddingToReview, setIsAddingToReview] = useState(false);

  // Calculate stats
  const totalQuestions = results.length;
  const correctCount = results.filter(r => r.correct).length;
  const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const totalTime = results.reduce((sum, r) => sum + r.timeSpent, 0);
  const avgTimePerQuestion = totalQuestions > 0 ? Math.round(totalTime / totalQuestions / 1000) : 0;

  // Identify weak areas
  const incorrectBySubtopic: Record<string, { count: number; category?: 'math' | 'english' }> = {};
  results.filter(r => !r.correct && r.subtopic).forEach(r => {
    if (!incorrectBySubtopic[r.subtopic!]) {
      incorrectBySubtopic[r.subtopic!] = { count: 0, category: r.category };
    }
    incorrectBySubtopic[r.subtopic!].count++;
  });

  const weakAreas: WeakArea[] = Object.entries(incorrectBySubtopic)
    .map(([name, { count, category }]) => ({ name, incorrectCount: count, category: category || 'math' }))
    .sort((a, b) => b.incorrectCount - a.incorrectCount)
    .slice(0, 2);

  // Determine if personal best
  const isPersonalBest = previousAccuracy !== undefined && accuracy > previousAccuracy;
  const isPerfect = accuracy === 100 && totalQuestions >= 5;

  // Show confetti for perfect or personal best
  useState(() => {
    if (isOpen && (isPerfect || isPersonalBest)) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  });

  // Get incorrect question IDs for review scheduling
  const incorrectQuestionIds = results.filter(r => !r.correct).map(r => r.questionId);

  const handleAddToReview = async () => {
    if (!studentAccountId || incorrectQuestionIds.length === 0) return;
    
    setIsAddingToReview(true);
    try {
      // Add each incorrect question to review queue
      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + 1); // Review tomorrow

      const inserts = incorrectQuestionIds.map(qId => ({
        student_account_id: studentAccountId,
        question_id: qId,
        next_review_at: nextReviewDate.toISOString(),
        ease_factor: 2.5,
        interval_days: 1,
        review_count: 1
      }));

      // Upsert to avoid duplicates
      for (const insert of inserts) {
        await supabase
          .from('student_review_queue')
          .upsert(insert, { onConflict: 'student_account_id,question_id' });
      }

      toast.success(`${incorrectQuestionIds.length} questions added to review queue!`);
      onAddToReview?.(incorrectQuestionIds);
    } catch (error) {
      console.error('Failed to add to review:', error);
      toast.error('Failed to schedule review');
    } finally {
      setIsAddingToReview(false);
    }
  };

  const getPerformanceMessage = () => {
    if (isPerfect) return { text: "Perfect Score! 🎉", color: 'text-green-600' };
    if (accuracy >= 90) return { text: "Excellent work!", color: 'text-green-600' };
    if (accuracy >= 75) return { text: "Great job!", color: 'text-primary' };
    if (accuracy >= 60) return { text: "Good effort!", color: 'text-amber-600' };
    return { text: "Keep practicing!", color: 'text-muted-foreground' };
  };

  const performanceMessage = getPerformanceMessage();

  const getSessionTypeLabel = () => {
    switch (sessionType) {
      case 'speed': return 'Speed Session';
      case 'review': return 'Review Session';
      case 'bluebook': return 'Mock Test';
      default: return 'Practice Session';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md overflow-hidden">
        {showConfetti && (
          <Confetti
            width={400}
            height={500}
            recycle={false}
            numberOfPieces={200}
            gravity={0.2}
          />
        )}

        <DialogHeader className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="mx-auto mb-2"
          >
            <div className={cn(
              "h-16 w-16 rounded-full flex items-center justify-center mx-auto",
              isPerfect ? "bg-gradient-to-br from-yellow-400 to-amber-500" :
              accuracy >= 75 ? "bg-gradient-to-br from-green-400 to-green-600" :
              "bg-gradient-to-br from-primary/80 to-primary"
            )}>
              <Trophy className="h-8 w-8 text-white" />
            </div>
          </motion.div>

          <DialogTitle className="text-xl">
            {getSessionTypeLabel()} Complete!
          </DialogTitle>

          <p className={cn("text-lg font-medium", performanceMessage.color)}>
            {performanceMessage.text}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-3 rounded-lg bg-muted/50 text-center"
            >
              <p className="text-2xl font-bold">{totalQuestions}</p>
              <p className="text-xs text-muted-foreground">Questions</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="p-3 rounded-lg bg-green-500/10 text-center"
            >
              <p className="text-2xl font-bold text-green-600">{correctCount}</p>
              <p className="text-xs text-muted-foreground">Correct</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-3 rounded-lg bg-primary/10 text-center"
            >
              <div className="flex items-center justify-center gap-1">
                <p className="text-2xl font-bold text-primary">{accuracy}%</p>
                {previousAccuracy !== undefined && (
                  accuracy > previousAccuracy ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : accuracy < previousAccuracy ? (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  ) : null
                )}
              </div>
              <p className="text-xs text-muted-foreground">Accuracy</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="p-3 rounded-lg bg-amber-500/10 text-center"
            >
              <div className="flex items-center justify-center gap-1">
                <Clock className="h-4 w-4 text-amber-600" />
                <p className="text-2xl font-bold text-amber-600">{avgTimePerQuestion}s</p>
              </div>
              <p className="text-xs text-muted-foreground">Avg/Question</p>
            </motion.div>
          </div>

          {/* Weak Areas */}
          {weakAreas.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              <p className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-amber-600" />
                Areas to Review
              </p>
              <div className="flex flex-wrap gap-2">
                {weakAreas.map((area, i) => (
                  <Badge
                    key={area.name}
                    variant="outline"
                    className="text-xs cursor-pointer hover:bg-primary/10"
                    onClick={() => navigate(`/practice/${area.category}`)}
                  >
                    {area.name}
                    <span className="ml-1 text-destructive">({area.incorrectCount})</span>
                  </Badge>
                ))}
              </div>
            </motion.div>
          )}

          {/* Schedule Review CTA */}
          {incorrectQuestionIds.length > 0 && studentAccountId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 text-amber-600 border-amber-600/30 hover:bg-amber-600/10"
                onClick={handleAddToReview}
                disabled={isAddingToReview}
              >
                <BookOpen className="h-4 w-4" />
                {isAddingToReview ? 'Adding...' : `Add ${incorrectQuestionIds.length} to Review Queue`}
              </Button>
            </motion.div>
          )}

          {/* Personal Best Badge */}
          <AnimatePresence>
            {isPersonalBest && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, type: "spring" }}
                className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30"
              >
                <Sparkles className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-700">New Personal Best!</span>
                <span className="text-xs text-muted-foreground">
                  +{accuracy - previousAccuracy!}% improvement
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => {
              onClose();
              navigate(-1);
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Try Again
          </Button>
          <Button
            className="flex-1 gap-2"
            onClick={() => {
              onClose();
              navigate('/practice/dashboard');
            }}
          >
            <Home className="h-4 w-4" />
            Dashboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
