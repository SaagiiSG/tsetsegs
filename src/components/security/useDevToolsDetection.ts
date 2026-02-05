import { useEffect, useRef, useCallback } from 'react';

interface UseDevToolsDetectionProps {
  onDetected: () => void;
  enabled?: boolean;
}

// DevTools detection threshold - needs to be high enough to avoid false positives
// from browser chrome (toolbars, bookmarks, scrollbars, extensions)
// Typical DevTools panel is 300-500px wide when docked
const DEVTOOLS_THRESHOLD = 160;

// Check if running inside an iframe (Lovable preview, etc.)
const isInIframe = () => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true; // If we can't access window.top, we're in a cross-origin iframe
  }
};

// Check if device is mobile (mobile keyboards affect viewport height)
const isMobileDevice = () => {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
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

// Check if browser zoom is active (can cause false positives)
const isZoomed = () => {
  // devicePixelRatio changes with zoom, but also differs on high-DPI screens
  // This is a rough heuristic - if it's not close to a whole number, zoom may be active
  const ratio = window.devicePixelRatio;
  const fractionalPart = ratio % 1;
  return fractionalPart > 0.1 && fractionalPart < 0.9;
};

export function useDevToolsDetection({ onDetected, enabled = true }: UseDevToolsDetectionProps) {
  const hasDetectedRef = useRef(false);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const consecutiveDetectionsRef = useRef(0);

  // Disable in development/preview environments to avoid false positives
  const shouldEnable = enabled && !isDevEnvironment();

  const detectDevTools = useCallback(() => {
    if (hasDetectedRef.current || !shouldEnable) return false;
    
    // Skip detection if zoom is active (causes unreliable measurements)
    if (isZoomed()) return false;
    
    // Window size difference (works when DevTools is docked)
    // On mobile, disable height threshold because keyboard causes significant height changes
    const widthDiff = window.outerWidth - window.innerWidth;
    const heightDiff = window.outerHeight - window.innerHeight;
    
    const widthThreshold = widthDiff > DEVTOOLS_THRESHOLD;
    const heightThreshold = !isMobileDevice() && heightDiff > DEVTOOLS_THRESHOLD;
    
    // Log for debugging (only in production, will show in security alerts)
    if (widthThreshold || heightThreshold) {
      console.log('[Security] Size diff detected:', { widthDiff, heightDiff, threshold: DEVTOOLS_THRESHOLD });
    }
    
    // Require the threshold to be exceeded for a sustained period to avoid transient false positives
    // (e.g., during window resize animations)
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
      
      // Skip if zoom is active
      if (isZoomed()) {
        consecutiveDetectionsRef.current = 0;
        return;
      }
      
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      
      // On mobile, only check width (keyboard affects height significantly)
      const widthThreshold = widthDiff > DEVTOOLS_THRESHOLD;
      const heightThreshold = !isMobileDevice() && heightDiff > DEVTOOLS_THRESHOLD;
      
      if (widthThreshold || heightThreshold) {
        // Require 2 consecutive detections to trigger (avoid transient issues)
        consecutiveDetectionsRef.current++;
        
        if (consecutiveDetectionsRef.current >= 2 && !hasDetectedRef.current) {
          console.log('[Security] DevTools detected after consecutive checks:', { widthDiff, heightDiff });
          hasDetectedRef.current = true;
          onDetected();
        }
      } else {
        consecutiveDetectionsRef.current = 0;
      }
    };

    // Check periodically - every 3 seconds is enough
    checkIntervalRef.current = setInterval(checkWindowSize, 3000);
    
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
