import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { useMemo, useState } from 'react';
import { 
  selectAdaptiveQuestions, 
  calculateTopicPerformance,
  getWeakCategories,
  calculateOverallAccuracy
} from '@/lib/adaptiveSelection';

interface AdaptiveQuestion {
  id: string;
  question_id: string;
  category_id: string | null;
  subtopic: string | null;
  difficulty_level: string | null;
  reason: string;
  priority: number;
}

export function useAdaptivePractice(subject: 'math' | 'english' = 'math', questionSet: '68' | 'CB' | '150' = '68') {
  const { student } = useStudentAuth();
  const queryClient = useQueryClient();
  const [sessionQuestions, setSessionQuestions] = useState<AdaptiveQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch all questions for the subject/set
  const { data: questions, isLoading: questionsLoading } = useQuery({
    queryKey: ['adaptive-questions', subject, questionSet],
    queryFn: async () => {
      let query = supabase
        .from('questions')
        .select('id, question_id, category_id, subtopic, difficulty_level')
        .eq('is_active', true)
        .eq('subject', subject);
      
      if (subject === 'math') {
        if (questionSet === '68') {
          query = query.eq('question_set', '68');
        } else if (questionSet === '150') {
          query = query.eq('question_set', 'SATMathTraining800');
        } else {
          query = query.eq('question_set', 'CollegeBoard').eq('is_original', true);
        }
      } else {
        query = query.eq('is_original', true);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!student,
  });

  // Fetch student's attempt history
  const { data: attempts } = useQuery({
    queryKey: ['adaptive-attempts', student?.id, subject],
    queryFn: async () => {
      if (!student) return [];
      
      const questionIds = questions?.map(q => q.id) || [];
      if (questionIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('student_attempts')
        .select('question_id, is_correct, attempt_number, time_spent_seconds')
        .eq('student_account_id', student.id)
        .in('question_id', questionIds)
        .order('attempted_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!student && !!questions?.length,
  });

  // Fetch review queue
  const { data: reviewQueue } = useQuery({
    queryKey: ['adaptive-review-queue', student?.id],
    queryFn: async () => {
      if (!student) return [];
      
      const { data, error } = await supabase
        .from('student_review_queue')
        .select('question_id')
        .eq('student_account_id', student.id)
        .lte('next_review_at', new Date().toISOString());
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!student,
  });

  // Fetch recently answered questions (last 24h)
  const { data: recentlyAnswered } = useQuery({
    queryKey: ['recently-answered', student?.id],
    queryFn: async () => {
      if (!student) return [];
      
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);
      
      const { data, error } = await supabase
        .from('student_attempts')
        .select('question_id')
        .eq('student_account_id', student.id)
        .gte('attempted_at', yesterday.toISOString());
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!student,
  });

  // Calculate topic performance
  const topicPerformance = useMemo(() => {
    if (!questions || !attempts) return new Map();
    return calculateTopicPerformance(attempts, questions);
  }, [questions, attempts]);

  // Get weak categories
  const weakCategories = useMemo(() => {
    return getWeakCategories(topicPerformance);
  }, [topicPerformance]);

  // Calculate overall accuracy
  const overallAccuracy = useMemo(() => {
    if (!attempts) return 0;
    return calculateOverallAccuracy(attempts);
  }, [attempts]);

  // Generate adaptive session
  const generateSession = (count: number = 10) => {
    if (!questions || !attempts) return;
    
    const reviewQueueIds = new Set(reviewQueue?.map(r => r.question_id) || []);
    const recentlyAnsweredIds = new Set(recentlyAnswered?.map(r => r.question_id) || []);
    
    const selected = selectAdaptiveQuestions(
      questions,
      attempts,
      reviewQueueIds,
      recentlyAnsweredIds,
      count
    );
    
    // Map back to full question data
    const questionMap = new Map(questions.map(q => [q.id, q]));
    const sessionQs: AdaptiveQuestion[] = selected.map(s => {
      const q = questionMap.get(s.questionId)!;
      return {
        ...q,
        reason: s.reason,
        priority: s.priority,
      };
    });
    
    setSessionQuestions(sessionQs);
    setCurrentIndex(0);
  };

  // Get next question in session
  const nextQuestion = () => {
    if (currentIndex < sessionQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      return sessionQuestions[currentIndex + 1];
    }
    return null;
  };

  // Get current question
  const currentQuestion = sessionQuestions[currentIndex] || null;

  // Check if session is complete
  const isSessionComplete = currentIndex >= sessionQuestions.length - 1 && sessionQuestions.length > 0;

  return {
    questions,
    questionsLoading,
    topicPerformance,
    weakCategories,
    overallAccuracy,
    sessionQuestions,
    currentQuestion,
    currentIndex,
    isSessionComplete,
    generateSession,
    nextQuestion,
    setCurrentIndex,
  };
}
