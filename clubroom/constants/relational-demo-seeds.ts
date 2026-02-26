import type { Booking, Session, User } from '@/constants/app-types';
import { buildCoachSessionSeeds } from '@/constants/coach-session-seeds';
import type {
  ChatMessage,
  ClubSquad,
  FamilyCalendarEvent,
  FamilyMember,
  FavouriteCoach,
  RosterEntry,
  SessionInvite,
  SessionOffering,
  SquadMember,
} from '@/constants/types';

const DAY_MS = 24 * 60 * 60 * 1000;

export const RELATIONAL_DEMO_SEED_VERSION =
  '2026-02-21-relational-v6-premium-demo-names';
export const CLUB_LIONS_ID = 'club_lions';

export interface RateCoachStoredReview {
  id: string;
  coachId: string;
  coachName?: string;
  userId?: string;
  userName: string;
  parentName: string;
  rating: number;
  text: string;
  content: string;
  createdAt: string;
  sessionDate: string;
}

export interface PublicCoachReview {
  id: string;
  coachId: string;
  reviewerName: string;
  reviewerId?: string;
  rating: number;
  comment?: string;
  sessionType?: string;
  createdAt: string;
}

export interface CoachDirectoryEntry {
  id: string;
  name: string;
  bio?: string;
  sports: string[];
  location?: { city: string; state?: string; lat?: number; lng?: number };
  distance?: number;
  rating: number;
  reviewCount: number;
  minPrice: number;
  maxPrice?: number;
  profilePhotoUrl?: string;
  coverPhotoUrl?: string;
  joinedAt?: string;
  totalSessions: number;
  nextAvailable?: string;
  badges?: string[];
  footballFocuses?: string[];
  qualifications?: string[];
  yearsExperience?: number;
  dbsChecked?: boolean;
}

export interface ClubMemberSeed {
  userId: string;
  userName: string;
  userPhotoUrl?: string;
  role: 'OWNER' | 'ADMIN' | 'HEAD_COACH' | 'COACH' | 'MEMBER';
  status: 'active' | 'pending' | 'banned';
  joinedAt: string;
  squadIds?: string[];
  bannedAt?: string;
  bannedBy?: string;
  banReason?: string;
}

export interface CoachBookingSeed {
  id: string;
  title: string;
  scheduledAt: string;
  location?: string;
  duration?: number;
  maxAthletes?: number;
  currentAthletes?: number;
  athleteIds?: string[];
  coachId?: string;
}

