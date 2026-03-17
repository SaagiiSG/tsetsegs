import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bug, ExternalLink, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  open: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  in_progress: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  resolved: 'bg-green-500/10 text-green-600 border-green-500/30',
  closed: 'bg-muted text-muted-foreground border-border',
};

const categoryLabels: Record<string, string> = {
  ui_bug: 'UI Bug',
  question_error: 'Question Error',
  performance: 'Performance',
  other: 'Other',
};

export default function BugReports() {
  const queryClient = useQueryClient();

  const { data: reports, isLoading } = useQuery({
    queryKey: ['admin-bug-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bug_reports')
        .select('*, student_accounts(phone_number, linked_student_id)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('bug_reports').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bug-reports'] });
      toast.success('Status updated');
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bug className="h-6 w-6 text-destructive" />
          Bug Reports
        </h1>
        <Badge variant="outline">{reports?.length || 0} total</Badge>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !reports?.length ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Bug className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No bug reports yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report: any) => (
            <Card key={report.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{report.title}</h3>
                      <Badge variant="outline" className={cn("text-xs", statusColors[report.status])}>
                        {report.status}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {categoryLabels[report.category] || report.category}
                      </Badge>
                    </div>
                    {report.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{report.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{format(new Date(report.created_at), 'MMM d, yyyy h:mm a')}</span>
                      <span>•</span>
                      <span>{report.student_accounts?.phone_number}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {report.screenshot_url && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <a href={report.screenshot_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {report.status === 'open' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => updateStatus.mutate({ id: report.id, status: 'resolved' })}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Resolve
                      </Button>
                    )}
                    {report.status === 'resolved' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => updateStatus.mutate({ id: report.id, status: 'open' })}
                      >
                        Reopen
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
