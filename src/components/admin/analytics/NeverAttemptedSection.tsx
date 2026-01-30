import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HelpCircle, SkipForward, Download, Send, Star, Eye } from 'lucide-react';
import { useNeverAttemptedQuestions, useSkippedQuestions } from '@/hooks/useAdminAnalytics';
import { format } from 'date-fns';

export function NeverAttemptedSection() {
  const { data: neverAttempted, isLoading: loadingNever } = useNeverAttemptedQuestions();
  const { data: skipped, isLoading: loadingSkipped } = useSkippedQuestions();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-yellow-500" />
            <div>
              <CardTitle>Unattempted & Skipped Questions</CardTitle>
              <CardDescription>
                Questions that need attention or promotion
              </CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="never">
          <TabsList className="mb-4">
            <TabsTrigger value="never" className="gap-2">
              <HelpCircle className="h-4 w-4" />
              Never Attempted
              <Badge variant="secondary">{neverAttempted?.length || 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="skipped" className="gap-2">
              <SkipForward className="h-4 w-4" />
              Frequently Skipped
              <Badge variant="secondary">{skipped?.length || 0}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="never">
            {loadingNever ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !neverAttempted || neverAttempted.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>All questions have been attempted!</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question ID</TableHead>
                    <TableHead className="hidden sm:table-cell">Topic</TableHead>
                    <TableHead className="hidden md:table-cell">Added</TableHead>
                    <TableHead className="hidden lg:table-cell">Suspected Reason</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {neverAttempted.map((question) => (
                    <TableRow key={question.id}>
                      <TableCell className="font-mono text-sm">{question.questionId}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline">{question.topic}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {format(new Date(question.dateAdded), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                        {question.suspectedReason}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-7">
                            <Send className="h-3 w-3 mr-1" />
                            Push
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7">
                            <Star className="h-3 w-3 mr-1" />
                            Feature
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="skipped">
            {loadingSkipped ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !skipped || skipped.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <SkipForward className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No frequently skipped questions</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question ID</TableHead>
                    <TableHead className="text-center">Skip Rate</TableHead>
                    <TableHead className="hidden sm:table-cell">Topic</TableHead>
                    <TableHead className="hidden lg:table-cell">Feedback</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {skipped.map((question) => (
                    <TableRow key={question.id}>
                      <TableCell className="font-mono text-sm">{question.questionId}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={question.skipRate > 30 ? 'destructive' : 'secondary'}>
                          {question.skipRate}%
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline">{question.topic}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm max-w-xs truncate">
                        {question.feedback || 'No feedback'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-7">
                            Add Hint
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7">
                            Simplify
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
