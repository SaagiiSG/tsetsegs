import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useClassComparisonData } from '@/hooks/useAdminAnalytics';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ClassComparisonTableProps {
  selectedBatchIds: string[];
}

export function ClassComparisonTable({ selectedBatchIds }: ClassComparisonTableProps) {
  const { data: classes, isLoading } = useClassComparisonData(selectedBatchIds);

  const metrics = [
    { key: 'studentCount', label: 'Student Count', format: (v: number) => v.toString() },
    { key: 'avgAccuracy', label: 'Avg Accuracy', format: (v: number) => `${v}%`, isPercentage: true },
    { key: 'avgQuestions', label: 'Avg Questions', format: (v: number) => v.toString() },
    { key: 'avgHours', label: 'Avg Hours', format: (v: number) => `${v}h` },
    { key: 'engagementPercent', label: 'Engagement', format: (v: number) => `${v}%`, isPercentage: true },
    { key: 'topStudent', label: 'Top Student', format: (v: string) => v },
    { key: 'atRiskCount', label: 'At-Risk Students', format: (v: number) => v.toString(), isNegative: true },
    { key: 'healthScore', label: 'Health Score', format: (v: number) => v.toString(), isPercentage: true },
  ];

  const getValueColor = (key: string, value: number | string, allValues: (number | string)[]) => {
    if (typeof value === 'string') return '';
    
    const numValues = allValues.filter((v): v is number => typeof v === 'number');
    const max = Math.max(...numValues);
    const min = Math.min(...numValues);
    
    const metric = metrics.find(m => m.key === key);
    
    if (metric?.isNegative) {
      // Lower is better
      if (value === min) return 'text-green-500 font-medium';
      if (value === max) return 'text-destructive font-medium';
    } else {
      // Higher is better
      if (value === max) return 'text-green-500 font-medium';
      if (value === min) return 'text-destructive font-medium';
    }
    
    return '';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!classes || classes.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Select at least 2 classes to compare
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Class Metrics Comparison</CardTitle>
        <CardDescription>
          Side-by-side performance metrics (green = best, red = needs attention)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-medium">Metric</TableHead>
                {classes.map((cls) => (
                  <TableHead key={cls.id} className="text-center">
                    {cls.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map((metric) => {
                const getMetricValue = (cls: typeof classes[0]): number | string => {
                  switch (metric.key) {
                    case 'studentCount': return cls.studentCount;
                    case 'avgAccuracy': return cls.avgAccuracy;
                    case 'avgQuestions': return cls.avgQuestions;
                    case 'avgHours': return cls.avgHours;
                    case 'engagementPercent': return cls.engagementPercent;
                    case 'topStudent': return cls.topStudent;
                    case 'atRiskCount': return cls.atRiskCount;
                    case 'healthScore': return cls.healthScore;
                    default: return 0;
                  }
                };
                
                const values: (number | string)[] = classes.map(getMetricValue);
                
                return (
                  <TableRow key={metric.key}>
                    <TableCell className="font-medium">{metric.label}</TableCell>
                    {classes.map((cls) => {
                      const value = getMetricValue(cls);
                      const colorClass = getValueColor(metric.key, value, values);
                      
                      return (
                        <TableCell key={cls.id} className={`text-center ${colorClass}`}>
                          {metric.format(value as never)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
