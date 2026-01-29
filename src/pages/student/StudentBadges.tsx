import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Award } from 'lucide-react';
import { useBadges, StudentBadge } from '@/hooks/useBadges';
import { BadgeRarity, BadgeCategory } from '@/data/badgeDefinitions';
import {
  BadgeGrid,
  BadgeFilters,
  BadgeStatsOverview,
  BadgeProgressSection,
  BadgeDetailModal
} from '@/components/student/badges';

export default function StudentBadges() {
  const [status, setStatus] = useState<'all' | 'earned' | 'in-progress' | 'locked'>('all');
  const [rarity, setRarity] = useState<BadgeRarity | 'all'>('all');
  const [category, setCategory] = useState<BadgeCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedBadge, setSelectedBadge] = useState<StudentBadge | null>(null);

  const { allBadges, inProgressBadges, badgeStats, featuredBadges, isLoading, pinBadge, unpinBadge, isPinning } = useBadges();

  // Find next available slot for pinning
  const findNextAvailableSlot = (): number => {
    for (let i = 0; i < 6; i++) {
      if (!featuredBadges[i]) return i + 1;
    }
    return 1; // Overwrite first slot if all full
  };

  // Check if badge is currently pinned
  const isPinned = (badgeId: string): boolean => {
    return featuredBadges.some(fb => fb?.badgeId === badgeId);
  };

  // Handle pin/unpin
  const handlePin = (badgeId: string) => {
    const pinnedSlot = featuredBadges.findIndex(fb => fb?.badgeId === badgeId);
    if (pinnedSlot >= 0) {
      unpinBadge(pinnedSlot + 1);
    } else {
      const slot = findNextAvailableSlot();
      pinBadge({ badgeId, slotPosition: slot });
    }
  };

  // Apply filters locally for better UX
  const filteredBadges = useMemo(() => {
    return allBadges.filter(sb => {
      // Status filter
      if (status === 'earned' && !sb.isUnlocked) return false;
      if (status === 'in-progress' && (sb.isUnlocked || sb.progress === 0)) return false;
      if (status === 'locked' && (sb.isUnlocked || sb.progress > 0)) return false;

      // Rarity filter
      if (rarity !== 'all' && sb.badge.rarity !== rarity) return false;

      // Category filter
      if (category !== 'all' && sb.badge.category !== category) return false;

      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        if (!sb.badge.name.toLowerCase().includes(searchLower) &&
            !sb.badge.description.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      return true;
    });
  }, [allBadges, status, rarity, category, search]);

  // Sort badges: unlocked first, then by progress, then by rarity
  const sortedBadges = useMemo(() => {
    const rarityOrder: BadgeRarity[] = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
    
    return [...filteredBadges].sort((a, b) => {
      // Unlocked badges first
      if (a.isUnlocked && !b.isUnlocked) return -1;
      if (!a.isUnlocked && b.isUnlocked) return 1;

      // Then by progress (higher first)
      if (a.progress !== b.progress) return b.progress - a.progress;

      // Then by rarity (rarer first)
      return rarityOrder.indexOf(a.badge.rarity) - rarityOrder.indexOf(b.badge.rarity);
    });
  }, [filteredBadges]);

  return (
    <div className="p-4 md:p-6 space-y-6 select-none">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Award className="h-6 w-6 text-purple-500" />
          Badge Collection
        </h1>
        <p className="text-muted-foreground">
          Earn badges by completing challenges and achievements
        </p>
      </motion.div>

      {/* Stats Overview */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <BadgeStatsOverview stats={badgeStats} />
      </motion.div>

      {/* Progress Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <BadgeProgressSection 
          inProgressBadges={inProgressBadges}
          onBadgeClick={setSelectedBadge}
        />
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <BadgeFilters
          status={status}
          rarity={rarity}
          category={category}
          search={search}
          onStatusChange={setStatus}
          onRarityChange={setRarity}
          onCategoryChange={setCategory}
          onSearchChange={setSearch}
        />
      </motion.div>

      {/* Badge Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <BadgeGrid 
          badges={sortedBadges}
          isLoading={isLoading}
          onBadgeClick={setSelectedBadge}
        />
      </motion.div>

      {/* Detail Modal */}
      <BadgeDetailModal
        badge={selectedBadge}
        open={!!selectedBadge}
        onClose={() => setSelectedBadge(null)}
        onPin={handlePin}
        isPinned={selectedBadge ? isPinned(selectedBadge.badgeId) : false}
        isPinning={isPinning}
      />
    </div>
  );
}
