import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, BookOpen, Trophy, CalendarCheck, CalendarClock,
  ArrowRight, ArrowLeft, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const generateSATDates = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const satMonths = [
    { month: 2, label: 'March' }, { month: 4, label: 'May' }, { month: 5, label: 'June' },
    { month: 7, label: 'August' }, { month: 8, label: 'September' },
    { month: 9, label: 'October' }, { month: 10, label: 'November' }, { month: 11, label: 'December' },
  ];
  const dates: { value: string; label: string }[] = [];
  [currentYear, currentYear + 1].forEach(year => {
    satMonths.forEach(({ month, label }) => {
      if (year > currentYear || (year === currentYear && month >= currentMonth)) {
        dates.push({ value: `${year}-${String(month + 1).padStart(2, '0')}`, label: `${label} ${year}` });
      }
    });
  });
  return dates;
};

const SAT_TEST_DATES = generateSATDates();

interface Step {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
}

interface WelcomeOnboardingModalProps {
  open: boolean;
  onClose: () => void;
}

export function WelcomeOnboardingModal({ open, onClose }: WelcomeOnboardingModalProps) {
  const { student } = useStudentAuth();
  const [step, setStep] = useState(0);
  const [selectedDate, setSelectedDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [direction, setDirection] = useState(1);

  const firstName = student?.linked_student?.first_name || 'there';

  const steps: Step[] = [
    {
      icon: <Sparkles className="h-8 w-8 text-primary" />,
      iconBg: 'bg-primary/10',
      title: `Welcome, ${firstName}! 🎉`,
      description: "We're excited to have you. Let's take a quick tour of what you can do here.",
    },
    {
      icon: <BookOpen className="h-8 w-8 text-blue-500" />,
      iconBg: 'bg-blue-500/10',
      title: 'Practice Math & English',
      description: 'Jump into daily practice, smart practice that adapts to your level, or speed mode to sharpen your timing.',
    },
    {
      icon: <Trophy className="h-8 w-8 text-amber-500" />,
      iconBg: 'bg-amber-500/10',
      title: 'Track Your Progress',
      description: 'Earn badges, climb the leaderboard, and keep your streak alive. Your stats update in real time.',
    },
    {
      icon: <CalendarCheck className="h-8 w-8 text-emerald-500" />,
      iconBg: 'bg-emerald-500/10',
      title: 'Book a Seat',
      description: 'Reserve your spot for in-person review sessions with just a tap. First come, first served!',
    },
    {
      icon: <CalendarClock className="h-8 w-8 text-primary" />,
      iconBg: 'bg-primary/10',
      title: 'When is your SAT?',
      description: "We'll show you a personalized countdown and tailor your practice schedule.",
    },
  ];

  const totalSteps = steps.length;
  const isLastStep = step === totalSteps - 1;

  const markOnboardingComplete = async () => {
    if (student) {
      await supabase
        .from('student_accounts')
        .update({ onboarding_completed: true })
        .eq('id', student.id);
    }
  };

  const handleNext = () => {
    if (isLastStep) return;
    setDirection(1);
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step === 0) return;
    setDirection(-1);
    setStep((s) => s - 1);
  };

  const handleSkip = async () => {
    await markOnboardingComplete();
    onClose();
  };

  const handleFinish = async () => {
    if (!student?.linked_student?.id) {
      await markOnboardingComplete();
      onClose();
      return;
    }

    setSaving(true);
    try {
      if (selectedDate) {
        const { error } = await supabase
          .from('students')
          .update({ sat_test_month: selectedDate })
          .eq('id', student.linked_student.id);
        if (error) throw error;
      }
      await markOnboardingComplete();
      toast.success("You're all set! Let's go 🚀");
      onClose();
      window.location.reload();
    } catch {
      toast.error('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -80 : 80, opacity: 0 }),
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleSkip()}>
      <DialogContent className="sm:max-w-md overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Welcome Onboarding</DialogTitle>
          <DialogDescription>A quick tour of the platform</DialogDescription>
        </DialogHeader>

        <div className="min-h-[280px] flex flex-col">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="flex flex-col items-center text-center gap-3 py-4"
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${steps[step].iconBg}`}>
                {steps[step].icon}
              </div>
              <h2 className="text-xl font-bold tracking-tight">{steps[step].title}</h2>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                {steps[step].description}
              </p>

              {/* SAT date picker on last step */}
              {isLastStep && (
                <div className="w-full mt-2">
                  <Select value={selectedDate} onValueChange={setSelectedDate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your SAT date..." />
                    </SelectTrigger>
                    <SelectContent>
                      {SAT_TEST_DATES.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Step dots */}
          <div className="flex justify-center gap-1.5 mt-auto pt-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/25'
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-4">
            {step > 0 ? (
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={handleSkip}>
                Skip
              </Button>
            )}

            {isLastStep ? (
              <div className="flex gap-2">
                {!selectedDate && (
                  <Button variant="ghost" size="sm" onClick={handleSkip}>
                    Skip for now
                  </Button>
                )}
                <Button size="sm" onClick={handleFinish} disabled={saving}>
                  {saving ? 'Saving...' : selectedDate ? 'Finish' : "Let's go!"}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={handleNext}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
