// Badge definitions for the SAT prep platform gamification system

export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type BadgeCategory = 'speed' | 'discipline' | 'championship' | 'legendary';
export type TierType = 'unranked' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'ruby';

export interface BadgeRequirement {
  type: string;
  target: number;
  label: string;
}

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  rarity: BadgeRarity;
  pointValue: number;
  iconName: string;
  category: BadgeCategory;
  requirements: BadgeRequirement[];
}

export const RARITY_COLORS: Record<BadgeRarity, { border: string; glow: string; text: string; primary: string; secondary: string }> = {
  common: {
    border: 'border-gray-400',
    glow: '#9CA3AF',
    text: 'text-gray-400',
    primary: '#6B7280',
    secondary: '#9CA3AF'
  },
  uncommon: {
    border: 'border-green-500',
    glow: '#22C55E',
    text: 'text-green-500',
    primary: '#16A34A',
    secondary: '#22C55E'
  },
  rare: {
    border: 'border-blue-500',
    glow: '#3B82F6',
    text: 'text-blue-500',
    primary: '#2563EB',
    secondary: '#3B82F6'
  },
  epic: {
    border: 'border-purple-500',
    glow: '#A855F7',
    text: 'text-purple-500',
    primary: '#9333EA',
    secondary: '#A855F7'
  },
  legendary: {
    border: 'border-amber-500',
    glow: '#F59E0B',
    text: 'text-amber-500',
    primary: '#D97706',
    secondary: '#F59E0B'
  }
};

export const TIER_COLORS: Record<TierType, string> = {
  unranked: '#6B7280', // Gray
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
  diamond: '#B9F2FF',
  ruby: '#E0115F'
};

// HSL values for tier themes (used in CSS variables)
export const TIER_THEME_HSL: Record<TierType, { 
  primary: string; 
  primaryLight: string;
  background: string;
  card: string;
  muted: string;
  border: string;
}> = {
  unranked: {
    primary: '220 13% 46%',
    primaryLight: '220 13% 56%',
    background: '220 15% 97%',
    card: '220 12% 99%',
    muted: '220 12% 94%',
    border: '220 13% 88%'
  },
  bronze: {
    primary: '30 56% 50%',
    primaryLight: '30 56% 60%',
    background: '30 25% 97%',
    card: '30 20% 99%',
    muted: '30 20% 94%',
    border: '30 25% 88%'
  },
  silver: {
    primary: '0 0% 65%',
    primaryLight: '0 0% 75%',
    background: '210 10% 97%',
    card: '210 8% 99%',
    muted: '210 8% 94%',
    border: '210 10% 88%'
  },
  gold: {
    primary: '51 100% 50%',
    primaryLight: '51 100% 60%',
    background: '48 30% 97%',
    card: '48 25% 99%',
    muted: '48 25% 94%',
    border: '48 30% 88%'
  },
  platinum: {
    primary: '30 5% 75%',
    primaryLight: '30 5% 85%',
    background: '30 8% 97%',
    card: '30 6% 99%',
    muted: '30 6% 94%',
    border: '30 8% 88%'
  },
  diamond: {
    primary: '187 100% 85%',
    primaryLight: '187 100% 90%',
    background: '190 30% 97%',
    card: '190 25% 99%',
    muted: '190 25% 94%',
    border: '190 30% 88%'
  },
  ruby: {
    primary: '343 90% 47%',
    primaryLight: '343 90% 57%',
    background: '345 25% 97%',
    card: '345 20% 99%',
    muted: '345 20% 94%',
    border: '345 25% 88%'
  }
};

// Tier display names
export const TIER_DISPLAY_NAMES: Record<TierType, string> = {
  unranked: 'Unranked',
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond',
  ruby: 'Ruby'
};

// Tier order for progression
export const TIER_ORDER: TierType[] = ['unranked', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'ruby'];

export const TIER_PROMOTION_CUTOFFS: Record<TierType, number> = {
  unranked: 50,  // Top 50 advance to Bronze
  bronze: 30,    // Top 30 advance to Silver
  silver: 20,    // Top 20 advance to Gold
  gold: 15,      // Top 15 advance to Platinum
  platinum: 10,  // Top 10 advance to Diamond
  diamond: 5,    // Top 5 advance to Ruby
  ruby: 1        // Top 1 retains Ruby rank
};

