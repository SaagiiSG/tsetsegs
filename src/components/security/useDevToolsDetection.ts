import { useEffect, useRef, useCallback } from 'react';

interface UseDevToolsDetectionProps {
  onDetected: () => void;
  enabled?: boolean;
}

export function useDevToolsDetection({ onDetected, enabled = true }: UseDevToolsDetectionProps) {
  const hasDetectedRef = useRef(false);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const detectDevTools = useCallback(() => {
    if (hasDetectedRef.current) return;
    
    // Method 1: Window size difference (works when DevTools is docked)
    const widthThreshold = window.outerWidth - window.innerWidth > 160;
    const heightThreshold = window.outerHeight - window.innerHeight > 160;
    
    if (widthThreshold || heightThreshold) {
      hasDetectedRef.current = true;
      onDetected();
      return true;
    }

    // Method 2: Console timing check
    const startTime = performance.now();
    // eslint-disable-next-line no-debugger
    debugger;
    const endTime = performance.now();
    
    if (endTime - startTime > 100) {
      hasDetectedRef.current = true;
      onDetected();
      return true;
    }

    return false;
  }, [onDetected]);

  useEffect(() => {
    if (!enabled) return;

    // Only do periodic checks in production-like environments
    // We use a less aggressive check to avoid false positives
    const checkWindowSize = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > 200;
      const heightThreshold = window.outerHeight - window.innerHeight > 200;
      
      if ((widthThreshold || heightThreshold) && !hasDetectedRef.current) {
        hasDetectedRef.current = true;
        onDetected();
      }
    };

    // Check periodically
    checkIntervalRef.current = setInterval(checkWindowSize, 1000);
    
    // Also check on resize
    window.addEventListener('resize', checkWindowSize);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      window.removeEventListener('resize', checkWindowSize);
    };
  }, [enabled, onDetected]);

  const resetDetection = useCallback(() => {
    hasDetectedRef.current = false;
  }, []);

  return { detectDevTools, resetDetection };
}
