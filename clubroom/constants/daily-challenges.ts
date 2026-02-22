import type { FourCornerKey } from '@/types/progress-types';

export interface DailyChallengeDefinition {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  category: FourCornerKey;
  difficulty: 'easy' | 'medium' | 'hard';
}

/**
 * Pool of 30+ micro-challenges for daily rotation.
 * Same challenge for all athletes on any given day (creates social conversation).
 */
export const DAILY_CHALLENGES: DailyChallengeDefinition[] = [
  // Technical
  { id: 'dc-01', title: 'Do 50 kick-ups', description: 'Keep the ball in the air for 50 touches — any combination of feet, knees, or head.', xpReward: 15, category: 'technical', difficulty: 'medium' },
  { id: 'dc-02', title: 'Weak-foot passing', description: 'Practice 20 passes with your weaker foot against a wall or to a friend.', xpReward: 20, category: 'technical', difficulty: 'medium' },
  { id: 'dc-03', title: 'Dribble figure 8s', description: 'Set up two cones and dribble figure-8 patterns for 5 minutes.', xpReward: 15, category: 'technical', difficulty: 'easy' },
  { id: 'dc-04', title: 'First touch drill', description: 'Throw the ball up and control it dead with one touch. 15 attempts.', xpReward: 20, category: 'technical', difficulty: 'hard' },
  { id: 'dc-05', title: 'Watch a 2-min dribbling video', description: 'Find a short dribbling tutorial and try 3 new moves afterwards.', xpReward: 10, category: 'technical', difficulty: 'easy' },
  { id: 'dc-06', title: 'Shooting practice', description: 'Take 10 shots on target from outside the box.', xpReward: 15, category: 'technical', difficulty: 'medium' },
  { id: 'dc-07', title: 'Passing accuracy', description: 'Set up a target and hit it 8 out of 10 times from 15 metres.', xpReward: 20, category: 'technical', difficulty: 'hard' },
  { id: 'dc-08', title: 'Ball mastery', description: 'Do 5 different ball mastery moves in a row without stopping.', xpReward: 15, category: 'technical', difficulty: 'medium' },

  // Physical
  { id: 'dc-09', title: 'Sprint intervals', description: '5 x 30m sprints with 30 seconds rest between each.', xpReward: 20, category: 'physical', difficulty: 'hard' },
  { id: 'dc-10', title: 'Plank challenge', description: 'Hold a plank for 60 seconds. Rest 30 seconds. Repeat 3 times.', xpReward: 15, category: 'physical', difficulty: 'medium' },
  { id: 'dc-11', title: 'Ladder drills', description: 'Run through agility patterns (high knees, in-out, lateral) for 5 minutes.', xpReward: 15, category: 'physical', difficulty: 'medium' },
  { id: 'dc-12', title: 'Stretch session', description: 'Follow a 10-minute stretching routine. Focus on hamstrings and hip flexors.', xpReward: 10, category: 'physical', difficulty: 'easy' },
  { id: 'dc-13', title: 'Cone shuttle runs', description: '10 shuttle runs between two cones 10m apart.', xpReward: 15, category: 'physical', difficulty: 'medium' },
  { id: 'dc-14', title: 'Balance challenge', description: 'Stand on one leg for 30 seconds with eyes closed. Alternate legs.', xpReward: 10, category: 'physical', difficulty: 'easy' },
  { id: 'dc-15', title: 'Wall sits', description: 'Hold a wall sit for 45 seconds. Rest 20 seconds. Repeat 4 times.', xpReward: 15, category: 'physical', difficulty: 'medium' },

  // Psychological
  { id: 'dc-16', title: 'Visualise your best game', description: 'Close your eyes for 3 minutes and mentally replay your best performance.', xpReward: 10, category: 'psychological', difficulty: 'easy' },
  { id: 'dc-17', title: 'Set a match-day routine', description: 'Write down your ideal pre-match routine in 5 steps.', xpReward: 15, category: 'psychological', difficulty: 'easy' },
  { id: 'dc-18', title: 'Positive self-talk drill', description: 'During practice, replace every negative thought with a positive one. Track how many times.', xpReward: 20, category: 'psychological', difficulty: 'hard' },
  { id: 'dc-19', title: 'Watch match highlights', description: 'Watch 5 minutes of a top player in your position. Note 2 things to try.', xpReward: 10, category: 'psychological', difficulty: 'easy' },
  { id: 'dc-20', title: 'Goal reflection', description: 'Write down your top 3 football goals for this month.', xpReward: 15, category: 'psychological', difficulty: 'medium' },
  { id: 'dc-21', title: 'Focus drill', description: 'Juggle the ball while counting backwards from 50. How far can you get?', xpReward: 20, category: 'psychological', difficulty: 'hard' },
  { id: 'dc-22', title: 'Breathing exercise', description: 'Do 5 rounds of box breathing (4s in, 4s hold, 4s out, 4s hold).', xpReward: 10, category: 'psychological', difficulty: 'easy' },

  // Social
  { id: 'dc-23', title: 'Play with a friend', description: 'Spend 15 minutes passing and playing with someone.', xpReward: 15, category: 'social', difficulty: 'easy' },
  { id: 'dc-24', title: 'Teach a younger player', description: 'Show a younger player one skill you learned this week.', xpReward: 25, category: 'social', difficulty: 'medium' },
  { id: 'dc-25', title: 'Encourage a teammate', description: 'Send a message or say something encouraging to a teammate today.', xpReward: 10, category: 'social', difficulty: 'easy' },
  { id: 'dc-26', title: 'Watch football together', description: 'Watch a match with family or friends and discuss what you see.', xpReward: 10, category: 'social', difficulty: 'easy' },
  { id: 'dc-27', title: '1v1 challenge', description: 'Challenge a friend to a 1v1 — best of 5 goals wins.', xpReward: 20, category: 'social', difficulty: 'medium' },
  { id: 'dc-28', title: 'Team quiz', description: 'Ask your squad 3 football trivia questions at next training.', xpReward: 15, category: 'social', difficulty: 'medium' },
  { id: 'dc-29', title: 'Celebrate someone', description: 'Publicly celebrate a teammate\'s achievement at training.', xpReward: 15, category: 'social', difficulty: 'easy' },
  { id: 'dc-30', title: 'Small-sided game', description: 'Organise a 3v3 or 4v4 game with friends.', xpReward: 25, category: 'social', difficulty: 'hard' },
];

/**
 * Deterministic daily rotation from date seed.
 * Same challenge for all athletes on the same day.
 */
export function getDailyChallengeForDate(date: Date = new Date()): DailyChallengeDefinition {
  const daysSinceEpoch = Math.floor(date.getTime() / (24 * 60 * 60 * 1000));
  const index = daysSinceEpoch % DAILY_CHALLENGES.length;
  return DAILY_CHALLENGES[index];
}
