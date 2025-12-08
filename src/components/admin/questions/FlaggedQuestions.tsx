import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Flag, CheckCircle, Loader2 } from 'lucide-react';

export function FlaggedQuestions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch flagged questions
  const { data: flags, isLoading } = useQuery({
    queryKey: ['flagged-questions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('question_flags')
        .select(`
          *,
          question:questions(question_id, question_text, category:question_categories(name)),
          student:student_accounts(phone_number)
        `)
        .eq('admin_reviewed', false)
        .order('flagged_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  // Mark as reviewed mutation
  const reviewMutation = useMutation({
    mutationFn: async (flagId: string) => {
      const { error } = await supabase
        .from('question_flags')
        .update({ admin_reviewed: true, reviewed_at: new Date().toISOString() })
        .eq('id', flagId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Flag marked as reviewed' });
      queryClient.invalidateQueries({ queryKey: ['flagged-questions'] });
      queryClient.invalidateQueries({ queryKey: ['flagged-questions-count'] });
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (!flags || flags.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Flagged Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Flag className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No flagged questions</p>
            <p className="text-sm">Questions flagged by students will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Flagged Questions ({flags.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {flags.map((flag: any) => (
          <div key={flag.id} className="border rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="font-mono">
                    {flag.question?.question_id}
                  </Badge>
                  <Badge variant="secondary">{flag.question?.category?.name}</Badge>
                  <span className="text-xs text-muted-foreground">
                    Flagged {new Date(flag.flagged_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm mb-2">{flag.question?.question_text}</p>
                {flag.flag_reason && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Reason:</span> {flag.flag_reason}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Flagged by: {flag.student?.phone_number}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => reviewMutation.mutate(flag.id)}
                disabled={reviewMutation.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark Reviewed
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
