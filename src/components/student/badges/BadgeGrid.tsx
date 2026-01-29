import { motion } from 'framer-motion';
import { BadgeCard } from './BadgeCard';
import { StudentBadge } from '@/hooks/useBadges';
import { Loader2, Award } from 'lucide-react';

interface BadgeGridProps {
  badges: StudentBadge[];
  isLoading: boolean;
  onBadgeClick?: (badge: StudentBadge) => void;
}

export function BadgeGrid({ badges, isLoading, onBadgeClick }: BadgeGridProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (badges.length === 0) {
    return (
      <div className="text-center py-12">
        <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">No badges found</p>
        <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <motion.div 
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: 0.05 }
        }
      }}
    >
      {badges.map((badge) => (
        <motion.div
          key={badge.badge.id}
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 }
          }}
        >
          <BadgeCard 
            badge={badge} 
            onClick={() => onBadgeClick?.(badge)}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
