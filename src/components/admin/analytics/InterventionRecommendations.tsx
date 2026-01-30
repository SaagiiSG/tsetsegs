import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useInterventionRecommendations } from '@/hooks/useAdminAnalytics';
import { Lightbulb, X, AlertTriangle, Info, Sparkles, Users, BookOpen, Trophy, Bell } from 'lucide-react';

export function InterventionRecommendations() {
  const { data: recommendations, isLoading } = useInterventionRecommendations();

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'important':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Important</Badge>;
      default:
        return <Badge variant="secondary">Suggested</Badge>;
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'assign':
        return <BookOpen className="h-4 w-4" />;
      case 'message':
        return <Bell className="h-4 w-4" />;
      case 'celebrate':
        return <Trophy className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-40 w-72 flex-shrink-0" />
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
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          <div>
            <CardTitle>Intervention Recommendations</CardTitle>
            <CardDescription>
              AI-generated actions to improve student outcomes
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!recommendations || recommendations.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No recommendations at this time</p>
            <p className="text-sm">All metrics look healthy!</p>
          </div>
        ) : (
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-4 pb-4">
              {recommendations.slice(0, 10).map((rec) => (
                <Card key={rec.id} className="w-72 flex-shrink-0 relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <CardContent className="pt-6 space-y-3">
                    {getPriorityBadge(rec.priority)}
                    <p className="text-sm whitespace-normal line-clamp-3">
                      {rec.text}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{rec.impactCount} students affected</span>
                    </div>
                    <Button size="sm" className="w-full">
                      {getActionIcon(rec.actionType)}
                      <span className="ml-2">{rec.actionLabel}</span>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
