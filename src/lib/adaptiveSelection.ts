/**
 * Adaptive Question Selection Algorithm
 * 
 * Weights question selection toward weak topics while balancing:
 * - Reinforcement (mastered topics)
 * - Challenge (new/difficult topics)
 * - Spaced repetition (review queue)
 */

interface QuestionData {
  id: string;
  category_id: string | null;
  subtopic: string | null;
  difficulty_level: string | null;
}

interface AttemptData {
  question_id: string;
  is_correct: boolean;
  attempt_number: number;
  time_spent_seconds: number | null;
}

interface TopicPerformance {
  categoryId: string;
  subtopic: string | null;
  accuracy: number;
  attemptCount: number;
  avgTimeSeconds: number;
  recentTrend: 'improving' | 'declining' | 'stable';
}

interface SelectionResult {
  questionId: string;
  reason: string;
  priority: number;
}

// Difficulty weights for scoring
const DIFFICULTY_WEIGHTS: Record<string, number> = {
  'Easy': 1,
  'Medium': 2,
  'Hard': 3,
};

/**
 * Calculate performance metrics by topic
 */
export function calculateTopicPerformance(
  attempts: AttemptData[],
  questions: QuestionData[]
): Map<string, TopicPerformance> {
  const questionMap = new Map(questions.map(q => [q.id, q]));
  const topicStats = new Map<string, {
    correct: number;
    total: number;
    times: number[];
    recentAttempts: boolean[];
  }>();

  // Group attempts by topic
  attempts.forEach(attempt => {
    const question = questionMap.get(attempt.question_id);
    if (!question || !question.category_id) return;

    const key = `${question.category_id}|${question.subtopic || 'general'}`;
    
    if (!topicStats.has(key)) {
      topicStats.set(key, { correct: 0, total: 0, times: [], recentAttempts: [] });
    }
    
    const stats = topicStats.get(key)!;
    stats.total++;
    if (attempt.is_correct) stats.correct++;
    if (attempt.time_spent_seconds) stats.times.push(attempt.time_spent_seconds);
    
    // Track last 5 attempts for trend
    if (stats.recentAttempts.length < 5) {
      stats.recentAttempts.push(attempt.is_correct);
    }
  });

  // Calculate performance metrics
  const performance = new Map<string, TopicPerformance>();
  
  topicStats.forEach((stats, key) => {
    const [categoryId, subtopic] = key.split('|');
    const accuracy = stats.total > 0 ? stats.correct / stats.total : 0;
    const avgTime = stats.times.length > 0 
      ? stats.times.reduce((a, b) => a + b, 0) / stats.times.length 
      : 0;
    
    // Calculate trend from recent attempts
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (stats.recentAttempts.length >= 3) {
      const firstHalf = stats.recentAttempts.slice(0, Math.floor(stats.recentAttempts.length / 2));
      const secondHalf = stats.recentAttempts.slice(Math.floor(stats.recentAttempts.length / 2));
      
      const firstAccuracy = firstHalf.filter(Boolean).length / firstHalf.length;
      const secondAccuracy = secondHalf.filter(Boolean).length / secondHalf.length;
      
      if (secondAccuracy > firstAccuracy + 0.1) trend = 'improving';
      else if (secondAccuracy < firstAccuracy - 0.1) trend = 'declining';
    }
    
    performance.set(key, {
      categoryId,
      subtopic: subtopic === 'general' ? null : subtopic,
      accuracy,
      attemptCount: stats.total,
      avgTimeSeconds: avgTime,
      recentTrend: trend,
    });
  });

  return performance;
}

/**
 * Score a question for adaptive selection
 */
function scoreQuestion(
  question: QuestionData,
  topicPerformance: Map<string, TopicPerformance>,
  attemptedQuestionIds: Set<string>,
  reviewQueueIds: Set<string>,
  recentlyAnsweredIds: Set<string>
): { score: number; reason: string } {
  let score = 50; // Base score
  let reasons: string[] = [];

  // Check if in review queue (highest priority)
  if (reviewQueueIds.has(question.id)) {
    score += 40;
    reasons.push('Due for review');
  }

  // Penalize recently answered questions
  if (recentlyAnsweredIds.has(question.id)) {
    score -= 30;
    reasons.push('Recently answered');
  }

  // Get topic performance
  const topicKey = `${question.category_id}|${question.subtopic || 'general'}`;
  const performance = topicPerformance.get(topicKey);

  if (performance) {
    // Weak topics get higher priority
    if (performance.accuracy < 0.5) {
      score += 25;
      reasons.push('Weak topic');
    } else if (performance.accuracy < 0.7) {
      score += 15;
      reasons.push('Needs practice');
    }
    
    // Declining trends need attention
    if (performance.recentTrend === 'declining') {
      score += 20;
      reasons.push('Declining performance');
    }
    
    // Mix in some mastered topics for confidence (10% of the time)
    if (performance.accuracy >= 0.9 && Math.random() < 0.1) {
      score += 10;
      reasons.push('Confidence builder');
    }
  } else {
    // Never attempted this topic - medium priority
    score += 15;
    reasons.push('New topic');
  }

  // Difficulty adjustment
  const difficultyWeight = DIFFICULTY_WEIGHTS[question.difficulty_level || 'Medium'] || 2;
  
  // For struggling students (low overall accuracy), prefer easier questions
  // For advanced students, prefer harder questions
  if (!attemptedQuestionIds.has(question.id)) {
    score += 10;
    reasons.push('Unattempted');
  }

  // Add slight randomness to prevent predictable patterns
  score += Math.random() * 5;

  return {
    score,
    reason: reasons.slice(0, 2).join(', ') || 'Standard practice',
  };
}

/**
 * Select questions for adaptive practice session
 */
export function selectAdaptiveQuestions(
  allQuestions: QuestionData[],
  attempts: AttemptData[],
  reviewQueueIds: Set<string>,
  recentlyAnsweredIds: Set<string>,
  count: number = 10
): SelectionResult[] {
  const topicPerformance = calculateTopicPerformance(attempts, allQuestions);
  const attemptedQuestionIds = new Set(attempts.map(a => a.question_id));

  // Score all questions
  const scoredQuestions = allQuestions.map(question => {
    const { score, reason } = scoreQuestion(
      question,
      topicPerformance,
      attemptedQuestionIds,
      reviewQueueIds,
      recentlyAnsweredIds
    );
    
    return {
      questionId: question.id,
      reason,
      priority: score,
    };
  });

  // Sort by priority and take top N
  scoredQuestions.sort((a, b) => b.priority - a.priority);
  
  return scoredQuestions.slice(0, count);
}

/**
 * Get overall accuracy for a student
 */
export function calculateOverallAccuracy(attempts: AttemptData[]): number {
  if (attempts.length === 0) return 0;
  
  const correctCount = attempts.filter(a => a.is_correct).length;
  return correctCount / attempts.length;
}

/**
 * Get weak categories that need focus
 */
export function getWeakCategories(
  topicPerformance: Map<string, TopicPerformance>,
  threshold: number = 0.6
): TopicPerformance[] {
  const weak: TopicPerformance[] = [];
  
  topicPerformance.forEach(perf => {
    if (perf.accuracy < threshold && perf.attemptCount >= 3) {
      weak.push(perf);
    }
  });
  
  return weak.sort((a, b) => a.accuracy - b.accuracy);
}
