import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { badgeDefinitions, BadgeDefinition, BadgeRarity, BadgeCategory } from '@/data/badgeDefinitions';

export interface StudentBadge {
  id: string;
  badgeId: string;
  progress: number;
  isUnlocked: boolean;
  unlockedAt: string | null;
  requirementsProgress: Record<string, number>;
  badge: BadgeDefinition;
}

export interface BadgeStats {
  totalBadges: number;
  earnedBadges: number;
  totalPoints: number;
  byRarity: Record<BadgeRarity, { earned: number; total: number }>;
  rarestEarned: BadgeDefinition | null;
}

export function useBadges(filter?: {
  rarity?: BadgeRarity;
  category?: BadgeCategory;
  status?: 'all' | 'earned' | 'in-progress' | 'locked';
}) {
  const { student } = useStudentAuth();
  const queryClient = useQueryClient();

  // Fetch student's badge progress
  const { data: studentBadges, isLoading } = useQuery({
    queryKey: ['student-badges', student?.id],
    queryFn: async (): Promise<StudentBadge[]> => {
      if (!student?.id) return [];

      const { data, error } = await supabase
        .from('student_badges')
        .select('*')
        .eq('student_account_id', student.id);

      if (error) throw error;

      // Map database badges to our badge definitions
      const badgeProgressMap = new Map(
        data?.map(b => [b.badge_id, b]) || []
      );

      // Fetch badge definitions from database to get IDs
      const { data: dbBadges } = await supabase
        .from('badges')
        .select('id, name');

      const badgeNameToId = new Map(
        dbBadges?.map(b => [b.name, b.id]) || []
      );

      return badgeDefinitions.map(badge => {
        const dbBadgeId = badgeNameToId.get(badge.name);
        const progress = dbBadgeId ? badgeProgressMap.get(dbBadgeId) : null;

        return {
          id: progress?.id || badge.id,
          badgeId: dbBadgeId || badge.id,
          progress: progress?.progress || 0,
          isUnlocked: progress?.is_unlocked || false,
          unlockedAt: progress?.unlocked_at || null,
          requirementsProgress: (progress?.requirements_progress as Record<string, number>) || {},
          badge
        };
      });
    },
    enabled: !!student?.id
  });

  // Fetch featured badges
  const { data: featuredBadges } = useQuery({
    queryKey: ['featured-badges', student?.id],
    queryFn: async (): Promise<(StudentBadge | null)[]> => {
      if (!student?.id) return Array(6).fill(null);

      const { data, error } = await supabase
        .from('featured_badges')
        .select('badge_id, slot_position')
        .eq('student_account_id', student.id)
        .order('slot_position');

      if (error) throw error;

      const slots: (StudentBadge | null)[] = Array(6).fill(null);
      
      data?.forEach(fb => {
        const badge = studentBadges?.find(sb => sb.badgeId === fb.badge_id && sb.isUnlocked);
        if (badge && fb.slot_position >= 1 && fb.slot_position <= 6) {
          slots[fb.slot_position - 1] = badge;
        }
      });

      return slots;
    },
    enabled: !!student?.id && !!studentBadges
  });

  // Pin/unpin featured badge
  const pinBadgeMutation = useMutation({
    mutationFn: async ({ badgeId, slotPosition }: { badgeId: string; slotPosition: number }) => {
      if (!student?.id) throw new Error('Not authenticated');

      // Remove existing badge from slot
      await supabase
        .from('featured_badges')
        .delete()
        .eq('student_account_id', student.id)
        .eq('slot_position', slotPosition);

      // Remove badge if already featured elsewhere
      await supabase
        .from('featured_badges')
        .delete()
        .eq('student_account_id', student.id)
        .eq('badge_id', badgeId);

      // Add to new slot
      const { error } = await supabase
        .from('featured_badges')
        .insert({
          student_account_id: student.id,
          badge_id: badgeId,
          slot_position: slotPosition
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featured-badges'] });
    }
  });

  const unpinBadgeMutation = useMutation({
    mutationFn: async (slotPosition: number) => {
      if (!student?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('featured_badges')
        .delete()
        .eq('student_account_id', student.id)
        .eq('slot_position', slotPosition);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featured-badges'] });
    }
  });

  // Apply filters
  const filteredBadges = studentBadges?.filter(sb => {
    if (filter?.rarity && sb.badge.rarity !== filter.rarity) return false;
    if (filter?.category && sb.badge.category !== filter.category) return false;
    if (filter?.status) {
      switch (filter.status) {
        case 'earned':
          if (!sb.isUnlocked) return false;
          break;
        case 'in-progress':
          if (sb.isUnlocked || sb.progress === 0) return false;
          break;
        case 'locked':
          if (sb.isUnlocked || sb.progress > 0) return false;
          break;
      }
    }
    return true;
  }) || [];

  // Calculate stats
  const badgeStats: BadgeStats = {
    totalBadges: badgeDefinitions.length,
    earnedBadges: studentBadges?.filter(sb => sb.isUnlocked).length || 0,
    totalPoints: studentBadges
      ?.filter(sb => sb.isUnlocked)
      .reduce((sum, sb) => sum + sb.badge.pointValue, 0) || 0,
    byRarity: {
      common: { earned: 0, total: 0 },
      uncommon: { earned: 0, total: 0 },
      rare: { earned: 0, total: 0 },
      epic: { earned: 0, total: 0 },
      legendary: { earned: 0, total: 0 }
    },
    rarestEarned: null
  };

  // Calculate by rarity
  const rarityOrder: BadgeRarity[] = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
  
  badgeDefinitions.forEach(badge => {
    badgeStats.byRarity[badge.rarity].total++;
  });
  
  studentBadges?.filter(sb => sb.isUnlocked).forEach(sb => {
    badgeStats.byRarity[sb.badge.rarity].earned++;
    
    // Track rarest earned
    if (!badgeStats.rarestEarned || 
        rarityOrder.indexOf(sb.badge.rarity) < rarityOrder.indexOf(badgeStats.rarestEarned.rarity)) {
      badgeStats.rarestEarned = sb.badge;
    }
  });

  // Get in-progress badges (for progress section)
  const inProgressBadges = studentBadges
    ?.filter(sb => !sb.isUnlocked && sb.progress > 0)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 5) || [];

  return {
    badges: filteredBadges,
    allBadges: studentBadges || [],
    featuredBadges: featuredBadges || Array(6).fill(null),
    inProgressBadges,
    badgeStats,
    isLoading,
    pinBadge: pinBadgeMutation.mutate,
    unpinBadge: unpinBadgeMutation.mutate,
    isPinning: pinBadgeMutation.isPending
  };
}
