import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { Booking, Session } from '@/constants/app-types';
import type { BadgeAward, Goal, GoalMilestone } from '@/constants/types';
import { apiClient } from '@/services/api-client';
import { badgeService } from '@/services/badge-service';
import { type Result, type ServiceError, ok, err, storageError } from '@/types/result';
import { createLogger } from '@/utils/logger';
import { progressGoalsService } from './progress-goals-service';
import { progressTermlyReportService } from './progress-termly-report-service';
import type { SessionFeedback, SessionNoteRecord } from './progress-feedback-service';
import type { AthleteSkillLevels, SkillLevel } from './progress-skills-service';
import type { SessionMedia, PositionRole } from '@/types/progress-types';
const logger = createLogger('ProgressDemoSeedService');
const DAY_MS = 24 * 60 * 60 * 1000;
type DemoCoach = {
  id: string;
  name: string;
};
type JournalEntrySeed = {
  id: string;
  sessionId: string;
  athleteId: string;
  personalNotes: string;
  coachNotes?: string;
  mood: number;
  energyLevel: number;
  createdAt: string;
};
type HomeworkCompletionRecord = {
  completedAt: string;
  proofUri: string;
  proofType: 'photo' | 'video';
};
type PracticeLogSeed = {
  id: string;
  athleteId: string;
  dateKey: string;
  minutes: number;
  createdAt: string;
  updatedAt?: string;
  note?: string;
};
type SelfAssessmentPromptSeed = {
  id: string;
  athleteId: string;
  athleteName: string;
  coachId: string;
  bookingId: string;
  sessionId: string;
  createdAt: string;
  dueAt: string;
  status: 'pending' | 'completed';
  completedAt?: string;
  notificationSentAt?: string;
};
type SelfAssessmentEntrySeed = {
  id: string;
  athleteId: string;
  coachId: string;
  bookingId: string;
  sessionId: string;
  mood: number;
  energyLevel: number;
  confidence: number;
  notes: string;
  createdAt: string;
  updatedAt?: string;
};
type PositionHistoryEntrySeed = {
  sessionId: string;
  athleteId: string;
  position: PositionRole;
  recordedAt: string;
};
type User1SeedSession = {
  index: number;
  daysAgo: number;
  position: PositionRole;
  coachId: string;
  coachName: string;
  templateName: string;
  sessionTitle: string;
  summary: string;
  privateNotes: string;
  improvements: string;
  homework: string;
  effort: 1 | 2 | 3 | 4 | 5;
  performance: 1 | 2 | 3 | 4 | 5;
  workedOn: string[];
  ratings: Array<{
    skill: string;
    rating: 1 | 2 | 3 | 4 | 5;
    previousRating: 1 | 2 | 3 | 4 | 5;
  }>;
  badgeAwarded?: string;
  badges?: string[];
};
const DEMO_COACHES: DemoCoach[] = [
  {
    id: 'coach1',
    name: 'Jess Okafor',
  },
  {
    id: 'coach2',
    name: 'Reuben Carr',
  },
  {
    id: 'coach3',
    name: 'Aiden Sharma',
  },
];
const SKILL_NAMES = [
  'First Touch',
  'Passing',
  'Decision-Making',
  'Finishing',
  'Positioning',
  'Conditioning',
] as const;
const DEMO_COACH_IDS = new Set(DEMO_COACHES.map((coach) => coach.id));
const USER1_DIAMOND_TEST_FEEDBACK_IDS = [
  'user1_diamond_test_feedback_1',
  'user1_diamond_test_feedback_2',
  'user1_diamond_test_feedback_3',
] as const;
function daysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}
function daysFromNow(days: number): string {
  return new Date(Date.now() + days * DAY_MS).toISOString().slice(0, 10);
}
function hashValue(input: string): number {
  return input.split('').reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);
}
function mergeById<
  T extends {
    id: string;
  },
