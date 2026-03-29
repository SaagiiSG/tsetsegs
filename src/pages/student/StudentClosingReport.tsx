import { useState, useEffect } from 'react';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, Share2, BookOpen, Trophy, TrendingUp, ArrowUp, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ReportData {
  studentName: string;
  batchName: string | null;
  attendanceRate: number;
  totalSessions: number;
  homeworkCompletion: number;
  firstMockScore: number | null;
  highestMockScore: number | null;
  scoreImprovement: number | null;
  totalQuestionsAttempted: number;
}

function useClosingReportData(studentId?: string, batchId?: string) {
  return useQuery({
    queryKey: ['closing-report', studentId, batchId],
    enabled: !!studentId && !!batchId,
    queryFn: async () => {
      // Fetch student info
      const { data: student } = await supabase
        .from('students')
        .select('first_name, last_name, batch_id')
        .eq('id', studentId!)
        .single();

      // Fetch batch info
      const { data: batch } = await supabase
        .from('batches')
        .select('batch_name, course_type')
        .eq('id', batchId!)
        .single();

      if (batch?.course_type === 'IELTS') return null; // Skip for IELTS

      // Attendance
      const { data: attendance } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', studentId!)
        .eq('batch_id', batchId!)
        .single();

      let attendanceRate = 0;
      let totalSessions = 0;
      if (attendance) {
        const sessionKeys = Array.from({ length: 15 }, (_, i) => `session_${i + 1}`);
        const attended = sessionKeys.filter(k => {
          const val = (attendance as any)[k];
          return val === 'present' || val === 'late';
        }).length;
        const total = sessionKeys.filter(k => (attendance as any)[k] !== null).length;
        totalSessions = total;
        attendanceRate = total > 0 ? Math.round((attended / total) * 100) : 0;
      }

      // Homework
      const { data: homework } = await supabase
        .from('homework')
        .select('completed')
        .eq('student_id', studentId!)
        .eq('batch_id', batchId!);

      const hwTotal = homework?.length || 0;
      const hwDone = homework?.filter(h => h.completed).length || 0;
      const homeworkCompletion = hwTotal > 0 ? Math.round((hwDone / hwTotal) * 100) : 0;

      // Mock scores (practice_tests)
      const { data: mockTests } = await supabase
        .from('practice_tests')
        .select('test_number, score')
        .eq('student_id', studentId!)
        .eq('batch_id', batchId!)
        .order('test_number', { ascending: true });

      const firstMock = mockTests?.[0]?.score ?? null;
      const highestMock = mockTests?.length ? Math.max(...mockTests.map(t => t.score || 0)) : null;
      const lastMock = mockTests?.length ? mockTests[mockTests.length - 1]?.score : null;
      const scoreImprovement = firstMock && lastMock ? lastMock - firstMock : null;

      // Total questions attempted
      const { data: studentAccount } = await supabase
        .from('student_accounts')
        .select('id')
        .eq('linked_student_id', studentId!)
        .single();

      let totalQuestionsAttempted = 0;
      if (studentAccount) {
        const { count } = await supabase
          .from('student_attempts')
          .select('id', { count: 'exact', head: true })
          .eq('student_account_id', studentAccount.id);
        totalQuestionsAttempted = count || 0;
      }

      return {
        studentName: `${student?.first_name || ''} ${student?.last_name || ''}`.trim(),
        batchName: batch?.batch_name,
        attendanceRate,
        totalSessions,
        homeworkCompletion,
        firstMockScore: firstMock,
        highestMockScore: highestMock,
        scoreImprovement,
        totalQuestionsAttempted,
      } as ReportData;
    },
  });
}

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction < 0 ? 300 : -300, opacity: 0 }),
};

function ReportSlide({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center h-full text-center px-6 py-4 space-y-4",
      className
    )}>
      {children}
    </div>
  );
}

interface ClosingReportSettings {
  heading: string;
  body: string;
  sign_off: string;
}

interface ClosingReportContentProps {
  data: ReportData;
  shareToken?: string;
  settings?: ClosingReportSettings | null;
}

