import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { toast } from 'sonner';

export function useScoreTarget() {
  const { student } = useStudentAuth();
  const queryClient = useQueryClient();

  // Fetch current target score
  const { data: targetScore, isLoading } = useQuery({
    queryKey: ['target-score', student?.id],
    queryFn: async () => {
      if (!student?.id) return null;

      const { data, error } = await supabase
        .from('student_accounts')
        .select('target_score')
        .eq('id', student.id)
        .single();

      if (error) throw error;
      return data?.target_score || null;
    },
    enabled: !!student?.id,
    staleTime: 60000
  });

  // Fetch current estimated score (latest Bluebook test)
  const { data: currentScore } = useQuery({
    queryKey: ['current-score', student?.id],
    queryFn: async () => {
      if (!student?.id) return null;

      const { data, error } = await supabase
        .from('bluebook_attempts')
        .select('total_score')
        .eq('student_account_id', student.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data?.total_score || null;
    },
    enabled: !!student?.id,
    staleTime: 60000
  });

  // Fetch weakest topic for daily focus recommendation
  const { data: weakestTopic } = useQuery({
    queryKey: ['weakest-topic', student?.id],
    queryFn: async () => {
      if (!student?.id) return null;

      // Get all attempts with question category data
      const { data: attempts, error } = await supabase
        .from('student_attempts')
        .select(`
          is_correct,
          question_id,
          questions!inner (
            subject,
            subtopic,
            question_categories (name)
          )
        `)
        .eq('student_account_id', student.id)
        .eq('attempt_number', 1);

      if (error) throw error;
      if (!attempts || attempts.length === 0) return null;

      // Group by subtopic and calculate accuracy
      const topicStats: Record<string, { 
        correct: number; 
        total: number; 
        subject: string;
        name: string;
      }> = {};

      attempts.forEach((attempt: any) => {
        const subtopic = attempt.questions?.subtopic || 'General';
        const subject = attempt.questions?.subject || 'math';
        
        if (!topicStats[subtopic]) {
          topicStats[subtopic] = { correct: 0, total: 0, subject, name: subtopic };
        }
        topicStats[subtopic].total++;
        if (attempt.is_correct) topicStats[subtopic].correct++;
      });

      // Find topic with lowest accuracy (min 3 attempts)
      let weakest: { name: string; category: 'math' | 'english'; accuracy: number } | null = null;
      let lowestAccuracy = 1;

      Object.entries(topicStats).forEach(([topic, stats]) => {
        if (stats.total >= 3) {
          const accuracy = stats.correct / stats.total;
          if (accuracy < lowestAccuracy) {
            lowestAccuracy = accuracy;
            weakest = {
              name: stats.name,
              category: stats.subject.toLowerCase().includes('english') ? 'english' : 'math',
              accuracy
            };
          }
        }
      });

      if (!weakest) return null;

      // Estimate potential gain: ~20-50 points per topic improvement
      const potentialGain = Math.round((1 - lowestAccuracy) * 40);

      return {
        name: weakest.name,
        category: weakest.category,
        potentialGain
      };
    },
    enabled: !!student?.id,
    staleTime: 300000 // 5 minutes
  });

  // Update target score mutation
  const updateTargetScore = useMutation({
    mutationFn: async (newScore: number | null) => {
      if (!student?.id) throw new Error('No student');

      const { error } = await supabase
        .from('student_accounts')
        .update({ target_score: newScore })
        .eq('id', student.id);

      if (error) throw error;
      return newScore;
    },
    onSuccess: (newScore) => {
      queryClient.invalidateQueries({ queryKey: ['target-score', student?.id] });
      toast.success(newScore ? `Target score set to ${newScore}!` : 'Target score cleared');
    },
    onError: (error) => {
      console.error('Error updating target score:', error);
      toast.error('Failed to update target score');
    }
  });

  return {
    targetScore,
    currentScore,
    weakestTopic,
    isLoading,
    updateTargetScore: async (score: number | null) => {
      await updateTargetScore.mutateAsync(score);
    }
  };
}