>(existing: T[], seeded: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of seeded) {
    map.set(item.id, item);
  }
  for (const item of existing) {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values());
}
function pickCoach(index: number): DemoCoach {
  return DEMO_COACHES[index % DEMO_COACHES.length];
}
function buildSeedFeedback(athleteId: string, athleteName: string): SessionFeedback[] {
  const base = hashValue(athleteId);
  const timelines = [2, 5, 8, 12, 16, 21, 28, 36];
  const seededPositions: PositionRole[] = ['MID', 'MID', 'ATT', 'MID', 'DEF', 'MID', 'ATT', 'MID'];
  return timelines.map((days, index) => {
    const coach = pickCoach(index);
    const skillOne = SKILL_NAMES[index % SKILL_NAMES.length];
    const skillTwo = SKILL_NAMES[(index + 2) % SKILL_NAMES.length];
    const ratingOne = 3 + ((base + index) % 3);
    const ratingTwo = 3 + ((base + index + 1) % 3);
    return {
      id: `seed_progress_feedback_${athleteId}_${index + 1}`,
      sessionId: `seed_progress_session_${athleteId}_${index + 1}`,
      bookingId: `seed_progress_booking_${athleteId}_${index + 1}`,
      coachId: coach.id,
      coachName: coach.name,
      athleteId,
      athleteName,
      createdAt: daysAgo(days),
      publicSummary:
        index % 2 === 0
          ? 'Solid intent throughout the block. Keep scanning earlier before first touch.'
          : 'Good execution in high-tempo phases. Decision speed and body shape improved.',
      privateNotes:
        index % 2 === 0
          ? 'Maintain pressure triggers and first-reaction press.'
          : 'Build more repetitions under live pressure.',
      skillsWorkedOn: [skillOne, skillTwo],
      skillRatings: [
        {
          skill: skillOne,
          rating: ratingOne,
          previousRating: Math.max(1, ratingOne - 1),
        },
        {
          skill: skillTwo,
          rating: ratingTwo,
          previousRating: Math.max(1, ratingTwo - 1),
        },
      ],
      improvements: 'Quicker scanning before receiving and stronger off-ball movement.',
      homework: '15 minutes of first-touch and scan-before-receive reps, 3x this week.',
      effortRating: 3 + ((base + index + 2) % 3),
      overallPerformance: 3 + ((base + index + 1) % 3),
      videoClipUrls: [],
      visibility: 'athlete',
      positionPlayed: seededPositions[index] ?? 'MID',
    };
  });
}
function buildUser1DiamondTestFeedback(athleteName: string): SessionFeedback[] {
  return [
    {
      id: USER1_DIAMOND_TEST_FEEDBACK_IDS[0],
      sessionId: 'user1_diamond_test_session_1',
      bookingId: 'user1_diamond_test_booking_1',
      coachId: 'coach1',
      coachName: 'Jess Okafor',
      athleteId: 'user1',
      athleteName,
      createdAt: daysAgo(20),
      publicSummary: 'Good intent. Keep earlier communication before receiving in tight areas.',
      privateNotes: 'Prompt teammate support sooner when pressed.',
      skillsWorkedOn: ['Teamwork', 'Decision-Making', 'Passing'],
      skillRatings: [
        {
          skill: 'Teamwork',
          rating: 3,
          previousRating: 2,
        },
        {
          skill: 'Decision-Making',
          rating: 3,
          previousRating: 2,
        },
        {
          skill: 'Passing',
          rating: 3,
          previousRating: 2,
        },
      ],
      improvements: 'Started calling support angles more consistently.',
      homework: 'Call a scan cue before first touch in each rep block.',
      effortRating: 4,
      overallPerformance: 3,
      visibility: 'athlete',
      fourCorners: {
        technical: 3,
        physical: 3,
        psychological: 3,
        social: 2,
      },
      sessionTemplateName: 'Build-Up Play (Small Group)',
      videoClipUrls: [],
    },
    {
      id: USER1_DIAMOND_TEST_FEEDBACK_IDS[1],
      sessionId: 'user1_diamond_test_session_2',
      bookingId: 'user1_diamond_test_booking_2',
      coachId: 'coach2',
      coachName: 'Reuben Carr',
      athleteId: 'user1',
      athleteName,
      createdAt: daysAgo(9),
      publicSummary: 'Better shape and awareness in transition moments.',
      privateNotes: 'Keep scanning over both shoulders.',
      skillsWorkedOn: ['Teamwork', 'Vision', 'First Touch'],
      skillRatings: [
        {
          skill: 'Teamwork',
          rating: 4,
          previousRating: 3,
        },
        {
          skill: 'Vision',
          rating: 4,
          previousRating: 3,
        },
        {
          skill: 'First Touch',
          rating: 4,
          previousRating: 3,
        },
      ],
      improvements: 'Support play improved and passing options opened faster.',
      homework: 'Two-touch rondo reps with verbal scan cues, 3 sets.',
      effortRating: 4,
      overallPerformance: 4,
      visibility: 'athlete',
      fourCorners: {
        technical: 4,
        physical: 3,
        psychological: 3,
        social: 4,
      },
      sessionTemplateName: 'Press & Play Through',
      videoClipUrls: [],
    },
    {
      id: USER1_DIAMOND_TEST_FEEDBACK_IDS[2],
      sessionId: 'user1_diamond_test_session_3',
      bookingId: 'user1_diamond_test_booking_3',
      coachId: 'coach1',
      coachName: 'Jess Okafor',
      athleteId: 'user1',
      athleteName,
      createdAt: daysAgo(2),
      publicSummary: 'Excellent teamwork today. Tempo and communication were clear all session.',
      privateNotes: 'Strong leadership cues under pressure.',
      skillsWorkedOn: ['Teamwork', 'Communication', 'Passing'],
      skillRatings: [
        {
          skill: 'Teamwork',
          rating: 5,
          previousRating: 4,
        },
        {
          skill: 'Communication',
          rating: 4,
          previousRating: 3,
        },
        {
          skill: 'Passing',
          rating: 4,
          previousRating: 4,
        },
      ],
      improvements: 'Consistent scan-call-receive sequence across game phases.',
      homework: 'Maintain verbal cues in first 15 mins of next session.',
      effortRating: 5,
      overallPerformance: 4,
      visibility: 'athlete',
      fourCorners: {
        technical: 4,
        physical: 3,
        psychological: 4,
        social: 5,
      },
      sessionTemplateName: 'Match Tempo Scenario',
      badgeAwarded: 'Session Leader',
      videoClipUrls: [],
    },
  ];
}
const USER1_FULL_SEED_PREFIX = 'user1_full';
const USER1_FULL_VIDEO_URI = 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4';
const USER1_FULL_SESSIONS: User1SeedSession[] = [
  {
    index: 1,
    daysAgo: 49,
    position: 'DEF',
    coachId: 'coach1',
    coachName: 'Jess Okafor',
    templateName: 'Defensive Fundamentals',
    sessionTitle: 'Defensive Shape Block',
    summary: 'Solid defensive effort. Keep body orientation open when receiving under pressure.',
    privateNotes: 'Work on quicker first step in 1v1 recovery runs.',
    improvements: 'Improved footwork in isolated 1v1 moments and stronger recovery angles.',
    homework: '3 sets of defensive shuffle + jockey stance reps (8 mins each).',
    effort: 3,
    performance: 3,
    workedOn: ['Tackling', 'Positioning', 'Communication'],
    ratings: [
      {
        skill: 'Work Rate',
        rating: 2,
        previousRating: 2,
      },
      {
        skill: 'Attitude',
        rating: 3,
        previousRating: 2,
      },
      {
        skill: 'Communication',
        rating: 2,
        previousRating: 2,
      },
      {
        skill: 'Coachability',
        rating: 3,
        previousRating: 2,
      },
      {
        skill: 'Tackling',
        rating: 2,
        previousRating: 2,
      },
      {
        skill: 'Heading & Aerial',
        rating: 2,
        previousRating: 2,
      },
      {
        skill: 'Positioning',
        rating: 2,
        previousRating: 2,
      },
      {
        skill: 'Playing Out',
        rating: 2,
        previousRating: 1,
      },
      {
        skill: '1v1 Defending',
        rating: 2,
        previousRating: 2,
      },
    ],
    badges: ['Defensive Wall'],
  },
  {
    index: 2,
    daysAgo: 42,
    position: 'MID',
    coachId: 'coach2',
    coachName: 'Reuben Carr',
    templateName: 'Midfield Tempo',
    sessionTitle: 'Tempo & Circulation',
    summary: 'Good midfield rhythm. Passing lanes opened earlier with cleaner scanning decisions.',
    privateNotes: 'Increase release speed after first touch under pressure.',
    improvements: 'Tempo control improved and decision speed noticeably quicker in transition.',
    homework: 'Two-touch rondo for 12 minutes, focus on scanning cues before receiving.',
    effort: 3,
    performance: 3,
    workedOn: ['Passing', 'Game Vision', 'Tempo & Control'],
    ratings: [
      {
        skill: 'Work Rate',
        rating: 3,
        previousRating: 2,
      },
      {
        skill: 'Attitude',
        rating: 3,
        previousRating: 3,
      },
      {
        skill: 'Communication',
        rating: 3,
        previousRating: 2,
      },
      {
        skill: 'Coachability',
        rating: 3,
        previousRating: 3,
      },
      {
        skill: 'Passing',
        rating: 3,
        previousRating: 2,
      },
      {
        skill: 'Ball Carrying',
        rating: 3,
        previousRating: 2,
      },
      {
        skill: 'Game Vision',
        rating: 2,
        previousRating: 2,
      },
      {
        skill: 'Pressing & Defending',
        rating: 3,
        previousRating: 2,
      },
      {
        skill: 'Tempo & Control',
        rating: 3,
        previousRating: 2,
      },
    ],
    badges: ['Tempo Builder'],
  },
  {
    index: 3,
    daysAgo: 35,
    position: 'ATT',
    coachId: 'coach3',
    coachName: 'Aiden Sharma',
    templateName: 'Attacking Patterns',
    sessionTitle: 'Movement & Final Third',
    summary: 'Attacking movement improved. Timing in behind and pressing triggers looked sharper.',
    privateNotes: 'Need stronger hold-up body shape with defender contact.',
    improvements: 'Better movement timing and cleaner first-touch direction in channel runs.',
    homework: 'Finishing circuit: 20 reps each side, one-touch and two-touch variations.',
    effort: 3,
    performance: 3,
    workedOn: ['Finishing', 'Movement', 'Pressing & Work Rate'],
    ratings: [
      {
        skill: 'Work Rate',
        rating: 3,
        previousRating: 3,
      },
      {
        skill: 'Attitude',
        rating: 3,
        previousRating: 3,
      },
      {
        skill: 'Communication',
        rating: 3,
        previousRating: 3,
      },
      {
        skill: 'Coachability',
        rating: 4,
        previousRating: 3,
      },
      {
        skill: 'Finishing',
        rating: 3,
        previousRating: 2,
      },
      {
        skill: 'Movement',
        rating: 3,
        previousRating: 2,
      },
      {
        skill: 'Dribbling & Skills',
        rating: 3,
        previousRating: 2,
      },
      {
        skill: 'Hold-Up Play',
        rating: 2,
        previousRating: 2,
      },
      {
        skill: 'Pressing & Work Rate',
        rating: 3,
        previousRating: 2,
      },
    ],
    badges: ['Attacking Intent'],
  },
  {
    index: 4,
    daysAgo: 28,
    position: 'MID',
    coachId: 'coach1',
    coachName: 'Jess Okafor',
    templateName: 'Midfield Control',
    sessionTitle: 'Control Under Pressure',
    summary: 'Very good composure in midfield. Ball carrying and support angles improved.',
    privateNotes: 'Add one more scan before receiving from central defenders.',
    improvements: 'Ball carrying confidence improved and support lane recognition was quicker.',
    homework: '4 x 4-minute pressure rondos with forced weak-foot exits.',
    effort: 4,
    performance: 4,
    workedOn: ['Ball Carrying', 'Passing', 'Communication'],
    ratings: [
      {
        skill: 'Work Rate',
        rating: 3,
        previousRating: 3,
      },
      {
        skill: 'Attitude',
        rating: 4,
        previousRating: 3,
      },
      {
        skill: 'Communication',
        rating: 3,
        previousRating: 3,
      },
      {
        skill: 'Coachability',
        rating: 4,
        previousRating: 3,
      },
      {
        skill: 'Passing',
        rating: 3,
        previousRating: 3,
      },
      {
        skill: 'Ball Carrying',
        rating: 4,
        previousRating: 3,
      },
      {
        skill: 'Game Vision',
        rating: 3,
        previousRating: 2,
      },
      {
        skill: 'Pressing & Defending',
        rating: 3,
        previousRating: 3,
      },
      {
        skill: 'Tempo & Control',
        rating: 3,
        previousRating: 3,
      },
    ],
    badges: ['Ball Carrier'],
  },
  {
    index: 5,
    daysAgo: 21,
    position: 'GK',
    coachId: 'coach2',
    coachName: 'Reuben Carr',
    templateName: 'Goalkeeper Distribution',
    sessionTitle: 'GK Distribution & Control',
    summary: 'Goalkeeping block was strong. Distribution decisions and command of box improved.',
    privateNotes: 'Keep body shape taller during close-range reaction saves.',
    improvements: 'Better communication from the back line and calmer distribution choices.',
    homework: 'Wall volley + first-time distribution pattern: 30 passes per side.',
    effort: 4,
    performance: 4,
    workedOn: ['Distribution', 'Command of Area', 'Communication'],
    ratings: [
      {
        skill: 'Work Rate',
        rating: 3,
        previousRating: 3,
      },
      {
        skill: 'Attitude',
        rating: 4,
        previousRating: 4,
      },
      {
        skill: 'Communication',
        rating: 4,
        previousRating: 3,
      },
      {
        skill: 'Coachability',
        rating: 4,
        previousRating: 4,
      },
      {
        skill: 'Shot Stopping',
        rating: 3,
        previousRating: 2,
      },
      {
        skill: 'Handling & Crosses',
        rating: 3,
        previousRating: 2,
      },
      {
        skill: 'Distribution',
        rating: 4,
        previousRating: 3,
      },
      {
        skill: 'Positioning & Sweeping',
        rating: 3,
        previousRating: 2,
      },
      {
        skill: 'Command of Area',
        rating: 3,
        previousRating: 2,
      },
    ],
    badges: ['Commanding Presence'],
  },
  {
    index: 6,
    daysAgo: 14,
    position: 'MID',
    coachId: 'coach3',
    coachName: 'Aiden Sharma',
    templateName: 'Press & Play Through',
    sessionTitle: 'Press Resistance Circuit',
    summary: 'Excellent application today. Passing rhythm and pressing recovery both stepped up.',
    privateNotes: 'Decision speed in final-third transitions still has another level.',
    improvements: 'Passing under pressure improved with cleaner first-touch set direction.',
    homework: '3 x 10-minute high-tempo passing blocks with one-touch constraints.',
    effort: 4,
    performance: 4,
    workedOn: ['Passing', 'Pressing & Defending', 'Tempo & Control'],
    ratings: [
      {
        skill: 'Work Rate',
        rating: 4,
        previousRating: 3,
      },
      {
        skill: 'Attitude',
        rating: 4,
        previousRating: 4,
      },
      {
        skill: 'Communication',
        rating: 4,
        previousRating: 4,
      },
      {
        skill: 'Coachability',
        rating: 4,
        previousRating: 4,
      },
      {
        skill: 'Passing',
        rating: 4,
        previousRating: 3,
      },
      {
        skill: 'Ball Carrying',
        rating: 4,
        previousRating: 4,
      },
      {
        skill: 'Game Vision',
        rating: 4,
        previousRating: 3,
      },
      {
        skill: 'Pressing & Defending',
        rating: 4,
        previousRating: 3,
      },
      {
        skill: 'Tempo & Control',
        rating: 4,
        previousRating: 3,
      },
    ],
    badges: ['Press Resistant', 'Vision Builder'],
  },
  {
    index: 7,
    daysAgo: 7,
    position: 'ATT',
    coachId: 'coach1',
    coachName: 'Jess Okafor',
    templateName: 'Finishing Under Pressure',
    sessionTitle: 'Clinical Finishing Block',
    summary:
      'Strong attacking output this week. Finishing choices and movement were consistently sharp.',
    privateNotes: 'Continue improving hold-up first contact and shoulder checks.',
    improvements: 'Higher quality first-time finishing and better off-ball timing into space.',
    homework: '20-minute finishing ladder, alternating weak foot and first-time strikes.',
    effort: 4,
    performance: 4,
    workedOn: ['Finishing', 'Movement', 'Hold-Up Play'],
    ratings: [
      {
        skill: 'Work Rate',
        rating: 4,
        previousRating: 4,
      },
      {
        skill: 'Attitude',
        rating: 4,
        previousRating: 4,
      },
      {
        skill: 'Communication',
        rating: 4,
        previousRating: 4,
      },
      {
        skill: 'Coachability',
        rating: 4,
        previousRating: 4,
      },
      {
        skill: 'Finishing',
        rating: 4,
        previousRating: 3,
      },
      {
        skill: 'Movement',
        rating: 4,
        previousRating: 3,
      },
      {
        skill: 'Dribbling & Skills',
        rating: 4,
        previousRating: 3,
      },
      {
        skill: 'Hold-Up Play',
        rating: 4,
        previousRating: 3,
      },
      {
        skill: 'Pressing & Work Rate',
        rating: 4,
        previousRating: 3,
      },
    ],
    badges: ['Clinical Finisher', 'Press Leader'],
  },
  {
    index: 8,
    daysAgo: 2,
    position: 'MID',
    coachId: 'coach2',
    coachName: 'Reuben Carr',
    templateName: 'Match Tempo Scenario',
    sessionTitle: 'Match-Speed Midfield Decisioning',
    summary:
      'Outstanding session. Passing tempo, scanning and communication were all at a high level.',
    privateNotes: 'Keep forcing one extra scan before high-risk forward passes.',
    improvements: 'Decision speed improved significantly and communication led the group rhythm.',
    homework: 'Maintain scan-call-receive routine in every first 15-minute warm-up block.',
    effort: 5,
    performance: 5,
    workedOn: ['Passing', 'Game Vision', 'Communication'],
    ratings: [
      {
        skill: 'Work Rate',
        rating: 5,
        previousRating: 4,
      },
      {
        skill: 'Attitude',
        rating: 5,
        previousRating: 4,
      },
      {
        skill: 'Communication',
        rating: 5,
        previousRating: 4,
      },
      {
        skill: 'Coachability',
        rating: 5,
        previousRating: 4,
      },
      {
        skill: 'Passing',
        rating: 5,
        previousRating: 4,
      },
      {
        skill: 'Ball Carrying',
        rating: 4,
        previousRating: 4,
      },
      {
        skill: 'Game Vision',
        rating: 5,
        previousRating: 4,
      },
      {
        skill: 'Pressing & Defending',
        rating: 4,
        previousRating: 4,
      },
      {
        skill: 'Tempo & Control',
        rating: 5,
        previousRating: 4,
      },
    ],
    badgeAwarded: 'Session Leader, Vision & Passing',
    badges: ['Session Leader', 'Vision & Passing'],
  },
];
function daysAgoAt(days: number, hour = 17, minute = 0): string {
  const date = new Date(Date.now() - days * DAY_MS);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}
