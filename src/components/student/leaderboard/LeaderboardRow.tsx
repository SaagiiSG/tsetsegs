import { motion } from 'framer-motion';
import { Crown, ArrowUp, AlertTriangle, Shield, Flame } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LeaderboardEntry } from '@/hooks/useLeaderboard';
import { TIER_COLORS, TIER_DISPLAY_NAMES, TierType } from '@/data/badgeDefinitions';
import { PointsBreakdownTooltip } from './PointsBreakdownTooltip';
import { cn } from '@/lib/utils';

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
  cutoffRank: number;
  onProfileClick?: (entry: LeaderboardEntry) => void;
}

export function LeaderboardRow({ entry, isCurrentUser, cutoffRank, onProfileClick }: LeaderboardRowProps) {
  const tierColor = TIER_COLORS[entry.currentTier as TierType] || TIER_COLORS.unranked;
  const isCutoffRow = entry.rank === cutoffRank;

  const handleClick = () => {
    // Don't open profile for current user - they can use the profile page
    if (!isCurrentUser && onProfileClick) {
      onProfileClick(entry);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: entry.rank * 0.02 }}
      onClick={handleClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-all",
        isCurrentUser && "bg-primary/10 border-primary/30 ring-1 ring-primary/20",
        entry.isTop1 && "bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/30",
        entry.isAdvancing && !entry.isTop1 && !isCurrentUser && "bg-green-500/5 border-green-500/20",
        entry.isAtRisk && "bg-yellow-500/10 border-yellow-500/30",
        !entry.isAdvancing && !entry.isAtRisk && "hover:bg-muted/50",
        !isCurrentUser && onProfileClick && "cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
      )}
    >
      {/* Rank */}
      <div className="w-10 flex justify-center">
        {entry.isTop1 ? (
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="relative"
          >
            <Crown className="h-6 w-6 text-amber-500" />
            <motion.div
              className="absolute inset-0 rounded-full"
              animate={{ 
                boxShadow: [
                  '0 0 10px rgba(245, 158, 11, 0.3)',
                  '0 0 20px rgba(245, 158, 11, 0.6)',
                  '0 0 10px rgba(245, 158, 11, 0.3)'
                ]
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.div>
        ) : (
          <span className={cn(
            "font-bold text-lg",
            entry.rank <= 3 ? "text-amber-500" : "text-muted-foreground"
          )}>
            {entry.rank}
          </span>
        )}
      </div>

      {/* Avatar */}
      <Avatar className="h-10 w-10 border-2" style={{ borderColor: tierColor }}>
        <AvatarFallback 
          className={cn(
            isCurrentUser && "bg-primary text-primary-foreground"
          )}
        >
          {entry.username.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Name & Level */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn(
            "font-medium truncate",
            isCurrentUser && "text-primary"
          )}>
            {entry.username}
          </p>
          {isCurrentUser && (
            <Badge variant="secondary" className="text-xs shrink-0">You</Badge>
          )}
          {entry.reservedNextTier && (
            <Badge variant="outline" className="text-xs shrink-0 gap-1">
              <Shield className="h-3 w-3" />
              Reserved
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Level {entry.level}</span>
          <span>•</span>
          <div 
            className="flex items-center gap-1"
            style={{ color: tierColor }}
          >
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: tierColor }}
            />
            <span>{TIER_DISPLAY_NAMES[entry.currentTier as TierType] || 'Unranked'}</span>
          </div>
        </div>
      </div>

      {/* Points */}
      <PointsBreakdownTooltip points={entry.totalPoints} breakdown={entry.pointsBreakdown}>
        <div className="text-right cursor-help">
          <p className="font-bold text-lg">{entry.totalPoints.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">pts</p>
        </div>
      </PointsBreakdownTooltip>

      {/* Status */}
      <div className="w-28 flex justify-end">
        {entry.isTop1 ? (
          <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white gap-1">
            <Flame className="h-3 w-3" />
            ADVANCING
          </Badge>
        ) : entry.isAdvancing ? (
          <Badge variant="outline" className="border-green-500 text-green-500 gap-1">
            <ArrowUp className="h-3 w-3" />
            ADVANCING
            {isCutoffRow && <span className="text-[10px] ml-1">(cutoff)</span>}
          </Badge>
        ) : entry.isAtRisk ? (
          <Badge variant="outline" className="border-yellow-500 text-yellow-500 gap-1">
            <AlertTriangle className="h-3 w-3" />
            AT RISK
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>
    </motion.div>
  );
}
