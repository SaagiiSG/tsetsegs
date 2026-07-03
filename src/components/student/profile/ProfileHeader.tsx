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
    <Card className="p-4 md:p-6 bg-card/50 backdrop-blur border-border/50">
      <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
        {/* Mobile top row: avatar + name + points */}
        <div className="flex md:hidden items-center gap-3 w-full">
          <div className="relative flex-shrink-0">
            <Avatar className="w-16 h-16 border-2" style={{ borderColor: tierColor }}>
              <AvatarFallback
                className="text-2xl font-bold bg-gradient-to-br from-primary to-primary/60"
                style={{ color: tierColor }}
              >
                {avatarInitial}
              </AvatarFallback>
            </Avatar>
            <div
              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold text-black whitespace-nowrap"
              style={{ backgroundColor: tierColor }}
            >
              LVL {level}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{username}</h1>
            <Badge
              variant="outline"
              className="gap-1 capitalize mt-1 text-[10px] py-0 h-5"
              style={{ borderColor: tierColor, color: tierColor }}
            >
              <TierIcon tier={currentTier} />
              {currentTier}
            </Badge>
          </div>
          <div className="text-right flex-shrink-0 min-w-0">
            <p className="text-xl font-bold leading-none tabular-nums truncate" style={{ color: tierColor }}>
              {totalPoints.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Total Points</p>
          </div>

        </div>

        {/* Desktop avatar */}
        <div className="hidden md:block relative">
          <Avatar className="w-28 h-28 border-4" style={{ borderColor: tierColor }}>
            <AvatarFallback
              className="text-4xl font-bold bg-gradient-to-br from-primary to-primary/60"
              style={{ color: tierColor }}
            >
              {avatarInitial}
            </AvatarFallback>
          </Avatar>
          <div
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-black"
            style={{ backgroundColor: tierColor }}
          >
            LVL {level}
          </div>
        </div>

        {/* Desktop info */}
        <div className="hidden md:block flex-1 text-left space-y-3">
          <div>
            <h1 className="text-3xl font-bold">{username}</h1>
            <div className="flex items-center gap-2 mt-2">
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
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Level {level}</span>
              <span className="text-muted-foreground">Level {level + 1}</span>
            </div>
            <Progress value={levelProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {pointsToNextLevel.toLocaleString()} pts to next level
            </p>
          </div>
        </div>

        <div className="hidden md:block text-right space-y-2">
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

        {/* Mobile: level progress + reserved + dates */}
        <div className="md:hidden w-full space-y-2">
          {reservedNextTier && (
            <Badge variant="secondary" className="text-[10px]">
              ✓ Reserved: {reservedNextTier}
            </Badge>
          )}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Lvl {level}</span>
              <span>{pointsToNextLevel.toLocaleString()} pts to next</span>
              <span>Lvl {level + 1}</span>
            </div>
            <Progress value={levelProgress} className="h-1.5" />
          </div>
          {(lastLogin || createdAt) && (
            <div className="flex justify-between text-[10px] text-muted-foreground pt-1">
              {lastLogin && <span>Seen {format(new Date(lastLogin), 'MMM d')}</span>}
              {createdAt && <span>Joined {format(new Date(createdAt), 'MMM d, yyyy')}</span>}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
