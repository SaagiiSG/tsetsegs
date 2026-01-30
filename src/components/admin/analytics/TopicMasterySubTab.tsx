import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';
import { Calculator, BookOpen, AlertTriangle, Award, BookMarked } from 'lucide-react';
import { useTopicMasteryData } from '@/hooks/useAdminAnalytics';
import { formatDistanceToNow } from 'date-fns';

interface TopicMasterySubTabProps {
  studentId: string;
}

export function TopicMasterySubTab({ studentId }: TopicMasterySubTabProps) {
  const { data, isLoading } = useTopicMasteryData(studentId);

  const getMasteryBadge = (accuracy: number) => {
    if (accuracy >= 90) return { label: 'Mastered', className: 'bg-green-500/10 text-green-500 border-green-500/20' };
    if (accuracy >= 70) return { label: 'Proficient', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
    if (accuracy >= 50) return { label: 'Learning', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' };
    if (accuracy > 0) return { label: 'Struggling', className: 'bg-destructive/10 text-destructive border-destructive/20' };
    return { label: 'Not Started', className: 'bg-muted text-muted-foreground border-muted' };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Top Panels: Weaknesses and Strengths */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weakness Panel */}
        <Card className="border-destructive/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle>Focus Areas</CardTitle>
            </div>
            <CardDescription>Top 5 topics needing improvement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.weakTopics.map((topic) => (
                <div key={topic.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="text-xs">{topic.accuracy}%</Badge>
                    <span className="text-sm font-medium">{topic.name}</span>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs">
                    <BookMarked className="h-3 w-3 mr-1" />
                    Assign
                  </Button>
                </div>
              ))}
              {data.weakTopics.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No weak topics identified!
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Strength Panel */}
        <Card className="border-green-500/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-green-500" />
              <CardTitle>Mastered Topics</CardTitle>
            </div>
            <CardDescription>Topics with 90%+ accuracy</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.masteredTopics.map((topic) => (
                <Badge key={topic.id} className="bg-green-500/10 text-green-500 border-green-500/20">
                  {topic.name}
                </Badge>
              ))}
              {data.masteredTopics.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No topics mastered yet. Keep practicing!
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Radar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Comparison</CardTitle>
          <CardDescription>Student vs Class Average across topics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data.radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis 
                  dataKey="topic" 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                />
                <PolarRadiusAxis 
                  angle={30} 
                  domain={[0, 100]} 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Radar
                  name="Student"
                  dataKey="student"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                />
                <Radar
                  name="Class Avg"
                  dataKey="classAvg"
                  stroke="hsl(var(--muted-foreground))"
                  fill="hsl(var(--muted-foreground))"
                  fillOpacity={0.1}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Topic Accordions */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Topic Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {/* Math Section */}
            <AccordionItem value="math">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  <span>Math Topics</span>
                  <Badge variant="secondary" className="ml-2">{data.mathTopics.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  {data.mathTopics.map((topic) => {
                    const mastery = getMasteryBadge(topic.accuracy);
                    return (
                      <div key={topic.id} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{topic.name}</span>
                            <Badge className={mastery.className}>{mastery.label}</Badge>
                          </div>
                          <Button size="sm" variant="ghost" className="h-7">
                            Assign
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Accuracy</p>
                            <p className="font-medium">{topic.accuracy}%</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Questions</p>
                            <p className="font-medium">{topic.completed}/{topic.total}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Avg Time</p>
                            <p className={`font-medium ${topic.avgTime > topic.optimalTime ? 'text-yellow-500' : ''}`}>
                              {topic.avgTime}s
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Last Practiced</p>
                            <p className="font-medium">
                              {topic.lastPracticed 
                                ? formatDistanceToNow(new Date(topic.lastPracticed), { addSuffix: true })
                                : 'Never'}
                            </p>
                          </div>
                        </div>
                        <Progress value={(topic.completed / topic.total) * 100} className="h-1 mt-3" />
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* English Section */}
            <AccordionItem value="english">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span>English Topics</span>
                  <Badge variant="secondary" className="ml-2">{data.englishTopics.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  {data.englishTopics.map((topic) => {
                    const mastery = getMasteryBadge(topic.accuracy);
                    return (
                      <div key={topic.id} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{topic.name}</span>
                            <Badge className={mastery.className}>{mastery.label}</Badge>
                          </div>
                          <Button size="sm" variant="ghost" className="h-7">
                            Assign
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Accuracy</p>
                            <p className="font-medium">{topic.accuracy}%</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Questions</p>
                            <p className="font-medium">{topic.completed}/{topic.total}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Avg Time</p>
                            <p className={`font-medium ${topic.avgTime > topic.optimalTime ? 'text-yellow-500' : ''}`}>
                              {topic.avgTime}s
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Last Practiced</p>
                            <p className="font-medium">
                              {topic.lastPracticed 
                                ? formatDistanceToNow(new Date(topic.lastPracticed), { addSuffix: true })
                                : 'Never'}
                            </p>
                          </div>
                        </div>
                        <Progress value={(topic.completed / topic.total) * 100} className="h-1 mt-3" />
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
