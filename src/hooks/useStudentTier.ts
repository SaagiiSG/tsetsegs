import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { TierType, TIER_THEME_HSL_LIGHT, TIER_THEME_HSL_DARK, TIER_ORDER } from '@/data/badgeDefinitions';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

export function useStudentTier() {
  const { student } = useStudentAuth();
  const { resolvedTheme } = useTheme();
  const [themePreference, setThemePreference] = useState<'rank' | TierType>(() => {
    const saved = localStorage.getItem('student_color_theme');
    return (saved as 'rank' | TierType) || 'rank';
  });

  const { data: currentTier, isLoading } = useQuery({
    queryKey: ['student-tier', student?.id],
    queryFn: async (): Promise<TierType> => {
      if (!student?.id) return 'unranked';

      // First check for active sprint ranking
      const { data: activeRanking } = await supabase
        .from('student_sprint_rankings')
        .select(`
          current_tier,
          sprints!inner(is_active)
        `)
        .eq('student_account_id', student.id)
        .eq('sprints.is_active', true)
        .maybeSingle();

      if (activeRanking) {
        return activeRanking.current_tier as TierType;
      }

      // No active sprint - check the most recent historical ranking
      // Use reserved_next_tier if available (promotion from last sprint), otherwise current_tier
      const { data: lastRanking } = await supabase
        .from('student_sprint_rankings')
        .select('current_tier, reserved_next_tier')
        .eq('student_account_id', student.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastRanking) {
        // If they have a reserved_next_tier (earned promotion), use that
        // Otherwise use their current_tier from that sprint
        return (lastRanking.reserved_next_tier || lastRanking.current_tier) as TierType;
      }
      
      return 'unranked';
    },
    enabled: !!student?.id,
    staleTime: 60000, // Cache for 1 minute
  });

  // Listen for theme preference changes
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('student_color_theme');
      setThemePreference((saved as 'rank' | TierType) || 'rank');
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically for same-tab changes
    const interval = setInterval(handleStorageChange, 500);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Apply theme to document root when tier, preference, or dark/light mode changes
  useEffect(() => {
    const tier = currentTier || 'unranked';
    const tierToApply = themePreference === 'rank' ? tier : themePreference;
    const isDark = resolvedTheme === 'dark';
    const themeSource = isDark ? TIER_THEME_HSL_DARK : TIER_THEME_HSL_LIGHT;
    const theme = themeSource[tierToApply];
    
    if (theme) {
      const root = document.documentElement;
      root.style.setProperty('--primary', theme.primary);
      root.style.setProperty('--ring', theme.primary);
      root.style.setProperty('--background', theme.background);
      root.style.setProperty('--card', theme.card);
      root.style.setProperty('--muted', theme.muted);
      root.style.setProperty('--border', theme.border);
      root.style.setProperty('--input', theme.border);
      
      // Add tier class for additional styling
      TIER_ORDER.forEach(t => root.classList.remove(`tier-${t}`));
      root.classList.add(`tier-${tierToApply}`);
    }
    
    // Don't cleanup on unmount - theme should persist across navigation
  }, [currentTier, themePreference, resolvedTheme]);

  const isDark = resolvedTheme === 'dark';
  const themeSource = isDark ? TIER_THEME_HSL_DARK : TIER_THEME_HSL_LIGHT;

  return {
    tier: currentTier || 'unranked',
    isLoading,
    themeColors: themeSource[currentTier || 'unranked'],
    themePreference
  };
}
