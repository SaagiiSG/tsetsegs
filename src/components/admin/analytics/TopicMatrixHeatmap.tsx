import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTopicMatrixData } from '@/hooks/useAdminAnalytics';

interface TopicMatrixHeatmapProps {
  selectedBatchIds: string[];
}

export function TopicMatrixHeatmap({ selectedBatchIds }: TopicMatrixHeatmapProps) {
  const [selectedCell, setSelectedCell] = useState<{ topic: string; classId: string } | null>(null);
  const { data, isLoading } = useTopicMatrixData(selectedBatchIds);

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return 'bg-green-500 text-white';
    if (accuracy >= 70) return 'bg-green-400 text-white';
    if (accuracy >= 60) return 'bg-yellow-400 text-yellow-900';
    if (accuracy >= 50) return 'bg-orange-400 text-orange-900';
    return 'bg-red-500 text-white';
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
          Select at least 2 classes to view topic matrix
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Topic Performance Matrix</CardTitle>
          <CardDescription>Click any cell to see student details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Topic</th>
                  {data.classes.map((cls) => (
                    <th key={cls.id} className="text-center py-2 px-2 font-medium text-muted-foreground min-w-[100px]">
                      {cls.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.topics.map((topic) => (
                  <tr key={topic.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{topic.name}</td>
                    {data.classes.map((cls) => {
                      const accuracy = data.matrix[topic.id]?.[cls.id] ?? 0;
                      return (
                        <td key={cls.id} className="text-center py-2 px-2">
                          <button
                            onClick={() => setSelectedCell({ topic: topic.id, classId: cls.id })}
                            className={`inline-flex items-center justify-center w-16 h-8 rounded text-xs font-medium transition-transform hover:scale-105 ${getAccuracyColor(accuracy)}`}
                          >
                            {accuracy}%
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Auto-insights */}
          {data.insights && data.insights.length > 0 && (
            <div className="mt-4 space-y-2">
              {data.insights.map((insight, i) => (
                <p key={i} className="text-sm text-muted-foreground">
                  💡 {insight}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!selectedCell} onOpenChange={() => setSelectedCell(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Students in {data.topics.find(t => t.id === selectedCell?.topic)?.name} - 
              {data.classes.find(c => c.id === selectedCell?.classId)?.name}
            </DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead className="text-center">Accuracy</TableHead>
                <TableHead className="text-center">Questions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Mock student data */}
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  <TableCell>Student {i}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={i % 2 === 0 ? 'default' : 'destructive'}>
                      {50 + i * 10}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{10 + i * 3}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </>
  );
}
