import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, Medal, Crown, User, Loader2, TrendingUp
} from 'lucide-react';

export default function StudentLeaderboard() {
  const { student } = useStudentAuth();

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['student-leaderboard'],
    queryFn: async () => {
      // Get all student attempts grouped by student
      const { data: attempts, error } = await supabase
        .from('student_attempts')
        .select(`
          student_account_id,
          is_correct,
          question_id
        `);
      
      if (error) throw error;

      // Get student accounts with linked student info
      const { data: accounts, error: accountsError } = await supabase
        .from('student_accounts')
        .select(`
          id,
          phone_number,
          linked_student:students(first_name, last_name)
        `);
      
      if (accountsError) throw accountsError;

      // Calculate stats per student
      const studentStats: Record<string, {
        id: string;
        name: string;
        completed: number;
        accuracy: number;
        totalAttempts: number;
        correctAttempts: number;
      }> = {};

      attempts?.forEach(attempt => {
        if (!studentStats[attempt.student_account_id]) {
          const account = accounts?.find(a => a.id === attempt.student_account_id);
          const linkedStudent = account?.linked_student as { first_name: string; last_name: string } | null;
          
          studentStats[attempt.student_account_id] = {
            id: attempt.student_account_id,
            name: linkedStudent 
              ? `${linkedStudent.first_name} ${linkedStudent.last_name?.charAt(0) || ''}.`
              : account?.phone_number?.slice(-4) || 'Anonymous',
            completed: 0,
            accuracy: 0,
            totalAttempts: 0,
            correctAttempts: 0
          };
        }
        
        studentStats[attempt.student_account_id].totalAttempts++;
        if (attempt.is_correct) {
          studentStats[attempt.student_account_id].correctAttempts++;
        }
      });

      // Count unique completed questions per student
      const completedByStudent: Record<string, Set<string>> = {};
      attempts?.filter(a => a.is_correct).forEach(a => {
        if (!completedByStudent[a.student_account_id]) {
          completedByStudent[a.student_account_id] = new Set();
        }
        completedByStudent[a.student_account_id].add(a.question_id);
      });

      Object.keys(studentStats).forEach(id => {
        studentStats[id].completed = completedByStudent[id]?.size || 0;
        studentStats[id].accuracy = studentStats[id].totalAttempts > 0
          ? Math.round((studentStats[id].correctAttempts / studentStats[id].totalAttempts) * 100)
          : 0;
      });

      // Sort by completed questions, then by accuracy
      return Object.values(studentStats)
        .sort((a, b) => b.completed - a.completed || b.accuracy - a.accuracy);
    },
    enabled: !!student
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentStudentRank = leaderboard?.findIndex(s => s.id === student?.id) ?? -1;
  const currentStudentStats = leaderboard?.find(s => s.id === student?.id);

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (rank === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="w-5 text-center font-bold text-muted-foreground">{rank + 1}</span>;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 0) return 'bg-gradient-to-r from-yellow-500 to-amber-500';
    if (rank === 1) return 'bg-gradient-to-r from-gray-400 to-gray-500';
    if (rank === 2) return 'bg-gradient-to-r from-amber-600 to-orange-600';
    return '';
  };

  return (
    <div className="p-4 md:p-6 space-y-6 select-none">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          Leaderboard
        </h1>
        <p className="text-muted-foreground">
          See how you rank among other students
        </p>
      </div>

      {/* Your Rank Card */}
      {currentStudentStats && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Your Rank
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">
                    #{currentStudentRank + 1}
                  </span>
                </div>
                <div>
                  <p className="font-semibold">{currentStudentStats.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {currentStudentStats.completed} questions completed
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-primary">
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-bold">{currentStudentStats.accuracy}%</span>
                </div>
                <p className="text-xs text-muted-foreground">accuracy</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top 3 */}
      {leaderboard && leaderboard.length >= 3 && (
        <div className="grid grid-cols-3 gap-2">
          {[1, 0, 2].map((rank) => {
            const entry = leaderboard[rank];
            if (!entry) return null;
            const isCenter = rank === 0;
            
            return (
              <Card 
                key={entry.id}
                className={`text-center ${isCenter ? 'scale-105 border-yellow-500/50 bg-yellow-500/5' : ''}`}
              >
                <CardContent className="p-4">
                  <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-2 ${getRankBadge(rank)}`}>
                    {rank === 0 ? (
                      <Crown className="h-6 w-6 text-white" />
                    ) : (
                      <span className="text-xl font-bold text-white">{rank + 1}</span>
                    )}
                  </div>
                  <p className="font-semibold text-sm truncate">{entry.name}</p>
                  <p className="text-2xl font-bold mt-1">{entry.completed}</p>
                  <p className="text-xs text-muted-foreground">completed</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Full Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rankings</CardTitle>
          <CardDescription>All students by questions completed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {leaderboard?.map((entry, index) => {
            const isCurrentUser = entry.id === student?.id;
            
            return (
              <div
                key={entry.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  isCurrentUser 
                    ? 'bg-primary/10 border border-primary/30' 
                    : 'border hover:bg-muted/50'
                }`}
              >
                <div className="w-8 flex justify-center">
                  {getRankIcon(index)}
                </div>
                
                <Avatar className="h-10 w-10">
                  <AvatarFallback className={isCurrentUser ? 'bg-primary text-primary-foreground' : ''}>
                    {entry.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-medium truncate ${isCurrentUser ? 'text-primary' : ''}`}>
                      {entry.name}
                    </p>
                    {isCurrentUser && (
                      <Badge variant="secondary" className="text-xs">You</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {entry.accuracy}% accuracy
                  </p>
                </div>
                
                <div className="text-right">
                  <p className="font-bold">{entry.completed}</p>
                  <p className="text-xs text-muted-foreground">completed</p>
                </div>
              </div>
            );
          })}
          
          {(!leaderboard || leaderboard.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No rankings yet</p>
              <p className="text-sm">Be the first to complete questions!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
