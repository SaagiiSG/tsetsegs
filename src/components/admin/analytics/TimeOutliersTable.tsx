import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, AlertTriangle, Eye, Edit, MessageSquare } from 'lucide-react';
import { useTimeOutliers } from '@/hooks/useAdminAnalytics';

export function TimeOutliersTable() {
  const { data: outliers, isLoading } = useTimeOutliers();

  const getIssueIndicator = (issue: string) => {
    switch (issue) {
      case 'complex_calculation':
        return <Badge variant="outline" className="text-purple-500 border-purple-500/30">Complex Calc</Badge>;
      case 'confusing_wording':
        return <Badge variant="outline" className="text-orange-500 border-orange-500/30">Confusing Wording</Badge>;
      case 'long_passage':
        return <Badge variant="outline" className="text-blue-500 border-blue-500/30">Long Passage</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-500" />
          <div>
            <CardTitle>Time Outliers</CardTitle>
            <CardDescription>
              Questions taking significantly longer than expected
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!outliers || outliers.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No time outliers detected</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Question ID</TableHead>
                <TableHead className="hidden sm:table-cell">Topic</TableHead>
                <TableHead className="text-center">Avg Time</TableHead>
                <TableHead className="text-center hidden md:table-cell">Expected</TableHead>
                <TableHead className="text-center">Ratio</TableHead>
                <TableHead className="hidden lg:table-cell">Issue</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {outliers.map((outlier) => (
                <TableRow key={outlier.id}>
                  <TableCell className="font-mono text-sm">{outlier.questionId}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline">{outlier.topic}</Badge>
                  </TableCell>
                  <TableCell className="text-center font-medium text-destructive">
                    {outlier.avgTime}s
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground hidden md:table-cell">
                    {outlier.expectedTime}s
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="destructive" className="font-mono">
                      {outlier.ratio}x
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {getIssueIndicator(outlier.issue)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
