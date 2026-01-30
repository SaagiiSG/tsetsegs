import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, Users, ArrowRight } from 'lucide-react';
import { useCohortAnalysis } from '@/hooks/useAdminAnalytics';

export function CohortAnalysis() {
  const [isOpen, setIsOpen] = useState(false);
  const [groupBy, setGroupBy] = useState<string>('enrollment');
  
  const { data: cohorts, isLoading } = useCohortAnalysis(groupBy);

  const funnelStages = [
    { name: 'Registered', count: cohorts?.funnel?.registered || 0, color: 'bg-blue-500' },
    { name: 'Active', count: cohorts?.funnel?.active || 0, color: 'bg-green-500' },
    { name: 'Engaged', count: cohorts?.funnel?.engaged || 0, color: 'bg-yellow-500' },
    { name: 'Competing', count: cohorts?.funnel?.competing || 0, color: 'bg-purple-500' },
  ];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle>Cohort Analysis</CardTitle>
                  <CardDescription>
                    Student retention and engagement by cohort
                  </CardDescription>
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Controls */}
            <div className="flex items-center gap-4">
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Group by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enrollment">Enrollment Month</SelectItem>
                  <SelectItem value="sprint">Sprint Join Date</SelectItem>
                  <SelectItem value="batch">Batch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Retention Funnel */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Retention Funnel</h4>
              <div className="flex items-center gap-2">
                {funnelStages.map((stage, index) => (
                  <div key={stage.name} className="flex items-center gap-2">
                    <div className="text-center">
                      <div className={`${stage.color} text-white text-xs font-medium px-3 py-1 rounded`}>
                        {stage.count}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{stage.name}</p>
                    </div>
                    {index < funnelStages.length - 1 && (
                      <div className="flex items-center text-muted-foreground">
                        <ArrowRight className="h-4 w-4" />
                        <span className="text-xs ml-1">
                          {stage.count > 0 
                            ? Math.round((funnelStages[index + 1].count / stage.count) * 100) 
                            : 0}%
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Cohort Table */}
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cohort</TableHead>
                    <TableHead className="text-center">Initial</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead className="text-center">Retention</TableHead>
                    <TableHead className="text-center hidden sm:table-cell">Avg Acc</TableHead>
                    <TableHead className="text-center hidden md:table-cell">Avg Hours</TableHead>
                    <TableHead className="hidden lg:table-cell">Top Student</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cohorts?.cohorts?.map((cohort) => (
                    <TableRow key={cohort.name}>
                      <TableCell className="font-medium">{cohort.name}</TableCell>
                      <TableCell className="text-center">{cohort.initialSize}</TableCell>
                      <TableCell className="text-center">{cohort.currentActive}</TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={cohort.retentionPercent >= 70 ? 'default' : cohort.retentionPercent >= 50 ? 'secondary' : 'destructive'}
                        >
                          {cohort.retentionPercent}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">{cohort.avgAccuracy}%</TableCell>
                      <TableCell className="text-center hidden md:table-cell">{cohort.avgHours}h</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">{cohort.topStudent}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
