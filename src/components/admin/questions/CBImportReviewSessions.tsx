import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { FileText, ChevronDown, ChevronRight, Trash2, CheckCircle, XCircle, AlertTriangle, SkipForward, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface ImportSession {
  id: string;
  filename: string;
  total_pages: number;
  success_count: number;
  error_count: number;
  skipped_count: number;
  created_at: string;
}

interface ImportIssue {
  id: string;
  session_id: string;
  page_number: number;
  issue_type: 'error' | 'skipped' | 'empty_options';
  error_message: string | null;
  skip_reason: string | null;
  raw_data: Record<string, any> | null;
  resolved: boolean;
  created_at: string;
}

export function CBImportReviewSessions() {
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<ImportIssue | null>(null);
  const queryClient = useQueryClient();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['cb-import-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cb_import_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as ImportSession[];
    }
  });

  const { data: issues } = useQuery({
    queryKey: ['cb-import-issues', expandedSession],
    queryFn: async () => {
      if (!expandedSession) return [];
      const { data, error } = await supabase
        .from('cb_import_issues')
        .select('*')
        .eq('session_id', expandedSession)
        .order('page_number', { ascending: true });
      if (error) throw error;
      return data as ImportIssue[];
    },
    enabled: !!expandedSession
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('cb_import_sessions')
        .delete()
        .eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Session deleted');
      queryClient.invalidateQueries({ queryKey: ['cb-import-sessions'] });
    }
  });

  const resolveIssueMutation = useMutation({
    mutationFn: async (issueId: string) => {
      const { error } = await supabase
        .from('cb_import_issues')
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', issueId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Issue marked as resolved');
      queryClient.invalidateQueries({ queryKey: ['cb-import-issues', expandedSession] });
    }
  });

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'skipped': return <SkipForward className="h-4 w-4 text-muted-foreground" />;
      case 'empty_options': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default: return null;
    }
  };

  const getIssueBadge = (type: string) => {
    switch (type) {
      case 'error': return <Badge variant="destructive">Error</Badge>;
      case 'skipped': return <Badge variant="secondary">Skipped</Badge>;
      case 'empty_options': return <Badge variant="outline" className="border-amber-500 text-amber-600">Empty Options</Badge>;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import Review Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No import sessions with issues</p>
            <p className="text-sm">Errors and skipped pages from imports will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Import Review Sessions</CardTitle>
          <CardDescription>
            Review errors and skipped pages from previous CollegeBoard imports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {sessions.map((session) => (
                <Collapsible
                  key={session.id}
                  open={expandedSession === session.id}
                  onOpenChange={(open) => setExpandedSession(open ? session.id : null)}
                >
                  <div className="border rounded-lg">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          {expandedSession === session.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{session.filename}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(session.created_at), 'MMM d, yyyy HH:mm')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="bg-primary">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {session.success_count}
                          </Badge>
                          {session.error_count > 0 && (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              {session.error_count}
                            </Badge>
                          )}
                          {session.skipped_count > 0 && (
                            <Badge variant="secondary">
                              <SkipForward className="h-3 w-3 mr-1" />
                              {session.skipped_count}
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSessionMutation.mutate(session.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t p-4">
                        {issues && issues.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-16">Page</TableHead>
                                <TableHead className="w-28">Type</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead className="w-24">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {issues.map((issue) => (
                                <TableRow 
                                  key={issue.id}
                                  className={issue.resolved ? 'opacity-50' : ''}
                                >
                                  <TableCell className="font-mono">{issue.page_number}</TableCell>
                                  <TableCell>{getIssueBadge(issue.issue_type)}</TableCell>
                                  <TableCell>
                                    <p className="text-sm line-clamp-2">
                                      {issue.error_message || issue.skip_reason || '-'}
                                    </p>
                                    {issue.raw_data && (
                                      <Button
                                        variant="link"
                                        size="sm"
                                        className="p-0 h-auto text-xs"
                                        onClick={() => setSelectedIssue(issue)}
                                      >
                                        View raw data
                                      </Button>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {!issue.resolved && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => resolveIssueMutation.mutate(issue.id)}
                                      >
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Resolve
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Loading issues...
                          </p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Raw Data Dialog */}
      <Dialog open={!!selectedIssue} onOpenChange={(open) => !open && setSelectedIssue(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Page {selectedIssue?.page_number} - Raw Data
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto">
              {JSON.stringify(selectedIssue?.raw_data, null, 2)}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
