import { useMemo } from 'react';
import { differenceInDays } from 'date-fns';

export interface RiskFactors {
  loginRecency: number;      // 0-1 (days since last login / 30)
  accuracyDecline: number;   // 0-1 (negative trend over 2 weeks)
  practiceDeficit: number;   // 0-1 (questions/week vs class avg)
  topicAvoidance: number;    // 0-1 (weak topics not practiced)
  sprintDisengagement: number; // 0-1 (points below tier average)
}

export interface RiskScore {
  score: number;           // 0-100
  level: 'low' | 'medium' | 'high';
  factors: RiskFactors;
  summary: string[];
}

const WEIGHTS = {
  loginRecency: 0.30,
  accuracyDecline: 0.25,
  practiceDeficit: 0.20,
  topicAvoidance: 0.15,
  sprintDisengagement: 0.10,
};

export function calculateRiskScore(factors: RiskFactors): RiskScore {
  const score = Math.round(
    (factors.loginRecency * WEIGHTS.loginRecency +
     factors.accuracyDecline * WEIGHTS.accuracyDecline +
     factors.practiceDeficit * WEIGHTS.practiceDeficit +
     factors.topicAvoidance * WEIGHTS.topicAvoidance +
     factors.sprintDisengagement * WEIGHTS.sprintDisengagement) * 100
  );

  const clampedScore = Math.min(Math.max(score, 0), 100);

  const level: RiskScore['level'] = 
    clampedScore >= 70 ? 'high' : 
    clampedScore >= 40 ? 'medium' : 
    'low';

  const summary: string[] = [];
  
  if (factors.loginRecency > 0.3) {
    const days = Math.round(factors.loginRecency * 30);
    summary.push(`Inactive for ${days} days`);
  }
  
  if (factors.accuracyDecline > 0.3) {
    summary.push('Declining accuracy trend');
  }
  
  if (factors.practiceDeficit > 0.3) {
    summary.push('Low practice frequency');
  }
  
  if (factors.topicAvoidance > 0.3) {
    summary.push('Avoiding weak topics');
  }
  
  if (factors.sprintDisengagement > 0.3) {
    summary.push('Low sprint engagement');
  }

  if (summary.length === 0) {
    summary.push('On track');
  }

  return {
    score: clampedScore,
    level,
    factors,
    summary,
  };
}

export function useRiskCalculation(studentData: {
  lastLogin: Date | null;
  recentAccuracy: number[];      // Last 14 days accuracy
  questionsThisWeek: number;
  classAvgQuestions: number;
  weakTopicsAttempted: number;
  totalWeakTopics: number;
  sprintPoints: number;
  tierAvgPoints: number;
}): RiskScore {
  return useMemo(() => {
    const {
      lastLogin,
      recentAccuracy,
      questionsThisWeek,
      classAvgQuestions,
      weakTopicsAttempted,
      totalWeakTopics,
      sprintPoints,
      tierAvgPoints,
    } = studentData;

    // Login recency (capped at 30 days)
    const daysSinceLogin = lastLogin 
      ? differenceInDays(new Date(), lastLogin)
      : 30;
    const loginRecency = Math.min(daysSinceLogin / 30, 1);

    // Accuracy decline (compare first half to second half of last 2 weeks)
    let accuracyDecline = 0;
    if (recentAccuracy.length >= 4) {
      const mid = Math.floor(recentAccuracy.length / 2);
      const firstHalf = recentAccuracy.slice(0, mid);
      const secondHalf = recentAccuracy.slice(mid);
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      if (secondAvg < firstAvg) {
        accuracyDecline = (firstAvg - secondAvg) / 100; // Normalize to 0-1
      }
    }

    // Practice deficit
    const practiceDeficit = classAvgQuestions > 0
      ? Math.max(0, 1 - (questionsThisWeek / classAvgQuestions))
      : 0;

    // Topic avoidance
    const topicAvoidance = totalWeakTopics > 0
      ? 1 - (weakTopicsAttempted / totalWeakTopics)
      : 0;

    // Sprint disengagement
    const sprintDisengagement = tierAvgPoints > 0
      ? Math.max(0, 1 - (sprintPoints / tierAvgPoints))
      : 0;

    return calculateRiskScore({
      loginRecency,
      accuracyDecline,
      practiceDeficit,
      topicAvoidance,
      sprintDisengagement,
    });
  }, [studentData]);
}

// Helper to get risk level color
export function getRiskLevelColor(level: RiskScore['level']) {
  switch (level) {
    case 'high':
      return {
        bg: 'bg-destructive/10',
        text: 'text-destructive',
        border: 'border-destructive/20',
      };
    case 'medium':
      return {
        bg: 'bg-yellow-500/10',
        text: 'text-yellow-500',
        border: 'border-yellow-500/20',
      };
    case 'low':
      return {
        bg: 'bg-green-500/10',
        text: 'text-green-500',
        border: 'border-green-500/20',
      };
  }
}