export interface ChildProfileSeed {
  id: string;
  parentId: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  dateOfBirth?: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  relationship: 'SON' | 'DAUGHTER' | 'WARD' | 'GRANDCHILD' | 'OTHER';
  photoUrl?: string;
  disabilities: {
    id: string;
    type: string;
    diagnosisDate?: string;
    description?: string;
    supportRequired?: string;
    communicationPreferences?: string[];
    triggers?: string[];
    calmingStrategies?: string[];
  }[];
  specialNeeds: {
    id: string;
    category: 'PHYSICAL' | 'LEARNING' | 'SENSORY' | 'BEHAVIORAL' | 'MEDICAL' | 'OTHER';
    name: string;
    description?: string;
    severity?: 'MILD' | 'MODERATE' | 'SEVERE';
    accommodationsNeeded?: string[];
    parentHints?: string;
  }[];
  hasSpecialNeeds: boolean;
  allergies: string[];
  medicalConditions: string[];
  medications: string[];
  communicationNotes?: string;
  behavioralNotes?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  secondaryEmergencyName?: string;
  secondaryEmergencyPhone?: string;
  photoConsent: boolean;
  videoConsent: boolean;
  socialMediaConsent: boolean;
  emergencyTreatmentConsent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppReviewRecord {
  id: string;
  coachId: string;
  coachName?: string;
  parentId?: string;
  parentName?: string;
  parentPhotoUrl?: string;
  athleteId?: string;
  athleteName?: string;
  bookingId?: string;
  rating: number;
  title?: string;
  content: string;
  comment?: string;
  isPublic?: boolean;
  isVerifiedBooking?: boolean;
  status?: 'PUBLISHED' | 'FLAGGED' | 'HIDDEN';
  createdAt: string;
  helpfulCount?: number;
}

export interface RelationalDemoSeedPayload {
  users: User[];
  bookings: Booking[];
  offerings: SessionOffering[];
  invites: SessionInvite[];
  coachSessions: Session[];
  roster: RosterEntry[];
  favourites: FavouriteCoach[];
  messagesByThread: Record<string, ChatMessage[]>;
  reviews: AppReviewRecord[];
  rateCoachReviews: RateCoachStoredReview[];
  coachPublicReviews: PublicCoachReview[];
  coaches: CoachDirectoryEntry[];
  squads: ClubSquad[];
  squadMembers: SquadMember[];
  clubMembers: ClubMemberSeed[];
  childrenProfiles: ChildProfileSeed[];
  familyMembers: FamilyMember[];
  familyBookings: FamilyCalendarEvent[];
  coachBookings: CoachBookingSeed[];
}

function withOffset(dayOffset: number, hour: number, minute = 0): Date {
  const date = new Date(Date.now() + dayOffset * DAY_MS);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function isoAt(dayOffset: number, hour: number, minute = 0): string {
  return withOffset(dayOffset, hour, minute).toISOString();
}

function dateAt(dayOffset: number): string {
  return withOffset(dayOffset, 12, 0).toISOString().slice(0, 10);
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const deduped: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    deduped.push(item);
  }
  return deduped;
}

function buildUsers(): User[] {
  return [
    {
      id: 'coach1',
      email: 'jess.okafor@coach.com',
      role: 'COACH',
      name: 'Jess Okafor',
      postcode: 'N1 1AA',
      dateOfBirth: '1988-03-15',
    },
    {
      id: 'coach2',
      email: 'reuben.carr@coach.com',
      role: 'COACH',
      name: 'Reuben Carr',
      postcode: 'E8 4RH',
      dateOfBirth: '1985-07-22',
    },
    {
      id: 'coach3',
      email: 'aiden.sharma@coach.com',
      role: 'COACH',
      name: 'Aiden Sharma',
      postcode: 'SW2 4AB',
      dateOfBirth: '1990-11-08',
    },
    {
      id: 'academy1',
      email: 'contact@southgateacademy.com',
      role: 'COACH',
      name: 'Southgate Academy',
      postcode: 'EC1A 2BN',
      dateOfBirth: '2015-01-01',
    },
    {
      id: 'admin',
      email: 'admin@coach.com',
      role: 'ADMIN',
      name: 'Admin User',
      postcode: 'WC1A 1AA',
      dateOfBirth: '1985-01-01',
    },
    {
      id: 'user1',
      email: 'alfie.barton@email.com',
      role: 'USER',
      name: 'Alfie Barton',
      postcode: 'N4 3PR',
      dateOfBirth: '2008-05-12',
    },
    {
      id: 'user2',
      email: 'maisie.barton@email.com',
      role: 'USER',
      name: 'Maisie Barton',
      postcode: 'N4 3PR',
      dateOfBirth: '2009-08-20',
    },
    {
      id: 'user3',
      email: 'kai.mensah@email.com',
      role: 'USER',
      name: 'Kai Mensah',
      postcode: 'E15 2JJ',
      dateOfBirth: '2007-01-05',
    },
    {
      id: 'user4',
      email: 'chris.barton@email.com',
      role: 'USER',
      name: 'Chris Barton',
      postcode: 'N4 3PR',
      dateOfBirth: '1980-02-11',
    },
    {
      id: 'user5',
      email: 'nadia.mensah@email.com',
      role: 'USER',
      name: 'Nadia Mensah',
      postcode: 'E15 2JJ',
      dateOfBirth: '1983-09-07',
    },
    {
      id: 'user6',
      email: 'dan.mensah@email.com',
      role: 'USER',
      name: 'Dan Mensah',
      postcode: 'SW11 2AA',
      dateOfBirth: '1990-06-15',
    },
    {
      id: 'athlete_4',
      email: 'priya.kapoor@email.com',
      role: 'USER',
      name: 'Priya Kapoor',
      postcode: 'E2 8AA',
      dateOfBirth: '2010-03-10',
    },
    {
      id: 'athlete_5',
      email: 'finley.reeves@email.com',
      role: 'USER',
      name: 'Finley Reeves',
      postcode: 'E2 8AA',
      dateOfBirth: '2011-09-02',
    },
    {
      id: 'parent_3',
      email: 'anita.kapoor@email.com',
      role: 'USER',
      name: 'Anita Kapoor',
      postcode: 'E2 8AA',
      dateOfBirth: '1984-04-18',
    },
    {
      id: 'parent_4',
      email: 'steve.reeves@email.com',
      role: 'USER',
      name: 'Steve Reeves',
      postcode: 'E2 8AA',
      dateOfBirth: '1981-12-04',
    },
    {
      id: 'parent_5',
      email: 'vanessa.osei@email.com',
      role: 'USER',
      name: 'Vanessa Osei',
      postcode: 'N7 0DP',
      dateOfBirth: '1986-06-29',
    },
    {
      id: 'parent_6',
      email: 'tariq.hussain@email.com',
      role: 'USER',
      name: 'Tariq Hussain',
      postcode: 'E10 4LA',
      dateOfBirth: '1982-10-17',
    },
    {
      id: 'athlete_6',
      email: 'jayden.osei@email.com',
      role: 'USER',
      name: 'Jayden Osei',
      postcode: 'N7 0DP',
      dateOfBirth: '2010-07-13',
    },
    {
      id: 'athlete_7',
      email: 'marcus.osei@email.com',
      role: 'USER',
      name: 'Marcus Osei',
      postcode: 'N7 0DP',
      dateOfBirth: '2011-02-24',
    },
    {
      id: 'athlete_8',
      email: 'zara.hussain@email.com',
      role: 'USER',
      name: 'Zara Hussain',
      postcode: 'E10 4LA',
      dateOfBirth: '2010-11-03',
    },
    {
      id: 'parent_7',
      email: 'linh.nguyen@email.com',
      role: 'USER',
      name: 'Linh Nguyen',
      postcode: 'SE10 9AB',
      dateOfBirth: '1987-01-14',
    },
    {
      id: 'athlete_9',
      email: 'ollie.nguyen@email.com',
      role: 'USER',
      name: 'Ollie Nguyen',
      postcode: 'SE10 9AB',
      dateOfBirth: '2010-04-21',
    },
    {
      id: 'athlete_10',
      email: 'tia.nguyen@email.com',
      role: 'USER',
      name: 'Tia Nguyen',
      postcode: 'SE10 9AB',
      dateOfBirth: '2011-09-14',
    },
  ];
}

function buildCoachSessions(): Session[] {
  const seedSessions = buildCoachSessionSeeds();
  const extraSession: Session = {
    id: 'seed_session_athlete4_1',
    bookingId: 'seed_booking_athlete4_1',
    coachId: 'coach1',
    athleteId: 'athlete_4',
    completedAt: isoAt(-5, 17, 30),
    attendance: 'ATTENDED',
    notes: 'Strong pressing triggers. Keep improving body shape before tackling.',
    skillsWorkedOn: ['Pressing', 'Defending'],
    performanceRating: 4,
    nextFocusAreas: ['Scan shoulder before press', 'Stay compact with unit'],
    coachName: 'Jess Okafor',
  };

  return dedupeById([...seedSessions, extraSession]);
}

function buildBaseBookings(): Booking[] {
  return [
    {
      id: 'book1',
      coachId: 'coach1',
      athleteIds: ['user1'],
      athleteId: 'user1',
      bookedById: 'user4',
      status: 'CONFIRMED',
      scheduledAt: isoAt(1, 17, 0),
      duration: 60,
      location: 'Pitch 2',
      notes: 'Focus on scanning before receiving.',
      coachName: 'Jess Okafor',
      service: '1-to-1 Training',
      serviceType: '1on1',
      objectives: ['Finishing', 'First touch'],
      price: 60,
      createdAt: isoAt(-2, 9, 30),
    },
    {
      id: 'book2',
      coachId: 'coach2',
      athleteIds: ['user2'],
      athleteId: 'user2',
      bookedById: 'user4',
      status: 'CONFIRMED',
      scheduledAt: isoAt(2, 16, 30),
      duration: 75,
      location: 'Hackney Marshes',
      notes: 'Small-group touch and movement.',
      coachName: 'Reuben Carr',
      service: 'Small Group Session',
      serviceType: 'group',
      objectives: ['Movement', 'Composure'],
      price: 45,
      createdAt: isoAt(-3, 10, 15),
    },
    {
      id: 'book3',
      coachId: 'coach1',
      athleteIds: ['user3'],
      athleteId: 'user3',
      bookedById: 'user5',
      status: 'PENDING',
      scheduledAt: isoAt(3, 18, 0),
      duration: 60,
      location: 'Pitch 1',
      notes: 'Pending confirmation after schedule clash.',
      coachName: 'Jess Okafor',
      service: 'Goalkeeper Technique',
      serviceType: '1on1',
      objectives: ['Distribution'],
      price: 55,
      createdAt: isoAt(-1, 13, 0),
    },
    {
      id: 'book4',
      coachId: 'coach1',
      athleteIds: ['athlete_4'],
      athleteId: 'athlete_4',
      bookedById: 'parent_3',
      status: 'CONFIRMED',
      scheduledAt: isoAt(4, 17, 15),
      duration: 60,
      location: 'Pitch 2',
      notes: 'Defensive compactness.',
      coachName: 'Jess Okafor',
      service: 'Defending Lab',
      serviceType: '1on1',
      objectives: ['Defending'],
      price: 55,
      createdAt: isoAt(-4, 12, 0),
    },
    {
      id: 'book5',
      coachId: 'coach1',
      athleteIds: ['athlete_5'],
      athleteId: 'athlete_5',
      bookedById: 'parent_4',
      status: 'CONFIRMED',
      scheduledAt: isoAt(6, 17, 45),
      duration: 60,
      location: 'Sports Hall',
      notes: 'Confidence and ball mastery.',
      coachName: 'Jess Okafor',
      service: 'Junior Ball Mastery',
      serviceType: '1on1',
      objectives: ['Ball control'],
      price: 50,
      createdAt: isoAt(-3, 11, 45),
    },
    {
      id: 'book6',
      coachId: 'coach1',
      athleteIds: ['user1'],
      athleteId: 'user1',
      bookedById: 'user4',
      status: 'COMPLETED',
      scheduledAt: isoAt(-6, 17, 0),
      duration: 60,
      location: 'Pitch 2',
      notes: 'Completed finishing session.',
      coachName: 'Jess Okafor',
      service: '1-to-1 Training',
      serviceType: '1on1',
      objectives: ['Finishing'],
      price: 60,
      createdAt: isoAt(-7, 8, 45),
      sessionInviteId: 'inv_accepted_user4_1',
    },
    {
      id: 'book7',
      coachId: 'coach2',
      athleteIds: ['user3'],
      athleteId: 'user3',
      bookedById: 'user5',
      status: 'COMPLETED',
      scheduledAt: isoAt(-8, 16, 0),
      duration: 75,
      location: 'Victoria Park',
      notes: 'Completed high-intensity block.',
      coachName: 'Reuben Carr',
      service: 'Small Group Session',
      serviceType: 'group',
      objectives: ['Work rate'],
      price: 45,
      createdAt: isoAt(-9, 9, 30),
    },
    {
      id: 'book8',
      coachId: 'coach1',
      athleteIds: ['user2'],
      athleteId: 'user2',
      bookedById: 'user4',
      status: 'AWAITING_COMPLETION',
      scheduledAt: isoAt(-1, 15, 30),
      duration: 60,
      location: 'Pitch 2',
      notes: 'Awaiting coach notes and ratings.',
      coachName: 'Jess Okafor',
      service: 'Decision-Making Session',
      serviceType: '1on1',
      objectives: ['Game Vision'],
      price: 60,
      createdAt: isoAt(-2, 9, 0),
    },
    {
      id: 'book9_group_user1',
      coachId: 'coach1',
      athleteIds: ['user1'],
      athleteId: 'user1',
      bookedById: 'user4',
      status: 'AWAITING_COMPLETION',
      scheduledAt: isoAt(-1, 19, 0),
      duration: 75,
      location: 'Pitch 2',
      notes: 'Group session attendance pending coach completion.',
      coachName: 'Jess Okafor',
      service: 'U15 Pressing Clinic',
      serviceType: 'group',
      objectives: ['Pressing & Defending'],
      price: 25,
      createdAt: isoAt(-3, 8, 30),
      groupSessionId: 'offering_u15_pressing',
      groupRegistrationId: 'reg_u15_user1',
      isGroupSession: true,
      currentParticipants: 9,
      maxParticipants: 12,
    },
    {
      id: 'book10_group_user2',
      coachId: 'coach1',
      athleteIds: ['user2'],
      athleteId: 'user2',
      bookedById: 'user4',
      status: 'AWAITING_COMPLETION',
      scheduledAt: isoAt(-1, 19, 0),
      duration: 75,
      location: 'Pitch 2',
      notes: 'Group session attendance pending coach completion.',
      coachName: 'Jess Okafor',
      service: 'U15 Pressing Clinic',
      serviceType: 'group',
      objectives: ['Pressing & Defending'],
      price: 25,
      createdAt: isoAt(-3, 8, 30),
      groupSessionId: 'offering_u15_pressing',
      groupRegistrationId: 'reg_u15_user2',
      isGroupSession: true,
      currentParticipants: 9,
      maxParticipants: 12,
    },
    {
      id: 'book11_group_user3',
      coachId: 'coach1',
      athleteIds: ['user3'],
      athleteId: 'user3',
      bookedById: 'user5',
      status: 'AWAITING_COMPLETION',
      scheduledAt: isoAt(-1, 19, 0),
      duration: 75,
      location: 'Pitch 2',
      notes: 'Group session attendance pending coach completion.',
      coachName: 'Jess Okafor',
      service: 'U15 Pressing Clinic',
      serviceType: 'group',
      objectives: ['Pressing & Defending'],
      price: 25,
      createdAt: isoAt(-3, 8, 30),
      groupSessionId: 'offering_u15_pressing',
      groupRegistrationId: 'reg_u15_user3',
      isGroupSession: true,
      currentParticipants: 9,
      maxParticipants: 12,
    },
    {
      id: 'book12_group_athlete4',
      coachId: 'coach1',
      athleteIds: ['athlete_4'],
      athleteId: 'athlete_4',
      bookedById: 'parent_3',
      status: 'AWAITING_COMPLETION',
      scheduledAt: isoAt(-1, 19, 0),
      duration: 75,
      location: 'Pitch 2',
      notes: 'Group session attendance pending coach completion.',
      coachName: 'Jess Okafor',
      service: 'U15 Pressing Clinic',
      serviceType: 'group',
      objectives: ['Pressing & Defending'],
      price: 25,
      createdAt: isoAt(-3, 8, 30),
      groupSessionId: 'offering_u15_pressing',
      groupRegistrationId: 'reg_u15_athlete4',
      isGroupSession: true,
      currentParticipants: 9,
      maxParticipants: 12,
    },
    {
      id: 'book13_group_athlete6',
      coachId: 'coach1',
      athleteIds: ['athlete_6'],
      athleteId: 'athlete_6',
      bookedById: 'parent_5',
      status: 'AWAITING_COMPLETION',
      scheduledAt: isoAt(-1, 19, 0),
      duration: 75,
      location: 'Pitch 2',
      notes: 'Group session attendance pending coach completion.',
      coachName: 'Jess Okafor',
      service: 'U15 Pressing Clinic',
      serviceType: 'group',
      objectives: ['Pressing & Defending'],
      price: 25,
      createdAt: isoAt(-3, 8, 30),
      groupSessionId: 'offering_u15_pressing',
      groupRegistrationId: 'reg_u15_athlete6',
      isGroupSession: true,
      currentParticipants: 9,
      maxParticipants: 12,
    },
    {
      id: 'book14_group_athlete7',
      coachId: 'coach1',
      athleteIds: ['athlete_7'],
      athleteId: 'athlete_7',
      bookedById: 'parent_5',
      status: 'AWAITING_COMPLETION',
      scheduledAt: isoAt(-1, 19, 0),
      duration: 75,
      location: 'Pitch 2',
      notes: 'Group session attendance pending coach completion.',
      coachName: 'Jess Okafor',
      service: 'U15 Pressing Clinic',
      serviceType: 'group',
      objectives: ['Pressing & Defending'],
      price: 25,
      createdAt: isoAt(-3, 8, 30),
      groupSessionId: 'offering_u15_pressing',
      groupRegistrationId: 'reg_u15_athlete7',
      isGroupSession: true,
      currentParticipants: 9,
      maxParticipants: 12,
    },
    {
      id: 'book15_group_athlete8',
      coachId: 'coach1',
      athleteIds: ['athlete_8'],
      athleteId: 'athlete_8',
      bookedById: 'parent_6',
      status: 'AWAITING_COMPLETION',
      scheduledAt: isoAt(-1, 19, 0),
      duration: 75,
      location: 'Pitch 2',
      notes: 'Group session attendance pending coach completion.',
      coachName: 'Jess Okafor',
      service: 'U15 Pressing Clinic',
      serviceType: 'group',
      objectives: ['Pressing & Defending'],
      price: 25,
      createdAt: isoAt(-3, 8, 30),
      groupSessionId: 'offering_u15_pressing',
      groupRegistrationId: 'reg_u15_athlete8',
      isGroupSession: true,
      currentParticipants: 9,
      maxParticipants: 12,
    },
    {
      id: 'book16_group_athlete9',
      coachId: 'coach1',
      athleteIds: ['athlete_9'],
      athleteId: 'athlete_9',
      bookedById: 'parent_7',
      status: 'AWAITING_COMPLETION',
      scheduledAt: isoAt(-1, 19, 0),
      duration: 75,
      location: 'Pitch 2',
      notes: 'Group session attendance pending coach completion.',
      coachName: 'Jess Okafor',
      service: 'U15 Pressing Clinic',
      serviceType: 'group',
      objectives: ['Pressing & Defending'],
      price: 25,
      createdAt: isoAt(-3, 8, 30),
      groupSessionId: 'offering_u15_pressing',
      groupRegistrationId: 'reg_u15_athlete9',
      isGroupSession: true,
      currentParticipants: 9,
      maxParticipants: 12,
    },
    {
      id: 'book17_group_athlete10',
      coachId: 'coach1',
      athleteIds: ['athlete_10'],
      athleteId: 'athlete_10',
      bookedById: 'parent_7',
      status: 'AWAITING_COMPLETION',
      scheduledAt: isoAt(-1, 19, 0),
      duration: 75,
      location: 'Pitch 2',
      notes: 'Group session attendance pending coach completion.',
      coachName: 'Jess Okafor',
      service: 'U15 Pressing Clinic',
      serviceType: 'group',
      objectives: ['Pressing & Defending'],
      price: 25,
      createdAt: isoAt(-3, 8, 30),
      groupSessionId: 'offering_u15_pressing',
      groupRegistrationId: 'reg_u15_athlete10',
      isGroupSession: true,
      currentParticipants: 9,
      maxParticipants: 12,
    },
    {
      id: 'book18',
      coachId: 'coach1',
      athleteIds: ['athlete_6'],
      athleteId: 'athlete_6',
      bookedById: 'parent_5',
      status: 'CONFIRMED',
      scheduledAt: isoAt(3, 18, 15),
      duration: 60,
      location: 'Pitch 3',
      notes: '1-to-1 pressing efficiency and recovery runs.',
      coachName: 'Jess Okafor',
      service: '1-to-1 Pressing Tune-up',
      serviceType: '1on1',
      objectives: ['Pressing & Defending', '1v1 Defending'],
      price: 58,
      createdAt: isoAt(-2, 11, 20),
    },
    {
      id: 'book19',
      coachId: 'coach1',
      athleteIds: ['athlete_10'],
      athleteId: 'athlete_10',
      bookedById: 'parent_7',
      status: 'COMPLETED',
      scheduledAt: isoAt(-10, 17, 30),
      duration: 60,
      location: 'Pitch 1',
      notes: 'Completed directional receiving session.',
      coachName: 'Jess Okafor',
      service: 'Directional Receiving 1-to-1',
      serviceType: '1on1',
      objectives: ['First touch', 'Awareness'],
      price: 57,
      createdAt: isoAt(-12, 9, 40),
    },
    {
      id: 'book20_parent_self_user4',
      coachId: 'coach2',
      athleteIds: ['user4'],
      athleteId: 'user4',
      bookedById: 'user4',
      status: 'CONFIRMED',
      scheduledAt: isoAt(5, 19, 15),
      duration: 60,
      location: 'Victoria Park Studio',
      notes: 'Parent self-training session alongside child pathways.',
      coachName: 'Reuben Carr',
      service: 'Adult Technical Tune-up',
      serviceType: '1on1',
      objectives: ['Passing', 'Conditioning'],
      price: 48,
      createdAt: isoAt(-1, 14, 10),
    },
    {
      id: 'book21_user2_eagles_clinic',
      coachId: 'coach2',
      athleteIds: ['user2'],
      athleteId: 'user2',
      bookedById: 'user4',
      status: 'CONFIRMED',
      scheduledAt: isoAt(6, 17, 30),
      duration: 75,
      location: 'East London Eagles Hub',
      notes: 'Maisie joins her Eagles squad technical block.',
      coachName: 'Reuben Carr',
      service: 'Eagles U14 Technical Circuit',
      serviceType: 'group',
      objectives: ['Passing', 'Composure'],
      price: 42,
      createdAt: isoAt(-2, 16, 0),
      groupSessionId: 'offering_eagles_u14_technical',
      groupRegistrationId: 'reg_eagles_u14_user2',
      isGroupSession: true,
      currentParticipants: 4,
      maxParticipants: 10,
    },
  ];
}

function buildBookingsFromSessions(sessions: Session[]): Booking[] {
  return sessions.map((session) => ({
    id: session.bookingId,
    coachId: session.coachId,
    athleteIds: [session.athleteId],
    athleteId: session.athleteId,
    bookedById: session.athleteId === 'user3' ? 'user5' : 'user4',
    status: 'COMPLETED',
    scheduledAt: session.completedAt,
    duration: 60,
    location: 'Lions FC Academy',
    notes: session.notes,
    coachName: session.coachName,
    service: 'Performance Session',
    serviceType: '1on1',
    objectives: session.skillsWorkedOn.slice(0, 2),
    price: 55,
    createdAt: session.completedAt,
  }));
}

function buildOfferings(): SessionOffering[] {
  return [
    {
      id: 'offering_u15_pressing',
      coachId: 'coach1',
      clubId: CLUB_LIONS_ID,
      clubScope: 'club',
      squadId: 'squad_u15',
      inviteType: 'OPEN',
      title: 'U15 Pressing Clinic',
      description: 'High-intensity pressing and transition actions.',
      sessionType: 'group',
      maxParticipants: 12,
      location: 'Pitch 2',
      scheduledAt: isoAt(2, 19, 0),
      isRecurring: false,
      recurrenceType: 'none',
      status: 'active',
      visibility: 'club',
      registrations: [
        {
          id: 'reg_u15_user1',
          userId: 'user1',
          bookedAt: isoAt(-1, 10, 0),
          status: 'confirmed',
        },
        {
          id: 'reg_u15_user2',
          userId: 'user2',
          bookedAt: isoAt(-1, 10, 5),
          status: 'confirmed',
        },
        {
          id: 'reg_u15_user3',
          userId: 'user3',
          bookedAt: isoAt(-1, 10, 10),
          status: 'confirmed',
        },
        {
          id: 'reg_u15_athlete4',
          userId: 'athlete_4',
          bookedAt: isoAt(-1, 10, 15),
          status: 'confirmed',
        },
        {
          id: 'reg_u15_athlete6',
          userId: 'athlete_6',
          bookedAt: isoAt(-1, 10, 20),
          status: 'confirmed',
        },
        {
          id: 'reg_u15_athlete7',
          userId: 'athlete_7',
          bookedAt: isoAt(-1, 10, 25),
          status: 'confirmed',
        },
        {
          id: 'reg_u15_athlete8',
          userId: 'athlete_8',
          bookedAt: isoAt(-1, 10, 30),
          status: 'confirmed',
        },
        {
          id: 'reg_u15_athlete9',
          userId: 'athlete_9',
          bookedAt: isoAt(-1, 10, 35),
          status: 'confirmed',
        },
        {
          id: 'reg_u15_athlete10',
          userId: 'athlete_10',
          bookedAt: isoAt(-1, 10, 40),
          status: 'confirmed',
        },
      ],
      createdAt: isoAt(-3, 8, 30),
      duration: 75,
      price: 25,
      ageMin: 13,
      ageMax: 15,
      footballSkill: 'Conditioning',
      invitedAthleteIds: [
        'user1',
        'user2',
        'user3',
        'athlete_4',
        'athlete_6',
        'athlete_7',
        'athlete_8',
        'athlete_9',
        'athlete_10',
      ],
      invitedAthleteNames: [
        'Alfie Barton',
        'Maisie Barton',
        'Kai Mensah',
        'Priya Kapoor',
        'Jayden Osei',
        'Marcus Osei',
        'Zara Hussain',
        'Ollie Nguyen',
        'Tia Nguyen',
      ],
    },
    {
      id: 'offering_finishing_block',
      coachId: 'coach1',
      clubId: CLUB_LIONS_ID,
      clubScope: 'squad',
      squadId: 'squad_u15',
      inviteType: 'CLOSED',
      title: 'Finishing Block',
      description: 'Small group finishing and shot decision work.',
      sessionType: 'group',
      maxParticipants: 6,
      location: 'Pitch 1',
      scheduledAt: isoAt(5, 17, 0),
      isRecurring: false,
      recurrenceType: 'none',
      status: 'active',
      visibility: 'club',
      registrations: [
        {
          id: 'reg_finishing_user4',
          userId: 'user4',
          bookedAt: isoAt(-2, 9, 0),
          status: 'confirmed',
        },
      ],
      createdAt: isoAt(-4, 12, 0),
      duration: 60,
      price: 30,
      ageMin: 12,
      ageMax: 16,
      footballSkill: 'Finishing',
      invitedAthleteIds: ['user1', 'user2', 'user3'],
      invitedAthleteNames: ['Alfie Barton', 'Maisie Barton', 'Kai Mensah'],
    },
    {
      id: 'offering_goalkeeper_lab',
      coachId: 'coach2',
      clubId: 'club_eagles',
      clubScope: 'public',
      inviteType: 'OPEN',
      title: 'Goalkeeper Distribution Lab',
      description: 'Handling, distribution, and game restart decisions.',
      sessionType: 'group',
      maxParticipants: 8,
      location: 'Victoria Park',
      scheduledAt: isoAt(4, 18, 30),
      isRecurring: false,
      recurrenceType: 'none',
      status: 'active',
      visibility: 'public',
      registrations: [
        {
          id: 'reg_goalkeeper_user5',
          userId: 'user5',
          bookedAt: isoAt(-1, 11, 0),
          status: 'confirmed',
        },
      ],
      createdAt: isoAt(-5, 9, 45),
      duration: 75,
      price: 28,
      ageMin: 11,
      ageMax: 16,
      footballSkill: 'Goalkeeping',
    },
    {
      id: 'offering_eagles_u14_technical',
      coachId: 'coach2',
      clubId: 'club_eagles',
      clubScope: 'squad',
      squadId: 'squad_eagles_u14',
      inviteType: 'SQUAD_ONLY',
      title: 'Eagles U14 Technical Circuit',
      description: 'First-touch and passing detail for East London Eagles U14 athletes.',
      sessionType: 'group',
      maxParticipants: 10,
      location: 'East London Eagles Hub',
      scheduledAt: isoAt(6, 17, 30),
      isRecurring: false,
      recurrenceType: 'none',
      status: 'active',
      visibility: 'club',
      registrations: [
        {
          id: 'reg_eagles_u14_user2',
          userId: 'user2',
          bookedAt: isoAt(-2, 15, 30),
          status: 'confirmed',
        },
        {
          id: 'reg_eagles_u14_athlete8',
          userId: 'athlete_8',
          bookedAt: isoAt(-2, 15, 40),
          status: 'confirmed',
        },
      ],
      createdAt: isoAt(-6, 10, 0),
      duration: 75,
      price: 32,
      ageMin: 13,
      ageMax: 15,
      footballSkill: 'Passing',
      invitedAthleteIds: ['user2', 'athlete_8'],
      invitedAthleteNames: ['Maisie Barton', 'Zara Hussain'],
    },
    {
      id: 'offering_parent_review_history',
      coachId: 'coach1',
      clubId: CLUB_LIONS_ID,
      clubScope: 'public',
      inviteType: 'OPEN',
      title: 'Past Technical Session',
      description: 'Past completed session for review and history coverage.',
      sessionType: '1on1',
      maxParticipants: 1,
      location: 'Pitch 2',
      scheduledAt: isoAt(-5, 10, 30),
      isRecurring: false,
      recurrenceType: 'none',
      status: 'completed',
      visibility: 'public',
      registrations: [
        {
          id: 'reg_history_user4',
          userId: 'user4',
          bookedAt: isoAt(-6, 9, 15),
          status: 'confirmed',
        },
      ],
      createdAt: isoAt(-10, 8, 0),
      duration: 60,
      price: 55,
      footballSkill: 'Passing',
    },
  ];
}

function buildInvites(): SessionInvite[] {
  return [
    {
      id: 'inv_pending_user4_1',
      coachId: 'coach1',
      clubName: 'Lions FC Academy',
      inviteType: 'CLOSED',
      athleteIds: ['user1', 'user2'],
      parentId: 'user4',
      proposedSlots: [
        {
          date: dateAt(5),
          startTime: '17:00',
          endTime: '18:00',
          location: 'Pitch 1',
        },
      ],
      sessionType: 'Finishing Block',
      focus: 'Finishing',
      notes: 'Invite for your selected athletes to join the finishing block.',
      price: 30,
      duration: 60,
      status: 'PENDING',
      expiresAt: isoAt(9, 23, 59),
      createdAt: isoAt(-1, 8, 0),
      existingSessionId: 'offering_finishing_block',
    },
    {
      id: 'inv_pending_user5_1',
      coachId: 'coach2',
      clubName: 'East London Eagles',
      inviteType: 'OPEN',
      athleteIds: ['user3'],
      parentId: 'user5',
      proposedSlots: [
        {
          date: dateAt(4),
          startTime: '18:30',
          endTime: '19:45',
          location: 'Victoria Park',
        },
      ],
      sessionType: 'Goalkeeper Distribution Lab',
      focus: 'Goalkeeping',
      notes: 'Join the next goalkeeper lab.',
      price: 28,
      duration: 75,
      status: 'PENDING',
      expiresAt: isoAt(8, 20, 0),
      createdAt: isoAt(-1, 9, 15),
      existingSessionId: 'offering_goalkeeper_lab',
    },
    {
      id: 'inv_accepted_user4_1',
      coachId: 'coach1',
      clubName: 'Lions FC Academy',
      inviteType: 'CLOSED',
      athleteIds: ['user1'],
      parentId: 'user4',
      proposedSlots: [
        {
          date: dateAt(-6),
          startTime: '17:00',
          endTime: '18:00',
          location: 'Pitch 2',
        },
      ],
      sessionType: '1-to-1 Training',
      focus: 'Finishing',
      notes: 'Completed invite converted to booking.',
      price: 60,
      duration: 60,
      status: 'ACCEPTED',
      expiresAt: isoAt(-5, 23, 59),
      createdAt: isoAt(-8, 10, 0),
      respondedAt: isoAt(-7, 18, 0),
      selectedSlot: {
        date: dateAt(-6),
        startTime: '17:00',
        endTime: '18:00',
        location: 'Pitch 2',
      },
      bookingId: 'book6',
      existingSessionId: 'offering_parent_review_history',
    },
    {
      id: 'inv_counter_user5_1',
      coachId: 'coach1',
      clubName: 'Lions FC Academy',
      inviteType: 'CLOSED',
      athleteIds: ['user3'],
      parentId: 'user5',
      proposedSlots: [
        {
          date: dateAt(3),
          startTime: '18:00',
          endTime: '19:00',
          location: 'Pitch 1',
        },
      ],
      sessionType: 'Goalkeeper Technique',
      focus: 'Distribution',
      notes: 'Countered by parent with alternate time.',
      price: 55,
      duration: 60,
      status: 'COUNTERED',
      expiresAt: isoAt(6, 23, 59),
      createdAt: isoAt(-1, 12, 30),
      respondedAt: isoAt(-1, 20, 0),
      counterProposal: [
        {
          date: dateAt(4),
          startTime: '19:00',
          endTime: '20:00',
          location: 'Pitch 1',
        },
      ],
      counterNote: 'Could we move this one hour later due to school pick-up?',
    },
    {
      id: 'inv_squad_only_user4_1',
      coachId: 'coach1',
      clubName: 'Lions FC Academy',
      inviteType: 'SQUAD_ONLY',
      squadIds: ['squad_u15'],
      athleteIds: [
        'user1',
        'user2',
        'user3',
        'athlete_4',
        'athlete_6',
        'athlete_7',
        'athlete_8',
        'athlete_9',
        'athlete_10',
      ],
      parentId: 'user4',
      proposedSlots: [
        {
          date: dateAt(2),
          startTime: '19:00',
          endTime: '20:15',
          location: 'Pitch 2',
        },
      ],
      sessionType: 'U15 Pressing Clinic',
      focus: 'Conditioning',
      notes: 'Invite-only squad session.',
      price: 25,
      duration: 75,
      status: 'PENDING',
      expiresAt: isoAt(7, 23, 59),
      createdAt: isoAt(-1, 7, 30),
      rsvpCounts: { going: 5, maybe: 2, cantGo: 0 },
      existingSessionId: 'offering_u15_pressing',
    },
    {
      id: 'inv_squad_only_parent5_1',
      coachId: 'coach1',
      clubName: 'Lions FC Academy',
      inviteType: 'SQUAD_ONLY',
      squadIds: ['squad_u15'],
      athleteIds: ['athlete_6', 'athlete_7'],
      parentId: 'parent_5',
      proposedSlots: [
        {
          date: dateAt(2),
          startTime: '19:00',
          endTime: '20:15',
          location: 'Pitch 2',
        },
      ],
      sessionType: 'U15 Pressing Clinic',
      focus: 'Conditioning',
      notes: 'Both Osei siblings are invited to the same pressing clinic.',
      price: 25,
      duration: 75,
      status: 'PENDING',
      expiresAt: isoAt(7, 23, 59),
      createdAt: isoAt(-1, 7, 35),
      existingSessionId: 'offering_u15_pressing',
      rsvpCounts: { going: 1, maybe: 0, cantGo: 0 },
    },
    {
      id: 'inv_squad_only_parent6_1',
      coachId: 'coach1',
      clubName: 'Lions FC Academy',
      inviteType: 'SQUAD_ONLY',
      squadIds: ['squad_u15'],
      athleteIds: ['athlete_8'],
      parentId: 'parent_6',
      proposedSlots: [
        {
          date: dateAt(2),
          startTime: '19:00',
          endTime: '20:15',
          location: 'Pitch 2',
        },
      ],
      sessionType: 'U15 Pressing Clinic',
      focus: 'Conditioning',
      notes: 'Zara is invited to join the full-squad pressing session.',
      price: 25,
      duration: 75,
      status: 'PENDING',
      expiresAt: isoAt(7, 23, 59),
      createdAt: isoAt(-1, 7, 40),
      existingSessionId: 'offering_u15_pressing',
      rsvpCounts: { going: 0, maybe: 1, cantGo: 0 },
    },
    {
      id: 'inv_squad_only_parent7_1',
      coachId: 'coach1',
      clubName: 'Lions FC Academy',
      inviteType: 'SQUAD_ONLY',
      squadIds: ['squad_u15'],
      athleteIds: ['athlete_9', 'athlete_10'],
      parentId: 'parent_7',
      proposedSlots: [
        {
          date: dateAt(2),
          startTime: '19:00',
          endTime: '20:15',
          location: 'Pitch 2',
        },
      ],
      sessionType: 'U15 Pressing Clinic',
      focus: 'Conditioning',
      notes: 'Nguyen siblings invited together for the U15 pressing clinic.',
      price: 25,
      duration: 75,
      status: 'PENDING',
      expiresAt: isoAt(7, 23, 59),
      createdAt: isoAt(-1, 7, 45),
      existingSessionId: 'offering_u15_pressing',
      rsvpCounts: { going: 1, maybe: 0, cantGo: 0 },
    },
  ];
}

function buildRoster(): RosterEntry[] {
  return [
    {
      id: 'roster_user1',
      coachId: 'coach1',
      athleteId: 'user1',
      athleteName: 'Alfie Barton',
      parentId: 'user4',
      parentName: 'Chris Barton',
      status: 'ACTIVE',
      startDate: dateAt(-220),
      lastSessionDate: dateAt(-2),
      nextSessionDate: dateAt(1),
      totalSessions: 48,
      totalRevenue: 2880,
      averageRating: 4.6,
      notes: [
        {
          id: 'roster_note_user1_1',
          content: 'Improved scanning under pressure.',
          createdAt: isoAt(-6, 18, 20),
        },
      ],
      tags: ['u15', 'finishing'],
      primaryFocus: 'Finishing',
      notificationPreference: 'ALL',
    },
    {
      id: 'roster_user2',
      coachId: 'coach1',
      athleteId: 'user2',
      athleteName: 'Maisie Barton',
      parentId: 'user4',
      parentName: 'Chris Barton',
      status: 'ACTIVE',
      startDate: dateAt(-180),
      lastSessionDate: dateAt(-1),
      nextSessionDate: dateAt(2),
      totalSessions: 30,
      totalRevenue: 1800,
      averageRating: 4.4,
      notes: [
        {
          id: 'roster_note_user2_1',
          content: 'Excellent attitude in transition drills.',
          createdAt: isoAt(-7, 19, 0),
        },
      ],
      tags: ['u13', 'decision-making'],
      primaryFocus: 'Passing',
      notificationPreference: 'ALL',
    },
    {
      id: 'roster_user3',
      coachId: 'coach1',
      athleteId: 'user3',
      athleteName: 'Kai Mensah',
      parentId: 'user5',
      parentName: 'Nadia Mensah',
      status: 'ACTIVE',
      startDate: dateAt(-300),
      lastSessionDate: dateAt(-8),
      nextSessionDate: dateAt(3),
      totalSessions: 54,
      totalRevenue: 3240,
      averageRating: 4.7,
      notes: [
        {
          id: 'roster_note_user3_1',
          content: 'Distribution quality is improving weekly.',
          createdAt: isoAt(-9, 17, 0),
        },
      ],
      tags: ['goalkeeper', 'u15'],
      primaryFocus: 'Goalkeeping',
      notificationPreference: 'IMPORTANT',
    },
    {
      id: 'roster_athlete4',
      coachId: 'coach1',
      athleteId: 'athlete_4',
      athleteName: 'Priya Kapoor',
      parentId: 'parent_3',
      parentName: 'Anita Kapoor',
      status: 'ACTIVE',
      startDate: dateAt(-140),
      lastSessionDate: dateAt(-5),
      nextSessionDate: dateAt(4),
      totalSessions: 22,
      totalRevenue: 1210,
      averageRating: 4.2,
      notes: [],
      tags: ['u14', 'defending'],
      primaryFocus: 'Defending',
      notificationPreference: 'ALL',
    },
    {
      id: 'roster_athlete5',
      coachId: 'coach1',
      athleteId: 'athlete_5',
      athleteName: 'Finley Reeves',
      parentId: 'parent_4',
      parentName: 'Steve Reeves',
      status: 'PAUSED',
      startDate: dateAt(-110),
      lastSessionDate: dateAt(-30),
      totalSessions: 12,
      totalRevenue: 600,
      averageRating: 4.0,
      notes: [
        {
          id: 'roster_note_athlete5_1',
          content: 'Paused temporarily due to school exams.',
          createdAt: isoAt(-20, 18, 30),
        },
      ],
      tags: ['u13'],
      primaryFocus: 'Dribbling',
      notificationPreference: 'NONE',
    },
    {
      id: 'roster_athlete6',
      coachId: 'coach1',
      athleteId: 'athlete_6',
      athleteName: 'Jayden Osei',
      parentId: 'parent_5',
      parentName: 'Vanessa Osei',
      status: 'ACTIVE',
      startDate: dateAt(-95),
      lastSessionDate: dateAt(-4),
      nextSessionDate: dateAt(2),
      totalSessions: 18,
      totalRevenue: 900,
      averageRating: 4.1,
      notes: [
        {
          id: 'roster_note_athlete6_1',
          content: 'Needs faster recovery runs after high press.',
          createdAt: isoAt(-5, 18, 10),
        },
      ],
      tags: ['u15', 'pressing'],
      primaryFocus: 'Conditioning',
      notificationPreference: 'ALL',
    },
    {
      id: 'roster_athlete7',
      coachId: 'coach1',
      athleteId: 'athlete_7',
      athleteName: 'Marcus Osei',
      parentId: 'parent_5',
      parentName: 'Vanessa Osei',
      status: 'ACTIVE',
      startDate: dateAt(-88),
      lastSessionDate: dateAt(-3),
      nextSessionDate: dateAt(2),
      totalSessions: 16,
      totalRevenue: 800,
      averageRating: 4.0,
      notes: [
        {
          id: 'roster_note_athlete7_1',
          content: 'Strong acceleration, keep body shape compact in duels.',
          createdAt: isoAt(-4, 19, 5),
        },
      ],
      tags: ['u14', 'defending'],
      primaryFocus: 'Defending',
      notificationPreference: 'ALL',
    },
    {
      id: 'roster_athlete8',
      coachId: 'coach1',
      athleteId: 'athlete_8',
      athleteName: 'Zara Hussain',
      parentId: 'parent_6',
      parentName: 'Tariq Hussain',
      status: 'ACTIVE',
      startDate: dateAt(-76),
      lastSessionDate: dateAt(-6),
      nextSessionDate: dateAt(2),
      totalSessions: 14,
      totalRevenue: 700,
      averageRating: 4.3,
      notes: [
        {
          id: 'roster_note_athlete8_1',
          content: 'Excellent communication in back-line organization.',
          createdAt: isoAt(-6, 20, 0),
        },
      ],
      tags: ['u15', 'leadership'],
      primaryFocus: 'Defending',
      notificationPreference: 'ALL',
    },
    {
      id: 'roster_athlete9',
      coachId: 'coach1',
      athleteId: 'athlete_9',
      athleteName: 'Ollie Nguyen',
      parentId: 'parent_7',
      parentName: 'Linh Nguyen',
      status: 'ACTIVE',
      startDate: dateAt(-68),
      lastSessionDate: dateAt(-5),
      nextSessionDate: dateAt(2),
      totalSessions: 12,
      totalRevenue: 600,
      averageRating: 4.2,
      notes: [
        {
          id: 'roster_note_athlete9_1',
          content: 'Needs better first-step reactions when pressing from blind side.',
          createdAt: isoAt(-5, 19, 20),
        },
      ],
      tags: ['u14', 'pressing'],
      primaryFocus: 'Conditioning',
      notificationPreference: 'ALL',
    },
    {
      id: 'roster_athlete10',
      coachId: 'coach1',
      athleteId: 'athlete_10',
      athleteName: 'Tia Nguyen',
      parentId: 'parent_7',
      parentName: 'Linh Nguyen',
      status: 'ACTIVE',
      startDate: dateAt(-61),
      lastSessionDate: dateAt(-10),
      nextSessionDate: dateAt(2),
      totalSessions: 11,
      totalRevenue: 627,
      averageRating: 4.1,
      notes: [
        {
          id: 'roster_note_athlete10_1',
          content: 'Great body shape while receiving under pressure.',
          createdAt: isoAt(-10, 18, 35),
        },
      ],
      tags: ['u14', 'first-touch'],
      primaryFocus: 'Passing',
      notificationPreference: 'ALL',
    },
    {
      id: 'roster_coach2_user3',
      coachId: 'coach2',
      athleteId: 'user3',
      athleteName: 'Kai Mensah',
      parentId: 'user5',
      parentName: 'Nadia Mensah',
      status: 'ACTIVE',
      startDate: dateAt(-90),
      lastSessionDate: dateAt(-8),
      nextSessionDate: dateAt(4),
      totalSessions: 10,
      totalRevenue: 450,
      averageRating: 4.5,
      notes: [],
      tags: ['goalkeeper'],
      primaryFocus: 'Goalkeeping',
      notificationPreference: 'IMPORTANT',
    },
  ];
}

function buildFavourites(): FavouriteCoach[] {
  return [
    {
      id: 'fav_user4_coach1',
      userId: 'user4',
      coachId: 'coach1',
      isFavourite: true,
      createdAt: isoAt(-40, 10, 0),
    },
    {
      id: 'fav_user4_coach2',
      userId: 'user4',
      coachId: 'coach2',
      isFavourite: true,
      createdAt: isoAt(-25, 9, 30),
    },
    {
      id: 'fav_user5_coach1',
      userId: 'user5',
      coachId: 'coach1',
      isFavourite: true,
      createdAt: isoAt(-15, 14, 0),
    },
    {
      id: 'fav_user1_coach2',
      userId: 'user1',
      coachId: 'coach2',
      isFavourite: true,
      createdAt: isoAt(-10, 8, 20),
    },
  ];
}

function buildMessagesByThread(): Record<string, ChatMessage[]> {
  return {
    thread_tom_coach1: [
      {
        id: 'msg_thread_tom_seed_1',
        threadId: 'thread_tom_coach1',
        sender: 'coach',
        body: 'See you tomorrow at 5pm. Bring both boots and resistance band.',
        createdAt: isoAt(-1, 17, 10),
        status: 'seen',
      },
      {
        id: 'msg_thread_tom_seed_2',
        threadId: 'thread_tom_coach1',
        sender: 'parent',
        body: 'Perfect, Alfie is ready and we will arrive 10 minutes early.',
        createdAt: isoAt(-1, 17, 25),
        status: 'seen',
      },
      {
        id: 'msg_thread_tom_seed_3',
        threadId: 'thread_tom_coach1',
        sender: 'coach',
        body: 'Great. We will work on first-touch direction and finishing speed.',
        createdAt: isoAt(-1, 17, 40),
        status: 'delivered',
      },
    ],
    thread_emma_coach2: [
      {
        id: 'msg_thread_emma_seed_1',
        threadId: 'thread_emma_coach2',
        sender: 'coach',
        body: 'Brilliant energy today. Keep repeating the receiving pattern at home.',
        createdAt: isoAt(-1, 15, 0),
        status: 'seen',
      },
      {
        id: 'msg_thread_emma_seed_2',
        threadId: 'thread_emma_coach2',
        sender: 'parent',
        body: 'Thanks coach. We will run that drill twice this week.',
        createdAt: isoAt(-1, 15, 20),
        status: 'delivered',
      },
    ],
    thread_group_offering_u15_pressing: [
      {
        id: 'msg_thread_group_u15_seed_1',
        threadId: 'thread_group_offering_u15_pressing',
        sender: 'coach',
        body: 'Great intensity tonight. Recovery run tomorrow: 20 mins easy + mobility.',
        createdAt: isoAt(-1, 20, 20),
        status: 'delivered',
      },
    ],
    thread_parent_user4_offering_u15_pressing: [
      {
        id: 'msg_thread_parent_user4_u15_seed_1',
        threadId: 'thread_parent_user4_offering_u15_pressing',
        sender: 'coach',
        body: 'Alfie and Maisie both trained well. Shared clips are now in session media.',
        createdAt: isoAt(-1, 20, 35),
        status: 'delivered',
      },
    ],
    thread_parent_parent_5_offering_u15_pressing: [
      {
        id: 'msg_thread_parent5_u15_seed_1',
        threadId: 'thread_parent_parent_5_offering_u15_pressing',
        sender: 'coach',
        body: 'Jayden and Marcus both attended. Pressing distances improved from last block.',
        createdAt: isoAt(-1, 20, 40),
        status: 'delivered',
      },
    ],
    thread_parent_parent_6_offering_u15_pressing: [
      {
        id: 'msg_thread_parent6_u15_seed_1',
        threadId: 'thread_parent_parent_6_offering_u15_pressing',
        sender: 'coach',
        body: 'Zara had a strong session, especially compact shape during transitions.',
        createdAt: isoAt(-1, 20, 45),
        status: 'delivered',
      },
    ],
    thread_parent_parent_7_offering_u15_pressing: [
      {
        id: 'msg_thread_parent7_u15_seed_1',
        threadId: 'thread_parent_parent_7_offering_u15_pressing',
        sender: 'coach',
        body: 'Ollie and Tia both attended. Shared clips show better pressing distances today.',
        createdAt: isoAt(-1, 20, 50),
        status: 'delivered',
      },
    ],
  };
}

function buildReviews(): {
  reviews: AppReviewRecord[];
  rateCoachReviews: RateCoachStoredReview[];
  coachPublicReviews: PublicCoachReview[];
} {
  return {
    reviews: [
      {
        id: 'app_review_user4_coach1_1',
        coachId: 'coach1',
        coachName: 'Jess Okafor',
        parentId: 'user4',
        parentName: 'Chris Barton',
        athleteId: 'user1',
        athleteName: 'Alfie Barton',
        bookingId: 'book6',
        rating: 5,
        title: 'Huge confidence boost',
        content: 'Alfie is playing with far more confidence and scanning more often.',
        comment: 'Alfie is playing with far more confidence and scanning more often.',
        isPublic: true,
        isVerifiedBooking: true,
        status: 'PUBLISHED',
        createdAt: isoAt(-5, 18, 0),
        helpfulCount: 3,
      },
      {
        id: 'app_review_user5_coach2_1',
        coachId: 'coach2',
        coachName: 'Reuben Carr',
        parentId: 'user5',
        parentName: 'Nadia Mensah',
        athleteId: 'user3',
        athleteName: 'Kai Mensah',
        bookingId: 'book7',
        rating: 5,
        title: 'Excellent structure',
        content: 'Clear structure, direct feedback, and very practical coaching.',
        comment: 'Clear structure, direct feedback, and very practical coaching.',
        isPublic: true,
        isVerifiedBooking: true,
        status: 'PUBLISHED',
        createdAt: isoAt(-7, 20, 0),
        helpfulCount: 2,
      },
      {
        id: 'app_review_user4_coach3_1',
        coachId: 'coach3',
        coachName: 'Aiden Sharma',
        parentId: 'user4',
        parentName: 'Chris Barton',
        athleteId: 'user2',
        athleteName: 'Maisie Barton',
        rating: 4,
        title: 'Great attention to detail',
        content: 'Useful technical feedback after every drill block.',
        comment: 'Useful technical feedback after every drill block.',
        isPublic: true,
        isVerifiedBooking: false,
        status: 'PUBLISHED',
        createdAt: isoAt(-12, 16, 30),
        helpfulCount: 1,
      },
    ],
    rateCoachReviews: [
      {
        id: 'rate_review_user4_coach1_1',
        coachId: 'coach1',
        coachName: 'Jess Okafor',
        userId: 'user4',
        userName: 'Chris Barton',
        parentName: 'Chris Barton',
        rating: 5,
        text: 'Excellent communication and clear session plans.',
        content: 'Excellent communication and clear session plans.',
        createdAt: isoAt(-4, 19, 10),
        sessionDate: isoAt(-6, 17, 0),
      },
      {
        id: 'rate_review_user5_coach2_1',
        coachId: 'coach2',
        coachName: 'Reuben Carr',
        userId: 'user5',
        userName: 'Nadia Mensah',
        parentName: 'Nadia Mensah',
        rating: 5,
        text: 'High tempo and very actionable feedback.',
        content: 'High tempo and very actionable feedback.',
        createdAt: isoAt(-6, 18, 20),
        sessionDate: isoAt(-8, 16, 0),
      },
    ],
    coachPublicReviews: [
      {
        id: 'coach_public_review_1',
        coachId: 'coach1',
        reviewerName: 'Chris Barton',
        reviewerId: 'user4',
        rating: 5,
        comment: 'Jess is brilliant with confidence and technical detail.',
        sessionType: '1-on-1 Session',
        createdAt: isoAt(-5, 18, 0),
      },
      {
        id: 'coach_public_review_2',
        coachId: 'coach2',
        reviewerName: 'Nadia Mensah',
        reviewerId: 'user5',
        rating: 5,
        comment: 'Reuben brings excellent intensity and structure.',
        sessionType: 'Small Group Session',
        createdAt: isoAt(-7, 20, 0),
      },
      {
        id: 'coach_public_review_3',
        coachId: 'coach1',
        reviewerName: 'Anita Kapoor',
        reviewerId: 'parent_3',
        rating: 4,
        comment: 'Great quality sessions and clear progression plans.',
        sessionType: 'Defending Lab',
        createdAt: isoAt(-10, 19, 0),
      },
    ],
  };
}

function buildCoaches(): CoachDirectoryEntry[] {
  return [
    {
      id: 'coach1',
      name: 'Jess Okafor',
      bio: 'UEFA B licensed coach specialising in high-performance youth development.',
      sports: ['Football'],
      location: { city: 'London', state: 'Greater London', lat: 51.541, lng: -0.083 },
      distance: 2.1,
      rating: 4.9,
      reviewCount: 68,
      minPrice: 55,
      maxPrice: 90,
      joinedAt: '2021-03-15',
      totalSessions: 612,
      nextAvailable: isoAt(1, 17, 0),
      badges: ['Verified', 'Background Checked', 'Top Rated'],
      footballFocuses: ['Finishing', 'First Touch', 'Positioning'],
      qualifications: ['UEFA B Licence', 'FA Safeguarding'],
      yearsExperience: 10,
      dbsChecked: true,
    },
    {
      id: 'coach2',
      name: 'Reuben Carr',
      bio: 'Former academy forward specialising in finishing and movement patterns.',
      sports: ['Football'],
      location: { city: 'London', state: 'Greater London', lat: 51.548, lng: -0.03 },
      distance: 3.8,
      rating: 4.8,
      reviewCount: 52,
      minPrice: 45,
      maxPrice: 70,
      joinedAt: '2020-09-01',
      totalSessions: 498,
      nextAvailable: isoAt(2, 16, 30),
      badges: ['Verified', 'Top Rated'],
      footballFocuses: ['Movement', 'Finishing', 'Composure'],
      qualifications: ['UEFA B Licence'],
      yearsExperience: 8,
      dbsChecked: true,
    },
    {
      id: 'coach3',
      name: 'Aiden Sharma',
      bio: 'Development specialist focused on early-teen tactical understanding.',
      sports: ['Football'],
      location: { city: 'London', state: 'Greater London', lat: 51.473, lng: -0.123 },
      distance: 5.2,
      rating: 4.6,
      reviewCount: 34,
      minPrice: 40,
      maxPrice: 65,
      joinedAt: '2022-01-10',
      totalSessions: 301,
      nextAvailable: isoAt(3, 18, 0),
      badges: ['Verified'],
      footballFocuses: ['Decision Making', 'Passing', 'Defending'],
      qualifications: ['FA Level 3', 'Goalkeeper Specialist'],
      yearsExperience: 7,
      dbsChecked: true,
    },
  ];
}

function buildSquads(): ClubSquad[] {
  return [
    {
      id: 'squad_u15',
      clubId: CLUB_LIONS_ID,
      name: 'U15 Performance',
      level: 'U15 · Competitive',
      description: 'Core development squad for U15 performance pathway.',
      memberCount: 8,
      primaryCoach: 'coach1',
      meetLocation: 'Pitch 2',
      nextSession: isoAt(2, 19, 0),
      tags: ['Pressing', 'Finishing'],
      ageMin: 14,
      ageMax: 15,
      groupId: 'group_squad_u15',
    },
    {
      id: 'squad_juniors',
      clubId: CLUB_LIONS_ID,
      name: 'Junior Skills',
      level: 'U11 · Development',
      description: 'Foundational skills and confidence training for juniors.',
      memberCount: 2,
      primaryCoach: 'coach2',
      meetLocation: 'Sports Hall',
      nextSession: isoAt(4, 17, 30),
      tags: ['Ball Mastery', 'Confidence'],
      ageMin: 10,
      ageMax: 12,
      groupId: 'group_squad_juniors',
    },
    {
      id: 'squad_eagles_u14',
      clubId: 'club_eagles',
      name: 'Eagles U14 Technical',
      level: 'U14 · Club',
      description: 'East London Eagles technical development pod.',
      memberCount: 2,
      primaryCoach: 'coach2',
      meetLocation: 'East London Eagles Hub',
      nextSession: isoAt(6, 17, 30),
      tags: ['Passing', 'Composure'],
      ageMin: 13,
      ageMax: 15,
      groupId: 'group_squad_eagles_u14',
    },
  ];
}

function buildSquadMembers(): SquadMember[] {
  return [
    {
      id: 'squad_member_user1',
      squadId: 'squad_u15',
      athleteId: 'user1',
      parentId: 'user4',
      status: 'ACTIVE',
      joinedAt: dateAt(-180),
      position: 'Midfielder',
      jerseyNumber: 10,
    },
    {
      id: 'squad_member_user3',
      squadId: 'squad_u15',
      athleteId: 'user3',
      parentId: 'user5',
      status: 'ACTIVE',
      joinedAt: dateAt(-170),
      position: 'Goalkeeper',
      jerseyNumber: 1,
    },
    {
      id: 'squad_member_athlete4',
      squadId: 'squad_u15',
      athleteId: 'athlete_4',
      parentId: 'parent_3',
      status: 'ACTIVE',
      joinedAt: dateAt(-120),
      position: 'Defender',
      jerseyNumber: 4,
    },
    {
      id: 'squad_member_athlete6',
      squadId: 'squad_u15',
      athleteId: 'athlete_6',
      parentId: 'parent_5',
      status: 'ACTIVE',
      joinedAt: dateAt(-90),
      position: 'Winger',
      jerseyNumber: 7,
    },
    {
      id: 'squad_member_athlete7',
      squadId: 'squad_u15',
      athleteId: 'athlete_7',
      parentId: 'parent_5',
      status: 'ACTIVE',
      joinedAt: dateAt(-86),
      position: 'Centre Back',
      jerseyNumber: 5,
    },
    {
      id: 'squad_member_athlete8',
      squadId: 'squad_u15',
      athleteId: 'athlete_8',
      parentId: 'parent_6',
      status: 'ACTIVE',
      joinedAt: dateAt(-74),
      position: 'Holding Midfielder',
      jerseyNumber: 6,
    },
    {
      id: 'squad_member_athlete9',
      squadId: 'squad_u15',
      athleteId: 'athlete_9',
      parentId: 'parent_7',
      status: 'ACTIVE',
      joinedAt: dateAt(-66),
      position: 'Winger',
      jerseyNumber: 11,
    },
    {
      id: 'squad_member_athlete10',
      squadId: 'squad_u15',
      athleteId: 'athlete_10',
      parentId: 'parent_7',
      status: 'ACTIVE',
      joinedAt: dateAt(-60),
      position: 'Attacking Midfielder',
      jerseyNumber: 12,
    },
    {
      id: 'squad_member_user2',
      squadId: 'squad_juniors',
      athleteId: 'user2',
      parentId: 'user4',
      status: 'ACTIVE',
      joinedAt: dateAt(-150),
      position: 'Forward',
      jerseyNumber: 9,
    },
    {
      id: 'squad_member_athlete5',
      squadId: 'squad_juniors',
      athleteId: 'athlete_5',
      parentId: 'parent_4',
      status: 'ACTIVE',
      joinedAt: dateAt(-100),
      position: 'Midfielder',
      jerseyNumber: 8,
    },
    {
      id: 'squad_member_eagles_user2',
      squadId: 'squad_eagles_u14',
      athleteId: 'user2',
      parentId: 'user4',
      status: 'ACTIVE',
      joinedAt: dateAt(-45),
      position: 'Forward',
      jerseyNumber: 14,
    },
    {
      id: 'squad_member_eagles_athlete8',
      squadId: 'squad_eagles_u14',
      athleteId: 'athlete_8',
      parentId: 'parent_6',
      status: 'ACTIVE',
      joinedAt: dateAt(-40),
      position: 'Defender',
      jerseyNumber: 3,
    },
  ];
}

function buildClubMembers(): ClubMemberSeed[] {
  return [
    {
      userId: 'coach1',
      userName: 'Director Kelly',
      role: 'OWNER',
      status: 'active',
      joinedAt: dateAt(-400),
      squadIds: ['squad_u15', 'squad_juniors'],
    },
    {
      userId: 'coach2',
      userName: 'Jess Okafor',
      role: 'COACH',
      status: 'active',
      joinedAt: dateAt(-320),
      squadIds: ['squad_u15'],
    },
    {
      userId: 'coach3',
      userName: 'Reuben Carr',
      role: 'COACH',
      status: 'active',
      joinedAt: dateAt(-280),
      squadIds: ['squad_juniors'],
    },
    {
      userId: 'user4',
      userName: 'Chris Barton',
      role: 'MEMBER',
      status: 'active',
      joinedAt: dateAt(-180),
      squadIds: ['squad_u15'],
    },
    {
      userId: 'user5',
      userName: 'Nadia Mensah',
      role: 'MEMBER',
      status: 'active',
      joinedAt: dateAt(-170),
      squadIds: ['squad_u15'],
    },
    {
      userId: 'user6',
      userName: 'Dan Mensah',
      role: 'MEMBER',
      status: 'active',
      joinedAt: dateAt(-90),
      squadIds: [],
    },
    {
      userId: 'parent_5',
      userName: 'Vanessa Osei',
      role: 'MEMBER',
      status: 'active',
      joinedAt: dateAt(-95),
      squadIds: ['squad_u15'],
    },
    {
      userId: 'parent_6',
      userName: 'Tariq Hussain',
      role: 'MEMBER',
      status: 'active',
      joinedAt: dateAt(-80),
      squadIds: ['squad_u15'],
    },
    {
      userId: 'parent_7',
      userName: 'Linh Nguyen',
      role: 'MEMBER',
      status: 'active',
      joinedAt: dateAt(-70),
      squadIds: ['squad_u15'],
    },
  ];
}

function buildChildrenProfiles(): ChildProfileSeed[] {
  return [
    {
      id: 'user1',
      parentId: 'user4',
      firstName: 'Alfie',
      lastName: 'Barton',
      nickname: 'Alf',
      dateOfBirth: '2008-05-12',
      gender: 'MALE',
      relationship: 'SON',
      disabilities: [
        {
          id: 'dis-seed-1',
          type: 'ADHD',
          diagnosisDate: '2020-09',
          description: 'Combined type — inattentive and hyperactive',
          supportRequired: 'Short instructions, regular movement breaks, positive reinforcement',
          communicationPreferences: ['Direct eye contact', 'One instruction at a time'],
          triggers: ['Long periods of sitting', 'Unclear expectations', 'Waiting in line'],
          calmingStrategies: ['Movement breaks', 'Fidget tools', 'Counting exercises'],
        },
      ],
      specialNeeds: [
        {
          id: 'sn-seed-1',
          category: 'BEHAVIORAL' as const,
          name: 'Structured transitions',
          description: 'Needs clear advance warnings before changing activities',
          severity: 'MODERATE' as const,
          accommodationsNeeded: ['5-minute verbal warning', 'Visual timer', 'Quiet space for breaks'],
          parentHints: 'Give a 5-minute warning before transitions. Let him finish what he is doing.',
        },
      ],
      hasSpecialNeeds: true,
      allergies: ['Peanuts'],
      medicalConditions: ['ADHD'],
      medications: ['Methylphenidate (morning only)'],
      communicationNotes: 'Responds best to concise, visual instruction. Prefers one step at a time.',
      behavioralNotes: 'Highly competitive; use short refocus cues when frustrated. May need movement breaks every 20 minutes.',
      emergencyContactName: 'Chris Barton',
      emergencyContactPhone: '+44 7700 111001',
      emergencyContactRelation: 'Father',
      secondaryEmergencyName: 'Sarah Barton',
      secondaryEmergencyPhone: '+44 7700 111002',
      photoConsent: true,
      videoConsent: true,
      socialMediaConsent: false,
      emergencyTreatmentConsent: true,
      createdAt: isoAt(-400, 10, 0),
      updatedAt: isoAt(-2, 12, 0),
    },
    {
      id: 'user2',
      parentId: 'user4',
      firstName: 'Maisie',
      lastName: 'Barton',
      dateOfBirth: '2009-08-20',
      gender: 'FEMALE',
      relationship: 'DAUGHTER',
      disabilities: [],
      specialNeeds: [],
      hasSpecialNeeds: false,
      allergies: ['Dairy'],
      medicalConditions: [],
      medications: [],
      communicationNotes: 'Build confidence with clear praise and one-step prompts.',
      behavioralNotes: 'May be quiet initially; warms up quickly after first few reps.',
      emergencyContactName: 'Chris Barton',
      emergencyContactPhone: '+44 7700 111001',
      emergencyContactRelation: 'Father',
      secondaryEmergencyName: 'Sarah Barton',
      secondaryEmergencyPhone: '+44 7700 111002',
      photoConsent: true,
      videoConsent: true,
      socialMediaConsent: true,
      emergencyTreatmentConsent: true,
      createdAt: isoAt(-380, 9, 45),
      updatedAt: isoAt(-3, 11, 30),
    },
    {
      id: 'user3',
      parentId: 'user5',
      firstName: 'Kai',
      lastName: 'Mensah',
      dateOfBirth: '2007-01-05',
      gender: 'MALE',
      relationship: 'SON',
      disabilities: [],
      specialNeeds: [],
      hasSpecialNeeds: false,
      allergies: [],
      medicalConditions: ['Mild asthma'],
      medications: ['Inhaler as needed'],
      communicationNotes: 'Prefers tactical context before technical instruction.',
      behavioralNotes: 'Very engaged and asks a lot of questions.',
      emergencyContactName: 'Nadia Mensah',
      emergencyContactPhone: '+44 7700 222001',
      emergencyContactRelation: 'Mother',
      photoConsent: true,
      videoConsent: true,
      socialMediaConsent: false,
      emergencyTreatmentConsent: true,
      createdAt: isoAt(-360, 10, 10),
      updatedAt: isoAt(-1, 10, 0),
    },
    {
      id: 'athlete_6',
      parentId: 'parent_5',
      firstName: 'Jayden',
      lastName: 'Osei',
      dateOfBirth: '2010-07-13',
      gender: 'MALE',
      relationship: 'SON',
      disabilities: [],
      specialNeeds: [],
      hasSpecialNeeds: false,
      allergies: [],
      medicalConditions: [],
      medications: [],
      communicationNotes: 'Responds well to quick, direct tactical cues.',
      behavioralNotes: 'High energy; benefits from role clarity before drills.',
      emergencyContactName: 'Vanessa Osei',
      emergencyContactPhone: '+44 7700 333001',
      emergencyContactRelation: 'Mother',
      photoConsent: true,
      videoConsent: true,
      socialMediaConsent: false,
      emergencyTreatmentConsent: true,
      createdAt: isoAt(-150, 9, 30),
      updatedAt: isoAt(-2, 10, 30),
    },
    {
      id: 'athlete_7',
      parentId: 'parent_5',
      firstName: 'Marcus',
      lastName: 'Osei',
      dateOfBirth: '2011-02-24',
      gender: 'MALE',
      relationship: 'SON',
      disabilities: [],
      specialNeeds: [],
      hasSpecialNeeds: false,
      allergies: ['Peanuts'],
      medicalConditions: [],
      medications: [],
      communicationNotes: 'Clear verbal prompts and single-focus tasks work best.',
      behavioralNotes: 'Confidence rises quickly after first successful repetition.',
      emergencyContactName: 'Vanessa Osei',
      emergencyContactPhone: '+44 7700 333001',
      emergencyContactRelation: 'Mother',
      secondaryEmergencyName: 'Kwame Osei',
      secondaryEmergencyPhone: '+44 7700 333002',
      photoConsent: true,
      videoConsent: true,
      socialMediaConsent: true,
      emergencyTreatmentConsent: true,
      createdAt: isoAt(-140, 9, 30),
      updatedAt: isoAt(-2, 10, 35),
    },
    {
      id: 'athlete_8',
      parentId: 'parent_6',
      firstName: 'Zara',
      lastName: 'Hussain',
      dateOfBirth: '2010-11-03',
      gender: 'FEMALE',
      relationship: 'DAUGHTER',
      disabilities: [],
      specialNeeds: [],
      hasSpecialNeeds: false,
      allergies: [],
      medicalConditions: [],
      medications: [],
      communicationNotes: 'Prefers visual demos before speed progression.',
      behavioralNotes: 'Strong leadership voice with peers.',
      emergencyContactName: 'Tariq Hussain',
      emergencyContactPhone: '+44 7700 444001',
      emergencyContactRelation: 'Father',
      photoConsent: true,
      videoConsent: true,
      socialMediaConsent: true,
      emergencyTreatmentConsent: true,
      createdAt: isoAt(-130, 10, 20),
      updatedAt: isoAt(-2, 11, 0),
    },
    {
      id: 'athlete_9',
      parentId: 'parent_7',
      firstName: 'Ollie',
      lastName: 'Nguyen',
      dateOfBirth: '2010-04-21',
      gender: 'MALE',
      relationship: 'SON',
      disabilities: [],
      specialNeeds: [],
      hasSpecialNeeds: false,
      allergies: [],
      medicalConditions: [],
      medications: [],
      communicationNotes: 'Short tactical prompts land best during live drills.',
      behavioralNotes: 'Very responsive to demonstration-led coaching.',
      emergencyContactName: 'Linh Nguyen',
      emergencyContactPhone: '+44 7700 555001',
      emergencyContactRelation: 'Mother',
      photoConsent: true,
      videoConsent: true,
      socialMediaConsent: false,
      emergencyTreatmentConsent: true,
      createdAt: isoAt(-120, 11, 5),
      updatedAt: isoAt(-2, 11, 10),
    },
    {
      id: 'athlete_10',
      parentId: 'parent_7',
      firstName: 'Tia',
      lastName: 'Nguyen',
      dateOfBirth: '2011-09-14',
      gender: 'FEMALE',
      relationship: 'DAUGHTER',
      disabilities: [],
      specialNeeds: [],
      hasSpecialNeeds: false,
      allergies: [],
      medicalConditions: [],
      medications: [],
      communicationNotes: 'Benefits from clear one-step targets per drill block.',
      behavioralNotes: 'Confident communicator and vocal in team tasks.',
      emergencyContactName: 'Linh Nguyen',
      emergencyContactPhone: '+44 7700 555001',
      emergencyContactRelation: 'Mother',
      photoConsent: true,
      videoConsent: true,
      socialMediaConsent: true,
      emergencyTreatmentConsent: true,
      createdAt: isoAt(-118, 11, 10),
      updatedAt: isoAt(-2, 11, 15),
    },
  ];
}

function buildFamilyMembers(): FamilyMember[] {
  return [
    {
      id: 'user1',
      name: 'Alfie Barton',
      relationship: 'son',
      age: 17,
      colorCode: '#3B82F6',
      dateOfBirth: '2008-05-12',
      skillLevel: 'INTERMEDIATE',
      primarySport: 'Football',
      totalSessions: 32,
      totalBadges: 7,
      isActive: true,
      addedAt: isoAt(-420, 10, 0),
    },
    {
      id: 'user2',
      name: 'Maisie Barton',
      relationship: 'daughter',
      age: 16,
      colorCode: '#10B981',
      dateOfBirth: '2009-08-20',
      skillLevel: 'BEGINNER',
      primarySport: 'Football',
      totalSessions: 22,
      totalBadges: 4,
      isActive: true,
      addedAt: isoAt(-390, 11, 0),
    },
    {
      id: 'athlete_6',
      name: 'Jayden Osei',
      relationship: 'son',
      age: 15,
      colorCode: '#8B5CF6',
      dateOfBirth: '2010-07-13',
      skillLevel: 'INTERMEDIATE',
      primarySport: 'Football',
      totalSessions: 18,
      totalBadges: 3,
      isActive: true,
      addedAt: isoAt(-150, 11, 20),
    },
    {
      id: 'athlete_7',
      name: 'Marcus Osei',
      relationship: 'son',
      age: 14,
      colorCode: '#F59E0B',
      dateOfBirth: '2011-02-24',
      skillLevel: 'BEGINNER',
      primarySport: 'Football',
      totalSessions: 16,
      totalBadges: 2,
      isActive: true,
      addedAt: isoAt(-140, 11, 25),
    },
    {
      id: 'athlete_9',
      name: 'Ollie Nguyen',
      relationship: 'son',
      age: 15,
      colorCode: '#0EA5E9',
      dateOfBirth: '2010-04-21',
      skillLevel: 'INTERMEDIATE',
      primarySport: 'Football',
      totalSessions: 12,
      totalBadges: 2,
      isActive: true,
      addedAt: isoAt(-120, 11, 35),
    },
    {
      id: 'athlete_10',
      name: 'Tia Nguyen',
      relationship: 'daughter',
      age: 14,
      colorCode: '#EC4899',
      dateOfBirth: '2011-09-14',
      skillLevel: 'INTERMEDIATE',
      primarySport: 'Football',
      totalSessions: 11,
      totalBadges: 2,
      isActive: true,
      addedAt: isoAt(-118, 11, 40),
    },
  ];
}

function buildFamilyBookings(): FamilyCalendarEvent[] {
  return [
    {
      id: 'family_booking_1',
      childId: 'user1',
      colorCode: '#3B82F6',
      title: '1-on-1 Session',
      description: 'Finishing and transition actions',
      start: isoAt(1, 17, 0),
      end: isoAt(1, 18, 0),
      location: 'Pitch 2',
      coachId: 'coach1',
      sessionType: '1-on-1',
      status: 'CONFIRMED',
      price: 60,
    },
    {
      id: 'family_booking_2',
      childId: 'user2',
      colorCode: '#10B981',
      title: 'Small Group Session',
      description: 'Receiving and movement',
      start: isoAt(2, 16, 30),
      end: isoAt(2, 17, 45),
      location: 'Hackney Marshes',
      coachId: 'coach2',
      sessionType: 'Group',
      status: 'CONFIRMED',
      price: 45,
    },
    {
      id: 'family_booking_3',
      childId: 'user1',
      colorCode: '#3B82F6',
      title: 'Past Session',
      start: isoAt(-6, 17, 0),
      end: isoAt(-6, 18, 0),
      location: 'Pitch 2',
      coachId: 'coach1',
      sessionType: '1-on-1',
      status: 'COMPLETED',
      price: 60,
    },
    {
      id: 'family_booking_4',
      childId: 'athlete_6',
      colorCode: '#8B5CF6',
      title: 'U15 Pressing Clinic',
      description: 'High-intensity pressing circuit',
      start: isoAt(2, 19, 0),
      end: isoAt(2, 20, 15),
      location: 'Pitch 2',
      coachId: 'coach1',
      sessionType: 'Group',
      status: 'CONFIRMED',
      price: 25,
    },
    {
      id: 'family_booking_5',
      childId: 'athlete_7',
      colorCode: '#F59E0B',
      title: 'U15 Pressing Clinic',
      description: 'High-intensity pressing circuit',
      start: isoAt(2, 19, 0),
      end: isoAt(2, 20, 15),
      location: 'Pitch 2',
      coachId: 'coach1',
      sessionType: 'Group',
      status: 'CONFIRMED',
      price: 25,
    },
    {
      id: 'family_booking_6',
      childId: 'athlete_9',
      colorCode: '#0EA5E9',
      title: 'U15 Pressing Clinic',
      description: 'High-intensity pressing circuit',
      start: isoAt(2, 19, 0),
      end: isoAt(2, 20, 15),
      location: 'Pitch 2',
      coachId: 'coach1',
      sessionType: 'Group',
      status: 'CONFIRMED',
      price: 25,
    },
    {
      id: 'family_booking_7',
      childId: 'athlete_10',
      colorCode: '#EC4899',
      title: 'U15 Pressing Clinic',
      description: 'High-intensity pressing circuit',
      start: isoAt(2, 19, 0),
      end: isoAt(2, 20, 15),
      location: 'Pitch 2',
      coachId: 'coach1',
      sessionType: 'Group',
      status: 'CONFIRMED',
      price: 25,
    },
    {
      id: 'family_booking_8',
      childId: 'user2',
      colorCode: '#10B981',
      title: 'Eagles U14 Technical Circuit',
      description: 'East London Eagles squad development session',
      start: isoAt(6, 17, 30),
      end: isoAt(6, 18, 45),
      location: 'East London Eagles Hub',
      coachId: 'coach2',
      sessionType: 'Group',
      status: 'CONFIRMED',
      price: 42,
    },
  ];
}

function buildCoachBookings(offerings: SessionOffering[], bookings: Booking[]): CoachBookingSeed[] {
  const offeringRows: CoachBookingSeed[] = offerings
    .filter((offering) => offering.coachId === 'coach1' && new Date(offering.scheduledAt) > new Date())
    .map((offering) => ({
      id: offering.id,
      title: offering.title,
      scheduledAt: offering.scheduledAt,
      location: offering.location,
      duration: offering.duration,
      maxAthletes: offering.maxParticipants,
      currentAthletes: offering.registrations.filter((r) => r.status === 'confirmed').length,
      athleteIds: offering.invitedAthleteIds,
      coachId: offering.coachId,
    }));

  const bookingRows: CoachBookingSeed[] = bookings
    .filter((booking) => booking.coachId === 'coach1' && booking.status === 'CONFIRMED')
    .map((booking) => ({
      id: booking.id,
      title: booking.service || 'Session',
      scheduledAt: booking.scheduledAt,
      location: booking.location,
      duration: booking.duration,
      maxAthletes: 1,
      currentAthletes: booking.athleteIds?.length ?? (booking.athleteId ? 1 : 0),
      athleteIds: booking.athleteIds ?? (booking.athleteId ? [booking.athleteId] : []),
      coachId: booking.coachId,
    }));

  return dedupeById([...offeringRows, ...bookingRows]);
}

export function buildRelationalDemoSeedPayload(): RelationalDemoSeedPayload {
  const users = buildUsers();
  const coachSessions = buildCoachSessions();
  const baseBookings = buildBaseBookings();
  const bookingsFromSessions = buildBookingsFromSessions(coachSessions);
  const bookings = dedupeById([...baseBookings, ...bookingsFromSessions]);
  const offerings = buildOfferings();
  const invites = buildInvites();
  const roster = buildRoster();
  const favourites = buildFavourites();
  const messagesByThread = buildMessagesByThread();
  const { reviews, rateCoachReviews, coachPublicReviews } = buildReviews();
  const coaches = buildCoaches();
  const squads = buildSquads();
  const squadMembers = buildSquadMembers();
  const clubMembers = buildClubMembers();
  const childrenProfiles = buildChildrenProfiles();
  const familyMembers = buildFamilyMembers();
  const familyBookings = buildFamilyBookings();
  const coachBookings = buildCoachBookings(offerings, bookings);

  return {
    users,
    bookings,
    offerings,
    invites,
    coachSessions,
    roster,
    favourites,
    messagesByThread,
    reviews,
    rateCoachReviews,
    coachPublicReviews,
    coaches,
    squads,
    squadMembers,
    clubMembers,
    childrenProfiles,
    familyMembers,
    familyBookings,
    coachBookings,
  };
}
/**
 * DEMO DATA SEEDS (legacy)
 *
 * This file contains large deterministic demo fixtures used by mock/offline flows.
 * Sprint note (Data Display Sprint 2): keep visible as demo-only; replace with lazy generation
 * when the refactor is scheduled (too large/risky for a mixed UX sprint).
 */
