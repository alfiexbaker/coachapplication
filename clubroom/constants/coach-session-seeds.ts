import type { Session } from '@/constants/app-types';

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(days: number, hour: number, minute = 0): string {
  const timestamp = Date.now() - days * DAY_MS;
  const date = new Date(timestamp);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

export function buildCoachSessionSeeds(): Session[] {
  return [
    {
      id: 'seed_session_user1_1',
      bookingId: 'seed_booking_user1_1',
      coachId: 'coach1',
      athleteId: 'user1',
      completedAt: daysAgo(2, 17, 30),
      attendance: 'ATTENDED',
      notes: 'Sharp session. Continue scanning before first touch.',
      skillsWorkedOn: ['Scanning', 'First Touch', 'Passing'],
      performanceRating: 4,
      nextFocusAreas: ['Play forward quicker', 'Open body shape'],
      coachName: 'Jess Okafor',
    },
    {
      id: 'seed_session_user2_1',
      bookingId: 'seed_booking_user2_1',
      coachId: 'coach1',
      athleteId: 'user2',
      completedAt: daysAgo(4, 18, 0),
      attendance: 'ATTENDED',
      notes: '',
      skillsWorkedOn: ['Finishing', 'Movement'],
      performanceRating: 3,
      nextFocusAreas: ['Weaker-foot finishing', 'Shot selection speed'],
      coachName: 'Jess Okafor',
    },
    {
      id: 'seed_session_user2_2',
      bookingId: 'seed_booking_user2_2',
      coachId: 'coach1',
      athleteId: 'user2',
      completedAt: daysAgo(8, 18, 30),
      attendance: 'ATTENDED',
      notes: 'Good progression in passing rhythm under pressure.',
      skillsWorkedOn: ['Passing', 'Composure'],
      performanceRating: 4,
      nextFocusAreas: ['Switch play earlier', 'Receive on back foot'],
      coachName: 'Jess Okafor',
    },
    {
      id: 'seed_session_user3_1',
      bookingId: 'seed_booking_user3_1',
      coachId: 'coach1',
      athleteId: 'user3',
      completedAt: daysAgo(13, 19, 0),
      attendance: 'ATTENDED',
      notes: 'Handled high balls confidently, distribution still inconsistent.',
      skillsWorkedOn: ['Goalkeeping', 'Distribution'],
      performanceRating: 3,
      nextFocusAreas: ['Set position before release', 'Long-pass accuracy'],
      coachName: 'Jess Okafor',
    },
    {
      id: 'seed_session_user1_2',
      bookingId: 'seed_booking_user1_2',
      coachId: 'coach1',
      athleteId: 'user1',
      completedAt: daysAgo(18, 17, 0),
      attendance: 'ATTENDED',
      notes: 'Decision-making improving in final third.',
      skillsWorkedOn: ['Decision Making', 'Dribbling'],
      performanceRating: 5,
      nextFocusAreas: ['Final ball quality', 'Acceleration after turn'],
      coachName: 'Jess Okafor',
    },
    {
      id: 'seed_session_user3_2',
      bookingId: 'seed_booking_user3_2',
      coachId: 'coach2',
      athleteId: 'user3',
      completedAt: daysAgo(3, 16, 30),
      attendance: 'ATTENDED',
      notes: 'Strong group energy, good communication throughout.',
      skillsWorkedOn: ['Communication', 'Positioning'],
      performanceRating: 4,
      nextFocusAreas: ['Lead defensive line', 'Quick reset after save'],
      coachName: 'Reuben Carr',
    },
    {
      id: 'seed_session_user1_3',
      bookingId: 'seed_booking_user1_3',
      coachId: 'coach2',
      athleteId: 'user1',
      completedAt: daysAgo(10, 16, 0),
      attendance: 'ATTENDED',
      notes: 'Work rate strong. Needs cleaner decision in transition.',
      skillsWorkedOn: ['Transition', 'Passing'],
      performanceRating: 4,
      nextFocusAreas: ['One-touch passing', 'Awareness before receive'],
      coachName: 'Reuben Carr',
    },
  ];
}
