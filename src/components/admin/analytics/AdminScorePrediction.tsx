import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScorePredictionCard } from "@/components/teacher/ScorePredictionCard";

interface AdminScorePredictionProps {
  studentAccountId: string;
}

export function AdminScorePrediction({ studentAccountId }: AdminScorePredictionProps) {
  const { data: linkedStudentId } = useQuery({
    queryKey: ['linked-student-id', studentAccountId],
    queryFn: async () => {
      const { data } = await supabase
        .from('student_accounts')
        .select('linked_student_id')
        .eq('id', studentAccountId)
        .maybeSingle();
      return data?.linked_student_id || null;
    },
    staleTime: 10 * 60 * 1000,
  });

  if (!linkedStudentId) return null;

  return <ScorePredictionCard studentId={linkedStudentId} />;
}
