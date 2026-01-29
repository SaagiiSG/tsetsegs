import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { RankHistoryEntry } from '@/hooks/useStudentProfile';
import { TIER_COLORS, TierType } from '@/data/badgeDefinitions';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface RankHistoryGraphProps {
  rankHistory: RankHistoryEntry[];
  currentTier: TierType;
}

const TIER_ORDER: TierType[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'ruby'];
const tierToNumber = (tier: TierType) => TIER_ORDER.indexOf(tier) + 1;

export function RankHistoryGraph({ rankHistory, currentTier }: RankHistoryGraphProps) {
  const chartData = rankHistory.map(entry => ({
    name: `S${entry.seasonNumber}-${entry.sprintNumber}`,
    tier: tierToNumber(entry.rank),
    tierName: entry.rank,
    points: entry.finalPoints,
    position: entry.position
  }));

  // Add current position if no history
  if (chartData.length === 0) {
    chartData.push({
      name: 'Current',
      tier: tierToNumber(currentTier),
      tierName: currentTier,
      points: 0,
      position: 0
    });
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border border-border rounded-lg p-2 text-sm">
          <p className="font-semibold">{data.name}</p>
          <p className="capitalize" style={{ color: TIER_COLORS[data.tierName as TierType] }}>
            {data.tierName} Tier
          </p>
          {data.points > 0 && (
            <p className="text-muted-foreground">{data.points.toLocaleString()} pts</p>
          )}
          {data.position > 0 && (
            <p className="text-muted-foreground">Rank #{data.position}</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-500" />
          Rank History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rankHistory.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
            Complete sprints to see your rank history
          </div>
        ) : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                />
                <YAxis 
                  domain={[0, 7]}
                  ticks={[1, 2, 3, 4, 5, 6]}
                  tickFormatter={(value) => TIER_ORDER[value - 1]?.charAt(0).toUpperCase() || ''}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="tier"
                  stroke={TIER_COLORS[currentTier]}
                  strokeWidth={2}
                  dot={{ fill: TIER_COLORS[currentTier], r: 4 }}
                  activeDot={{ r: 6, stroke: TIER_COLORS[currentTier], strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tier legend */}
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
          {TIER_ORDER.map(tier => (
            <div key={tier} className="flex items-center gap-1">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: TIER_COLORS[tier] }}
              />
              <span className="text-[10px] capitalize text-muted-foreground">{tier}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
