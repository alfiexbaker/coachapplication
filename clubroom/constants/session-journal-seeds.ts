import type { JournalEntry } from '@/components/development/session-journal';

const now = Date.now();
const daysAgo = (days: number) => new Date(now - days * 24 * 60 * 60 * 1000).toISOString();

export const SESSION_JOURNAL_SEEDS: JournalEntry[] = [
  {
    id: 'seed_journal_user2_1',
    sessionId: 'seed_session_user2_1',
    athleteId: 'user2',
    personalNotes: 'Felt sharp in possession today. Need to scan more before receiving.',
    coachNotes: 'Great intent in tight spaces. Focus on first touch into space next session.',
    mood: 4,
    energyLevel: 4,
    createdAt: daysAgo(2),
  },
  {
    id: 'seed_journal_user2_2',
    sessionId: 'seed_session_user2_2',
    athleteId: 'user2',
    personalNotes: 'Passing rhythm improved. Will keep working on weak-foot reps.',
    coachNotes: 'Progressing well. Add 10 minutes of weak-foot passing daily.',
    mood: 5,
    energyLevel: 3,
    createdAt: daysAgo(7),
  },
  {
    id: 'seed_journal_user1_1',
    sessionId: 'seed_session_user1_1',
    athleteId: 'user1',
    personalNotes: 'Good finishing drills, but decision speed can be better under pressure.',
    coachNotes: 'Finishing technique is improving. Work on faster shot selection.',
    mood: 4,
    energyLevel: 4,
    createdAt: daysAgo(3),
  },
  {
    id: 'seed_journal_user3_1',
    sessionId: 'seed_session_user3_1',
    athleteId: 'user3',
    personalNotes: 'Handled high balls better today. Positioning still needs consistency.',
    coachNotes: 'Confident handling. Keep reinforcing set position before shots.',
    mood: 4,
    energyLevel: 5,
    createdAt: daysAgo(5),
  },
];