export const badgeDefinitions: BadgeDefinition[] = [
  // Speed Badges - Common (300 pts)
  {
    id: 'lightning-strike',
    name: 'Lightning Strike',
    description: 'Complete 10 questions under 5 minutes with 80%+ accuracy',
    rarity: 'common',
    pointValue: 300,
    iconName: 'Zap',
    category: 'speed',
    requirements: [
      { type: 'questions_under_time', target: 10, label: '10 questions under 5 min' },
      { type: 'accuracy_threshold', target: 80, label: '80%+ accuracy' }
    ]
  },
  {
    id: 'speedster',
    name: 'Speedster',
    description: 'Complete 20 questions under 5 minutes with 90%+ accuracy',
    rarity: 'common',
    pointValue: 300,
    iconName: 'Timer',
    category: 'speed',
    requirements: [
      { type: 'questions_under_time', target: 20, label: '20 questions under 5 min' },
      { type: 'accuracy_threshold', target: 90, label: '90%+ accuracy' }
    ]
  },
  {
    id: 'hot-streak',
    name: 'Hot Streak',
    description: 'Complete 5 speed sessions over 5 consecutive days',
    rarity: 'common',
    pointValue: 300,
    iconName: 'Flame',
    category: 'speed',
    requirements: [
      { type: 'consecutive_days_speed', target: 5, label: '5 consecutive days of speed sessions' }
    ]
  },
  {
    id: 'chain-lightning',
    name: 'Chain Lightning',
    description: '3 consecutive perfect speed drills (100% accuracy)',
    rarity: 'common',
    pointValue: 300,
    iconName: 'Link',
    category: 'speed',
    requirements: [
      { type: 'consecutive_perfect_drills', target: 3, label: '3 perfect speed drills in a row' }
    ]
  },
  
  // Speed Badges - Uncommon (500 pts)
  {
    id: 'peak-of-speed',
    name: 'Peak of Speed',
    description: 'Complete 10 speed sessions with 95%+ accuracy',
    rarity: 'uncommon',
    pointValue: 500,
    iconName: 'Mountain',
    category: 'speed',
    requirements: [
      { type: 'speed_sessions_high_accuracy', target: 10, label: '10 speed sessions with 95%+ accuracy' }
    ]
  },
  
  // Discipline Badges - Rare (1000 pts)
  {
    id: 'blitz',
    name: 'Blitz',
    description: 'Complete Module 1 in under 15 minutes',
    rarity: 'rare',
    pointValue: 1000,
    iconName: 'Clock',
    category: 'discipline',
    requirements: [
      { type: 'module_under_time', target: 15, label: 'Complete Module 1 under 15 min' }
    ]
  },
  {
    id: 'discipline-king',
    name: 'Discipline King',
    description: '20+ consecutive days of speed sessions AND practice',
    rarity: 'rare',
    pointValue: 1000,
    iconName: 'Crown',
    category: 'discipline',
    requirements: [
      { type: 'consecutive_days_both', target: 20, label: '20+ days of speed + practice' }
    ]
  },
  {
    id: 'sniper',
    name: 'Sniper',
    description: '10 consecutive correct answers in under 8 minutes total',
    rarity: 'rare',
    pointValue: 1000,
    iconName: 'Target',
    category: 'discipline',
    requirements: [
      { type: 'consecutive_correct_under_time', target: 10, label: '10 correct in under 8 min' }
    ]
  },
  {
    id: 'rush-delivery',
    name: 'Rush Delivery',
    description: '20 consecutive correct answers in under 12 minutes total',
    rarity: 'rare',
    pointValue: 1000,
    iconName: 'Package',
    category: 'discipline',
    requirements: [
      { type: 'consecutive_correct_under_time', target: 20, label: '20 correct in under 12 min' }
    ]
  },
  
  // Sprint Championship - Rare (1000 pts)
  {
    id: 'bronze-novice',
    name: 'Bronze Novice',
    description: 'Finish Top 1 in Bronze Sprint',
    rarity: 'rare',
    pointValue: 1000,
    iconName: 'Medal',
    category: 'championship',
    requirements: [
      { type: 'sprint_top_1', target: 1, label: 'Top 1 in Bronze Sprint' }
    ]
  },
  {
    id: 'silver-challenger',
    name: 'Silver Challenger',
    description: 'Finish Top 1 in Silver Sprint',
    rarity: 'rare',
    pointValue: 1000,
    iconName: 'Medal',
    category: 'championship',
    requirements: [
      { type: 'sprint_top_1', target: 1, label: 'Top 1 in Silver Sprint' }
    ]
  },
  {
    id: 'gold-scholar',
    name: 'Gold Scholar',
    description: 'Finish Top 1 in Gold Sprint',
    rarity: 'rare',
    pointValue: 1000,
    iconName: 'Medal',
    category: 'championship',
    requirements: [
      { type: 'sprint_top_1', target: 1, label: 'Top 1 in Gold Sprint' }
    ]
  },
  
  // Elite Badges - Epic (2000 pts)
  {
    id: 'time-lord',
    name: 'Time Lord',
    description: '50 questions in under 17 minutes with 90%+ accuracy',
    rarity: 'epic',
    pointValue: 2000,
    iconName: 'Hourglass',
    category: 'discipline',
    requirements: [
      { type: 'questions_under_time_high_accuracy', target: 50, label: '50 questions under 17 min, 90%+ accuracy' }
    ]
  },
  {
    id: 'flawless-execution',
    name: 'Flawless Execution',
    description: 'Zero mistakes in practice test, completed in under 30 minutes total',
    rarity: 'epic',
    pointValue: 2000,
    iconName: 'Diamond',
    category: 'discipline',
    requirements: [
      { type: 'perfect_test_under_time', target: 30, label: 'Perfect test under 30 min' }
    ]
  },
  {
    id: 'god-amongst-human',
    name: 'God Amongst Human',
    description: 'Hold Top 1 position all-time leaderboard for 3 consecutive weeks',
    rarity: 'epic',
    pointValue: 2000,
    iconName: 'Star',
    category: 'championship',
    requirements: [
      { type: 'top_1_weeks', target: 3, label: 'Top 1 for 3 consecutive weeks' }
    ]
  },
  {
    id: 'problem-slayer',
    name: 'Problem Slayer',
    description: '300 problems solved correctly on first try',
    rarity: 'epic',
    pointValue: 2000,
    iconName: 'Sword',
    category: 'discipline',
    requirements: [
      { type: 'first_try_correct', target: 300, label: '300 first-try correct' }
    ]
  },
  
  // Sprint Championship - Epic (2000 pts)
  {
    id: 'platinum-legend',
    name: 'Platinum Legend',
    description: 'Finish Top 1 in Platinum Sprint',
    rarity: 'epic',
    pointValue: 2000,
    iconName: 'Award',
    category: 'championship',
    requirements: [
      { type: 'sprint_top_1', target: 1, label: 'Top 1 in Platinum Sprint' }
    ]
  },
  {
    id: 'diamond-apex',
    name: 'Diamond Apex',
    description: 'Finish Top 1 in Diamond Sprint',
    rarity: 'epic',
    pointValue: 2000,
    iconName: 'Gem',
    category: 'championship',
    requirements: [
      { type: 'sprint_top_1', target: 1, label: 'Top 1 in Diamond Sprint' }
    ]
  },
  
  // Legendary Badges (30000 pts)
  {
    id: 'the-penguin',
    name: 'The Penguin',
    description: 'Solve all 68 questions with variants + Solve all 1074 CB math problems + Practice test average 750+ + Vocabulary 100% completion',
    rarity: 'legendary',
    pointValue: 30000,
    iconName: 'Bird',
    category: 'legendary',
    requirements: [
      { type: 'all_68_questions', target: 68, label: 'All 68 questions with variants' },
      { type: 'all_cb_problems', target: 1074, label: 'All 1074 CB math problems' },
      { type: 'practice_test_avg', target: 750, label: 'Practice test average 750+' },
      { type: 'vocabulary_completion', target: 100, label: 'Vocabulary 100% completion' }
    ]
  },
  {
    id: 'the-glacier-penguin',
    name: 'The Glacier Penguin',
    description: 'Complete all requirements for "The Penguin" badge + Complete all English question bank',
    rarity: 'legendary',
    pointValue: 30000,
    iconName: 'Snowflake',
    category: 'legendary',
    requirements: [
      { type: 'penguin_badge', target: 1, label: 'Complete The Penguin badge' },
      { type: 'all_english_bank', target: 1, label: 'Complete all English question bank' }
    ]
  },
  {
    id: 'ruby-legend',
    name: 'Ruby Legend',
    description: 'Hold Ruby rank for 4 consecutive weeks',
    rarity: 'legendary',
    pointValue: 30000,
    iconName: 'Sparkles',
    category: 'legendary',
    requirements: [
      { type: 'ruby_weeks', target: 4, label: 'Ruby rank for 4 consecutive weeks' }
    ]
  }
];

