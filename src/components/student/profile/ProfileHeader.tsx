import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Crown, Shield, Gem, Star, Award, Zap } from 'lucide-react';
import { TierType, TIER_COLORS } from '@/data/badgeDefinitions';
import { format } from 'date-fns';

interface ProfileHeaderProps {
  username: string;
  avatarInitial: string;
  level: number;
  levelProgress: number;
  totalPoints: number;
  pointsToNextLevel: number;
  currentTier: TierType;
  reservedNextTier: string | null;
  createdAt: string | null;
  lastLogin: string | null;
}

const TierIcon = ({ tier }: { tier: TierType }) => {
  const iconClass = "w-5 h-5";
  switch (tier) {
    case 'ruby': return <Gem className={iconClass} />;
    case 'diamond': return <Crown className={iconClass} />;
    case 'platinum': return <Star className={iconClass} />;
    case 'gold': return <Award className={iconClass} />;
    case 'silver': return <Shield className={iconClass} />;
    default: return <Zap className={iconClass} />;
  }
};

export function ProfileHeader({
  username,
  avatarInitial,
  level,
  levelProgress,
  totalPoints,
  pointsToNextLevel,
  currentTier,
  reservedNextTier,
  createdAt,
  lastLogin
}: ProfileHeaderProps) {
  const tierColor = TIER_COLORS[currentTier];

  return (
    <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Avatar */}
        <div className="relative">
          <Avatar className="w-28 h-28 border-4" style={{ borderColor: tierColor }}>
            <AvatarFallback 
              className="text-4xl font-bold bg-gradient-to-br from-primary to-primary/60"
              style={{ color: tierColor }}
            >
              {avatarInitial}
            </AvatarFallback>
          </Avatar>
          {/* Level badge */}
          <div 
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-black"
            style={{ backgroundColor: tierColor }}
          >
            LVL {level}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 text-center md:text-left space-y-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{username}</h1>
            <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
              <Badge 
                variant="outline" 
                className="gap-1 capitalize"
                style={{ borderColor: tierColor, color: tierColor }}
              >
                <TierIcon tier={currentTier} />
                {currentTier} Tier
              </Badge>
              {reservedNextTier && (
                <Badge variant="secondary" className="text-xs">
                  ✓ Reserved: {reservedNextTier}
                </Badge>
              )}
            </div>
          </div>

          {/* Level progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Level {level}</span>
              <span className="text-muted-foreground">Level {level + 1}</span>
            </div>
            <Progress value={levelProgress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center md:text-left">
              {pointsToNextLevel.toLocaleString()} pts to next level
            </p>
          </div>
        </div>

        {/* Points & dates */}
        <div className="text-center md:text-right space-y-2">
          <div>
            <p className="text-4xl font-bold" style={{ color: tierColor }}>
              {totalPoints.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">Total Points</p>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            {lastLogin && (
              <p>Last seen: {format(new Date(lastLogin), 'MMM d, yyyy')}</p>
            )}
            {createdAt && (
              <p>Joined: {format(new Date(createdAt), 'MMM d, yyyy')}</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
