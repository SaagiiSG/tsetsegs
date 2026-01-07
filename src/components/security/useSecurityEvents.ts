import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseSecurityEventsProps {
  studentAccountId: string | undefined;
  onSuspiciousActivity: (type: string) => void;
  enabled?: boolean;
}

export function useSecurityEvents({ 
  studentAccountId, 
  onSuspiciousActivity,
  enabled = true 
}: UseSecurityEventsProps) {
  const alertCountRef = useRef<Record<string, number>>({});
  
  const logSecurityAlert = useCallback(async (alertType: string, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium', metadata: Record<string, any> = {}) => {
    if (!studentAccountId) return;
    
    // Track local count for auto-blocking logic
    alertCountRef.current[alertType] = (alertCountRef.current[alertType] || 0) + 1;
    
    try {
      await supabase.from('security_alerts').insert({
        student_account_id: studentAccountId,
        alert_type: alertType,
        severity,
        metadata: {
          ...metadata,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          local_count: alertCountRef.current[alertType]
        }
      });

      // Check for auto-block conditions
      if (alertType === 'devtools_opened' && alertCountRef.current[alertType] >= 3) {
        await blockStudent('Multiple DevTools detection');
      } else if (alertType === 'screenshot_attempt' && alertCountRef.current[alertType] >= 5) {
        await blockStudent('Excessive screenshot attempts');
      }
    } catch (err) {
      console.error('Failed to log security alert:', err);
    }
    
    onSuspiciousActivity(alertType);
  }, [studentAccountId, onSuspiciousActivity]);

  const blockStudent = async (reason: string) => {
    if (!studentAccountId) return;
    
    try {
      await supabase
        .from('student_accounts')
        .update({
          is_blocked: true,
          blocked_reason: reason,
          blocked_at: new Date().toISOString()
        })
        .eq('id', studentAccountId);
      
      // Force logout
      localStorage.removeItem('student_session_id');
      localStorage.removeItem('student_id');
      window.location.href = '/practice?blocked=true';
    } catch (err) {
      console.error('Failed to block student:', err);
    }
  };

  useEffect(() => {
    if (!enabled) return;

    // Disable right-click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      logSecurityAlert('right_click_attempt', 'low', { target: (e.target as HTMLElement)?.tagName });
    };

    // Block keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      
      // PrintScreen
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        logSecurityAlert('screenshot_attempt', 'high', { key: 'PrintScreen' });
        return;
      }
      
      // Ctrl+P (Print)
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        logSecurityAlert('print_attempt', 'medium', { key: 'Ctrl+P' });
        return;
      }
      
      // Ctrl+S (Save)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        logSecurityAlert('save_attempt', 'low', { key: 'Ctrl+S' });
        return;
      }
      
      // Ctrl+Shift+S (Screenshot on some systems)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 's') {
        e.preventDefault();
        logSecurityAlert('screenshot_attempt', 'high', { key: 'Ctrl+Shift+S' });
        return;
      }
      
      // Mac screenshots: Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5
      if (isMac && e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
        e.preventDefault();
        logSecurityAlert('screenshot_attempt', 'high', { key: `Cmd+Shift+${e.key}` });
        return;
      }
      
      // DevTools shortcuts
      if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'i')) {
        e.preventDefault();
        logSecurityAlert('devtools_shortcut', 'high', { key: e.key });
        return;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, logSecurityAlert]);

  return { logSecurityAlert, blockStudent };
}
