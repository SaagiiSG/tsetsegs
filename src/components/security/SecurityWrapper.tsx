import { useState, useEffect, useCallback, ReactNode } from 'react';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { useSecurityEvents } from './useSecurityEvents';
import { WatermarkOverlay } from './WatermarkOverlay';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SecurityWrapperProps {
  children: ReactNode;
}

export function SecurityWrapper({ children }: SecurityWrapperProps) {
  const { student, logActivity } = useStudentAuth();
  const [isBlurred, setIsBlurred] = useState(false);
  const [blurReason, setBlurReason] = useState<string>('');

  const handleSuspiciousActivity = useCallback((type: string) => {
    logActivity('suspicious_activity', { type });
  }, [logActivity]);

  const { logSecurityAlert } = useSecurityEvents({
    studentAccountId: student?.id,
    onSuspiciousActivity: handleSuspiciousActivity,
    enabled: !!student
  });

  // Check if focus is on an allowed element (like Desmos calculator)
  const isAllowedFocusTarget = useCallback(() => {
    const activeElement = document.activeElement;
    const tagName = activeElement?.tagName?.toLowerCase();
    
    // Allow focus on input/textarea/canvas elements (for mobile keyboard & drawing)
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select' || tagName === 'canvas') {
      return true;
    }
    
    // Check if focus moved to Desmos iframe or calculator window
    if (activeElement?.tagName === 'IFRAME') {
      const iframe = activeElement as HTMLIFrameElement;
      if (iframe.src?.includes('desmos.com') || iframe.title?.includes('Desmos')) {
        return true;
      }
    }
    // Check if clicking inside calculator window
    const calculatorWindow = document.querySelector('[data-calculator-window]');
    if (calculatorWindow?.contains(activeElement)) {
      return true;
    }
    return false;
  }, []);

  // Check if a calculator drag/resize is currently in progress
  const isCalculatorInteracting = useCallback(() => {
    return document.body.dataset.calculatorDragging === 'true';
  }, []);

  // Handle visibility change (tab switch, window minimize)
  useEffect(() => {
    if (!student) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Don't blur if interacting with calculator (drag/resize can momentarily steal focus)
        if (isCalculatorInteracting()) return;
        setIsBlurred(true);
        setBlurReason('Window not in focus');
        logSecurityAlert('window_blur', 'medium', { visibility: 'hidden' });
      } else {
        setIsBlurred(false);
        setBlurReason('');
      }
    };

    const handleWindowBlur = () => {
      // Ignore blur entirely while dragging/resizing the Desmos calculator
      if (isCalculatorInteracting()) return;

      // Delay check to allow focus to settle on new element
      setTimeout(() => {
        if (isCalculatorInteracting()) return;
        if (isAllowedFocusTarget()) {
          // Focus moved to calculator, don't blur
          return;
        }
        setIsBlurred(true);
        setBlurReason('Window not in focus');
        logSecurityAlert('window_blur', 'low', { event: 'blur' });
      }, 100);
    };

    const handleWindowFocus = () => {
      setIsBlurred(false);
      setBlurReason('');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [student, logSecurityAlert, isAllowedFocusTarget, isCalculatorInteracting]);

  // Prevent text selection within secure content
  useEffect(() => {
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    
    return () => {
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };
  }, []);

  const handleContinue = () => {
    setIsBlurred(false);
    setBlurReason('');
  };

  return (
    <div className="relative">
      {/* Watermark overlay */}
      <WatermarkOverlay />
      
      {/* Content with conditional blur */}
      <div 
        className={`transition-all duration-300 ${isBlurred ? 'blur-xl pointer-events-none' : ''}`}
        style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      >
        {children}
      </div>
      
      {/* Blur overlay with message */}
      {isBlurred && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center space-y-4 p-6 max-w-sm">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Eye className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold">{blurReason}</h2>
            <p className="text-muted-foreground">
              Content is hidden for security reasons. Click below to continue.
            </p>
            <Button onClick={handleContinue} className="mt-4">
              Continue
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
