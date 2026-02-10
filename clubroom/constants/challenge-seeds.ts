import type { Challenge, ChallengeSubmission } from '@/services/challenge-service';

const now = Date.now();
const daysFromNow = (days: number) => new Date(now + days * 24 * 60 * 60 * 1000).toISOString();
const daysAgo = (days: number) => new Date(now - days * 24 * 60 * 60 * 1000).toISOString();

export const CHALLENGE_SEEDS: Challenge[] = [
  {
    id: 'seed_challenge_1',
    squadId: 'squad_1',
    createdBy: 'coach1',
    createdByName: 'Coach Sarah',
    title: 'First-Touch Wall Pass Challenge',
    description: 'Complete 20 clean one-touch wall passes with each foot.',
    demoVideoUrl: 'https://example.com/challenges/first-touch-demo.mp4',
    deadline: daysFromNow(4),
    totalParticipants: 3,
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  },
  {
    id: 'seed_challenge_2',
    squadId: 'squad_1',
    createdBy: 'coach1',
    createdByName: 'Coach Sarah',
    title: 'Weak-Foot Finishing Set',
    description: 'Score 10 controlled finishes on your weak foot from the edge of the box.',
    demoVideoUrl: 'https://example.com/challenges/weak-foot-finishing.mp4',
    deadline: daysFromNow(1),
    totalParticipants: 2,
    createdAt: daysAgo(3),
    updatedAt: daysAgo(2),
  },
  {
    id: 'seed_challenge_3',
    squadId: 'squad_1',
    createdBy: 'coach1',
    createdByName: 'Coach Sarah',
    title: 'Agility Cone Weave',
    description: 'Complete 6 cone-weave reps under 18 seconds each.',
    demoVideoUrl: 'https://example.com/challenges/agility-cones.mp4',
    deadline: daysAgo(2),
    totalParticipants: 4,
    createdAt: daysAgo(8),
    updatedAt: daysAgo(3),
  },
];

export const CHALLENGE_SUBMISSION_SEEDS: ChallengeSubmission[] = [
  {
    id: 'seed_submission_1',
    challengeId: 'seed_challenge_1',
    athleteId: 'user1',
    athleteName: 'Tom Henderson',
    videoUrl: 'https://example.com/submissions/tom-first-touch.mp4',
    submittedAt: daysAgo(1),
    awardedBadge: true,
  },
  {
    id: 'seed_submission_2',
    challengeId: 'seed_challenge_2',
    athleteId: 'user2',
    athleteName: 'Emma Henderson',
    videoUrl: 'https://example.com/submissions/emma-weak-foot.mp4',
    submittedAt: daysAgo(1),
    awardedBadge: false,
  },
  {
    id: 'seed_submission_3',
    challengeId: 'seed_challenge_3',
    athleteId: 'user3',
    athleteName: 'James Wilson',
    videoUrl: 'https://example.com/submissions/james-agility.mp4',
    submittedAt: daysAgo(3),
    awardedBadge: false,
  },
];
