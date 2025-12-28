import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

interface TutorialStep {
  title: string;
  description: string;
  targetSelector: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Math Schedule',
    description: 'Create the paid Math class schedule here. Add multiple time slots for different days.',
    targetSelector: '[data-tutorial="math-section"]',
    position: 'right',
  },
  {
    title: 'English Schedule (Free)',
    description: 'Set up the free English class schedule. Students will see this marked as "үнэгүй" (free).',
    targetSelector: '[data-tutorial="english-section"]',
    position: 'left',
  },
  {
    title: 'Add Time Slots',
    description: 'Click here to add a new time slot. You can add multiple slots per subject.',
    targetSelector: '[data-tutorial="add-math"]',
    position: 'bottom',
  },
  {
    title: 'Save as Template',
    description: 'Save your schedule as a template for quick reuse when creating new batches.',
    targetSelector: '[data-tutorial="save-math"]',
    position: 'bottom',
  },
  {
    title: 'Quick Templates',
    description: 'Click any saved template to instantly apply it. Great for recurring schedules!',
    targetSelector: '[data-tutorial="templates-math"]',
    position: 'bottom',
  },
];

interface ScheduleBuilderTutorialProps {
  onComplete: () => void;
  isOpen: boolean;
}

export function ScheduleBuilderTutorial({ onComplete, isOpen }: ScheduleBuilderTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setMounted(true);
    } else {
      setMounted(false);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          if (currentStep < TUTORIAL_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
          } else {
            onComplete();
          }
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onComplete();
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (currentStep < TUTORIAL_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
          } else {
            onComplete();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep, onComplete]);

  useEffect(() => {
    if (!isOpen || !mounted) return;

    const updateTargetRect = () => {
      const step = TUTORIAL_STEPS[currentStep];
      const target = document.querySelector(step.targetSelector);
      if (target) {
        const rect = target.getBoundingClientRect();
        setTargetRect(rect);
      } else {
        setTargetRect(null);
      }
    };

    // Delay to allow DOM to render
    const timeout = setTimeout(updateTargetRect, 100);
    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect, true);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect, true);
    };
  }, [currentStep, isOpen, mounted]);

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
  const padding = 8;

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) return { opacity: 0 };

    const tooltipWidth = 280;
    const tooltipHeight = 180;
    const gap = 16;

    switch (step.position) {
      case 'right':
        return {
          left: Math.min(targetRect.right + gap, window.innerWidth - tooltipWidth - 20),
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
        };
      case 'left':
        return {
          left: Math.max(targetRect.left - tooltipWidth - gap, 20),
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
        };
      case 'bottom':
        return {
          left: Math.max(20, Math.min(targetRect.left + targetRect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - 20)),
          top: targetRect.bottom + gap,
        };
      case 'top':
        return {
          left: Math.max(20, Math.min(targetRect.left + targetRect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - 20)),
          top: targetRect.top - tooltipHeight - gap,
        };
      default:
        return {};
    }
  };

  return (
    <AnimatePresence>
      {mounted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50"
          style={{ pointerEvents: 'auto' }}
        >
          {/* Dark overlay with spotlight cutout */}
          <svg
            className="absolute inset-0 w-full h-full"
            style={{ pointerEvents: 'none' }}
          >
            <defs>
              <mask id="spotlight-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {targetRect && (
                  <rect
                    x={targetRect.left - padding}
                    y={targetRect.top - padding}
                    width={targetRect.width + padding * 2}
                    height={targetRect.height + padding * 2}
                    rx="12"
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(0, 0, 0, 0.75)"
              mask="url(#spotlight-mask)"
            />
          </svg>

          {/* Highlight border around target */}
          {targetRect && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute pointer-events-none"
              style={{
                left: targetRect.left - padding,
                top: targetRect.top - padding,
                width: targetRect.width + padding * 2,
                height: targetRect.height + padding * 2,
                borderRadius: 12,
                border: '2px solid hsl(var(--primary))',
                boxShadow: '0 0 0 4px hsl(var(--primary) / 0.2), 0 0 20px hsl(var(--primary) / 0.3)',
              }}
            />
          )}

          {/* Skip button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSkip}
            className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white z-10"
          >
            <X className="w-5 h-5" />
          </Button>

          {/* Click blocker - rendered first so tooltip is on top */}
          <div
            className="absolute inset-0"
            onClick={handleSkip}
          />

          {/* Tooltip - rendered last to be on top */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute w-[280px] bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-10"
            style={getTooltipStyle()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Progress dots */}
            <div className="flex items-center gap-1.5 p-3 border-b border-border bg-muted/50">
              {TUTORIAL_STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx === currentStep ? 'bg-primary' : idx < currentStep ? 'bg-primary/50' : 'bg-muted-foreground/30'
                  }`}
                />
              ))}
              <span className="ml-auto text-xs text-muted-foreground">
                {currentStep + 1}/{TUTORIAL_STEPS.length}
              </span>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between p-3 border-t border-border bg-muted/30">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
              <Button size="sm" onClick={handleNext} className="gap-1">
                {isLastStep ? 'Done' : 'Next'}
                {!isLastStep && <ChevronRight className="w-4 h-4" />}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
