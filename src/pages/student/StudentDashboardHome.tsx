import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useSyncBadgeProgress } from '@/hooks/useSyncBadgeProgress';
import { useDailyGoals } from '@/hooks/useDailyGoals';
import { useDailyProgress } from '@/hooks/useDailyProgress';
import { toast } from 'sonner';

import { DailyRing } from '@/components/student/dashboard/DailyRing';
import { SetProgressIsland } from '@/components/student/dashboard/SetProgressIsland';
import { GoalSetupDialog } from '@/components/student/dashboard/GoalSetupDialog';
import { WeaknessIsland } from '@/components/student/dashboard/WeaknessIsland';
import { SpeedIsland } from '@/components/student/dashboard/SpeedIsland';
import { MasteryHexagon } from '@/components/student/dashboard/MasteryHexagon';
import { QuickVocabQuiz } from '@/components/student/dashboard/QuickVocabQuiz';
import { StudentSatSimulationCard } from '@/components/student/dashboard/StudentSatSimulationCard';
import { StreakHistoryDialog } from '@/components/student/StreakHistoryDialog';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ClosingReportContent, useClosingReportData } from '@/pages/student/StudentClosingReport';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';

export default function StudentDashboardHome() {
  const { student } = useStudentAuth();
  const { isEnabled } = useFeatureFlags();
  const { goals, isSet: goalsSet, isLoading: goalsLoading } = useDailyGoals();
  const { data: progress } = useDailyProgress();

  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [showClosingReport, setShowClosingReport] = useState(false);
  const [streakHistoryOpen, setStreakHistoryOpen] = useState(false);

  // Auto-open goal setup on first visit
  useEffect(() => {
    if (!goalsLoading && !goalsSet && student?.id) {
      const dismissKey = `goals_setup_seen_${student.id}`;
      if (!localStorage.getItem(dismissKey)) {
        setGoalDialogOpen(true);
        localStorage.setItem(dismissKey, '1');
      }
    }
  }, [goalsLoading, goalsSet, student?.id]);

  // Badge progress sync (once)
  const { syncBadgeProgress } = useSyncBadgeProgress();
  const synced = useRef(false);
  useEffect(() => {
    if (student?.id && !synced.current) {
      synced.current = true;
      syncBadgeProgress().then((newly) => {
        if (newly.length > 0) {
          toast.success(`🎉 Badge${newly.length > 1 ? 's' : ''} unlocked: ${newly.join(', ')}`);
        }
      });
    }
  }, [student?.id, syncBadgeProgress]);

  // Closing report (preserved from previous dashboard)
  const studentId = student?.linked_student?.id;
  const batchId = student?.linked_student?.batch_id;
  const { data: batchCompleted } = useQuery({
    queryKey: ['batch-completed-check', studentId, batchId],
    enabled: !!studentId && !!batchId && isEnabled('closing_reports'),
    queryFn: async () => {
      const { data } = await supabase
        .from('attendance')
        .select('session_15')
        .eq('student_id', studentId!)
        .eq('batch_id', batchId!)
        .maybeSingle();
      return data?.session_15 != null;
    },
  });
  const { data: closingReportData } = useClosingReportData(
    batchCompleted ? studentId : undefined,
    batchCompleted ? batchId : undefined,
  );

  const studentName = student?.linked_student?.first_name || 'there';

  return (
    <div className="p-3 md:p-5 space-y-4 md:space-y-5 select-none max-w-[1400px] mx-auto">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-end justify-between gap-3 flex-wrap"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Hey {studentName} 👋
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            {goalsSet ? "Let's close those rings today." : 'Set up your daily ring to get started.'}
          </p>
        </div>
        {batchCompleted && closingReportData && (
          <Button variant="outline" size="sm" onClick={() => setShowClosingReport(true)}>
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            View closing report
          </Button>
        )}
      </motion.div>

      {/* Row 1: 25% ring + 75% set progress */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="lg:col-span-3 aspect-square lg:aspect-auto lg:min-h-[320px]"
        >
          <DailyRing
            speed={{ current: progress?.speed ?? 0, goal: goals.speed }}
            hard={{ current: progress?.hard ?? 0, goal: goals.hard }}
            medium={{ current: progress?.medium ?? 0, goal: goals.medium }}
            onEditGoals={() => setGoalDialogOpen(true)}
            onShowHistory={() => setStreakHistoryOpen(true)}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-9 lg:min-h-[320px]"
        >
          <SetProgressIsland />
        </motion.div>
      </div>

      {/* Row 2: 40% weakness + 60% speed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-5 min-h-[280px]"
        >
          <WeaknessIsland />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-7 min-h-[280px]"
        >
          <SpeedIsland />
        </motion.div>
      </div>

      {/* SAT Simulation Engine — locked until 440 questions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
      >
        <StudentSatSimulationCard />
      </motion.div>

      {/* Row 3: 50/50 hexagon + vocab */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="min-h-[340px]"
        >
          <MasteryHexagon />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="min-h-[340px]"
        >
          <QuickVocabQuiz />
        </motion.div>
      </div>

      {/* Goal setup dialog */}
      <GoalSetupDialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen} />

      {/* Closing report dialog */}
      {batchCompleted && closingReportData && (
        <Dialog open={showClosingReport} onOpenChange={setShowClosingReport}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
            <ClosingReportContent data={closingReportData} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
