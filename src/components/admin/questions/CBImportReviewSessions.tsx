import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { FileText, ChevronDown, ChevronRight, Trash2, CheckCircle, XCircle, AlertTriangle, SkipForward, Loader2, RefreshCw, CheckCheck, Eye, Image } from 'lucide-react';
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
  page_image_url: string | null;
  resolved: boolean;
  created_at: string;
}

export function CBImportReviewSessions() {
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<ImportIssue | null>(null);
  const [selectedIssueIds, setSelectedIssueIds] = useState<Set<string>>(new Set());
  const [reparseLoading, setReparseLoading] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
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

  const { data: issues, refetch: refetchIssues } = useQuery({
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

  const bulkResolveMutation = useMutation({
    mutationFn: async (issueIds: string[]) => {
      const { error } = await supabase
        .from('cb_import_issues')
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .in('id', issueIds);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${selectedIssueIds.size} issues marked as resolved`);
      setSelectedIssueIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['cb-import-issues', expandedSession] });
    }
  });

  // Re-parse functionality - calls edge function with alternative prompt
  const handleReparse = async (issue: ImportIssue) => {
    if (!issue.page_image_url) {
      toast.error('No image available for re-parsing');
      return;
    }

    setReparseLoading(issue.id);
    try {
      const { data, error } = await supabase.functions.invoke('parse-cb-question', {
        body: {
          imageUrl: issue.page_image_url,
          pageNumber: issue.page_number,
          retryMode: true // Signal to use alternative parsing strategy
        }
      });

      if (error) throw error;

      if (data.skipped) {
        toast.info(`Page ${issue.page_number}: Still skipped - ${data.skipReason}`);
      } else if (data.error) {
        toast.error(`Page ${issue.page_number}: ${data.error}`);
      } else {
        // Successfully parsed - show the result for review
        setSelectedIssue({ ...issue, raw_data: data });
        toast.success(`Page ${issue.page_number} re-parsed successfully! Review the data.`);
      }
    } catch (error: any) {
      console.error('Re-parse error:', error);
      toast.error(`Failed to re-parse: ${error.message}`);
    } finally {
      setReparseLoading(null);
    }
  };

  const toggleIssueSelection = (issueId: string) => {
    const newSet = new Set(selectedIssueIds);
    if (newSet.has(issueId)) {
      newSet.delete(issueId);
    } else {
      newSet.add(issueId);
    }
    setSelectedIssueIds(newSet);
  };

  const selectAllUnresolved = () => {
    if (!issues) return;
    const unresolvedIds = issues.filter(i => !i.resolved).map(i => i.id);
    setSelectedIssueIds(new Set(unresolvedIds));
  };

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

  const unresolvedCount = issues?.filter(i => !i.resolved).length || 0;

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
          <CardTitle className="flex items-center justify-between">
            <span>Import Review Sessions</span>
            {expandedSession && selectedIssueIds.size > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => bulkResolveMutation.mutate(Array.from(selectedIssueIds))}
                disabled={bulkResolveMutation.isPending}
              >
                <CheckCheck className="h-4 w-4" />
                Resolve Selected ({selectedIssueIds.size})
              </Button>
            )}
          </CardTitle>
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
                  onOpenChange={(open) => {
                    setExpandedSession(open ? session.id : null);
                    setSelectedIssueIds(new Set());
                  }}
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
                        {/* Bulk actions toolbar */}
                        {unresolvedCount > 0 && (
                          <div className="flex items-center justify-between mb-4 p-2 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{unresolvedCount} unresolved issue{unresolvedCount !== 1 ? 's' : ''}</span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={selectAllUnresolved}
                            >
                              Select All Unresolved
                            </Button>
                          </div>
                        )}

                        {issues && issues.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-10"></TableHead>
                                <TableHead className="w-16">Page</TableHead>
                                <TableHead className="w-28">Type</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead className="w-32">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {issues.map((issue) => (
                                <TableRow 
                                  key={issue.id}
                                  className={issue.resolved ? 'opacity-50' : ''}
                                >
                                  <TableCell>
                                    {!issue.resolved && (
                                      <Checkbox
                                        checked={selectedIssueIds.has(issue.id)}
                                        onCheckedChange={() => toggleIssueSelection(issue.id)}
                                      />
                                    )}
                                  </TableCell>
                                  <TableCell className="font-mono">{issue.page_number}</TableCell>
                                  <TableCell>{getIssueBadge(issue.issue_type)}</TableCell>
                                  <TableCell>
                                    <p className="text-sm line-clamp-2">
                                      {issue.error_message || issue.skip_reason || '-'}
                                    </p>
                                    <div className="flex gap-2 mt-1">
                                      {issue.raw_data && (
                                        <Button
                                          variant="link"
                                          size="sm"
                                          className="p-0 h-auto text-xs"
                                          onClick={() => setSelectedIssue(issue)}
                                        >
                                          <Eye className="h-3 w-3 mr-1" />
                                          View data
                                        </Button>
                                      )}
                                      {issue.page_image_url && (
                                        <Button
                                          variant="link"
                                          size="sm"
                                          className="p-0 h-auto text-xs"
                                          onClick={() => setPreviewImageUrl(issue.page_image_url)}
                                        >
                                          <Image className="h-3 w-3 mr-1" />
                                          View image
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      {/* Re-parse button */}
                                      {!issue.resolved && issue.page_image_url && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleReparse(issue)}
                                          disabled={reparseLoading === issue.id}
                                          title="Re-parse with alternative strategy"
                                        >
                                          {reparseLoading === issue.id ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                          ) : (
                                            <RefreshCw className="h-3 w-3" />
                                          )}
                                        </Button>
                                      )}
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
                                    </div>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedIssue(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImageUrl} onOpenChange={(open) => !open && setPreviewImageUrl(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Page Image Preview</DialogTitle>
          </DialogHeader>
          {previewImageUrl && (
            <div className="flex justify-center">
              <img 
                src={previewImageUrl} 
                alt="Page preview" 
                className="max-h-[70vh] object-contain rounded-lg border"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewImageUrl(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
