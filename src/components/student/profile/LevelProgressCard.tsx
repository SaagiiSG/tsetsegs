import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, Info } from 'lucide-react';
import { getPointsForLevel } from '@/data/badgeDefinitions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface LevelProgressCardProps {
  level: number;
  totalPoints: number;
  levelProgress: number;
  pointsToNextLevel: number;
}

export function LevelProgressCard({
  level,
  totalPoints,
  levelProgress,
  pointsToNextLevel
}: LevelProgressCardProps) {
  const currentLevelPoints = getPointsForLevel(level);
  const nextLevelPoints = getPointsForLevel(level + 1);
  
  // Calculate stroke dasharray for circular progress
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (levelProgress / 100) * circumference;

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" />
          Level Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Circular progress */}
          <div className="relative w-28 h-28 flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="56"
                cy="56"
                r="45"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-muted/30"
              />
              {/* Progress circle */}
              <circle
                cx="56"
                cy="56"
                r="45"
                stroke="url(#levelGradient)"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500"
              />
              <defs>
                <linearGradient id="levelGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#FFD700" />
                  <stop offset="100%" stopColor="#FFA500" />
                </linearGradient>
              </defs>
            </svg>
            {/* Level number in center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                {level}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Level</span>
            </div>
          </div>

          {/* Level details */}
          <div className="flex-1 space-y-3">
            <div>
              <div className="flex items-center gap-1 mb-1">
                <p className="text-sm text-muted-foreground">Points to Level {level + 1}</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3 h-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">Level Formula: 200 + 50 × 2^(level-1)</p>
                      <p className="text-xs mt-1">Level {level + 1} requires {nextLevelPoints.toLocaleString()} total pts</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-2xl font-bold">{pointsToNextLevel.toLocaleString()} pts</p>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${levelProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{currentLevelPoints.toLocaleString()} pts</span>
                <span>{nextLevelPoints.toLocaleString()} pts</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Current: <span className="font-medium text-foreground">{totalPoints.toLocaleString()}</span> total points
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