// Helper function to get badge by ID
export const getBadgeById = (id: string): BadgeDefinition | undefined => {
  return badgeDefinitions.find(badge => badge.id === id);
};

// Helper function to get badges by category
export const getBadgesByCategory = (category: BadgeCategory): BadgeDefinition[] => {
  return badgeDefinitions.filter(badge => badge.category === category);
};

// Helper function to get badges by rarity
export const getBadgesByRarity = (rarity: BadgeRarity): BadgeDefinition[] => {
  return badgeDefinitions.filter(badge => badge.rarity === rarity);
};

// Point values by rarity
export const RARITY_POINTS: Record<BadgeRarity, number> = {
  common: 300,
  uncommon: 500,
  rare: 1000,
  epic: 2000,
  legendary: 30000
};

// Level calculation formula: Level = floor(log2((totalPoints - 200) / 50) + 1)
export const calculateLevel = (totalPoints: number): number => {
  if (totalPoints < 250) return 1;
  return Math.floor(Math.log2((totalPoints - 200) / 50) + 1);
};

// Points needed for a specific level: Points for Level N = 200 + 50 * 2^(N-1)
export const getPointsForLevel = (level: number): number => {
  if (level <= 1) return 0;
  return 200 + 50 * Math.pow(2, level - 1);
};

// Progress to next level (0-100)
export const getLevelProgress = (totalPoints: number): number => {
  const currentLevel = calculateLevel(totalPoints);
  const currentLevelPoints = getPointsForLevel(currentLevel);
  const nextLevelPoints = getPointsForLevel(currentLevel + 1);
  
  if (nextLevelPoints === currentLevelPoints) return 100;
  
  return Math.min(100, Math.floor(
    ((totalPoints - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100
  ));
};
