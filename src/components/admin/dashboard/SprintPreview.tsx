import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, ChevronRight, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SprintLeader {
  id: string;
  name: string;
  tier: string;
  points: number;
  rank: number;
}

interface SprintPreviewProps {
  leaders: SprintLeader[];
}

const tierColors: Record<string, string> = {
  unranked: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  bronze: 'bg-amber-700/20 text-amber-600 border-amber-700/30',
  silver: 'bg-gray-400/20 text-gray-300 border-gray-400/30',
  gold: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  platinum: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  diamond: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  ruby: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
};

export function SprintPreview({ leaders }: SprintPreviewProps) {
  const navigate = useNavigate();

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50 animate-fade-in" style={{ animationDelay: '250ms' }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            Sprint Leaderboard
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/admin/sprint-monitor')}
          >
            View all
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {leaders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No active sprint
          </p>
        ) : (
          <div className="space-y-2">
            {leaders.map((leader, index) => (
              <div 
                key={leader.id}
                className={`
                  flex items-center gap-3 p-2 rounded-lg
                  ${index === 0 ? 'bg-yellow-500/10 border border-yellow-500/20' : 'hover:bg-muted/30'}
                  transition-colors
                `}
              >
                {/* Rank */}
                <div className="w-6 h-6 flex items-center justify-center">
                  {index === 0 ? (
                    <Crown className="w-4 h-4 text-yellow-400" />
                  ) : (
                    <span className="text-sm font-mono font-bold text-muted-foreground">
                      {leader.rank}
                    </span>
                  )}
                </div>
                
                {/* Name */}
                <span className="flex-1 text-sm font-medium truncate">
                  {leader.name}
                </span>
                
                {/* Tier Badge */}
                <Badge 
                  variant="outline" 
                  className={`text-[10px] font-mono uppercase ${tierColors[leader.tier] || tierColors.unranked}`}
                >
                  {leader.tier}
                </Badge>
                
                {/* Points */}
                <span className="text-sm font-mono font-bold tabular-nums text-primary">
                  {leader.points.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
