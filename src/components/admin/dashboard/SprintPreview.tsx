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
 unranked: 'bg-muted text-muted-foreground border-border',
 bronze: 'bg-muted text-muted-foreground border-border',
 silver: 'bg-muted text-muted-foreground border-border',
 gold: 'bg-status-watch/10 text-status-watch border-status-watch/20',
 platinum: 'bg-status-healthy/10 text-status-healthy border-status-healthy/20',
 diamond: 'bg-status-info/10 text-status-info border-status-info/20',
 ruby: 'bg-status-risk/10 text-status-risk border-status-risk/20',
};

export function SprintPreview({ leaders }: SprintPreviewProps) {
  const navigate = useNavigate();

  return (
    <section className="min-w-0 border-t py-5">
      <div className="pb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <Trophy className="w-4 h-4 text-status-watch" />
            Sprint Leaderboard
          </h2>
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
      </div>
      <div>
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
                  ${index === 0 ? 'bg-muted/50' : 'hover:bg-muted/30'}
                  transition-colors
                `}
              >
                {/* Rank */}
                <div className="w-6 h-6 flex items-center justify-center">
                  {index === 0 ? (
                    <Crown className="w-4 h-4 text-status-watch" />
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
      </div>
    </section>
  );
}
