import { useEffect, useRef, useCallback } from 'react';

interface UseDevToolsDetectionProps {
  onDetected: () => void;
  enabled?: boolean;
}

// Check if running inside an iframe (Lovable preview, etc.)
const isInIframe = () => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true; // If we can't access window.top, we're in a cross-origin iframe
  }
};

// Check if it's a development/preview environment
const isDevEnvironment = () => {
  const hostname = window.location.hostname;
  return (
    isInIframe() ||
    hostname === 'localhost' ||
    hostname.includes('lovable.dev') ||
    hostname.includes('lovableproject.com') ||
    hostname.includes('preview')
  );
};

export function useDevToolsDetection({ onDetected, enabled = true }: UseDevToolsDetectionProps) {
  const hasDetectedRef = useRef(false);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Disable in development/preview environments to avoid false positives
  const shouldEnable = enabled && !isDevEnvironment();

  const detectDevTools = useCallback(() => {
    if (hasDetectedRef.current || !shouldEnable) return false;
    
    // Method 1: Window size difference (works when DevTools is docked)
    // Using higher threshold to reduce false positives
    const widthThreshold = window.outerWidth - window.innerWidth > 200;
    const heightThreshold = window.outerHeight - window.innerHeight > 200;
    
    if (widthThreshold || heightThreshold) {
      hasDetectedRef.current = true;
      onDetected();
      return true;
    }

    return false;
  }, [onDetected, shouldEnable]);

  useEffect(() => {
    if (!shouldEnable) return;

    // Only do periodic checks in production environments
    const checkWindowSize = () => {
      // Extra safety: don't check if in iframe
      if (isInIframe()) return;
      
      const widthThreshold = window.outerWidth - window.innerWidth > 200;
      const heightThreshold = window.outerHeight - window.innerHeight > 200;
      
      if ((widthThreshold || heightThreshold) && !hasDetectedRef.current) {
        hasDetectedRef.current = true;
        onDetected();
      }
    };

    // Check periodically but less aggressively
    checkIntervalRef.current = setInterval(checkWindowSize, 2000);
    
    // Also check on resize
    window.addEventListener('resize', checkWindowSize);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      window.removeEventListener('resize', checkWindowSize);
    };
  }, [shouldEnable, onDetected]);

  const resetDetection = useCallback(() => {
    hasDetectedRef.current = false;
  }, []);

  return { detectDevTools, resetDetection };
}
