import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, RotateCcw, Clock, CheckCircle2, Loader2, Zap, Calendar
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function StudentReview() {
  const { student, logActivity } = useStudentAuth();
  const navigate = useNavigate();

  const { data: reviewQueue, isLoading } = useQuery({
    queryKey: ['full-review-queue', student?.id],
    queryFn: async () => {
      if (!student) return [];
      
      const { data, error } = await supabase
        .from('student_review_queue')
        .select(`
          *,
          question:questions(
            id,
            question_id,
            category:question_categories(name)
          )
        `)
        .eq('student_account_id', student.id)
        .order('next_review_at');
      
      if (error) throw error;
      return data;
    },
    enabled: !!student
  });

  const dueNow = reviewQueue?.filter(r => new Date(r.next_review_at) <= new Date()) || [];
  const upcoming = reviewQueue?.filter(r => new Date(r.next_review_at) > new Date()) || [];

  const getCategoryColor = (categoryName: string) => {
    const colors: Record<string, string> = {
      'Advanced Math': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      'Algebra': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      'Geometry and Trigonometry': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      'Data Analysis and Problem Solving': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    };
    return colors[categoryName] || 'bg-muted text-muted-foreground border-border';
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 select-none">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="h-6 w-6 text-orange-500" />
          Spaced Repetition
        </h1>
        <p className="text-muted-foreground">
          Review questions to strengthen your memory
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-orange-600 mb-1">
              <Zap className="h-4 w-4" />
              <span className="text-sm font-medium">Due Now</span>
            </div>
            <p className="text-3xl font-bold">{dueNow.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-medium">Scheduled</span>
            </div>
            <p className="text-3xl font-bold">{upcoming.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Due Now Section */}
      {dueNow.length > 0 ? (
        <Card className="border-orange-500/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-orange-500" />
              Ready for Review ({dueNow.length})
            </CardTitle>
            <CardDescription>
              These questions need your attention
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {dueNow.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => {
                  logActivity('review_question_click', { question_id: item.question_id });
                  navigate(`/practice/question/${item.question_id}`);
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <span className="font-mono font-bold text-orange-600">
                      {item.question?.question_id}
                    </span>
                  </div>
                  <div>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getCategoryColor(item.question?.category?.name || '')}`}
                    >
                      {item.question?.category?.name || 'N/A'}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Reviewed {item.review_count} times
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Review
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="font-semibold text-lg">All caught up!</h3>
            <p className="text-muted-foreground mt-2">
              No questions due for review right now
            </p>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Section */}
      {upcoming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Upcoming Reviews ({upcoming.length})
            </CardTitle>
            <CardDescription>
              Questions scheduled for future review
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card/50"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <span className="font-mono font-bold text-muted-foreground">
                      {item.question?.question_id}
                    </span>
                  </div>
                  <div>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getCategoryColor(item.question?.category?.name || '')}`}
                    >
                      {item.question?.category?.name || 'N/A'}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Due {formatDistanceToNow(new Date(item.next_review_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {upcoming.length > 5 && (
              <p className="text-center text-sm text-muted-foreground py-2">
                +{upcoming.length - 5} more scheduled
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
