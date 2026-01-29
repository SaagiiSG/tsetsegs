import { PointsBreakdown } from '@/hooks/useLeaderboard';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

interface PointsBreakdownTooltipProps {
  points: number;
  breakdown: PointsBreakdown;
  children: React.ReactNode;
}

export function PointsBreakdownTooltip({ points, breakdown, children }: PointsBreakdownTooltipProps) {
  const items = [
    { label: 'Questions Solved', value: breakdown.questions, icon: '📝' },
    { label: 'Section Bonuses', value: breakdown.sectionBonuses, icon: '🎯' },
    { label: 'Speed Sessions', value: breakdown.speedSessions, icon: '⚡' },
    { label: 'Badge Acquisitions', value: breakdown.badges, icon: '🏆' },
    { label: 'Bank Completions', value: breakdown.bankCompletions, icon: '✅' },
  ].filter(item => item.value > 0);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent className="w-64 p-3" side="left">
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="font-semibold">Total Points</span>
            <span className="font-bold text-primary">{points.toLocaleString()}</span>
          </div>
          
          {items.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium">Breakdown:</p>
              {items.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <span>{item.icon}</span>
                    <span className="text-muted-foreground">{item.label}</span>
                  </span>
                  <span className="font-medium">+{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No detailed breakdown available</p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
