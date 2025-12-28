import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, ChevronRight, ChevronLeft, Calculator, BookOpen, Plus, Save, AlertTriangle } from 'lucide-react';

interface TutorialStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  highlight?: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Welcome to Schedule Builder',
    description: 'This tool helps you create separate schedules for Math and English classes. Each schedule can have multiple time slots on different days.',
    icon: <Calculator className="w-8 h-8 text-blue-500" />,
  },
  {
    title: 'Adding Time Slots',
    description: 'Click the "Add" button to create a new time slot. You can select the day and freely choose start/end times from the dropdown menus.',
    icon: <Plus className="w-8 h-8 text-green-500" />,
    highlight: 'add-button',
  },
  {
    title: 'Math vs English Schedules',
    description: 'Math schedule is the paid class. English schedule is marked as "үнэгүй" (free) and will display that way to students.',
    icon: <BookOpen className="w-8 h-8 text-purple-500" />,
  },
  {
    title: 'Saving Templates',
    description: 'Click "Save" on any schedule to save it as a template. Next time, you can quickly apply saved templates instead of building from scratch.',
    icon: <Save className="w-8 h-8 text-amber-500" />,
    highlight: 'save-button',
  },
  {
    title: 'Conflict Detection',
    description: 'The builder automatically detects if Math and English schedules overlap on the same day/time and will warn you.',
    icon: <AlertTriangle className="w-8 h-8 text-red-500" />,
  },
];

interface ScheduleBuilderTutorialProps {
  onComplete: () => void;
  isOpen: boolean;
}

export function ScheduleBuilderTutorial({ onComplete, isOpen }: ScheduleBuilderTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  if (!isOpen) return null;

  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleSkip}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-6 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {TUTORIAL_STEPS.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      idx === currentStep ? 'bg-primary' : idx < currentStep ? 'bg-primary/50' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
              <Button variant="ghost" size="icon" onClick={handleSkip} className="h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-background rounded-xl shadow-sm">
                {step.icon}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Step {currentStep + 1} of {TUTORIAL_STEPS.length}</p>
                <h3 className="text-lg font-semibold">{step.title}</h3>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <motion.p
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-muted-foreground leading-relaxed"
            >
              {step.description}
            </motion.p>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border flex items-center justify-between bg-muted/30">
            <Button
              variant="ghost"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSkip}>
                Skip
              </Button>
              <Button onClick={handleNext} className="gap-1">
                {isLastStep ? 'Get Started' : 'Next'}
                {!isLastStep && <ChevronRight className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
