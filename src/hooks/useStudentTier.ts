import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { TierType, TIER_THEME_HSL } from '@/data/badgeDefinitions';
import { useEffect } from 'react';

export function useStudentTier() {
  const { student } = useStudentAuth();

  const { data: currentTier, isLoading } = useQuery({
    queryKey: ['student-tier', student?.id],
    queryFn: async (): Promise<TierType> => {
      if (!student?.id) return 'unranked';

      // Get the most recent sprint ranking for this student
      const { data: ranking, error } = await supabase
        .from('student_sprint_rankings')
        .select(`
          current_tier,
          sprints!inner(is_active)
        `)
        .eq('student_account_id', student.id)
        .eq('sprints.is_active', true)
        .maybeSingle();

      if (error || !ranking) {
        // Check if they have any historical ranking
        const { data: anyRanking } = await supabase
          .from('student_sprint_rankings')
          .select('current_tier')
          .eq('student_account_id', student.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (anyRanking) {
          return anyRanking.current_tier as TierType;
        }
        return 'unranked';
      }

      return ranking.current_tier as TierType;
    },
    enabled: !!student?.id,
    staleTime: 60000, // Cache for 1 minute
  });

  // Apply theme to document root when tier changes
  useEffect(() => {
    const tier = currentTier || 'unranked';
    const theme = TIER_THEME_HSL[tier];
    
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
      root.classList.remove('tier-unranked', 'tier-bronze', 'tier-silver', 'tier-gold', 'tier-platinum', 'tier-diamond', 'tier-ruby');
      root.classList.add(`tier-${tier}`);
    }

    return () => {
      // Cleanup on unmount
      const root = document.documentElement;
      root.style.removeProperty('--primary');
      root.style.removeProperty('--ring');
      root.style.removeProperty('--background');
      root.style.removeProperty('--card');
      root.style.removeProperty('--muted');
      root.style.removeProperty('--border');
      root.style.removeProperty('--input');
      root.classList.remove('tier-unranked', 'tier-bronze', 'tier-silver', 'tier-gold', 'tier-platinum', 'tier-diamond', 'tier-ruby');
    };
  }, [currentTier]);

  return {
    tier: currentTier || 'unranked',
    isLoading,
    themeColors: TIER_THEME_HSL[currentTier || 'unranked']
  };
}
