import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Trophy, Crown, Gem, Medal, Award } from 'lucide-react';
import { useSprintComparisonData } from '@/hooks/useAdminAnalytics';

interface SprintComparisonSectionProps {
  selectedBatchIds: string[];
}

const TIER_COLORS = {
  ruby: '#e11d48',
  diamond: '#22d3ee',
  gold: '#eab308',
  silver: '#94a3b8',
  bronze: '#d97706',
};

export function SprintComparisonSection({ selectedBatchIds }: SprintComparisonSectionProps) {
  const { data, isLoading } = useSprintComparisonData(selectedBatchIds);

  const getTierIcon = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'ruby': return <Crown className="h-4 w-4" style={{ color: TIER_COLORS.ruby }} />;
      case 'diamond': return <Gem className="h-4 w-4" style={{ color: TIER_COLORS.diamond }} />;
      case 'gold': return <Medal className="h-4 w-4" style={{ color: TIER_COLORS.gold }} />;
      case 'silver': return <Award className="h-4 w-4" style={{ color: TIER_COLORS.silver }} />;
      case 'bronze': return <Trophy className="h-4 w-4" style={{ color: TIER_COLORS.bronze }} />;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || selectedBatchIds.length < 2) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Select at least 2 classes to compare sprint performance
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <div>
            <CardTitle>Sprint Performance</CardTitle>
            <CardDescription>Competition participation and rankings</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Participation & Points Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.classes.map((cls) => (
            <div key={cls.id} className="p-4 border rounded-lg">
              <p className="text-sm font-medium truncate mb-2">{cls.name}</p>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Participation</span>
                    <span className="font-medium">{cls.participationRate}%</span>
                  </div>
                  <Progress value={cls.participationRate} className="h-1" />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Avg Points</span>
                  <span className="font-medium text-yellow-500">{cls.avgPoints}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tier Distribution Chart */}
        <div>
          <h4 className="text-sm font-medium mb-3">Tier Distribution</h4>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.tierDistribution} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis 
                  type="category" 
                  dataKey="tier" 
                  tick={{ fontSize: 10 }}
                  width={60}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Legend />
                {data.classes.map((cls, index) => (
                  <Bar
                    key={cls.id}
                    dataKey={cls.id}
                    name={cls.name}
                    stackId="a"
                    fill={Object.values(TIER_COLORS)[index % 5]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cross-Class Top 20 */}
        <div>
          <h4 className="text-sm font-medium mb-3">Cross-Class Top 20</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead className="text-center">Tier</TableHead>
                <TableHead className="text-right">Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.topStudents.slice(0, 10).map((student, index) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">
                    {index < 3 ? (
                      <span className={`text-lg ${
                        index === 0 ? 'text-yellow-500' :
                        index === 1 ? 'text-slate-400' :
                        'text-amber-700'
                      }`}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </span>
                    ) : (
                      index + 1
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{student.className}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {getTierIcon(student.tier)}
                      <span className="text-sm">{student.tier}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium text-yellow-500">
                    {student.points.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