export function ClosingReportContent({ data, shareToken, settings }: ClosingReportContentProps) {
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState(0);
  const totalPages = 6;

  const firstName = data.studentName.split(' ')[0] || 'Student';
  const finalHeading = (settings?.heading || 'Thank You, {name}!').replace(/{name}/g, firstName);
  const finalBody = (settings?.body || 'Your hard work and dedication throughout this program have been incredible. Keep pushing toward your goals — we believe in you!').replace(/{name}/g, firstName);
  const finalSignOff = (settings?.sign_off || 'See you on the review session! 🚀').replace(/{name}/g, firstName);

  const goNext = () => {
    if (page < totalPages - 1) { setDirection(1); setPage(p => p + 1); }
  };
  const goPrev = () => {
    if (page > 0) { setDirection(-1); setPage(p => p - 1); }
  };

  const handleShare = async () => {
    if (shareToken) {
      const url = `${window.location.origin}/report/${shareToken}`;
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    }
  };

  const slides = [
    // Slide 0: Congrats Intro
    <ReportSlide key="congrats">
      <motion.div
        initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
        className="text-6xl"
      >
        🎉
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-3xl font-black"
      >
        Congrats, {firstName}!
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-muted-foreground max-w-xs text-base"
      >
        You've finished the course! Let's take a look at how you did.
      </motion.p>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <Button onClick={goNext} size="lg" className="gap-2 mt-4">
          Let's Go <ChevronRight className="h-4 w-4" />
        </Button>
      </motion.div>
    </ReportSlide>,

    // Slide 1: Class Stats
    <ReportSlide key="stats">
      <motion.div
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
        className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center"
      >
        <BookOpen className="h-10 w-10 text-primary" />
      </motion.div>
      <h2 className="text-2xl font-bold">Your Journey</h2>
      <p className="text-muted-foreground">Here's how you showed up, {data.studentName.split(' ')[0]}!</p>
      <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
        <div className="bg-card border rounded-xl p-4">
          <div className="text-3xl font-bold text-primary">{data.attendanceRate}%</div>
          <div className="text-xs text-muted-foreground mt-1">Attendance</div>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <div className="text-3xl font-bold text-primary">{data.homeworkCompletion}%</div>
          <div className="text-xs text-muted-foreground mt-1">Homework</div>
        </div>
        <div className="bg-card border rounded-xl p-4 col-span-2">
          <div className="text-3xl font-bold text-primary">{data.totalQuestionsAttempted}</div>
          <div className="text-xs text-muted-foreground mt-1">Questions Practiced</div>
        </div>
      </div>
    </ReportSlide>,

    // Slide 2: First Mock
    <ReportSlide key="first">
      <motion.div
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
        className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center"
      >
        <Trophy className="h-10 w-10 text-amber-500" />
      </motion.div>
      <h2 className="text-2xl font-bold">Your Starting Point</h2>
      <p className="text-muted-foreground">First practice test score</p>
      {data.firstMockScore ? (
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, type: 'spring' }}
          className="text-6xl font-black text-primary"
        >
          {data.firstMockScore}
        </motion.div>
      ) : (
        <p className="text-muted-foreground italic">No practice test recorded</p>
      )}
    </ReportSlide>,

    // Slide 3: Highest Score
    <ReportSlide key="highest">
      <motion.div
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
        className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center"
      >
        <TrendingUp className="h-10 w-10 text-emerald-500" />
      </motion.div>
      <h2 className="text-2xl font-bold">Your Peak</h2>
      <p className="text-muted-foreground">Highest practice test score</p>
      {data.highestMockScore ? (
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, type: 'spring' }}
          className="text-6xl font-black text-emerald-500"
        >
          {data.highestMockScore}
        </motion.div>
      ) : (
        <p className="text-muted-foreground italic">No practice test recorded</p>
      )}
    </ReportSlide>,

    // Slide 4: Improvement
    <ReportSlide key="improve">
      <motion.div
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
        className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center"
      >
        <ArrowUp className="h-10 w-10 text-blue-500" />
      </motion.div>
      <h2 className="text-2xl font-bold">Your Growth</h2>
      <p className="text-muted-foreground">Score improvement over the program</p>
      {data.scoreImprovement !== null ? (
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, type: 'spring' }}
          className={cn(
            "text-6xl font-black",
            data.scoreImprovement >= 0 ? "text-emerald-500" : "text-destructive"
          )}
        >
          {data.scoreImprovement >= 0 ? '+' : ''}{data.scoreImprovement}
        </motion.div>
      ) : (
        <p className="text-muted-foreground italic">Not enough data</p>
      )}
      <p className="text-sm text-muted-foreground">points</p>
    </ReportSlide>,

    // Slide 5: Thank You
    <ReportSlide key="thanks">
      <motion.div
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
        className="w-20 h-20 rounded-full bg-pink-500/10 flex items-center justify-center"
      >
        <Heart className="h-10 w-10 text-pink-500" />
      </motion.div>
      <h2 className="text-3xl font-bold">{finalHeading}</h2>
      <p className="text-muted-foreground max-w-sm">{finalBody}</p>
      <p className="text-lg font-semibold text-primary mt-2">{finalSignOff}</p>
      {shareToken && (
        <Button onClick={handleShare} variant="outline" className="gap-2">
          <Share2 className="h-4 w-4" />
          Share with Parents
        </Button>
      )}
    </ReportSlide>,
  ];

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Content */}
      <div className="flex-1 relative overflow-hidden min-h-0">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={page}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="h-full"
          >
            {slides[page]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center px-4 py-3 border-t border-border shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={goPrev}
          disabled={page === 0}
          className="gap-1 disabled:opacity-0"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalPages }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300 cursor-pointer",
                i === page ? "bg-primary w-5" : "bg-muted-foreground/20 hover:bg-muted-foreground/40"
              )}
              onClick={() => { setDirection(i > page ? 1 : -1); setPage(i); }}
            />
          ))}
        </div>
        <Button
          variant={page === totalPages - 1 ? "ghost" : "default"}
          size="sm"
          onClick={goNext}
          disabled={page === totalPages - 1}
          className="gap-1 disabled:opacity-0"
        >
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function StudentClosingReport() {
  const { student } = useStudentAuth();
  const studentId = student?.linked_student?.id;
  const batchId = student?.linked_student?.batch_id;

  const { data, isLoading } = useClosingReportData(studentId, batchId);

  const { data: settings } = useQuery({
    queryKey: ['closing-report-settings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('closing_report_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      return data as ClosingReportSettings | null;
    },
  });

  // Generate share token
  const [shareToken, setShareToken] = useState<string | null>(null);
  useEffect(() => {
    if (!studentId || !batchId) return;
    (async () => {
      const { data: existing } = await supabase
        .from('closing_report_tokens')
        .select('token')
        .eq('student_id', studentId)
        .eq('batch_id', batchId)
        .maybeSingle();
      if (existing) {
        setShareToken(existing.token);
      }
    })();
  }, [studentId, batchId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        No closing report available yet.
      </div>
    );
  }

  return <ClosingReportContent data={data} shareToken={shareToken || undefined} settings={settings} />;
}

export { useClosingReportData };
