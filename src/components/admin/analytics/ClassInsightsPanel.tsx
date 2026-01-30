import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Lightbulb, Download, ArrowRight, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { useClassInsights } from '@/hooks/useAdminAnalytics';

interface ClassInsightsPanelProps {
  selectedBatchIds: string[];
}

export function ClassInsightsPanel({ selectedBatchIds }: ClassInsightsPanelProps) {
  const { data: insights, isLoading } = useClassInsights(selectedBatchIds);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'comparison': return <TrendingUp className="h-4 w-4" />;
      case 'collaboration': return <Users className="h-4 w-4" />;
      case 'alert': return <AlertTriangle className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'comparison': return 'text-blue-500 bg-blue-500/10';
      case 'collaboration': return 'text-green-500 bg-green-500/10';
      case 'alert': return 'text-destructive bg-destructive/10';
      default: return 'text-yellow-500 bg-yellow-500/10';
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
          <div className="flex gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-64 flex-shrink-0" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights || selectedBatchIds.length < 2) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Select at least 2 classes to generate insights
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            <div>
              <CardTitle>Auto-Generated Insights</CardTitle>
              <CardDescription>AI-powered recommendations based on comparison</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-4 pb-4">
            {insights.map((insight) => (
              <Card key={insight.id} className="w-80 flex-shrink-0">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-full ${getInsightColor(insight.type)}`}>
                      {getInsightIcon(insight.type)}
                    </div>
                    <Badge variant="secondary">{insight.category}</Badge>
                  </div>
                  
                  <p className="text-sm whitespace-normal">{insight.text}</p>

                  {insight.stats && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {insight.stats}
                    </div>
                  )}

                  {insight.action && (
                    <Button size="sm" variant="outline" className="w-full">
                      {insight.action}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
