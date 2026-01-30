import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Check, X, Archive, ChevronRight } from 'lucide-react';
import { useDifficultyCalibration } from '@/hooks/useAdminAnalytics';

export function DifficultyCalibrationAlerts() {
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);
  const { data: alerts, isLoading } = useDifficultyCalibration();

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'hard': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const toggleAlert = (id: string) => {
    setSelectedAlerts(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <div>
              <CardTitle>Difficulty Calibration Alerts</CardTitle>
              <CardDescription>
                Questions with mismatched difficulty based on actual performance
              </CardDescription>
            </div>
          </div>
          {selectedAlerts.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{selectedAlerts.length} selected</Badge>
              <Button size="sm" variant="outline">Bulk Adjust</Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!alerts || alerts.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Check className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-50" />
            <p>All questions are properly calibrated!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.slice(0, 20).map((alert) => (
              <div
                key={alert.id}
                className={`p-4 border rounded-lg transition-all ${
                  selectedAlerts.includes(alert.id) ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedAlerts.includes(alert.id)}
                    onCheckedChange={() => toggleAlert(alert.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <code className="text-xs bg-muted px-1 rounded">{alert.questionId}</code>
                      <Badge variant="outline" className="text-xs">{alert.topic}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {alert.snippet}
                    </p>
                    
                    {/* Difficulty comparison */}
                    <div className="flex items-center gap-2 text-sm mb-3">
                      <span className={getDifficultyColor(alert.currentDifficulty)}>
                        {alert.currentDifficulty}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      <span className={`font-medium ${getDifficultyColor(alert.recommendedDifficulty)}`}>
                        {alert.recommendedDifficulty}
                      </span>
                      <Badge variant="secondary" className="text-xs ml-auto">
                        {alert.confidence}% conf
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground mb-3">
                      {alert.reason}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button size="sm" variant="default" className="h-7 text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        Adjust
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        <X className="h-3 w-3 mr-1" />
                        Keep
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive">
                        <Archive className="h-3 w-3 mr-1" />
                        Retire
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
