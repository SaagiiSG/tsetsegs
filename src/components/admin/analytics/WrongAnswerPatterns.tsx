import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { AlertTriangle, BookOpen, Users, TrendingDown } from 'lucide-react';
import { useWrongAnswerPatterns } from '@/hooks/useAdminAnalytics';

export function WrongAnswerPatterns() {
  const { data: patterns, isLoading } = useWrongAnswerPatterns();

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
              <Skeleton key={i} className="h-48 w-72 flex-shrink-0" />
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
          <TrendingDown className="h-5 w-5 text-destructive" />
          <div>
            <CardTitle>Wrong Answer Patterns</CardTitle>
            <CardDescription>
              Common mistakes and error patterns across questions
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!patterns || patterns.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No significant error patterns detected</p>
          </div>
        ) : (
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-4 pb-4">
              {patterns.map((pattern) => (
                <Card key={pattern.id} className="w-80 flex-shrink-0">
                  <CardContent className="pt-4 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <code className="text-xs bg-muted px-1 rounded">{pattern.questionId}</code>
                        <Badge variant="outline" className="ml-2 text-xs">{pattern.topic}</Badge>
                      </div>
                      <Badge variant="destructive" className="text-xs">
                        {pattern.errorRate}% error
                      </Badge>
                    </div>

                    {/* Correct Answer */}
                    <div className="p-2 bg-green-500/10 border border-green-500/20 rounded text-sm">
                      <span className="text-xs text-green-600 font-medium">Correct: </span>
                      <span className="font-medium">{pattern.correctAnswer}</span>
                    </div>

                    {/* Wrong Options Distribution */}
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Wrong Answer Distribution</p>
                      {pattern.wrongOptions.map((option, index) => (
                        <div key={index} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className={option.isCommon ? 'font-medium text-destructive' : ''}>
                              {option.label}: {option.text}
                            </span>
                            <span className={option.isCommon ? 'font-medium text-destructive' : 'text-muted-foreground'}>
                              {option.percentage}%
                            </span>
                          </div>
                          <Progress 
                            value={option.percentage} 
                            className={`h-1 ${option.isCommon ? 'bg-destructive/20' : ''}`}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Pattern Analysis */}
                    <div className="p-2 bg-muted rounded text-xs">
                      <p className="text-muted-foreground">{pattern.analysis}</p>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{pattern.affectedStudents} students</span>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        <BookOpen className="h-3 w-3 mr-1" />
                        Create Lesson
                      </Button>
                    </div>
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