function dateKeyDaysAgo(days: number): string {
  return daysAgoAt(days).slice(0, 10);
}
function seedSessionId(index: number): string {
  return `${USER1_FULL_SEED_PREFIX}_session_${String(index).padStart(2, '0')}`;
}
function seedBookingId(index: number): string {
  return `${USER1_FULL_SEED_PREFIX}_booking_${String(index).padStart(2, '0')}`;
}
function seedFeedbackId(index: number): string {
  return `${USER1_FULL_SEED_PREFIX}_feedback_${String(index).padStart(2, '0')}`;
}
function seedMediaPhotoUri(index: number, slot: number): string {
  return `https://picsum.photos/seed/${USER1_FULL_SEED_PREFIX}_p_${index}_${slot}/1080/720`;
}
function seedMediaThumbUri(index: number, slot: number): string {
  return `https://picsum.photos/seed/${USER1_FULL_SEED_PREFIX}_t_${index}_${slot}/420/280`;
}
function seedVideoThumbUri(index: number): string {
  return `https://picsum.photos/seed/${USER1_FULL_SEED_PREFIX}_v_${index}/420/280`;
}
function toSessionDateIso(daysAgoValue: number): string {
  return daysAgoAt(daysAgoValue, 18, 30);
}
function toCornerRatingsFromSeed(
  ratings: Array<{
    skill: string;
    rating: 1 | 2 | 3 | 4 | 5;
  }>,
): {
  technical: number;
  physical: number;
  psychological: number;
  social: number;
} {
  const technicalValues = ratings.flatMap((entry) =>
    entry.skill !== 'Work Rate' &&
    entry.skill !== 'Attitude' &&
    entry.skill !== 'Communication' &&
    entry.skill !== 'Coachability'
      ? [entry.rating]
      : [],
  );
  const physicalValues = ratings.flatMap((entry) =>
    entry.skill === 'Work Rate' ? [entry.rating] : [],
  );
  const psychologicalValues = ratings.flatMap((entry) =>
    entry.skill === 'Attitude' || entry.skill === 'Coachability' ? [entry.rating] : [],
  );
  const socialValues = ratings.flatMap((entry) =>
    entry.skill === 'Communication' ? [entry.rating] : [],
  );
  const avg = (values: number[]): number => {
    if (values.length === 0) {
      return 3;
    }
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.max(1, Math.min(5, Math.round(mean)));
  };
  return {
    technical: avg(technicalValues),
    physical: avg(physicalValues),
    psychological: avg(psychologicalValues),
    social: avg(socialValues),
  };
}
function buildUser1FullFeedback(athleteName: string): SessionFeedback[] {
  return USER1_FULL_SESSIONS.map((session) => {
    const sessionId = seedSessionId(session.index);
    const bookingId = seedBookingId(session.index);
    const createdAt = toSessionDateIso(session.daysAgo);
    const fourCorners = toCornerRatingsFromSeed(session.ratings);
    const badgeAwarded = session.badgeAwarded ?? session.badges?.join(', ');
    return {
      id: seedFeedbackId(session.index),
      sessionId,
      bookingId,
      sessionTemplateId: `${USER1_FULL_SEED_PREFIX}_template_${session.position.toLowerCase()}_${String(session.index).padStart(2, '0')}`,
      sessionTemplateName: session.templateName,
      sessionTitle: session.sessionTitle,
      coachId: session.coachId,
      coachName: session.coachName,
      athleteId: 'user1',
      athleteName,
      createdAt,
      publicSummary: session.summary,
      privateNotes: session.privateNotes,
      skillsWorkedOn: session.workedOn,
      skillRatings: session.ratings.map((rating) => ({
        skill: rating.skill,
        rating: rating.rating,
        previousRating: rating.previousRating,
      })),
      improvements: session.improvements,
      homework: session.homework,
      effortRating: session.effort,
      overallPerformance: session.performance,
      videoClipUrls: session.index >= 6 ? [USER1_FULL_VIDEO_URI] : [],
      photoUrls: [seedMediaPhotoUri(session.index, 1), seedMediaPhotoUri(session.index, 2)],
      badgeAwarded,
      fourCorners,
      positionPlayed: session.position,
      visibility: 'athlete',
    };
  });
}
function mergeSessionMedia(existing: SessionMedia[], seeded: SessionMedia[]): SessionMedia[] {
  const map = new Map<string, SessionMedia>();
  for (const item of seeded) {
    map.set(`${item.sessionId}:${item.athleteId}`, item);
  }
  for (const item of existing) {
    const key = `${item.sessionId}:${item.athleteId}`;
    if (!map.has(key)) {
      map.set(key, item);
    }
  }
  return Array.from(map.values()).sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}
function buildUser1SessionMedia(): SessionMedia[] {
  return USER1_FULL_SESSIONS.map((session) => {
    const sessionId = seedSessionId(session.index);
    const createdAt = toSessionDateIso(session.daysAgo);
    const photos = [1, 2].map((slot) => ({
      uri: seedMediaPhotoUri(session.index, slot),
      thumbnailUri: seedMediaThumbUri(session.index, slot),
      width: 1080,
      height: 720,
      capturedAt: new Date(new Date(createdAt).getTime() + slot * 60_000).toISOString(),
    }));
    const video =
      session.index >= 6
        ? {
            uri: USER1_FULL_VIDEO_URI,
            thumbnailUri: seedVideoThumbUri(session.index),
            duration: 5,
            capturedAt: createdAt,
          }
        : null;
    return {
      sessionId,
      athleteId: 'user1',
      coachId: session.coachId,
      photos,
      video,
      createdAt,
    } satisfies SessionMedia;
  });
}
function buildUser1CompletedBookings(athleteName: string): Booking[] {
  const sessionLinked = USER1_FULL_SESSIONS.map((session) => {
    const id = seedBookingId(session.index);
    const scheduledAt = toSessionDateIso(session.daysAgo);
    return {
      id,
      coachId: session.coachId,
      coachName: session.coachName,
      athleteId: 'user1',
      athleteIds: ['user1'],
      athleteNames: [athleteName],
      bookedById: 'user4',
      bookedByName: 'Sarah Barton',
      status: 'COMPLETED' as const,
      scheduledAt,
      duration: 75,
      location: 'Riverside Training Ground',
      service: session.templateName,
      sessionTemplateName: session.templateName,
      notes: session.sessionTitle,
      createdAt: daysAgoAt(session.daysAgo + 4, 10, 0),
    } satisfies Booking;
  });
  const extraAttendanceDays = [1, 4, 6, 9, 11, 16, 19, 23, 26, 31, 34, 38, 41];
  const extras = extraAttendanceDays.map((days, index) => {
    const coach = DEMO_COACHES[index % DEMO_COACHES.length];
    return {
      id: `${USER1_FULL_SEED_PREFIX}_booking_extra_${String(index + 1).padStart(2, '0')}`,
      coachId: coach.id,
      coachName: coach.name,
      athleteId: 'user1',
      athleteIds: ['user1'],
      athleteNames: [athleteName],
      bookedById: 'user4',
      bookedByName: 'Sarah Barton',
      status: 'COMPLETED' as const,
      scheduledAt: daysAgoAt(days, 18, 0),
      duration: 60,
      location: 'Riverside Training Ground',
      service: 'Extra Technical Session',
      notes: 'Supplementary session for rhythm and attendance consistency.',
      createdAt: daysAgoAt(days + 3, 11, 30),
    } satisfies Booking;
  });
  return [...sessionLinked, ...extras];
}
function buildUser1CoachSessions(): Session[] {
  return USER1_FULL_SESSIONS.map((session) => ({
    id: `${USER1_FULL_SEED_PREFIX}_coach_session_${String(session.index).padStart(2, '0')}`,
    bookingId: seedBookingId(session.index),
    coachId: session.coachId,
    athleteId: 'user1',
    completedAt: toSessionDateIso(session.daysAgo),
    attendance: 'ATTENDED',
    notes: session.privateNotes,
    skillsWorkedOn: session.workedOn,
    performanceRating: session.performance,
    nextFocusAreas: session.workedOn.slice(0, 2),
    videoUrls: session.index >= 6 ? [USER1_FULL_VIDEO_URI] : [],
    coachName: session.coachName,
  }));
}
function buildUser1FullSkills(): AthleteSkillLevels {
  const now = new Date().toISOString();
  const baseHistoryDays = [84, 56, 28, 2];
  const makeSkill = (
    skill: string,
    levels: [number, number, number, number],
    coachId: string,
  ): SkillLevel => {
    const history = baseHistoryDays.map((days, index) => ({
      date: daysAgoAt(days, 17, 0),
      level: levels[index],
      coachId,
    }));
    const previousLevel = levels[2];
    const level = levels[3];
    return {
      skill,
      level,
      previousLevel,
      lastUpdated: now,
      updatedBy: coachId,
      trend:
        level > previousLevel ? 'improving' : level < previousLevel ? 'declining' : 'consistent',
      history,
    };
  };
  const skills: Record<string, SkillLevel> = {
    'Work Rate': makeSkill('Work Rate', [4, 5, 7, 9], 'coach1'),
    Attitude: makeSkill('Attitude', [5, 6, 8, 9], 'coach2'),
    Communication: makeSkill('Communication', [4, 5, 7, 9], 'coach2'),
    Coachability: makeSkill('Coachability', [5, 6, 8, 9], 'coach3'),
    Passing: makeSkill('Passing', [5, 6, 7, 9], 'coach2'),
    'Ball Carrying': makeSkill('Ball Carrying', [4, 5, 7, 8], 'coach1'),
    'Game Vision': makeSkill('Game Vision', [4, 5, 7, 9], 'coach2'),
    'Pressing & Defending': makeSkill('Pressing & Defending', [4, 5, 6, 8], 'coach3'),
    'Tempo & Control': makeSkill('Tempo & Control', [4, 5, 7, 9], 'coach2'),
    Finishing: makeSkill('Finishing', [4, 5, 6, 8], 'coach1'),
    Movement: makeSkill('Movement', [4, 5, 6, 8], 'coach1'),
    'Dribbling & Skills': makeSkill('Dribbling & Skills', [4, 5, 6, 8], 'coach3'),
    'Hold-Up Play': makeSkill('Hold-Up Play', [3, 4, 6, 8], 'coach3'),
    Tackling: makeSkill('Tackling', [3, 4, 5, 7], 'coach1'),
    Positioning: makeSkill('Positioning', [4, 5, 6, 7], 'coach1'),
    '1v1 Defending': makeSkill('1v1 Defending', [3, 4, 5, 7], 'coach1'),
    'Shot Stopping': makeSkill('Shot Stopping', [3, 4, 5, 6], 'coach2'),
    Distribution: makeSkill('Distribution', [4, 5, 6, 8], 'coach2'),
  };
  return {
    athleteId: 'user1',
    skills,
    lastUpdated: now,
  };
}
function buildUser1FullGoals(athleteId: string): Goal[] {
  const goals: Goal[] = [
    {
      id: `${USER1_FULL_SEED_PREFIX}_goal_game_vision`,
      userId: athleteId,
      athleteId,
      title: 'Lift Game Vision to Excellent',
      description: 'Improve scan frequency and early passing decisions under match pressure.',
      category: 'GAME_SENSE',
      linkedSkill: 'Game Vision',
      targetLevel: 'Excellent',
      targetDate: daysFromNow(45),
      status: 'ACTIVE',
      progress: 70,
      milestones: buildGoalMilestones(
        `${USER1_FULL_SEED_PREFIX}_goal_game_vision`,
        [
          'Scan before every receive',
          'Switch play in under two touches',
          'Call support lane early',
        ],
        2,
      ),
      createdBy: 'COACH',
      createdById: 'coach2',
      createdAt: daysAgoAt(52, 10, 0),
      updatedAt: daysAgoAt(2, 20, 0),
    },
    {
      id: `${USER1_FULL_SEED_PREFIX}_goal_finishing`,
      userId: athleteId,
      athleteId,
      title: 'Improve Finishing Consistency',
      description: 'Convert high-quality chances with both feet in pressured scenarios.',
      category: 'ATTACKING',
      linkedSkill: 'Finishing',
      targetLevel: 'Excellent',
      targetDate: daysFromNow(35),
      status: 'ACTIVE',
      progress: 60,
      milestones: buildGoalMilestones(
        `${USER1_FULL_SEED_PREFIX}_goal_finishing`,
        [
          '8/10 on-target in finishing ladder',
          'Weak-foot finishing set complete',
          'Apply in game scenario',
        ],
        2,
      ),
      createdBy: 'COACH',
      createdById: 'coach1',
      createdAt: daysAgoAt(47, 10, 0),
      updatedAt: daysAgoAt(7, 19, 0),
    },
    {
      id: `${USER1_FULL_SEED_PREFIX}_goal_character`,
      userId: athleteId,
      athleteId,
      title: 'Build Exceptional Work Rate',
      description: 'Maintain high intensity and positive body language across full sessions.',
      category: 'CHARACTER',
      linkedSkill: 'Work Rate',
      targetLevel: 'Exceptional',
      targetDate: daysFromNow(-10),
      status: 'COMPLETED',
      progress: 100,
      milestones: buildGoalMilestones(
        `${USER1_FULL_SEED_PREFIX}_goal_character`,
        [
          'Hit sprint recovery targets',
          'Complete final block at full intensity',
          'Lead pressing triggers',
        ],
        3,
      ),
      createdBy: 'COACH',
      createdById: 'coach3',
      createdAt: daysAgoAt(70, 9, 0),
      updatedAt: daysAgoAt(6, 20, 0),
    },
    {
      id: `${USER1_FULL_SEED_PREFIX}_goal_defending`,
      userId: athleteId,
      athleteId,
      title: 'Sharpen 1v1 Defending',
      description: 'Improve distance management and tackle timing in isolation moments.',
      category: 'DEFENDING',
      linkedSkill: '1v1 Defending',
      targetLevel: 'Very Good',
      targetDate: daysFromNow(30),
      status: 'PAUSED',
      progress: 42,
      milestones: buildGoalMilestones(
        `${USER1_FULL_SEED_PREFIX}_goal_defending`,
        ['Delay and contain in channel', 'Win 60% 1v1 duels', 'Recover after first step loss'],
        1,
      ),
      createdBy: 'COACH',
      createdById: 'coach1',
      createdAt: daysAgoAt(58, 12, 0),
      updatedAt: daysAgoAt(18, 18, 0),
    },
  ];
  return goals;
}
function buildUser1FullBadges(athleteId: string): BadgeAward[] {
  const rows: Array<{
    index: number;
    badgeId: string;
    badgeLabel: string;
    coachId: string;
    category: BadgeAward['badgeCategory'];
    tier: 1 | 2 | 3;
    points: number;
    reason: string;
    visibility: BadgeAward['visibility'];
  }> = [
    {
      index: 2,
      badgeId: 'badge_best_training',
      badgeLabel: 'Standout Session',
      coachId: 'coach2',
      category: 'psychological',
      tier: 1,
      points: 10,
      reason: 'Strong intent and quality throughout the full midfield block.',
      visibility: 'athlete',
    },
    {
      index: 4,
      badgeId: 'badge_master_passer',
      badgeLabel: 'Vision & Passing',
      coachId: 'coach1',
      category: 'technical',
      tier: 2,
      points: 25,
      reason: 'Consistently found high-value passing options under pressure.',
      visibility: 'supporters',
    },
    {
      index: 5,
      badgeId: 'badge_team_player',
      badgeLabel: 'Team Player',
      coachId: 'coach2',
      category: 'social',
      tier: 1,
      points: 10,
      reason: 'Communication and support cues improved the whole unit shape.',
      visibility: 'athlete',
    },
    {
      index: 6,
      badgeId: 'badge_focused_athlete',
      badgeLabel: 'Focused Athlete',
      coachId: 'coach3',
      category: 'psychological',
      tier: 2,
      points: 25,
      reason: 'Sustained concentration and quality decisions over full high-tempo block.',
      visibility: 'supporters',
    },
    {
      index: 7,
      badgeId: 'badge_assist_king',
      badgeLabel: 'Assist King',
      coachId: 'coach1',
      category: 'technical',
      tier: 2,
      points: 25,
      reason: 'Created repeated high-quality chances with final-third passing.',
      visibility: 'athlete',
    },
    {
      index: 8,
      badgeId: 'badge_team_captain',
      badgeLabel: 'Team Captain',
      coachId: 'coach2',
      category: 'social',
      tier: 3,
      points: 50,
      reason: 'Led tempo, communication and standards throughout the match-speed scenario.',
      visibility: 'supporters',
    },
  ];
  return rows.map((row, idx) => ({
    id: `${USER1_FULL_SEED_PREFIX}_badge_award_${String(idx + 1).padStart(2, '0')}`,
    badgeId: row.badgeId,
    badgeLabel: row.badgeLabel,
    athleteId,
    coachId: row.coachId,
    sessionId: seedSessionId(row.index),
    reason: row.reason,
    note: 'Linked directly to session feedback and performance trend.',
    awardedBy: row.coachId,
    awardedAt: daysAgoAt(USER1_FULL_SESSIONS[row.index - 1]?.daysAgo ?? 2, 20, 10),
    visibility: row.visibility,
    badgeCategory: row.category,
    badgeTier: row.tier,
    badgePointValue: row.points,
  }));
}
function buildUser1FullJournalEntries(athleteId: string): JournalEntrySeed[] {
  return USER1_FULL_SESSIONS.slice(-6).map((session) => ({
    id: `${USER1_FULL_SEED_PREFIX}_journal_${String(session.index).padStart(2, '0')}`,
    sessionId: seedSessionId(session.index),
    athleteId,
    personalNotes: `Session ${session.index}: ${session.improvements}`,
    coachNotes: session.privateNotes,
    mood: Math.max(3, session.performance),
    energyLevel: Math.max(3, session.effort),
    createdAt: toSessionDateIso(session.daysAgo),
  }));
}
function buildUser1HomeworkCompletion(): Record<string, HomeworkCompletionRecord> {
  const latestFeedback = USER1_FULL_SESSIONS.slice(-3);
  return latestFeedback.reduce<Record<string, HomeworkCompletionRecord>>((acc, session, index) => {
    const feedbackId = seedFeedbackId(session.index);
    acc[feedbackId] = {
      completedAt: daysAgoAt(Math.max(0, session.daysAgo - 1), 21, 0),
      proofUri: seedMediaPhotoUri(session.index, 1 + index),
      proofType: index % 2 === 0 ? 'photo' : 'video',
    };
    return acc;
  }, {});
}
function buildUser1SessionNotes(): Record<string, SessionNoteRecord> {
  return USER1_FULL_SESSIONS.reduce<Record<string, SessionNoteRecord>>((acc, session) => {
    const sessionId = seedSessionId(session.index);
    acc[sessionId] = {
      summary: session.summary,
      focus: session.workedOn,
      improvements: session.improvements,
      homework: session.homework,
      effort: session.effort,
      attendance: 'ATTENDED',
      videoUrls: session.index >= 6 ? [USER1_FULL_VIDEO_URI] : [],
      imageUrls: [seedMediaPhotoUri(session.index, 1), seedMediaPhotoUri(session.index, 2)],
      updatedAt: toSessionDateIso(session.daysAgo),
    };
    return acc;
  }, {});
}
function buildUser1PositionHistory(): Record<string, PositionHistoryEntrySeed[]> {
  const entries = USER1_FULL_SESSIONS.map((session) => ({
    sessionId: seedSessionId(session.index),
    athleteId: 'user1',
    position: session.position,
    recordedAt: toSessionDateIso(session.daysAgo),
  })).sort(
    (left, right) => new Date(right.recordedAt).getTime() - new Date(left.recordedAt).getTime(),
  );
  return {
    user1: entries,
  };
}
function buildUser1PracticeLogs(): PracticeLogSeed[] {
  const rows = [
    {
      daysAgo: 1,
      minutes: 30,
      note: 'First-touch wall work + weak-foot control.',
    },
    {
      daysAgo: 3,
      minutes: 25,
      note: 'Scanning cue rehearsal before receive.',
    },
    {
      daysAgo: 5,
      minutes: 35,
      note: 'Finishing ladder with quick recovery runs.',
    },
    {
      daysAgo: 8,
      minutes: 20,
      note: 'Pressure rondo prep set.',
    },
    {
      daysAgo: 10,
      minutes: 30,
      note: 'Tempo passing pattern in tight area.',
    },
    {
      daysAgo: 13,
      minutes: 28,
      note: 'Ball carrying and turn mechanics.',
    },
    {
      daysAgo: 17,
      minutes: 32,
      note: 'Defensive footwork & recovery angles.',
    },
    {
      daysAgo: 20,
      minutes: 24,
      note: 'Distribution reps and communication cues.',
    },
  ];
  return rows.map((row) => {
    const dateKey = dateKeyDaysAgo(row.daysAgo);
    return {
      id: `${USER1_FULL_SEED_PREFIX}_practice_${dateKey}`,
      athleteId: 'user1',
      dateKey,
      minutes: row.minutes,
      note: row.note,
      createdAt: daysAgoAt(row.daysAgo, 20, 45),
    };
  });
}
function buildUser1SelfAssessments(athleteName: string): {
  prompts: SelfAssessmentPromptSeed[];
  entries: SelfAssessmentEntrySeed[];
} {
  const completedPromptIndexes = [5, 6, 7];
  const completedPrompts = completedPromptIndexes.map((index) => {
    const session = USER1_FULL_SESSIONS[index - 1];
    return {
      id: `${USER1_FULL_SEED_PREFIX}_self_prompt_${String(index).padStart(2, '0')}`,
      athleteId: 'user1',
      athleteName,
      coachId: session.coachId,
      bookingId: seedBookingId(index),
      sessionId: seedSessionId(index),
      createdAt: daysAgoAt(session.daysAgo, 19, 30),
      dueAt: daysAgoAt(Math.max(0, session.daysAgo - 1), 19, 30),
      status: 'completed' as const,
      completedAt: daysAgoAt(Math.max(0, session.daysAgo - 1), 21, 0),
      notificationSentAt: daysAgoAt(Math.max(0, session.daysAgo - 1), 20, 0),
    };
  });
  const pendingSession = USER1_FULL_SESSIONS[USER1_FULL_SESSIONS.length - 1];
  const pendingPrompt: SelfAssessmentPromptSeed = {
    id: `${USER1_FULL_SEED_PREFIX}_self_prompt_pending`,
    athleteId: 'user1',
    athleteName,
    coachId: pendingSession.coachId,
    bookingId: seedBookingId(pendingSession.index),
    sessionId: seedSessionId(pendingSession.index),
    createdAt: daysAgoAt(1, 18, 0),
    dueAt: daysAgoAt(1, 20, 0),
    status: 'pending',
    notificationSentAt: daysAgoAt(1, 20, 5),
  };
  const completedEntries = completedPromptIndexes.map((index) => {
    const session = USER1_FULL_SESSIONS[index - 1];
    return {
      id: `${USER1_FULL_SEED_PREFIX}_self_entry_${String(index).padStart(2, '0')}`,
      athleteId: 'user1',
      coachId: session.coachId,
      bookingId: seedBookingId(index),
      sessionId: seedSessionId(index),
      mood: session.performance,
      energyLevel: session.effort,
      confidence: Math.max(3, session.performance),
      notes: `Self-check after ${session.sessionTitle}: felt sharp and focused.`,
      createdAt: daysAgoAt(Math.max(0, session.daysAgo - 1), 21, 5),
    };
  });
  return {
    prompts: [...completedPrompts, pendingPrompt],
    entries: completedEntries,
  };
}
function buildSkillLevels(athleteId: string): AthleteSkillLevels {
  const base = hashValue(athleteId);
  const now = new Date().toISOString();
  const skills: Record<string, SkillLevel> = {};
  SKILL_NAMES.forEach((skill, index) => {
    const coach = pickCoach(index);
    const previousLevel = 3 + ((base + index) % 3);
    const level = Math.min(10, previousLevel + 1);
    skills[skill] = {
      skill,
      level,
      previousLevel,
      lastUpdated: now,
      updatedBy: coach.id,
      trend: 'improving',
      history: [
        {
          date: daysAgo(21),
          level: Math.max(1, previousLevel - 1),
          coachId: coach.id,
        },
        {
          date: daysAgo(10),
          level: previousLevel,
          coachId: coach.id,
        },
        {
          date: daysAgo(2),
          level,
          coachId: coach.id,
        },
      ],
    };
  });
  return {
    athleteId,
    skills,
    lastUpdated: now,
  };
}
function buildGoalMilestones(
  goalId: string,
  titles: string[],
  completedCount: number,
): GoalMilestone[] {
  return titles.map((title, index) => ({
    id: `${goalId}_ms_${index + 1}`,
    goalId,
    title,
    isCompleted: index < completedCount,
    completedAt: index < completedCount ? daysAgo(7 - index) : undefined,
    order: index,
  }));
}
function buildSeedGoals(athleteId: string): Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>[] {
  const tacticalGoalId = `seed_goal_${athleteId}_tactical`;
  const finishingGoalId = `seed_goal_${athleteId}_finishing`;
  const fitnessGoalId = `seed_goal_${athleteId}_fitness`;
  return [
    {
      userId: athleteId,
      athleteId,
      title: 'Improve Decision-Making Speed',
      description: 'Make faster and better choices during pressing and transition moments.',
      category: 'GAME_SENSE',
      targetDate: daysFromNow(60),
      status: 'ACTIVE',
      progress: 50,
      milestones: buildGoalMilestones(
        tacticalGoalId,
        [
          'Scan before receiving',
          'Choose pass within two touches',
          'Break first press consistently',
        ],
        1,
      ),
      createdBy: 'COACH',
      createdById: 'coach1',
    },
    {
      userId: athleteId,
      athleteId,
      title: 'Increase Finishing Consistency',
      description: 'Convert high-quality chances with cleaner technique under pressure.',
      category: 'BALL_SKILLS',
      targetDate: daysFromNow(45),
      status: 'ACTIVE',
      progress: 66,
      milestones: buildGoalMilestones(
        finishingGoalId,
        [
          'Hit target in 8/10 reps',
          'Finish from both feet in pattern drills',
          'Apply in small-sided game',
        ],
        2,
      ),
      createdBy: 'ATHLETE',
      createdById: athleteId,
    },
    {
      userId: athleteId,
      athleteId,
      title: 'Build Match Stamina',
      description: 'Sustain intensity across full-session conditioning blocks.',
      category: 'CHARACTER',
      targetDate: daysFromNow(-15),
      status: 'COMPLETED',
      progress: 100,
      milestones: buildGoalMilestones(
        fitnessGoalId,
        [
          'Complete interval block',
          'Recover heart rate faster',
          'Finish final block at target pace',
        ],
        3,
      ),
      createdBy: 'COACH',
      createdById: 'coach2',
    },
  ];
}
function buildSeedBadges(athleteId: string): BadgeAward[] {
  return [
    {
      id: `seed_badge_award_${athleteId}_consistency`,
      badgeId: 'badge_best_training',
      badgeLabel: 'Standout Session',
      badgeTone: 'success',
      athleteId,
      coachId: 'coach1',
      sessionId: `seed_progress_session_${athleteId}_2`,
      reason: 'Excellent work-rate and communication in the session block.',
      note: 'Kept standards high for the whole group.',
      awardedBy: 'coach1',
      awardedAt: daysAgo(5),
      visibility: 'athlete',
      badgeCategory: 'psychological',
      badgeTier: 1,
      badgePointValue: 10,
    },
    {
      id: `seed_badge_award_${athleteId}_technique`,
      badgeId: 'badge_master_passer',
      badgeLabel: 'Vision & Passing',
      badgeTone: 'default',
      athleteId,
      coachId: 'coach2',
      sessionId: `seed_progress_session_${athleteId}_1`,
      reason: 'Consistently found high-value passes under pressure.',
      note: 'Great awareness and composure in tight spaces.',
      awardedBy: 'coach2',
      awardedAt: daysAgo(1),
      visibility: 'supporters',
      badgeCategory: 'technical',
      badgeTier: 2,
      badgePointValue: 25,
    },
  ];
}
function buildJournalEntries(athleteId: string): JournalEntrySeed[] {
  return [
    {
      id: `seed_journal_${athleteId}_1`,
      sessionId: `seed_progress_session_${athleteId}_1`,
      athleteId,
      personalNotes: 'Sharp session. Felt quicker finding the free pass after scanning.',
      coachNotes: 'Strong progress. Keep body shape open before receiving.',
      mood: 4,
      energyLevel: 4,
      createdAt: daysAgo(2),
    },
    {
      id: `seed_journal_${athleteId}_2`,
      sessionId: `seed_progress_session_${athleteId}_3`,
      athleteId,
      personalNotes: 'Work rate stayed high. Need cleaner first touch under pressure.',
      coachNotes: 'Good intensity. Add extra first-touch reps on weaker foot.',
      mood: 4,
      energyLevel: 3,
      createdAt: daysAgo(8),
    },
  ];
}
async function ensureFeedbackSeeded(athleteId: string, athleteName: string): Promise<void> {
  const allFeedback = await apiClient.get<SessionFeedback[]>(STORAGE_KEYS.SESSION_FEEDBACK, []);
  const hasAthleteFeedback = allFeedback.some((entry) => entry.athleteId === athleteId);
  if (hasAthleteFeedback) {
    return;
  }
  const seeded = buildSeedFeedback(athleteId, athleteName);
  const merged = mergeById(allFeedback, seeded).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  await apiClient.set(STORAGE_KEYS.SESSION_FEEDBACK, merged);
}
async function ensureSkillsSeeded(athleteId: string): Promise<void> {
  const allLevels = await apiClient.get<Record<string, AthleteSkillLevels>>(
    STORAGE_KEYS.SKILL_LEVELS,
    {},
  );
  const hasAthleteSkills =
    Boolean(allLevels[athleteId]) && Object.keys(allLevels[athleteId].skills).length > 0;
  if (hasAthleteSkills) {
    return;
  }
  const seeded = buildSkillLevels(athleteId);
  await apiClient.set(STORAGE_KEYS.SKILL_LEVELS, {
    ...allLevels,
    [athleteId]: seeded,
  });
}
async function ensureGoalsSeeded(athleteId: string): Promise<void> {
  const current = await progressGoalsService.getGoalsForAthlete(athleteId);
  if (current.active.length + current.completed.length > 0) {
    return;
  }
  const goals = buildSeedGoals(athleteId);
  await Promise.all(
    goals.map((goal) =>
      progressGoalsService.createGoal(athleteId, goal, goal.createdBy, goal.createdById),
    ),
  );
}
async function ensureBadgesSeeded(athleteId: string): Promise<void> {
  const existingAthleteBadges = await badgeService.listAwardsForAthlete(athleteId);
  if (existingAthleteBadges.length > 0) {
    return;
  }
  const storedAwards = await apiClient.get<BadgeAward[]>(STORAGE_KEYS.BADGE_AWARDS, []);
  const merged = mergeById(storedAwards, buildSeedBadges(athleteId)).sort(
    (a, b) => new Date(b.awardedAt).getTime() - new Date(a.awardedAt).getTime(),
  );
  await apiClient.set(STORAGE_KEYS.BADGE_AWARDS, merged);
}
async function ensureJournalSeeded(athleteId: string): Promise<void> {
  const stored = await apiClient.get<JournalEntrySeed[]>(STORAGE_KEYS.SESSION_JOURNAL, []);
  const hasAthleteJournal = stored.some((entry) => entry.athleteId === athleteId);
  if (hasAthleteJournal) {
    return;
  }
  const merged = mergeById(stored, buildJournalEntries(athleteId)).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  await apiClient.set(STORAGE_KEYS.SESSION_JOURNAL, merged);
}
function isSeedSessionFeedback(feedback: SessionFeedback, athleteId: string): boolean {
  if (feedback.athleteId !== athleteId) {
    return false;
  }
  return (
    feedback.id.startsWith(`seed_progress_feedback_${athleteId}_`) ||
    feedback.sessionId.startsWith(`seed_progress_session_${athleteId}_`) ||
    feedback.bookingId?.startsWith(`seed_progress_booking_${athleteId}_`) === true
  );
}
function isSeedGoal(goal: Goal, athleteId: string): boolean {
  return goal.athleteId === athleteId && goal.id.startsWith(`seed_goal_${athleteId}_`);
}
function isSeedBadgeAward(award: BadgeAward, athleteId: string): boolean {
  return award.athleteId === athleteId && award.id.startsWith(`seed_badge_award_${athleteId}_`);
}
function isSeedJournalEntry(entry: JournalEntrySeed, athleteId: string): boolean {
  return entry.athleteId === athleteId && entry.id.startsWith(`seed_journal_${athleteId}_`);
}
function bookingMatchesAthlete(booking: Booking, athleteId: string): boolean {
  if (booking.athleteIds?.includes(athleteId)) {
    return true;
  }
  return booking.athleteId === athleteId;
}
function isLikelySeedSkillSnapshot(levels: AthleteSkillLevels | undefined): boolean {
  if (!levels) {
    return false;
  }
  const skills = Object.values(levels.skills);
  if (skills.length === 0) {
    return false;
  }
  return skills.every((skill) => {
    if (!SKILL_NAMES.includes(skill.skill as (typeof SKILL_NAMES)[number])) {
      return false;
    }
    if (!DEMO_COACH_IDS.has(skill.updatedBy)) {
      return false;
    }
    return skill.history.every((entry) => DEMO_COACH_IDS.has(entry.coachId));
  });
}
export async function clearProgressDemoSeedData(
  athleteId: string,
): Promise<Result<void, ServiceError>> {
  if (!athleteId) {
    return ok(undefined);
  }
  try {
    const [allFeedback, allLevels, allGoals, allAwards, allJournal, allBookings] =
      await Promise.all([
        apiClient.get<SessionFeedback[]>(STORAGE_KEYS.SESSION_FEEDBACK, []),
        apiClient.get<Record<string, AthleteSkillLevels>>(STORAGE_KEYS.SKILL_LEVELS, {}),
        apiClient.get<Goal[]>(STORAGE_KEYS.GOALS, []),
        apiClient.get<BadgeAward[]>(STORAGE_KEYS.BADGE_AWARDS, []),
        apiClient.get<JournalEntrySeed[]>(STORAGE_KEYS.SESSION_JOURNAL, []),
        apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []),
      ]);
    const filteredFeedback = allFeedback.filter(
      (entry) => !isSeedSessionFeedback(entry, athleteId),
    );
    const filteredGoals = allGoals.filter((goal) => !isSeedGoal(goal, athleteId));
    const filteredAwards = allAwards.filter((award) => !isSeedBadgeAward(award, athleteId));
    const filteredJournal = allJournal.filter((entry) => !isSeedJournalEntry(entry, athleteId));
    const hadSeedFeedback = filteredFeedback.length !== allFeedback.length;
    const hadSeedGoals = filteredGoals.length !== allGoals.length;
    const hadSeedAwards = filteredAwards.length !== allAwards.length;
    const hadSeedJournal = filteredJournal.length !== allJournal.length;
    const nextLevels = {
      ...allLevels,
    };
    const athleteLevels = nextLevels[athleteId];
    const hasCompletedBooking = allBookings.some(
      (booking) => booking.status === 'COMPLETED' && bookingMatchesAthlete(booking, athleteId),
    );
    const hasRealSignals =
      filteredFeedback.some((entry) => entry.athleteId === athleteId) ||
      filteredGoals.some((goal) => goal.athleteId === athleteId) ||
      filteredAwards.some((award) => award.athleteId === athleteId) ||
      filteredJournal.some((entry) => entry.athleteId === athleteId) ||
      hasCompletedBooking;
    let removedSeedSkills = false;
    if (!hasRealSignals && isLikelySeedSkillSnapshot(athleteLevels)) {
      delete nextLevels[athleteId];
      removedSeedSkills = true;
    }
    if (hadSeedFeedback) {
      await apiClient.set(STORAGE_KEYS.SESSION_FEEDBACK, filteredFeedback);
    }
    if (hadSeedGoals) {
      await apiClient.set(STORAGE_KEYS.GOALS, filteredGoals);
    }
    if (hadSeedAwards) {
      await apiClient.set(STORAGE_KEYS.BADGE_AWARDS, filteredAwards);
    }
    if (hadSeedJournal) {
      await apiClient.set(STORAGE_KEYS.SESSION_JOURNAL, filteredJournal);
    }
    if (removedSeedSkills) {
      await apiClient.set(STORAGE_KEYS.SKILL_LEVELS, nextLevels);
    }
    if (hadSeedFeedback || hadSeedGoals || hadSeedAwards || hadSeedJournal || removedSeedSkills) {
      logger.info('progress_demo_seed_data_cleared', {
        athleteId,
        removedSeedFeedback: hadSeedFeedback,
        removedSeedGoals: hadSeedGoals,
        removedSeedAwards: hadSeedAwards,
        removedSeedJournal: hadSeedJournal,
        removedSeedSkills,
      });
    }
    return ok(undefined);
  } catch (error) {
    logger.error('failed_to_clear_progress_demo_seed_data', {
      athleteId,
      error,
    });
    return err(storageError('Failed to clear seeded progress data'));
  }
}
export async function ensureUser1DiamondTestDataSeeded(
  athleteId: string,
  athleteName?: string,
): Promise<Result<void, ServiceError>> {
  if (athleteId !== 'user1') {
    return ok(undefined);
  }
  try {
    const [
      allFeedback,
      allLevels,
      allGoals,
      allAwards,
      allJournal,
      allMedia,
      allHomeworkCompletion,
      allSessionNotes,
      allPositionHistory,
      allBookings,
      allCoachSessions,
      allPracticeLogs,
      allSelfAssessmentPrompts,
      allSelfAssessmentEntries,
      allTermReports,
    ] = await Promise.all([
      apiClient.get<SessionFeedback[]>(STORAGE_KEYS.SESSION_FEEDBACK, []),
      apiClient.get<Record<string, AthleteSkillLevels>>(STORAGE_KEYS.SKILL_LEVELS, {}),
      apiClient.get<Goal[]>(STORAGE_KEYS.GOALS, []),
      apiClient.get<BadgeAward[]>(STORAGE_KEYS.BADGE_AWARDS, []),
      apiClient.get<JournalEntrySeed[]>(STORAGE_KEYS.SESSION_JOURNAL, []),
      apiClient.get<SessionMedia[]>(STORAGE_KEYS.SESSION_MEDIA, []),
      apiClient.get<Record<string, HomeworkCompletionRecord>>(STORAGE_KEYS.HOMEWORK_COMPLETION, {}),
      apiClient.get<Record<string, SessionNoteRecord>>(STORAGE_KEYS.SESSION_NOTES, {}),
      apiClient.get<Record<string, PositionHistoryEntrySeed[]>>(STORAGE_KEYS.POSITION_HISTORY, {}),
      apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []),
      apiClient.get<Session[]>(STORAGE_KEYS.COACH_SESSIONS, []),
      apiClient.get<PracticeLogSeed[]>(STORAGE_KEYS.PROGRESS_PRACTICE_LOGS, []),
      apiClient.get<SelfAssessmentPromptSeed[]>(STORAGE_KEYS.PROGRESS_SELF_ASSESSMENT_PROMPTS, []),
      apiClient.get<SelfAssessmentEntrySeed[]>(STORAGE_KEYS.PROGRESS_SELF_ASSESSMENTS, []),
      apiClient.get<
        Array<{
          id: string;
          athleteId: string;
          generatedAt: string;
          report: unknown;
        }>
      >(STORAGE_KEYS.PROGRESS_TERM_REPORTS, []),
    ]);
    const safeAthleteName = athleteName?.trim() || 'Alfie Barton';
    const seededFeedback = [
      ...buildUser1FullFeedback(safeAthleteName),
      ...buildUser1DiamondTestFeedback(safeAthleteName),
    ];
    const mergedFeedback = mergeById(allFeedback, seededFeedback).sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
    const seededSkills = buildUser1FullSkills();
    const existingUser1Skills = allLevels.user1;
    const mergedSkillMap = {
      ...seededSkills.skills,
    };
    if (existingUser1Skills) {
      Object.entries(existingUser1Skills.skills).forEach(([skill, skillData]) => {
        if (!mergedSkillMap[skill]) {
          mergedSkillMap[skill] = skillData;
        }
      });
    }
    const mergedLevels: Record<string, AthleteSkillLevels> = {
      ...allLevels,
      user1: {
        athleteId: 'user1',
        skills: mergedSkillMap,
        lastUpdated: new Date().toISOString(),
      },
    };
    const mergedGoals = mergeById(allGoals, buildUser1FullGoals('user1')).sort(
      (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    );
    const mergedAwards = mergeById(allAwards, buildUser1FullBadges('user1')).sort(
      (left, right) => new Date(right.awardedAt).getTime() - new Date(left.awardedAt).getTime(),
    );
    const mergedJournal = mergeById(allJournal, buildUser1FullJournalEntries('user1')).sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
    const mergedMedia = mergeSessionMedia(allMedia, buildUser1SessionMedia());
    const mergedHomeworkCompletion = {
      ...allHomeworkCompletion,
      ...buildUser1HomeworkCompletion(),
    };
    const mergedSessionNotes = {
      ...allSessionNotes,
      ...buildUser1SessionNotes(),
    };
    const seededPositionHistory = buildUser1PositionHistory().user1;
    const existingPositionHistory = allPositionHistory.user1 ?? [];
    const positionMap = new Map<string, PositionHistoryEntrySeed>();
    seededPositionHistory.forEach((entry) => positionMap.set(entry.sessionId, entry));
    existingPositionHistory.forEach((entry) => {
      if (!positionMap.has(entry.sessionId)) {
        positionMap.set(entry.sessionId, entry);
      }
    });
    const mergedPositionHistory = {
      ...allPositionHistory,
      user1: Array.from(positionMap.values()).sort(
        (left, right) => new Date(right.recordedAt).getTime() - new Date(left.recordedAt).getTime(),
      ),
    };
    const mergedBookings = mergeById(
      allBookings,
      buildUser1CompletedBookings(safeAthleteName),
    ).sort(
      (left, right) =>
        new Date(right.scheduledAt || right.createdAt || '').getTime() -
        new Date(left.scheduledAt || left.createdAt || '').getTime(),
    );
    const mergedCoachSessions = mergeById(allCoachSessions, buildUser1CoachSessions()).sort(
      (left, right) => new Date(right.completedAt).getTime() - new Date(left.completedAt).getTime(),
    );
    const mergedPracticeLogs = mergeById(allPracticeLogs, buildUser1PracticeLogs()).sort(
      (left, right) => right.dateKey.localeCompare(left.dateKey),
    );
    const selfAssessments = buildUser1SelfAssessments(safeAthleteName);
    const mergedSelfAssessmentPrompts = mergeById(
      allSelfAssessmentPrompts,
      selfAssessments.prompts,
    ).sort((left, right) => new Date(right.dueAt).getTime() - new Date(left.dueAt).getTime());
    const mergedSelfAssessmentEntries = mergeById(
      allSelfAssessmentEntries,
      selfAssessments.entries,
    ).sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
    await Promise.all([
      apiClient.set(STORAGE_KEYS.SESSION_FEEDBACK, mergedFeedback),
      apiClient.set(STORAGE_KEYS.SKILL_LEVELS, mergedLevels),
      apiClient.set(STORAGE_KEYS.GOALS, mergedGoals),
      apiClient.set(STORAGE_KEYS.BADGE_AWARDS, mergedAwards),
      apiClient.set(STORAGE_KEYS.SESSION_JOURNAL, mergedJournal),
      apiClient.set(STORAGE_KEYS.SESSION_MEDIA, mergedMedia),
      apiClient.set(STORAGE_KEYS.HOMEWORK_COMPLETION, mergedHomeworkCompletion),
      apiClient.set(STORAGE_KEYS.SESSION_NOTES, mergedSessionNotes),
      apiClient.set(STORAGE_KEYS.POSITION_HISTORY, mergedPositionHistory),
      apiClient.set(STORAGE_KEYS.BOOKINGS, mergedBookings),
      apiClient.set(STORAGE_KEYS.COACH_SESSIONS, mergedCoachSessions),
      apiClient.set(STORAGE_KEYS.PROGRESS_PRACTICE_LOGS, mergedPracticeLogs),
      apiClient.set(STORAGE_KEYS.PROGRESS_SELF_ASSESSMENT_PROMPTS, mergedSelfAssessmentPrompts),
      apiClient.set(STORAGE_KEYS.PROGRESS_SELF_ASSESSMENTS, mergedSelfAssessmentEntries),
    ]);
    const hasUser1TermlySnapshot = allTermReports.some(
      (snapshot) =>
        snapshot.athleteId === 'user1' &&
        String(snapshot.id).startsWith(`${USER1_FULL_SEED_PREFIX}_term_report_`),
    );
    if (!hasUser1TermlySnapshot) {
      const reportResult = await progressTermlyReportService.generateTermlyReport({
        athleteId: 'user1',
        athleteName: safeAthleteName,
        viewerRole: 'parent',
      });
      if (reportResult.success) {
        const snapshot = {
          id: `${USER1_FULL_SEED_PREFIX}_term_report_${Date.now()}`,
          athleteId: 'user1',
          generatedAt: reportResult.data.generatedAt,
          report: reportResult.data,
        };
        await apiClient.set(STORAGE_KEYS.PROGRESS_TERM_REPORTS, [snapshot, ...allTermReports]);
      }
    }
    logger.info('user1_progress_full_stack_seeded', {
      feedbackCount: seededFeedback.length,
      sessionCount: USER1_FULL_SESSIONS.length,
      awardsCount: buildUser1FullBadges('user1').length,
      goalsCount: buildUser1FullGoals('user1').length,
      practiceLogs: buildUser1PracticeLogs().length,
      selfAssessmentEntries: selfAssessments.entries.length,
    });
    return ok(undefined);
  } catch (error) {
    logger.error('failed_to_seed_user1_diamond_test_data', {
      athleteId,
      error,
    });
    return err(storageError('Failed to seed user1 diamond test data'));
  }
}
export async function ensureProgressDemoSeeded(
  athleteId: string,
  athleteName?: string,
): Promise<Result<void, ServiceError>> {
  if (!athleteId) {
    return ok(undefined);
  }
  const safeAthleteName = athleteName?.trim() || 'Athlete';
  try {
    await Promise.all([
      ensureFeedbackSeeded(athleteId, safeAthleteName),
      ensureSkillsSeeded(athleteId),
      ensureGoalsSeeded(athleteId),
      ensureBadgesSeeded(athleteId),
      ensureJournalSeeded(athleteId),
    ]);
    return ok(undefined);
  } catch (error) {
    logger.error('failed_to_seed_progress_demo', {
      athleteId,
      error,
    });
    return err(storageError('Failed to seed progress demo data'));
  }
}
/**
 * DEMO SEED SERVICE (legacy)
 *
 * Provides seeded progress data for demo/mock environments.
 * Sprint note (Data Display Sprint 2): demo-aware UI banners added in consumers; this module
 * remains until a dedicated lazy-generation refactor removes the large seed dependency.
 */
