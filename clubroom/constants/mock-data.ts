import type {
  User,
  UserRole,
  CoachProfile,
  UserProfile,
  Relationship,
  Booking,
  Session,
  Goal,
  Conversation,
  Message,
  Post,
  Comment,
  Review,
  SkillLevel,
  BookingStatus,
  GoalStatus,
} from './app-types';

import type {
  ChatThreadSummary,
  ChatMessage,
  UserProfile as EnhancedUserProfile,
  CoachProfile as EnhancedCoachProfile,
  BookingSummary,
  ChatSender,
  BadgeDefinition,
  BadgeAward,
  Club,
  ClubMembership,
  ClubFeedPost,
  ClubInvite,
  ClubSquad,
  SessionOffering,
  SocialLinks,
} from './types';

// ===== USERS =====
export const MOCK_USERS: User[] = [
  // Coaches
  {
    id: 'coach1',
    email: 'sarah.mitchell@coach.com',
    role: 'COACH',
    name: 'Sarah Mitchell',
    avatar: 'SM',
    postcode: 'SW1A 1AA',
    dateOfBirth: '1988-03-15',
  },
  {
    id: 'coach2',
    email: 'mike.thompson@coach.com',
    role: 'COACH',
    name: 'Mike Thompson',
    avatar: 'MT',
    postcode: 'SW1A 2AA',
    dateOfBirth: '1985-07-22',
  },
  {
    id: 'coach3',
    email: 'david.roberts@coach.com',
    role: 'COACH',
    name: 'David Roberts',
    avatar: 'DR',
    postcode: 'SW2A 1BB',
    dateOfBirth: '1990-11-08',
  },
  {
    id: 'coach4',
    email: 'amy.taylor@coach.com',
    role: 'COACH',
    name: 'Amy Taylor',
    avatar: 'AT',
    postcode: 'SW5A 2CC',
    dateOfBirth: '1991-06-18',
  },
  {
    id: 'coach5',
    email: 'oliver.jones@coach.com',
    role: 'COACH',
    name: 'Oliver Jones',
    avatar: 'OJ',
    postcode: 'SW6A 3DD',
    dateOfBirth: '1987-10-02',
  },
  {
    id: 'coach6',
    email: 'lucy.brown@coach.com',
    role: 'COACH',
    name: 'Lucy Brown',
    avatar: 'LB',
    postcode: 'SW7A 4EE',
    dateOfBirth: '1989-01-12',
  },
  {
    id: 'coach7',
    email: 'harry.clark@coach.com',
    role: 'COACH',
    name: 'Harry Clark',
    avatar: 'HC',
    postcode: 'SW8A 5FF',
    dateOfBirth: '1984-09-30',
  },

  // Users (Athletes)
  {
    id: 'user1',
    email: 'tom.henderson@email.com',
    role: 'USER',
    name: 'Tom Henderson',
    avatar: 'TH',
    postcode: 'SW1A 3CC',
    dateOfBirth: '2008-05-12',
  },
  {
    id: 'user2',
    email: 'emma.henderson@email.com',
    role: 'USER',
    name: 'Emma Henderson',
    avatar: 'EH',
    postcode: 'SW1A 3CC',
    dateOfBirth: '2009-08-20',
  },
  {
    id: 'user3',
    email: 'james.wilson@email.com',
    role: 'USER',
    name: 'James Wilson',
    avatar: 'JW',
    postcode: 'SW1A 4DD',
    dateOfBirth: '2007-12-03',
  },
  {
    id: 'user4',
    email: 'sophie.taylor@email.com',
    role: 'USER',
    name: 'Sophie Taylor',
    avatar: 'ST',
    postcode: 'SW2A 1EE',
    dateOfBirth: '2008-04-18',
  },
  {
    id: 'user5',
    email: 'liam.davies@email.com',
    role: 'USER',
    name: 'Liam Davies',
    avatar: 'LD',
    postcode: 'SW3A 2FF',
    dateOfBirth: '2009-06-22',
  },
  {
    id: 'user6',
    email: 'ella.martinez@email.com',
    role: 'USER',
    name: 'Ella Martinez',
    avatar: 'EM',
    postcode: 'SW1A 5GG',
    dateOfBirth: '2008-11-09',
  },

  // Parents
  {
    id: 'parent1',
    email: 'john.henderson@email.com',
    role: 'PARENT',
    name: 'John Henderson',
    avatar: 'JH',
    postcode: 'SW1A 3CC',
    dateOfBirth: '1980-02-14',
  },
  {
    id: 'parent2',
    email: 'lisa.wilson@email.com',
    role: 'PARENT',
    name: 'Lisa Wilson',
    avatar: 'LW',
    postcode: 'SW1A 4DD',
    dateOfBirth: '1982-09-25',
  },
];

// ===== COACH PROFILES =====
export const MOCK_COACH_PROFILES: CoachProfile[] = [
  {
    userId: 'coach1',
    bio: '15 years experience coaching goalkeepers at all levels. Former professional goalkeeper with expertise in shot-stopping, positioning, and distribution.',
    qualifications: ['UEFA B License', 'FA Level 3', 'Advanced Goalkeeping Coach'],
    specialties: ['Goalkeeping', 'Shot Stopping', 'Positioning', 'Distribution'],
    yearsExperience: 15,
    sessionRate: 50,
    availability: [
      { id: 'av1', dayOfWeek: 1, startTime: '16:00', endTime: '19:00', location: 'Hyde Park' },
      { id: 'av2', dayOfWeek: 3, startTime: '16:00', endTime: '19:00', location: 'Hyde Park' },
      { id: 'av3', dayOfWeek: 5, startTime: '15:00', endTime: '18:00', location: 'Regent\'s Park' },
    ],
    rating: 4.9,
    totalReviews: 47,
    totalSessions: 230,
  },
  {
    userId: 'coach2',
    bio: 'Specialist in striker development with focus on finishing, movement, and clinical goal-scoring. Worked with academy players at Championship level.',
    qualifications: ['UEFA A License', 'FA Level 4', 'Sports Science Degree'],
    specialties: ['Striker Training', 'Finishing', 'Movement', 'First Touch'],
    yearsExperience: 12,
    sessionRate: 45,
    availability: [
      { id: 'av4', dayOfWeek: 2, startTime: '17:00', endTime: '20:00', location: 'Victoria Park' },
      { id: 'av5', dayOfWeek: 4, startTime: '17:00', endTime: '20:00', location: 'Victoria Park' },
      { id: 'av6', dayOfWeek: 6, startTime: '10:00', endTime: '14:00', location: 'Hackney Marshes' },
    ],
    rating: 4.7,
    totalReviews: 38,
    totalSessions: 185,
  },
  {
    userId: 'coach3',
    bio: 'Youth development coach focusing on technical skills, ball control, and game intelligence for midfielders and attackers.',
    qualifications: ['FA Level 2', 'Youth Development Certificate'],
    specialties: ['Ball Control', 'Passing', 'Tactical Awareness', 'Dribbling'],
    yearsExperience: 8,
    sessionRate: 40,
    availability: [
      { id: 'av7', dayOfWeek: 1, startTime: '16:30', endTime: '19:30', location: 'Clapham Common' },
      { id: 'av8', dayOfWeek: 3, startTime: '16:30', endTime: '19:30', location: 'Clapham Common' },
      { id: 'av9', dayOfWeek: 0, startTime: '09:00', endTime: '12:00', location: 'Battersea Park' },
    ],
    rating: 4.8,
    totalReviews: 29,
    totalSessions: 142,
  },
  {
    userId: 'coach4',
    bio: 'Speed and agility specialist helping wingers and wingbacks explode past defenders.',
    qualifications: ['UEFA B', 'FA Youth Module 3'],
    specialties: ['Agility', '1v1s', 'Crossing', 'Conditioning'],
    yearsExperience: 9,
    sessionRate: 55,
    availability: [
      { id: 'av10', dayOfWeek: 2, startTime: '17:00', endTime: '20:00', location: 'Hyde Park' },
      { id: 'av11', dayOfWeek: 6, startTime: '09:00', endTime: '13:00', location: 'Battersea Park' },
    ],
    rating: 4.6,
    totalReviews: 22,
    totalSessions: 120,
  },
  {
    userId: 'coach5',
    bio: 'Data-led analyst coach blending video reviews with technical reps.',
    qualifications: ['UEFA B', 'Sports Analytics Diploma'],
    specialties: ['Video Analysis', 'Passing Lanes', 'Build-up Play'],
    yearsExperience: 11,
    sessionRate: 60,
    availability: [
      { id: 'av12', dayOfWeek: 4, startTime: '18:00', endTime: '21:00', location: 'Canary Wharf' },
      { id: 'av13', dayOfWeek: 0, startTime: '10:00', endTime: '14:00', location: 'Greenwich Park' },
    ],
    rating: 4.9,
    totalReviews: 55,
    totalSessions: 260,
  },
  {
    userId: 'coach6',
    bio: 'Forward coach with academy pedigree—finishing under pressure and movement.',
    qualifications: ['UEFA A Candidate'],
    specialties: ['Finishing', 'Pressing', 'Movement', 'First Touch'],
    yearsExperience: 10,
    sessionRate: 58,
    availability: [
      { id: 'av14', dayOfWeek: 1, startTime: '17:00', endTime: '20:00', location: 'Regent\'s Park' },
      { id: 'av15', dayOfWeek: 5, startTime: '18:00', endTime: '21:00', location: 'Paddington Rec' },
    ],
    rating: 4.7,
    totalReviews: 33,
    totalSessions: 188,
  },
  {
    userId: 'coach7',
    bio: 'Psychology-led mentor focused on confidence, scanning, and decision-making.',
    qualifications: ['FA Level 2', 'Sports Psychology Certificate'],
    specialties: ['Decision Making', 'Scanning', 'Confidence'],
    yearsExperience: 7,
    sessionRate: 45,
    availability: [
      { id: 'av16', dayOfWeek: 3, startTime: '17:00', endTime: '20:00', location: 'Clissold Park' },
      { id: 'av17', dayOfWeek: 6, startTime: '12:00', endTime: '16:00', location: 'Hampstead Heath' },
    ],
    rating: 4.5,
    totalReviews: 18,
    totalSessions: 90,
  },
];

// ===== USER PROFILES =====
export const MOCK_USER_PROFILES: UserProfile[] = [
  {
    userId: 'user1',
    bio: 'Striker looking to make the school team. Love scoring goals and working on my finishing.',
    skillLevel: 'INTERMEDIATE',
    position: 'Striker',
    goals: [], // Will be populated from MOCK_GOALS
    parentId: 'parent1',
  },
  {
    userId: 'user2',
    bio: 'Midfielder who enjoys passing and creating chances. Want to improve my game vision.',
    skillLevel: 'BEGINNER',
    position: 'Midfielder',
    goals: [],
    parentId: 'parent1',
  },
  {
    userId: 'user3',
    bio: 'Determined to play at a higher level. Working hard on all aspects of my game.',
    skillLevel: 'ADVANCED',
    position: 'Winger',
    goals: [],
    parentId: 'parent2',
  },
];

// ===== RELATIONSHIPS =====
export const MOCK_RELATIONSHIPS: Relationship[] = [
  {
    id: 'rel1',
    parentId: 'parent1',
    childId: 'user1',
    relationshipType: 'PARENT_CHILD',
  },
  {
    id: 'rel2',
    parentId: 'parent1',
    childId: 'user2',
    relationshipType: 'PARENT_CHILD',
  },
  {
    id: 'rel3',
    parentId: 'parent2',
    childId: 'user3',
    relationshipType: 'PARENT_CHILD',
  },
];

// ===== BOOKINGS =====
const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const nextWeek = new Date(today);
nextWeek.setDate(nextWeek.getDate() + 7);
const lastWeek = new Date(today);
lastWeek.setDate(lastWeek.getDate() - 7);

export const MOCK_BOOKINGS: Booking[] = [
  // Upcoming bookings
  {
    id: 'book1',
    coachId: 'coach1',
    athleteId: 'user1',
    bookedById: 'parent1',
    status: 'CONFIRMED',
    scheduledAt: tomorrow.toISOString(),
    duration: 60,
    location: 'Hyde Park',
    notes: 'Focus on positioning and shot-stopping',
    coachName: 'Sarah Mitchell',
    athleteName: 'Tom Henderson',
  },
  // Group booking with multiple participants
  {
    id: 'book_group1',
    coachId: 'coach2',
    athleteId: 'user1', // Primary booker
    bookedById: 'parent1',
    status: 'CONFIRMED',
    scheduledAt: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000).toISOString(), // 5 days from now at 10am
    duration: 90,
    location: 'Hackney Marshes',
    notes: 'Group striker training - Advanced finishing clinic',
    coachName: 'Mike Thompson',
    athleteName: 'Tom Henderson',
    isGroupSession: true,
    maxParticipants: 8,
    currentParticipants: 5,
    participants: [
      { id: 'user1', name: 'Tom Henderson', avatar: 'TH', status: 'confirmed' },
      { id: 'user3', name: 'James Wilson', avatar: 'JW', status: 'confirmed' },
      { id: 'user4', name: 'Sophie Taylor', avatar: 'ST', status: 'confirmed' },
      { id: 'user5', name: 'Liam Davies', avatar: 'LD', status: 'confirmed' },
      { id: 'user6', name: 'Ella Martinez', avatar: 'EM', status: 'pending' },
    ],
  },
  {
    id: 'book2',
    coachId: 'coach2',
    athleteId: 'user1',
    bookedById: 'parent1',
    status: 'PENDING',
    scheduledAt: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    duration: 60,
    location: 'Victoria Park',
    notes: 'Work on finishing with weak foot',
    coachName: 'Mike Thompson',
    athleteName: 'Tom Henderson',
  },
  {
    id: 'book3',
    coachId: 'coach3',
    athleteId: 'user2',
    bookedById: 'parent1',
    status: 'CONFIRMED',
    scheduledAt: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    duration: 60,
    location: 'Clapham Common',
    notes: 'First session - assess current ability',
    coachName: 'David Roberts',
    athleteName: 'Emma Henderson',
  },
  {
    id: 'book4',
    coachId: 'coach2',
    athleteId: 'user3',
    bookedById: 'user3',
    status: 'CONFIRMED',
    scheduledAt: nextWeek.toISOString(),
    duration: 60,
    location: 'Hackney Marshes',
    coachName: 'Mike Thompson',
    athleteName: 'James Wilson',
  },
];

export const badgeCatalog: BadgeDefinition[] = [
  // Consistency badges
  {
    id: 'badge_best_training',
    label: 'Best Training Session',
    tone: 'success',
    description: 'Recognises a standout session with effort and focus.',
    category: 'consistency',
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'badge_streak_starter',
    label: 'Streak Starter',
    tone: 'default',
    description: 'Completed 3 sessions in a row without missing.',
    category: 'consistency',
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'badge_dedicated_athlete',
    label: 'Dedicated Athlete',
    tone: 'success',
    description: 'Maintained perfect attendance for a month.',
    category: 'consistency',
    tier: 2,
    pointValue: 25,
  },
  // Technique badges
  {
    id: 'badge_master_passer',
    label: 'Master Passer',
    tone: 'default',
    description: 'Awarded for reliable build-up play and vision.',
    category: 'technique',
    tier: 2,
    pointValue: 25,
  },
  {
    id: 'badge_sharp_shooter_pro',
    label: 'Sharp Shooter Pro',
    tone: 'warning',
    description: 'Celebrates clinical finishing under pressure.',
    category: 'technique',
    tier: 3,
    pointValue: 50,
  },
  {
    id: 'badge_first_touch',
    label: 'Silky First Touch',
    tone: 'default',
    description: 'Demonstrated excellent ball control in tight spaces.',
    category: 'technique',
    tier: 1,
    pointValue: 10,
  },
  // Leadership badges
  {
    id: 'badge_team_captain',
    label: 'Team Captain',
    tone: 'success',
    description: 'Led drills and encouraged teammates.',
    category: 'leadership',
    tier: 2,
    pointValue: 25,
  },
  {
    id: 'badge_vocal_leader',
    label: 'Vocal Leader',
    tone: 'default',
    description: 'Communicated well and organized the group.',
    category: 'leadership',
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'badge_mentor',
    label: 'Mentor',
    tone: 'success',
    description: 'Helped younger players improve their skills.',
    category: 'leadership',
    tier: 3,
    pointValue: 50,
  },
  // Mindset badges
  {
    id: 'badge_growth_mindset',
    label: 'Growth Mindset',
    tone: 'default',
    description: 'Embraced challenges and learned from mistakes.',
    category: 'mindset',
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'badge_focused_athlete',
    label: 'Laser Focus',
    tone: 'success',
    description: 'Maintained concentration throughout the session.',
    category: 'mindset',
    tier: 2,
    pointValue: 25,
  },
  // Teamwork badges
  {
    id: 'badge_team_player',
    label: 'Team Player',
    tone: 'default',
    description: 'Put the team first and supported others.',
    category: 'teamwork',
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'badge_assist_king',
    label: 'Assist King',
    tone: 'success',
    description: 'Created multiple scoring opportunities for teammates.',
    category: 'teamwork',
    tier: 2,
    pointValue: 25,
  },
  // Resilience badges
  {
    id: 'badge_comeback_kid',
    label: 'Comeback Kid',
    tone: 'warning',
    description: 'Bounced back from setbacks with determination.',
    category: 'resilience',
    tier: 2,
    pointValue: 25,
  },
  {
    id: 'badge_never_give_up',
    label: 'Never Give Up',
    tone: 'success',
    description: 'Showed incredible perseverance under pressure.',
    category: 'resilience',
    tier: 3,
    pointValue: 50,
  },
];

export const badgeAwards: BadgeAward[] = [
  {
    id: 'award_training_focus',
    badgeId: 'badge_best_training',
    badgeLabel: 'Best Training Session',
    badgeTone: 'success',
    athleteId: 'user1',
    athleteName: 'Tom Henderson',
    coachId: 'coach1',
    coachName: 'Sarah Mitchell',
    sessionId: 'sess1',
    reason: 'Led transitions and stayed switched on across drills.',
    note: 'Kept energy up for younger players in the pod.',
    awardedBy: 'coach1',
    awardedByName: 'Sarah Mitchell',
    awardedAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
    visibility: 'supporters',
    badgeCategory: 'consistency',
    badgeTier: 1,
    badgePointValue: 10,
  },
  {
    id: 'award_master_passer',
    badgeId: 'badge_master_passer',
    badgeLabel: 'Master Passer',
    badgeTone: 'default',
    athleteId: 'user2',
    athleteName: 'Emma Henderson',
    coachId: 'coach3',
    coachName: 'David Roberts',
    sessionId: 'sess4',
    reason: 'Threaded creative passes under pressure.',
    note: 'Great first-time balls during rondos.',
    awardedBy: 'coach3',
    awardedByName: 'David Roberts',
    awardedAt: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    visibility: 'athlete',
    badgeCategory: 'technique',
    badgeTier: 2,
    badgePointValue: 25,
  },
  {
    id: 'award_sharp_shooter',
    badgeId: 'badge_sharp_shooter_pro',
    badgeLabel: 'Sharp Shooter Pro',
    badgeTone: 'warning',
    athleteId: 'user3',
    athleteName: 'James Wilson',
    coachId: 'coach2',
    coachName: 'Mike Thompson',
    sessionId: 'club_session_1',
    reason: 'Finished five consecutive reps with both feet.',
    note: 'Stayed composed with a defender closing.',
    awardedBy: 'coach2',
    awardedByName: 'Mike Thompson',
    awardedAt: new Date(today.getTime() - 12 * 60 * 60 * 1000).toISOString(),
    visibility: 'supporters',
    badgeCategory: 'technique',
    badgeTier: 3,
    badgePointValue: 50,
  },
  // Additional mock awards for progression demo
  {
    id: 'award_team_captain',
    badgeId: 'badge_team_captain',
    badgeLabel: 'Team Captain',
    badgeTone: 'success',
    athleteId: 'user1',
    athleteName: 'Tom Henderson',
    coachId: 'coach1',
    coachName: 'Sarah Mitchell',
    sessionId: 'sess2',
    reason: 'Led the warm-up and organized drills.',
    note: 'Great communication with the group.',
    awardedBy: 'coach1',
    awardedByName: 'Sarah Mitchell',
    awardedAt: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    visibility: 'athlete',
    badgeCategory: 'leadership',
    badgeTier: 2,
    badgePointValue: 25,
  },
  {
    id: 'award_growth_mindset',
    badgeId: 'badge_growth_mindset',
    badgeLabel: 'Growth Mindset',
    badgeTone: 'default',
    athleteId: 'user1',
    athleteName: 'Tom Henderson',
    coachId: 'coach1',
    coachName: 'Sarah Mitchell',
    sessionId: 'sess3',
    reason: 'Accepted feedback positively and improved.',
    awardedBy: 'coach1',
    awardedByName: 'Sarah Mitchell',
    awardedAt: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    visibility: 'athlete',
    badgeCategory: 'mindset',
    badgeTier: 1,
    badgePointValue: 10,
  },
  {
    id: 'award_team_player',
    badgeId: 'badge_team_player',
    badgeLabel: 'Team Player',
    badgeTone: 'default',
    athleteId: 'user2',
    athleteName: 'Emma Henderson',
    coachId: 'coach3',
    coachName: 'David Roberts',
    sessionId: 'sess5',
    reason: 'Helped teammates throughout the session.',
    awardedBy: 'coach3',
    awardedByName: 'David Roberts',
    awardedAt: new Date(today.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    visibility: 'athlete',
    badgeCategory: 'teamwork',
    badgeTier: 1,
    badgePointValue: 10,
  },
];

// ===== SESSIONS (Past completed bookings) =====
export const MOCK_SESSIONS: Session[] = [
  {
    id: 'sess1',
    bookingId: 'book_past1',
    coachId: 'coach1',
    athleteId: 'user1',
    completedAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    attendance: 'ATTENDED',
    notes: 'Tom showed great improvement today. His positioning has gotten much better, and he\'s starting to read the game well. We worked on diving technique and he\'s becoming more confident coming off his line.',
    skillsWorkedOn: ['Positioning', 'Shot Stopping', 'Diving Technique'],
    performanceRating: 4,
    nextFocusAreas: ['Distribution', 'One-on-one situations'],
    videoUrls: ['https://example.com/diving_drill_1.mp4', 'https://example.com/positioning_practice.mp4'],
    coachName: 'Sarah Mitchell',
    athleteName: 'Tom Henderson',
  },
  {
    id: 'sess2',
    bookingId: 'book_past2',
    coachId: 'coach2',
    athleteId: 'user1',
    completedAt: new Date(today.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    attendance: 'ATTENDED',
    notes: 'Excellent session focusing on finishing. Tom is getting more power in his shots and his weak foot is improving rapidly. Needs to work on composure in front of goal.',
    skillsWorkedOn: ['Finishing', 'Weak Foot', 'Shot Power'],
    performanceRating: 5,
    nextFocusAreas: ['Composure', 'First touch in the box'],
    coachName: 'Mike Thompson',
    athleteName: 'Tom Henderson',
  },
  {
    id: 'sess3',
    bookingId: 'book_past3',
    coachId: 'coach1',
    athleteId: 'user1',
    completedAt: new Date(today.getTime() - 16 * 24 * 60 * 60 * 1000).toISOString(),
    attendance: 'ATTENDED',
    notes: 'Good session but Tom seemed a bit tired. We kept it light and focused on technique rather than intensity. His handling is solid.',
    skillsWorkedOn: ['Handling', 'Footwork', 'Communication'],
    performanceRating: 3,
    nextFocusAreas: ['Build fitness', 'Reaction speed'],
    coachName: 'Sarah Mitchell',
    athleteName: 'Tom Henderson',
  },
  {
    id: 'sess4',
    bookingId: 'book_past4',
    coachId: 'coach3',
    athleteId: 'user2',
    completedAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    attendance: 'ATTENDED',
    notes: 'First session with Emma. She has good basic technique and is eager to learn. We focused on passing accuracy and receiving the ball under pressure.',
    skillsWorkedOn: ['Passing', 'First Touch', 'Ball Control'],
    performanceRating: 4,
    nextFocusAreas: ['Vision', 'Decision making'],
    coachName: 'David Roberts',
    athleteName: 'Emma Henderson',
  },
  {
    id: 'sess5',
    bookingId: 'book_past5',
    coachId: 'coach2',
    athleteId: 'user3',
    completedAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    attendance: 'ATTENDED',
    notes: 'James is very talented and works extremely hard. We did advanced finishing drills and he picked everything up quickly. His movement off the ball is exceptional.',
    skillsWorkedOn: ['Finishing', 'Movement', 'Positioning'],
    performanceRating: 5,
    nextFocusAreas: ['Hold-up play', 'Link-up with teammates'],
    coachName: 'Mike Thompson',
    athleteName: 'James Wilson',
  },
  // Session needing notes (for demo)
  {
    id: 'sess_needs_notes',
    bookingId: 'book_past_new',
    coachId: 'coach1',
    athleteId: 'user1',
    completedAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    attendance: 'ATTENDED',
    notes: '',
    skillsWorkedOn: [],
    performanceRating: 3,
    nextFocusAreas: [],
    coachName: 'Sarah Mitchell',
    athleteName: 'Tom Henderson',
  },
  // More sessions for analytics
  {
    id: 'sess6',
    bookingId: 'book_past6',
    coachId: 'coach1',
    athleteId: 'user1',
    completedAt: new Date(today.getTime() - 23 * 24 * 60 * 60 * 1000).toISOString(),
    attendance: 'ATTENDED',
    notes: 'Introduction session. Tom has good natural ability and is very coachable.',
    skillsWorkedOn: ['Basic Technique', 'Positioning', 'Handling'],
    performanceRating: 4,
    nextFocusAreas: ['Shot stopping', 'Footwork'],
    coachName: 'Sarah Mitchell',
    athleteName: 'Tom Henderson',
  },
  {
    id: 'sess7',
    bookingId: 'book_past7',
    coachId: 'coach2',
    athleteId: 'user3',
    completedAt: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    attendance: 'ATTENDED',
    notes: 'Great progress from James. His finishing is clinical now.',
    skillsWorkedOn: ['Finishing', 'First Touch', 'Composure'],
    performanceRating: 5,
    nextFocusAreas: ['Headers', 'Weak foot'],
    coachName: 'Mike Thompson',
    athleteName: 'James Wilson',
  },
  // Additional sessions for coach analytics
  {
    id: 'sess8',
    bookingId: 'book_past8',
    coachId: 'coach1',
    athleteId: 'user1',
    completedAt: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    attendance: 'ATTENDED',
    notes: 'Second session. Building on basics.',
    skillsWorkedOn: ['Shot Stopping', 'Distribution'],
    performanceRating: 4,
    nextFocusAreas: ['Command of box'],
    coachName: 'Sarah Mitchell',
    athleteName: 'Tom Henderson',
  },
];

// ===== GOALS =====
export const MOCK_GOALS: Goal[] = [
  {
    id: 'goal1',
    userId: 'user1',
    title: 'Make School Team',
    description: 'Get selected for the school football team tryouts in January',
    targetDate: '2026-01-15',
    status: 'ACTIVE',
    progress: 60,
    createdAt: new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'goal2',
    userId: 'user1',
    title: 'Improve Weak Foot',
    description: 'Be comfortable shooting and passing with my left foot',
    status: 'ACTIVE',
    progress: 45,
    createdAt: new Date(today.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'goal3',
    userId: 'user2',
    title: 'Complete 10 Sessions',
    description: 'Attend 10 coaching sessions to build fundamentals',
    targetDate: '2026-03-01',
    status: 'ACTIVE',
    progress: 20,
    createdAt: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'goal4',
    userId: 'user3',
    title: 'Join Academy',
    description: 'Trial for a professional academy',
    targetDate: '2026-06-01',
    status: 'ACTIVE',
    progress: 75,
    createdAt: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ===== CONVERSATIONS =====
export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv1',
    participants: ['coach1', 'parent1'],
    relatedAthleteId: 'user1',
    lastMessageAt: new Date(today.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    lastMessage: 'See you tomorrow at 3.',
    unreadCount: 0,
    coachName: 'Sarah Mitchell',
    athleteName: 'Tom Henderson',
  },
  {
    id: 'conv2',
    participants: ['coach2', 'parent1'],
    relatedAthleteId: 'user1',
    lastMessageAt: new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    lastMessage: 'Tom is making good progress with his finishing.',
    unreadCount: 1,
    coachName: 'Mike Thompson',
    athleteName: 'Tom Henderson',
  },
  {
    id: 'conv3',
    participants: ['coach3', 'parent1'],
    relatedAthleteId: 'user2',
    lastMessageAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    lastMessage: 'Emma did well in her first session.',
    unreadCount: 0,
    coachName: 'David Roberts',
    athleteName: 'Emma Henderson',
  },
  {
    id: 'conv4',
    participants: ['coach2', 'user3'],
    relatedAthleteId: 'user3',
    lastMessageAt: new Date(today.getTime() - 3 * 60 * 60 * 1000).toISOString(),
    lastMessage: 'Thanks for the session coach.',
    unreadCount: 0,
    coachName: 'Mike Thompson',
    athleteName: 'James Wilson',
  },
  // Group booking conversations
  {
    id: 'conv5',
    participants: ['coach2', 'user4'],
    relatedAthleteId: 'user4',
    relatedBookingId: 'book_group1',
    lastMessageAt: new Date(today.getTime() - 1 * 60 * 60 * 1000).toISOString(),
    lastMessage: 'Looking forward to the group session on Saturday.',
    unreadCount: 0,
    coachName: 'Mike Thompson',
    athleteName: 'Sophie Taylor',
  },
  {
    id: 'conv6',
    participants: ['coach2', 'user5'],
    relatedAthleteId: 'user5',
    relatedBookingId: 'book_group1',
    lastMessageAt: new Date(today.getTime() - 6 * 60 * 60 * 1000).toISOString(),
    lastMessage: 'Should I bring my own ball?',
    unreadCount: 0,
    coachName: 'Mike Thompson',
    athleteName: 'Liam Davies',
  },
  {
    id: 'conv7',
    participants: ['coach2', 'user6'],
    relatedAthleteId: 'user6',
    relatedBookingId: 'book_group1',
    lastMessageAt: new Date(today.getTime() - 12 * 60 * 60 * 1000).toISOString(),
    lastMessage: 'Can you confirm my spot for the clinic?',
    unreadCount: 1,
    coachName: 'Mike Thompson',
    athleteName: 'Ella Martinez',
  },
];

// ===== MESSAGES =====
export const MOCK_MESSAGES: Message[] = [
  // Conversation 1 (coach1 <-> parent1 about user1)
  {
    id: 'msg1',
    conversationId: 'conv1',
    senderId: 'parent1',
    senderName: 'John Henderson',
    content: 'Hi Sarah, can we book a session for tomorrow at 3pm?',
    sentAt: new Date(today.getTime() - 4 * 60 * 60 * 1000).toISOString(),
    read: true,
  },
  {
    id: 'msg2',
    conversationId: 'conv1',
    senderId: 'coach1',
    senderName: 'Sarah Mitchell',
    content: 'Yes that works. Hyde Park as usual?',
    sentAt: new Date(today.getTime() - 3 * 60 * 60 * 1000).toISOString(),
    read: true,
  },
  {
    id: 'msg3',
    conversationId: 'conv1',
    senderId: 'parent1',
    senderName: 'John Henderson',
    content: 'Yes please. Tom is looking forward to it.',
    sentAt: new Date(today.getTime() - 2.5 * 60 * 60 * 1000).toISOString(),
    read: true,
  },
  {
    id: 'msg4',
    conversationId: 'conv1',
    senderId: 'coach1',
    senderName: 'Sarah Mitchell',
    content: 'See you tomorrow at 3.',
    sentAt: new Date(today.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    read: true,
  },

  // Conversation 2 (coach2 <-> parent1 about user1)
  {
    id: 'msg5',
    conversationId: 'conv2',
    senderId: 'coach2',
    senderName: 'Mike Thompson',
    content: 'Tom is making good progress with his finishing.',
    sentAt: new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    read: false,
  },

  // Group booking messages - Sophie Taylor
  {
    id: 'msg6',
    conversationId: 'conv5',
    senderId: 'user4',
    senderName: 'Sophie Taylor',
    content: 'Hi Coach Mike. Looking forward to the group clinic this weekend.',
    sentAt: new Date(today.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    read: true,
  },
  {
    id: 'msg7',
    conversationId: 'conv5',
    senderId: 'coach2',
    senderName: 'Mike Thompson',
    content: 'Good to hear Sophie. We will be working on advanced finishing techniques. See you Saturday.',
    sentAt: new Date(today.getTime() - 1.5 * 60 * 60 * 1000).toISOString(),
    read: true,
  },
  {
    id: 'msg8',
    conversationId: 'conv5',
    senderId: 'user4',
    senderName: 'Sophie Taylor',
    content: 'Looking forward to the group session on Saturday.',
    sentAt: new Date(today.getTime() - 1 * 60 * 60 * 1000).toISOString(),
    read: true,
  },

  // Group booking messages - Liam Davies
  {
    id: 'msg9',
    conversationId: 'conv6',
    senderId: 'user5',
    senderName: 'Liam Davies',
    content: 'Hi Coach. This is my first group session. Should I bring my own ball?',
    sentAt: new Date(today.getTime() - 6 * 60 * 60 * 1000).toISOString(),
    read: true,
  },
  {
    id: 'msg10',
    conversationId: 'conv6',
    senderId: 'coach2',
    senderName: 'Mike Thompson',
    content: 'Hi Liam. No need to bring a ball, I will have plenty for the whole group. Just bring your boots and water.',
    sentAt: new Date(today.getTime() - 5.5 * 60 * 60 * 1000).toISOString(),
    read: true,
  },

  // Group booking messages - Ella Martinez (pending confirmation)
  {
    id: 'msg11',
    conversationId: 'conv7',
    senderId: 'user6',
    senderName: 'Ella Martinez',
    content: 'Hi Coach Mike, I am interested in joining the striker clinic this Saturday. Can you confirm my spot for the clinic?',
    sentAt: new Date(today.getTime() - 12 * 60 * 60 * 1000).toISOString(),
    read: false,
  },
];

// ===== POSTS =====
export const MOCK_POSTS: Post[] = [
  {
    id: 'post1',
    authorId: 'user3',
    authorName: 'James Wilson',
    authorAvatar: 'JW',
    content: 'Just achieved my goal of scoring 20 goals this season. Thanks to Coach Mike for all the help.',
    likes: ['user1', 'parent1', 'coach2', 'coach1', 'user2'],
    commentCount: 4,
    createdAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'post2',
    authorId: 'coach2',
    authorName: 'Mike Thompson',
    authorAvatar: 'MT',
    content: '5 essential drills to improve your first touch:\n1. Wall passes\n2. Close control circles\n3. Cushion control\n4. Directional first touch\n5. Game situations',
    likes: ['user1', 'user2', 'user3', 'parent1', 'parent2', 'coach1', 'coach3'],
    commentCount: 6,
    createdAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'post3',
    authorId: 'user1',
    authorName: 'Tom Henderson',
    authorAvatar: 'TH',
    content: 'Good session today working on positioning. Feeling more confident.',
    likes: ['parent1', 'coach1', 'user3'],
    commentCount: 2,
    createdAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'post4',
    authorId: 'coach1',
    authorName: 'Sarah Mitchell',
    authorAvatar: 'SM',
    content: 'Reminder: Consistency is key. Even 15 minutes of daily practice can make a huge difference. Keep pushing.',
    likes: ['user1', 'user2', 'parent1', 'coach3'],
    commentCount: 3,
    createdAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'post5',
    authorId: 'user2',
    authorName: 'Emma Henderson',
    authorAvatar: 'EH',
    content: 'First session with Coach David went well. Learned so much about ball control.',
    likes: ['parent1', 'coach3', 'user1'],
    commentCount: 1,
    createdAt: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'post6',
    authorId: 'coach3',
    authorName: 'David Roberts',
    authorAvatar: 'DR',
    content: 'The best players are the ones who practice with purpose. Set clear goals for each training session.',
    likes: ['user1', 'user2', 'user3', 'coach2'],
    commentCount: 2,
    createdAt: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'post7',
    authorId: 'parent1',
    authorName: 'John Henderson',
    authorAvatar: 'JH',
    content: 'Proud of Tom and Emma\'s progress. The coaches here are doing a great job.',
    likes: ['user1', 'user2', 'coach1', 'coach2', 'coach3', 'parent2'],
    commentCount: 5,
    createdAt: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ===== COMMENTS =====
export const MOCK_COMMENTS: Comment[] = [
  // Comments for post1 (James Wilson's achievement)
  {
    id: 'comment1',
    postId: 'post1',
    authorId: 'coach2',
    authorName: 'Mike Thompson',
    authorAvatar: 'MT',
    content: 'Proud of you James. Your hard work really paid off.',
    likes: ['user3', 'user1'],
    createdAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comment2',
    postId: 'post1',
    authorId: 'user1',
    authorName: 'Tom Henderson',
    authorAvatar: 'TH',
    content: 'Congrats James.',
    likes: ['user3'],
    createdAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comment3',
    postId: 'post1',
    authorId: 'parent1',
    authorName: 'John Henderson',
    authorAvatar: 'JH',
    content: 'Well done. Keep up the good work.',
    likes: [],
    createdAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comment4',
    postId: 'post1',
    authorId: 'coach1',
    authorName: 'Sarah Mitchell',
    authorAvatar: 'SM',
    content: 'Solid achievement James.',
    likes: ['user3', 'coach2'],
    createdAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
  },

  // Comments for post2 (Mike's training tips)
  {
    id: 'comment5',
    postId: 'post2',
    authorId: 'user1',
    authorName: 'Tom Henderson',
    authorAvatar: 'TH',
    content: 'Thanks Coach. Going to try these today.',
    likes: ['coach2', 'user2'],
    createdAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comment6',
    postId: 'post2',
    authorId: 'user3',
    authorName: 'James Wilson',
    authorAvatar: 'JW',
    content: 'Wall passes are my favorite. Very effective.',
    likes: ['coach2', 'user1', 'user2'],
    createdAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comment7',
    postId: 'post2',
    authorId: 'parent1',
    authorName: 'John Henderson',
    authorAvatar: 'JH',
    content: 'Good tips. Will work on these with the kids.',
    likes: ['coach2'],
    createdAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comment8',
    postId: 'post2',
    authorId: 'coach1',
    authorName: 'Sarah Mitchell',
    authorAvatar: 'SM',
    content: 'Solid drills Mike. I use these with my goalkeepers too.',
    likes: ['coach2', 'user1'],
    createdAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comment9',
    postId: 'post2',
    authorId: 'user2',
    authorName: 'Emma Henderson',
    authorAvatar: 'EH',
    content: 'Looking forward to practicing these.',
    likes: ['parent1', 'coach2'],
    createdAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comment10',
    postId: 'post2',
    authorId: 'coach3',
    authorName: 'David Roberts',
    authorAvatar: 'DR',
    content: 'Good fundamentals. These are effective drills.',
    likes: ['coach2'],
    createdAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000 + 7 * 60 * 60 * 1000).toISOString(),
  },

  // Comments for post3 (Tom's positioning session)
  {
    id: 'comment11',
    postId: 'post3',
    authorId: 'coach1',
    authorName: 'Sarah Mitchell',
    authorAvatar: 'SM',
    content: 'You did well today Tom. Keep it up.',
    likes: ['user1', 'parent1'],
    createdAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comment12',
    postId: 'post3',
    authorId: 'parent1',
    authorName: 'John Henderson',
    authorAvatar: 'JH',
    content: 'Proud of you son.',
    likes: ['user1'],
    createdAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
  },

  // Comments for post4 (Sarah's consistency reminder)
  {
    id: 'comment13',
    postId: 'post4',
    authorId: 'user1',
    authorName: 'Tom Henderson',
    authorAvatar: 'TH',
    content: 'This is true. Been practicing every day this week.',
    likes: ['coach1', 'parent1'],
    createdAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comment14',
    postId: 'post4',
    authorId: 'user2',
    authorName: 'Emma Henderson',
    authorAvatar: 'EH',
    content: 'Thanks for the reminder Coach.',
    likes: ['coach1'],
    createdAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comment15',
    postId: 'post4',
    authorId: 'coach3',
    authorName: 'David Roberts',
    authorAvatar: 'DR',
    content: 'Agreed. Small consistent steps lead to big results.',
    likes: ['coach1', 'user1', 'user2'],
    createdAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
  },

  // Comments for post5 (Emma's first session)
  {
    id: 'comment16',
    postId: 'post5',
    authorId: 'coach3',
    authorName: 'David Roberts',
    authorAvatar: 'DR',
    content: 'You were a strong student Emma. Good first session.',
    likes: ['user2', 'parent1'],
    createdAt: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
  },

  // Comments for post6 (David's training purpose)
  {
    id: 'comment17',
    postId: 'post6',
    authorId: 'user3',
    authorName: 'James Wilson',
    authorAvatar: 'JW',
    content: 'This has helped me. I always have a plan now.',
    likes: ['coach3', 'user1'],
    createdAt: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comment18',
    postId: 'post6',
    authorId: 'coach2',
    authorName: 'Mike Thompson',
    authorAvatar: 'MT',
    content: 'Well said David. Purpose drives progress.',
    likes: ['coach3'],
    createdAt: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
  },

  // Comments for post7 (John's proud parent post)
  {
    id: 'comment19',
    postId: 'post7',
    authorId: 'coach1',
    authorName: 'Sarah Mitchell',
    authorAvatar: 'SM',
    content: 'Thank you John. Tom and Emma are good to work with.',
    likes: ['parent1', 'user1', 'user2'],
    createdAt: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comment20',
    postId: 'post7',
    authorId: 'coach2',
    authorName: 'Mike Thompson',
    authorAvatar: 'MT',
    content: 'They are both doing well. Good to have supportive parents.',
    likes: ['parent1', 'coach1'],
    createdAt: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comment21',
    postId: 'post7',
    authorId: 'user1',
    authorName: 'Tom Henderson',
    authorAvatar: 'TH',
    content: 'Thanks Dad. I enjoy the coaching sessions.',
    likes: ['parent1', 'user2'],
    createdAt: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comment22',
    postId: 'post7',
    authorId: 'user2',
    authorName: 'Emma Henderson',
    authorAvatar: 'EH',
    content: 'Thanks Dad.',
    likes: ['parent1', 'user1'],
    createdAt: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comment23',
    postId: 'post7',
    authorId: 'parent2',
    authorName: 'Lisa Wilson',
    authorAvatar: 'LW',
    content: 'Agreed. The coaching quality here is high.',
    likes: ['parent1', 'coach1', 'coach2'],
    createdAt: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000).toISOString(),
  },
];

// ===== REVIEWS =====
export const MOCK_REVIEWS: Review[] = [
  {
    id: 'rev1',
    coachId: 'coach1',
    athleteId: 'user1',
    rating: 5,
    comment: 'Sarah has helped Tom develop his goalkeeping skills. He is more confident now.',
    createdAt: new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    athleteName: 'Tom Henderson',
  },
  {
    id: 'rev2',
    coachId: 'coach2',
    athleteId: 'user1',
    rating: 5,
    comment: 'Mike is effective at teaching finishing techniques. Tom\'s goal-scoring has improved.',
    createdAt: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    athleteName: 'Tom Henderson',
  },
  {
    id: 'rev3',
    coachId: 'coach2',
    athleteId: 'user3',
    rating: 5,
    comment: 'Professional coach who knows how to get the best out of players.',
    createdAt: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    athleteName: 'James Wilson',
  },
  {
    id: 'rev4',
    coachId: 'coach4',
    athleteId: 'user2',
    rating: 5,
    comment: 'Amy pushed my pace and shared a warmup PDF. Very helpful.',
    createdAt: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    athleteName: 'Emma Henderson',
  },
  {
    id: 'rev5',
    coachId: 'coach5',
    athleteId: 'user4',
    rating: 4,
    comment: 'The video review showing my positioning mistakes was useful.',
    createdAt: today.toISOString(),
    athleteName: 'Sophie Taylor',
  },
];

// ===== HELPER FUNCTIONS =====

export function getUserById(id: string): User | undefined {
  return MOCK_USERS.find((u) => u.id === id);
}

export function getCoachProfile(userId: string): CoachProfile | undefined {
  return MOCK_COACH_PROFILES.find((cp) => cp.userId === userId);
}

export function getUserProfile(userId: string): UserProfile | undefined {
  return MOCK_USER_PROFILES.find((up) => up.userId === userId);
}

export function getChildrenForParent(parentId: string): User[] {
  const childIds = MOCK_RELATIONSHIPS.filter((r) => r.parentId === parentId).map((r) => r.childId);
  return MOCK_USERS.filter((u) => childIds.includes(u.id));
}

export function getParentForAthlete(athleteId: string): User | undefined {
  const relationship = MOCK_RELATIONSHIPS.find((r) => r.childId === athleteId);
  if (!relationship) return undefined;
  return MOCK_USERS.find((u) => u.id === relationship.parentId);
}

export function getBookingsForCoach(coachId: string): Booking[] {
  return MOCK_BOOKINGS.filter((b) => b.coachId === coachId);
}

export function getBookingsForAthlete(athleteId: string): Booking[] {
  return MOCK_BOOKINGS.filter((b) => b.athleteId === athleteId);
}

export function getSessionsForCoach(coachId: string): Session[] {
  return MOCK_SESSIONS.filter((s) => s.coachId === coachId);
}

export function getSessionsForAthlete(athleteId: string): Session[] {
  return MOCK_SESSIONS.filter((s) => s.athleteId === athleteId);
}

export function getBadgeCatalog(): BadgeDefinition[] {
  return badgeCatalog;
}

export function getBadgeAwardsForAthlete(athleteId: string): BadgeAward[] {
  return badgeAwards
    .filter((award) => award.athleteId === athleteId)
    .sort((a, b) => new Date(b.awardedAt).getTime() - new Date(a.awardedAt).getTime());
}

export function getBadgeAwardsForSession(sessionId: string): BadgeAward[] {
  return badgeAwards
    .filter((award) => award.sessionId === sessionId)
    .sort((a, b) => new Date(b.awardedAt).getTime() - new Date(a.awardedAt).getTime());
}

export function getRecentBadgeAwards(limit = 5): BadgeAward[] {
  return [...badgeAwards]
    .sort((a, b) => new Date(b.awardedAt).getTime() - new Date(a.awardedAt).getTime())
    .slice(0, limit);
}

export function getGoalsForUser(userId: string): Goal[] {
  return MOCK_GOALS.filter((g) => g.userId === userId);
}

export function getConversationsForUser(userId: string): Conversation[] {
  return MOCK_CONVERSATIONS.filter((c) => c.participants.includes(userId));
}

export function getMessagesForConversation(conversationId: string): Message[] {
  return MOCK_MESSAGES.filter((m) => m.conversationId === conversationId);
}

export function getReviewsForCoach(coachId: string): Review[] {
  return MOCK_REVIEWS.filter((r) => r.coachId === coachId);
}

export function getCommentsForPost(postId: string): Comment[] {
  return MOCK_COMMENTS.filter((c) => c.postId === postId);
}

export function getPostById(postId: string): Post | undefined {
  return MOCK_POSTS.find((p) => p.id === postId);
}

// Get all coaches with their profiles (for search/discover)
export function getAllCoachesWithProfiles(): Array<User & { profile: CoachProfile }> {
  return MOCK_USERS.filter((u) => u.role === 'COACH').map((coach) => ({
    ...coach,
    profile: getCoachProfile(coach.id)!,
  }));
}

// Calculate distance between postcodes (mock - just returns random for now)
export function getDistanceBetweenPostcodes(postcode1: string, postcode2: string): number {
  // Mock: return a distance between 0.1 and 5 miles
  return Math.random() * 4.9 + 0.1;
}

// Format currency in GBP
export function formatGBP(amount: number): string {
  return `£${amount.toFixed(0)}`;
}

// Format date/time helpers
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)}, ${formatTime(date)}`;
}

// ===== SESSION MANAGEMENT DATA =====

import type {
  SessionTemplate,
  CoachSession,
  SessionState,
  GuestAthlete,
  SessionRequest,
  AthleteDirectoryEntry,
  SessionPlan,
  SessionRecap,
  AppNotification,
  PaymentInfo,
  TeamInviteCode,
} from './app-types';

// Session Templates
export const MOCK_SESSION_TEMPLATES: SessionTemplate[] = [
  {
    id: 'template1',
    coachId: 'coach1',
    name: 'Goalkeeper Development Session',
    type: '1-to-1',
    duration: 60,
    capacity: 1,
    defaultPrice: 50,
    description: 'Intensive 1-to-1 goalkeeper training covering shot-stopping, positioning, and distribution.',
    defaultLocation: 'Hyde Park',
    skillsFocus: ['Goalkeeping', 'Shot Stopping', 'Positioning', 'Distribution'],
    createdAt: new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'template2',
    coachId: 'coach1',
    name: 'Small Group Goalkeeper Clinic',
    type: 'small-group',
    duration: 90,
    capacity: 6,
    defaultPrice: 30,
    description: 'Small group training for up to 6 goalkeepers. Focus on fundamentals and match situations.',
    defaultLocation: 'Hyde Park',
    skillsFocus: ['Goalkeeping', 'Game Intelligence', 'Communication'],
    createdAt: new Date(today.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'template3',
    coachId: 'coach2',
    name: 'Finishing Masterclass',
    type: '1-to-1',
    duration: 60,
    capacity: 1,
    defaultPrice: 45,
    description: 'Individual striker training focused on finishing techniques, movement, and composure.',
    defaultLocation: 'Victoria Park',
    skillsFocus: ['Finishing', 'Movement', 'Composure'],
    createdAt: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'template4',
    coachId: 'coach2',
    name: 'Striker Workshop',
    type: 'small-group',
    duration: 90,
    capacity: 8,
    defaultPrice: 25,
    description: 'Group session for strikers. Competitive drills and game scenarios.',
    defaultLocation: 'Hackney Marshes',
    skillsFocus: ['Finishing', 'First Touch', 'Link-up Play'],
    createdAt: new Date(today.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// UK Venues/Locations
export const UK_VENUES = [
  'Hyde Park',
  'Regent\'s Park',
  'Victoria Park',
  'Clapham Common',
  'Battersea Park',
  'Hackney Marshes',
  'Primrose Hill',
  'Hampstead Heath',
  'Richmond Park',
  'Wandsworth Common',
];

// Coach Sessions
export const MOCK_COACH_SESSIONS: CoachSession[] = [
  // Draft session
  {
    id: 'session1',
    coachId: 'coach1',
    templateId: 'template1',
    type: '1-to-1',
    state: 'DRAFT',
    title: 'Goalkeeper Assessment',
    description: 'Initial assessment session for new goalkeeper',
    scheduledAt: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    duration: 60,
    location: 'Hyde Park',
    capacity: 1,
    roster: [],
    isPrivate: false,
    isOpenToRequests: true,
    price: 50,
    createdAt: new Date(today.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(today.getTime() - 2 * 60 * 60 * 1000).toISOString(),
  },
  // Open session (available for booking)
  {
    id: 'session2',
    coachId: 'coach1',
    templateId: 'template2',
    type: 'small-group',
    state: 'OPEN',
    title: 'Weekend Goalkeeper Clinic',
    description: 'Small group training for goalkeepers of all levels',
    scheduledAt: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000).toISOString(), // Next Saturday 10am
    duration: 90,
    location: 'Regent\'s Park',
    capacity: 6,
    roster: [
      {
        id: 'roster1',
        sessionId: 'session2',
        participantType: 'athlete',
        athleteId: 'user1',
        confirmedAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    isPrivate: false,
    isOpenToRequests: true,
    price: 30,
    createdAt: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  // Requested session (has pending requests)
  {
    id: 'session3',
    coachId: 'coach2',
    templateId: 'template3',
    type: '1-to-1',
    state: 'REQUESTED',
    title: 'Finishing Masterclass',
    description: 'Advanced finishing techniques for strikers',
    scheduledAt: new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000).toISOString(),
    duration: 60,
    location: 'Victoria Park',
    capacity: 1,
    roster: [],
    isPrivate: false,
    isOpenToRequests: true,
    price: 45,
    createdAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  // Confirmed session
  {
    id: 'session4',
    coachId: 'coach1',
    templateId: 'template1',
    type: '1-to-1',
    state: 'CONFIRMED',
    title: 'Goalkeeper Training - Tom Henderson',
    description: 'Focus on shot-stopping and positioning',
    scheduledAt: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000).toISOString(), // Tomorrow 3pm
    duration: 60,
    location: 'Hyde Park',
    capacity: 1,
    roster: [
      {
        id: 'roster2',
        sessionId: 'session4',
        participantType: 'athlete',
        athleteId: 'user1',
        confirmedAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    isPrivate: true,
    isOpenToRequests: false,
    price: 50,
    planId: 'plan1',
    createdAt: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  // Completed session
  {
    id: 'session5',
    coachId: 'coach2',
    templateId: 'template3',
    type: '1-to-1',
    state: 'COMPLETED',
    title: 'Finishing Session - James Wilson',
    description: 'Worked on weak foot finishing',
    scheduledAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000).toISOString(),
    duration: 60,
    location: 'Victoria Park',
    capacity: 1,
    roster: [
      {
        id: 'roster3',
        sessionId: 'session5',
        participantType: 'athlete',
        athleteId: 'user3',
        confirmedAt: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        attendanceStatus: 'ATTENDED',
      },
    ],
    isPrivate: true,
    isOpenToRequests: false,
    price: 45,
    recapId: 'recap1',
    createdAt: new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  // Cancelled session
  {
    id: 'session6',
    coachId: 'coach1',
    type: 'small-group',
    state: 'CANCELLED',
    title: 'Goalkeeper Clinic - Weather Cancellation',
    description: 'Outdoor training session',
    scheduledAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000).toISOString(),
    duration: 90,
    location: 'Hampstead Heath',
    capacity: 6,
    roster: [],
    isPrivate: false,
    isOpenToRequests: true,
    price: 30,
    cancelledAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    cancellationReason: 'Poor weather conditions - heavy rain. Full refunds issued.',
    createdAt: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Guest Athletes
export const MOCK_GUEST_ATHLETES: GuestAthlete[] = [
  {
    id: 'guest1',
    coachId: 'coach1',
    name: 'Oliver Smith',
    ageBand: 'Under 12',
    guardianName: 'Rachel Smith',
    guardianContact: '+44 7700 900123',
    notes: 'Showing good potential in goal. Needs to work on distribution.',
    isVerified: true,
    createdAt: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'guest2',
    coachId: 'coach2',
    name: 'Charlie Brown',
    ageBand: '13-15',
    guardianName: 'David Brown',
    guardianContact: '+44 7700 900456',
    notes: 'Natural striker. Very fast and eager to learn.',
    isVerified: true,
    createdAt: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'guest3',
    coachId: 'coach1',
    name: 'Lily Johnson',
    ageBand: '13-15',
    guardianName: 'Sarah Johnson',
    guardianContact: '+44 7700 900789',
    notes: 'Invited to trial session. Guardian yet to confirm.',
    isVerified: false,
    createdAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Session Requests
export const MOCK_SESSION_REQUESTS: SessionRequest[] = [
  {
    id: 'req1',
    sessionId: 'session3',
    athleteId: 'user1',
    requestedById: 'parent1',
    status: 'PENDING',
    message: 'Tom is keen to work on his finishing skills. Would this session be suitable for him?',
    createdAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'req2',
    sessionId: 'session2',
    athleteId: 'user2',
    requestedById: 'parent1',
    status: 'APPROVED',
    message: 'Emma would love to join this clinic.',
    createdAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    respondedAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    responseMessage: 'Emma is confirmed for the clinic.',
  },
];

// Athlete Directory Entries
export const MOCK_ATHLETE_DIRECTORY: AthleteDirectoryEntry[] = [
  {
    id: 'dir1',
    coachId: 'coach1',
    athleteId: 'user1',
    tags: ['Goalkeeper', 'U16', 'Regular'],
    notes: 'Making excellent progress. Very coachable and dedicated.',
    firstSessionDate: new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    lastSessionDate: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    totalSessions: 12,
    addedAt: new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'dir2',
    coachId: 'coach2',
    athleteId: 'user3',
    tags: ['Striker', 'U17', 'Academy Prospect'],
    notes: 'Exceptional talent. Has trials coming up with professional academies.',
    firstSessionDate: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    lastSessionDate: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    totalSessions: 18,
    addedAt: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'dir3',
    coachId: 'coach2',
    athleteId: 'user1',
    tags: ['Finishing', 'U16'],
    notes: 'Works well on finishing drills. Good attitude.',
    firstSessionDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    lastSessionDate: new Date(today.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    totalSessions: 5,
    addedAt: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Session Plans
export const MOCK_SESSION_PLANS: SessionPlan[] = [
  {
    id: 'plan1',
    sessionId: 'session4',
    coachId: 'coach1',
    objectives: [
      'Improve shot-stopping technique',
      'Work on positioning for crosses',
      'Practice distribution under pressure',
    ],
    warmUp: '10 mins: Dynamic stretching and agility ladder drills',
    mainActivities: [
      {
        id: 'act1',
        name: 'Shot Stopping Drill',
        duration: 20,
        description: 'Repetitive shots from various angles to improve reaction time and technique',
        focusAreas: ['Shot Stopping', 'Diving Technique'],
      },
      {
        id: 'act2',
        name: 'Positioning for Crosses',
        duration: 15,
        description: 'Practice coming off the line to claim crosses, judging flight and timing',
        focusAreas: ['Positioning', 'Command of Area'],
      },
      {
        id: 'act3',
        name: 'Distribution Under Pressure',
        duration: 15,
        description: 'Passing drills with defenders closing down quickly',
        focusAreas: ['Distribution', 'Decision Making'],
      },
    ],
    coolDown: '10 mins: Static stretching and reflection on key points',
    equipment: ['Cones', 'Training balls', 'Goals', 'Agility ladder', 'Gloves'],
    notes: 'Tom has been working hard. Focus on building confidence with crosses today.',
    sharedWithAthletes: true,
    createdAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Session Recaps
export const MOCK_SESSION_RECAPS: SessionRecap[] = [
  {
    id: 'recap1',
    sessionId: 'session5',
    coachId: 'coach2',
    summary:
      'Excellent session with James. Focused on weak foot finishing and he made tremendous progress. His confidence has grown significantly.',
    highlightsPerAthlete: [
      {
        athleteId: 'user3',
        athleteName: 'James Wilson',
        strengths: ['Quick learning', 'Strong work ethic', 'Natural finishing ability'],
        areasToImprove: ['Weak foot accuracy', 'First touch control'],
        performanceRating: 5,
        notes: 'James is ready for more advanced techniques. Consider 1-on-1 scenarios next.',
      },
    ],
    skillsWorked: ['Finishing', 'Weak Foot', 'Composure'],
    overallPerformance: 5,
    nextSteps: 'Continue weak foot development. Introduce more game-realistic scenarios.',
    photoUrls: [],
    videoUrls: ['https://example.com/james-finishing-drill.mp4'],
    sharedWithAthletes: true,
    createdAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
  },
];

// Notifications
export const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif1',
    userId: 'coach2',
    type: 'SESSION_REQUEST',
    title: 'New Session Request',
    body: 'John Henderson has requested a place for Tom in your Finishing Masterclass.',
    deepLink: '/(tabs)/bookings/session3',
    relatedEntityId: 'req1',
    isRead: false,
    createdAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif2',
    userId: 'user1',
    type: 'SESSION_CONFIRMED',
    title: 'Session Confirmed',
    body: 'Your session with Sarah Mitchell on ' + formatDateTime(new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000)) + ' is confirmed.',
    deepLink: '/(tabs)/bookings/session4',
    relatedEntityId: 'session4',
    isRead: true,
    createdAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif3',
    userId: 'coach1',
    type: 'CERTIFICATION_EXPIRING',
    title: 'Certification Expiring Soon',
    body: 'Your FA Safeguarding Children Certificate expires in 45 days. Please renew.',
    deepLink: '/(tabs)/coach-profile',
    relatedEntityId: 'cert3',
    isRead: false,
    createdAt: new Date(today.getTime() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif4',
    userId: 'parent1',
    type: 'RECAP_SHARED',
    title: 'Session Recap Available',
    body: 'Mike Thompson has shared the session recap for James\'s latest training.',
    deepLink: '/(tabs)/bookings/session5',
    relatedEntityId: 'recap1',
    isRead: false,
    createdAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif_badge_athlete',
    userId: 'user1',
    type: 'BADGE',
    title: 'New badge awarded',
    body: 'Best Training Session from Coach Sarah',
    deepLink: '/(tabs)/progress',
    relatedEntityId: 'award_training_focus',
    isRead: false,
    createdAt: new Date(today.getTime() - 10 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif_badge_parent',
    userId: 'parent1',
    type: 'BADGE',
    title: 'New badge awarded',
    body: 'Tom earned Sharp Shooter Pro — share with supporters?',
    deepLink: '/(tabs)/notifications',
    relatedEntityId: 'award_sharp_shooter',
    isRead: false,
    createdAt: new Date(today.getTime() - 6 * 60 * 60 * 1000).toISOString(),
  },
];

// Payment Information
export const MOCK_PAYMENTS: PaymentInfo[] = [
  {
    id: 'pay1',
    sessionId: 'session4',
    athleteId: 'user1',
    payerId: 'parent1',
    amount: 50,
    finalAmount: 50,
    status: 'PAID',
    paidAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Paid via bank transfer',
  },
  {
    id: 'pay2',
    sessionId: 'session2',
    athleteId: 'user1',
    payerId: 'parent1',
    amount: 30,
    finalAmount: 30,
    status: 'PENDING',
    dueDate: new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Payment due before session',
  },
  {
    id: 'pay3',
    sessionId: 'session6',
    athleteId: 'user1',
    payerId: 'parent1',
    amount: 30,
    finalAmount: 0,
    status: 'REFUNDED',
    refundedAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Full refund issued due to weather cancellation',
  },
];

// Team Invite Codes
export const MOCK_INVITE_CODES: TeamInviteCode[] = [
  {
    id: 'invite1',
    coachId: 'coach1',
    code: 'GK-SQUAD-2025',
    teamName: 'Goalkeeper Development Squad',
    description: 'Join my goalkeeper training programme',
    maxUses: 20,
    currentUses: 3,
    expiresAt: new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
    createdAt: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'invite2',
    coachId: 'coach2',
    code: 'STRIKER-CAMP',
    teamName: 'Summer Striker Camp',
    description: 'Elite striker training - limited spaces',
    maxUses: 12,
    currentUses: 8,
    expiresAt: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
    createdAt: new Date(today.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Helper functions for session management
export function getTemplatesForCoach(coachId: string): SessionTemplate[] {
  return MOCK_SESSION_TEMPLATES.filter((t) => t.coachId === coachId);
}

export function getCoachSessionsForCoach(coachId: string): CoachSession[] {
  return MOCK_COACH_SESSIONS.filter((s) => s.coachId === coachId);
}

export function getOpenSessions(): CoachSession[] {
  return MOCK_COACH_SESSIONS.filter((s) => s.state === 'OPEN' && s.isOpenToRequests);
}

export function getGuestAthletesForCoach(coachId: string): GuestAthlete[] {
  return MOCK_GUEST_ATHLETES.filter((g) => g.coachId === coachId);
}

export function getRequestsForSession(sessionId: string): SessionRequest[] {
  return MOCK_SESSION_REQUESTS.filter((r) => r.sessionId === sessionId);
}

export function getDirectoryForCoach(coachId: string): AthleteDirectoryEntry[] {
  return MOCK_ATHLETE_DIRECTORY.filter((d) => d.coachId === coachId);
}

export function getNotificationsForUser(userId: string): AppNotification[] {
  return MOCK_NOTIFICATIONS.filter((n) => n.userId === userId);
}

export function getPaymentsForUser(userId: string): PaymentInfo[] {
  return MOCK_PAYMENTS.filter((p) => p.payerId === userId);
}

export function getInviteCodesForCoach(coachId: string): TeamInviteCode[] {
  return MOCK_INVITE_CODES.filter((i) => i.coachId === coachId);
}

// ===== CLUB HUB DATA =====

export const clubs: Club[] = [
  {
    id: 'club_lions',
    name: 'Lions FC Academy',
    city: 'London',
    country: 'UK',
    badge: 'LFC',
    photoUrl: 'https://images.unsplash.com/photo-1470082784645-bc2f0b9f9614?auto=format&fit=crop&w=800&q=80',
    tagline: 'North London performance pathway with parent-friendly comms.',
    memberCount: 52,
    coachCount: 8,
    squadCount: 3,
    ownerId: 'coach1',
    ownerName: 'Director Kelly',
    inviteCode: 'LIONS-CLUB',
  },
  {
    id: 'club_eagles',
    name: 'East London Eagles',
    city: 'London',
    country: 'UK',
    badge: 'ELE',
    photoUrl: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=800&q=80',
    tagline: 'Developing champions through dedication and teamwork.',
    memberCount: 38,
    coachCount: 5,
    squadCount: 2,
    ownerId: 'coach2',
    ownerName: 'Sarah Mitchell',
    inviteCode: 'EAGLES-JOIN',
  },
];

export const clubMemberships: ClubMembership[] = [
  // Lions FC memberships
  {
    clubId: 'club_lions',
    userId: 'coach1',
    role: 'HEAD_COACH',
    status: 'active',
    joinSource: 'invite',
    inviteCode: 'LIONS-CLUB',
    squadIds: ['squad_u15', 'squad_juniors'],
    canPostAsClub: true,
  },
  {
    clubId: 'club_lions',
    userId: 'coach2',
    role: 'COACH',
    status: 'active',
    joinSource: 'invite',
    inviteCode: 'LIONS-COACH',
    squadIds: ['squad_u15'],
  },
  {
    clubId: 'club_lions',
    userId: 'coach3',
    role: 'COACH',
    status: 'pending',
    joinSource: 'invite',
    inviteCode: 'LIONS-TRIAL',
    squadIds: ['squad_juniors'],
  },
  // Parent memberships at Lions FC
  {
    clubId: 'club_lions',
    userId: 'parent1',
    role: 'MEMBER',
    status: 'active',
    joinSource: 'invite',
    inviteCode: 'LIONS-PARENT',
    squadIds: ['squad_u15'],
  },
  {
    clubId: 'club_lions',
    userId: 'parent2',
    role: 'MEMBER',
    status: 'active',
    joinSource: 'invite',
    inviteCode: 'LIONS-PARENT',
    squadIds: ['squad_juniors'],
  },
  // Eagles memberships
  {
    clubId: 'club_eagles',
    userId: 'coach2',
    role: 'OWNER',
    status: 'active',
    joinSource: 'created',
    canPostAsClub: true,
  },
  {
    clubId: 'club_eagles',
    userId: 'coach1',
    role: 'COACH',
    status: 'active',
    joinSource: 'invite',
    inviteCode: 'EAGLES-COACH',
  },
  {
    clubId: 'club_eagles',
    userId: 'parent1',
    role: 'MEMBER',
    status: 'active',
    joinSource: 'invite',
    inviteCode: 'EAGLES-JOIN',
  },
];

export const clubSquads: ClubSquad[] = [
  {
    id: 'squad_u15',
    clubId: 'club_lions',
    name: 'U15 Performance',
    level: 'U15 · Competitive',
    memberCount: 18,
    primaryCoach: 'Sarah Mitchell',
    meetLocation: 'Pitch 2',
    nextSession: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['Pressing', 'Finishing'],
  },
  {
    id: 'squad_juniors',
    clubId: 'club_lions',
    name: 'Junior Skills',
    level: 'U11 · Development',
    memberCount: 22,
    primaryCoach: 'Mike Thompson',
    meetLocation: 'Sports Hall',
    nextSession: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['Ball Mastery', 'Confidence'],
  },
  {
    id: 'squad_staff',
    clubId: 'club_lions',
    name: 'Staff Room',
    level: 'Coaches & Admins',
    memberCount: 8,
    primaryCoach: 'Director Kelly',
    meetLocation: 'Clubhouse',
    tags: ['Approvals', 'Safeguarding'],
  },
];

export const clubInvites: ClubInvite[] = [
  {
    code: 'LIONS-CLUB',
    clubId: 'club_lions',
    clubName: 'Lions FC Academy',
    createdBy: 'coach1',
    createdByName: 'Director Kelly',
    role: 'HEAD_COACH',
    expiresAt: new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    remainingUses: 8,
  },
  {
    code: 'LIONS-COACH',
    clubId: 'club_lions',
    clubName: 'Lions FC Academy',
    createdBy: 'coach1',
    createdByName: 'Director Kelly',
    role: 'COACH',
    expiresAt: new Date(today.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    remainingUses: 15,
  },
  {
    code: 'LIONS-TRIAL',
    clubId: 'club_lions',
    clubName: 'Lions FC Academy',
    createdBy: 'coach2',
    createdByName: 'Coach Sarah',
    role: 'COACH',
    expiresAt: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    remainingUses: 3,
  },
];

export const clubFeedPosts: ClubFeedPost[] = [
  // Pinned announcement at top
  {
    id: 'club_post_pinned_1',
    clubId: 'club_lions',
    title: 'Club Registration Now Open for Spring Season',
    body: 'Spring 2026 registration is live! Early bird pricing available until Jan 31. All returning members get priority placement. New families welcome — share with friends!',
    createdAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    audience: 'club',
    audienceLabel: 'Club-wide',
    authorName: 'Director Kelly',
    authorId: 'coach_kelly',
    postAs: 'club',
    postType: 'announcement',
    isPinned: true,
    pinnedBy: 'coach_kelly',
    pinnedAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    reactionCount: 45,
    commentCount: 12,
  },
  // Recent announcement
  {
    id: 'club_post_1',
    clubId: 'club_lions',
    title: 'Indoor training tonight',
    body: 'Heavy rain forecast — moving U15s to the sports hall. Doors open 18:15. Bring flats and water.',
    createdAt: new Date(today.getTime() - 60 * 60 * 1000).toISOString(),
    audience: 'club',
    audienceLabel: 'Club-wide',
    authorName: 'Director Kelly',
    authorId: 'coach_kelly',
    postAs: 'club',
    postType: 'announcement',
    attachments: ['Indoor waiver.pdf'],
    reactionCount: 12,
    commentCount: 4,
  },
  // Photo post
  {
    id: 'club_post_photo_1',
    clubId: 'club_lions',
    title: 'U12 Tournament Champions!',
    body: 'Incredible weekend at the Regional Cup! Our U12s went undefeated and brought home the trophy. So proud of this group!',
    createdAt: new Date(today.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    audience: 'club',
    audienceLabel: 'Club-wide',
    authorName: 'Coach Mike',
    authorId: 'coach_mike',
    postAs: 'self',
    postType: 'photo',
    imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
    reactionCount: 34,
    commentCount: 8,
  },
  // Badge/general post
  {
    id: 'club_post_2',
    clubId: 'club_lions',
    title: 'Badge unlocks posted',
    body: 'Finishing clinic clips uploaded. Top effort from Maya and Ethan — badge hub updated.',
    createdAt: new Date(today.getTime() - 3 * 60 * 60 * 1000).toISOString(),
    audience: 'squad',
    audienceLabel: 'Squad · U15',
    authorName: 'Coach Sarah',
    authorId: 'coach1',
    postAs: 'self',
    postType: 'general',
    badgeAwarded: 'Clinical Finisher',
    reactionCount: 7,
    commentCount: 2,
  },
  // Event post
  {
    id: 'club_post_event_1',
    clubId: 'club_lions',
    title: 'Family Fun Day - Save the Date',
    body: 'Mark your calendars! Annual Family Fun Day is coming up. BBQ, skills challenges, and mini tournaments for all ages. Families and friends welcome!',
    createdAt: new Date(today.getTime() - 4 * 60 * 60 * 1000).toISOString(),
    audience: 'club',
    audienceLabel: 'Club-wide',
    authorName: 'Director Kelly',
    authorId: 'coach_kelly',
    postAs: 'club',
    postType: 'event',
    eventDate: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    eventLocation: 'Lions Sports Complex',
    reactionCount: 28,
    commentCount: 15,
  },
  // Staff only post
  {
    id: 'club_post_3',
    clubId: 'club_lions',
    title: 'Staff approvals',
    body: 'Drafting next month\'s schedule. Drop proposed camps and indoor blocks for approval.',
    createdAt: new Date(today.getTime() - 20 * 60 * 1000).toISOString(),
    audience: 'staff',
    audienceLabel: 'Staff',
    authorName: 'Director Kelly',
    authorId: 'coach_kelly',
    postAs: 'club',
    postType: 'general',
    attachments: ['Schedule template'],
    reactionCount: 3,
    commentCount: 1,
  },
  // Another photo
  {
    id: 'club_post_photo_2',
    clubId: 'club_lions',
    title: 'Training highlights',
    body: 'Great energy at yesterday\'s session! The passing drills are really paying off.',
    createdAt: new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    audience: 'squad',
    audienceLabel: 'Squad · U15',
    authorName: 'Coach Sarah',
    authorId: 'coach1',
    postAs: 'self',
    postType: 'photo',
    imageUrl: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800',
    reactionCount: 19,
    commentCount: 3,
  },
  // General update
  {
    id: 'club_post_general_1',
    clubId: 'club_lions',
    title: 'Welcome new members!',
    body: 'Big welcome to the 8 new families joining us this month. Looking forward to seeing everyone on the pitch!',
    createdAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    audience: 'club',
    audienceLabel: 'Club-wide',
    authorName: 'Director Kelly',
    authorId: 'coach_kelly',
    postAs: 'club',
    postType: 'general',
    reactionCount: 22,
    commentCount: 6,
  },
  // Eagles club posts
  {
    id: 'eagles_post_1',
    clubId: 'club_eagles',
    title: 'Match Day Update',
    body: 'Great result yesterday! U14s won 3-1 against Hackney Rovers. Solid defensive performance and clinical finishing. Well done everyone!',
    createdAt: new Date(today.getTime() - 5 * 60 * 60 * 1000).toISOString(),
    audience: 'club',
    audienceLabel: 'Club-wide',
    authorName: 'Sarah Mitchell',
    authorId: 'coach2',
    postAs: 'club',
    postType: 'announcement',
    reactionCount: 31,
    commentCount: 9,
  },
  {
    id: 'eagles_post_photo_1',
    clubId: 'club_eagles',
    title: 'New Training Kits Arrived!',
    body: 'Fresh gear for the new season. Pick up yours at the next session. Looking sharp, Eagles!',
    createdAt: new Date(today.getTime() - 8 * 60 * 60 * 1000).toISOString(),
    audience: 'club',
    audienceLabel: 'Club-wide',
    authorName: 'Sarah Mitchell',
    authorId: 'coach2',
    postAs: 'club',
    postType: 'photo',
    imageUrl: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800',
    reactionCount: 24,
    commentCount: 5,
  },
  {
    id: 'eagles_post_event_1',
    clubId: 'club_eagles',
    title: 'Winter Training Camp',
    body: 'Intensive 3-day training camp during half term. Focus on technical skills and match preparation. Limited spots available!',
    createdAt: new Date(today.getTime() - 12 * 60 * 60 * 1000).toISOString(),
    audience: 'club',
    audienceLabel: 'Club-wide',
    authorName: 'Sarah Mitchell',
    authorId: 'coach2',
    postAs: 'club',
    postType: 'event',
    eventDate: new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    eventLocation: 'Victoria Park Sports Centre',
    reactionCount: 18,
    commentCount: 7,
  },
];

export const clubSessions: SessionOffering[] = [
  {
    id: 'club_session_1',
    clubId: 'club_lions',
    clubScope: 'squad',
    squadId: 'squad_u15',
    coachId: 'coach1',
    coachName: 'Sarah Mitchell',
    title: 'U15 finishing tune-up',
    description: 'Club-only reps with clips added to badge hub.',
    sessionType: 'group',
    maxParticipants: 18,
    location: 'Pitch 2',
    scheduledAt: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    isRecurring: false,
    recurrenceType: 'none',
    status: 'active',
    visibility: 'club',
    registrations: [
      {
        id: 'club_reg_1',
        userId: 'user1',
        userName: 'Tom Henderson',
        bookedAt: new Date(today.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        status: 'confirmed',
      },
    ],
    createdAt: today.toISOString(),
    priceUsd: 0,
    footballSkill: 'Finishing',
  },
  {
    id: 'club_session_2',
    clubId: 'club_lions',
    clubScope: 'club',
    coachId: 'coach2',
    coachName: 'Mike Thompson',
    title: 'Club open play night',
    description: 'Members-only scrimmage block with mixed squads.',
    sessionType: 'group',
    maxParticipants: 30,
    location: 'Main Dome',
    scheduledAt: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    isRecurring: true,
    recurrenceType: 'weekly',
    dayOfWeek: 3,
    timeOfDay: '18:30',
    status: 'active',
    visibility: 'club',
    registrations: [],
    createdAt: today.toISOString(),
    priceUsd: 10,
    footballSkill: 'Conditioning',
  },
];

export function getClubMembershipForUser(userId: string): ClubMembership | undefined {
  return clubMemberships.find((membership) => membership.userId === userId && membership.status === 'active');
}

export function getAllClubMembershipsForUser(userId: string): ClubMembership[] {
  return clubMemberships.filter((membership) => membership.userId === userId && membership.status === 'active');
}

export function getClubById(clubId: string): Club | undefined {
  return clubs.find((club) => club.id === clubId);
}

export function getUserClubs(userId: string): Club[] {
  const memberships = getAllClubMembershipsForUser(userId);
  return memberships
    .map((m) => getClubById(m.clubId))
    .filter((club): club is Club => club !== undefined);
}

export type AggregatedFeedPost = ClubFeedPost & {
  clubName: string;
  clubBadge?: string;
};

export function getAggregatedFeed(
  userId: string,
  filter?: 'all' | 'announcement' | 'photo' | 'event'
): AggregatedFeedPost[] {
  const memberships = getAllClubMembershipsForUser(userId);
  const clubIds = memberships.map((m) => m.clubId);

  let posts: AggregatedFeedPost[] = clubFeedPosts
    .filter((post) => clubIds.includes(post.clubId))
    .map((post) => {
      const club = getClubById(post.clubId);
      return {
        ...post,
        clubName: club?.name || 'Unknown Club',
        clubBadge: club?.badge,
      };
    });

  if (filter && filter !== 'all') {
    posts = posts.filter((post) => post.postType === filter);
  }

  // Sort by date descending (no pinning for aggregated feed)
  return posts.sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function getClubSquads(clubId: string): ClubSquad[] {
  return clubSquads.filter((squad) => squad.clubId === clubId);
}

export function getClubFeed(clubId: string, filter?: 'all' | 'announcement' | 'photo' | 'event'): ClubFeedPost[] {
  let posts = clubFeedPosts.filter((post) => post.clubId === clubId);

  if (filter && filter !== 'all') {
    posts = posts.filter((post) => post.postType === filter);
  }

  // Sort: pinned first, then by date descending
  return posts.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function addClubFeedPost(post: Omit<ClubFeedPost, 'id' | 'createdAt' | 'reactionCount' | 'commentCount'>): ClubFeedPost {
  const newPost: ClubFeedPost = {
    ...post,
    id: `club_post_${Date.now()}`,
    createdAt: new Date().toISOString(),
    reactionCount: 0,
    commentCount: 0,
  };
  clubFeedPosts.unshift(newPost);
  return newPost;
}

export function togglePinPost(postId: string, pinnedBy: string): boolean {
  const post = clubFeedPosts.find((p) => p.id === postId);
  if (!post) return false;

  post.isPinned = !post.isPinned;
  if (post.isPinned) {
    post.pinnedBy = pinnedBy;
    post.pinnedAt = new Date().toISOString();
  } else {
    post.pinnedBy = undefined;
    post.pinnedAt = undefined;
  }
  return post.isPinned;
}

export function getPinnedPosts(clubId: string): ClubFeedPost[] {
  return clubFeedPosts.filter((post) => post.clubId === clubId && post.isPinned);
}

export function getAnnouncements(clubId: string): ClubFeedPost[] {
  return clubFeedPosts.filter((post) => post.clubId === clubId && post.postType === 'announcement');
}

export function getClubSessions(clubId: string): SessionOffering[] {
  return clubSessions.filter((session) => session.clubId === clubId);
}

export function getClubInvites(clubId: string): ClubInvite[] {
  return clubInvites.filter((invite) => invite.clubId === clubId);
}

// ===== ADDITIONAL EXPORTS FOR COMPATIBILITY =====

// Chat threads for MessagesScreen
const BASE_CHAT_THREADS: ChatThreadSummary[] = MOCK_CONVERSATIONS.map((conv) => ({
  id: conv.id,
  kind: 'direct',
  bookingId: conv.relatedBookingId || 'book1', // Mock booking ID fallback
  coachName: conv.coachName,
  childName: conv.athleteName,
  serviceName: 'Coaching Session',
  location: 'Hyde Park',
  scheduledFor: conv.lastMessageAt,
  unreadCount: conv.unreadCount,
  safetyCopy: 'All conversations are monitored for safety',
  pinnedObjectives: ['Finishing', 'Passing'],
  lastMessageSnippet: conv.lastMessage,
  lastMessageSender: conv.coachName,
  title: `${conv.athleteName} x ${conv.coachName}`,
}));

const GROUP_CHAT_THREADS: ChatThreadSummary[] = [
  {
    id: 'club_announcements',
    kind: 'group',
    groupType: 'club',
    bookingId: 'club_announcements',
    coachName: 'Lions FC Academy',
    childName: 'Club',
    serviceName: 'Club Room',
    location: 'Clubhouse',
    scheduledFor: new Date(today.getTime() - 45 * 60 * 1000).toISOString(),
    unreadCount: 3,
    unreadMentions: 1,
    memberCount: 48,
    title: 'Lions FC Parents',
    subtitle: 'Club announcements & logistics',
    scopeLabel: 'Club-wide',
    postingAsOptions: ['Myself', 'Lions FC'],
    safetyCopy: 'Admins can post on behalf of the club; keep announcements professional.',
    pinnedObjectives: ['Passing', 'Conditioning'],
    lastMessageSnippet: 'Training moved indoors due to weather.',
    lastMessageSender: 'Director Kelly',
  },
  {
    id: 'squad_u15',
    kind: 'group',
    groupType: 'squad',
    bookingId: 'squad_u15',
    coachName: 'Coach Sarah',
    childName: 'U15 Squad',
    serviceName: 'Match Prep',
    location: 'Pitch 2',
    scheduledFor: new Date(today.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    unreadCount: 0,
    unreadMentions: 0,
    memberCount: 16,
    title: 'U15 Squad',
    subtitle: 'Lineups, drills, kit lists',
    scopeLabel: 'Squad',
    postingAsOptions: ['Myself', 'Coaching Team'],
    safetyCopy: 'All squad chat is visible to parents and coaches.',
    pinnedObjectives: ['Finishing', 'Passing'],
    lastMessageSnippet: 'Share your availability for Saturday.',
    lastMessageSender: 'Coach Sarah',
  },
  {
    id: 'class_juniors',
    kind: 'group',
    groupType: 'class',
    bookingId: 'class_juniors',
    coachName: 'Coach Mike',
    childName: 'Junior Class',
    serviceName: 'Clinic Updates',
    location: 'Sports Hall',
    scheduledFor: new Date(today.getTime() - 6 * 60 * 60 * 1000).toISOString(),
    unreadCount: 4,
    unreadMentions: 2,
    memberCount: 24,
    title: 'Saturday Finishing Clinic',
    subtitle: 'Parents + athletes',
    scopeLabel: 'Class',
    postingAsOptions: ['Myself', 'Clinic Staff'],
    safetyCopy: 'Keep class updates inclusive; highlight homework and wins.',
    pinnedObjectives: ['Finishing', 'Dribbling'],
    lastMessageSnippet: 'Great finishes today — badge unlocks posted.',
    lastMessageSender: 'Coach Mike',
  },
];

// Chat threads for MessagesScreen
export const chatThreads: ChatThreadSummary[] = [...BASE_CHAT_THREADS, ...GROUP_CHAT_THREADS];

// Chat messages for MessagesScreen
export const chatMessages: ChatMessage[] = [
  ...MOCK_MESSAGES.map((msg): ChatMessage => ({
    id: msg.id,
    threadId: msg.conversationId,
    sender: msg.senderId.startsWith('coach') ? 'coach' : ('parent' as ChatSender),
    senderName: msg.senderName,
    body: msg.content,
    createdAt: msg.sentAt,
    status: msg.read ? 'seen' : 'delivered',
  })),
  {
    id: 'msg_club_1',
    threadId: 'club_announcements',
    sender: 'coach',
    senderName: 'Director Kelly',
    body: 'Reminder: indoor training tonight. Bring flats and water.',
    createdAt: new Date(today.getTime() - 50 * 60 * 1000).toISOString(),
    status: 'seen',
  },
  {
    id: 'msg_club_2',
    threadId: 'club_announcements',
    sender: 'parent',
    senderName: 'You (posting as Lions FC)',
    body: 'Copying the new indoor waiver here — please sign before Friday.',
    createdAt: new Date(today.getTime() - 30 * 60 * 1000).toISOString(),
    status: 'delivered',
  },
  {
    id: 'msg_squad_1',
    threadId: 'squad_u15',
    sender: 'coach',
    senderName: 'Coach Sarah',
    body: 'Drop your availability for Saturday: Yes or No',
    createdAt: new Date(today.getTime() - 90 * 60 * 1000).toISOString(),
    status: 'delivered',
  },
  {
    id: 'msg_class_1',
    threadId: 'class_juniors',
    sender: 'coach',
    senderName: 'Coach Mike',
    body: 'Badge hub updated with today’s highlights — check the awards tab.',
    createdAt: new Date(today.getTime() - 4 * 60 * 60 * 1000).toISOString(),
    status: 'seen',
  },
  {
    id: 'msg_class_2',
    threadId: 'class_juniors',
    sender: 'parent',
    senderName: 'Alex (parent)',
    body: 'Ethan loved the finishing ladder — thanks! Does he need to bring boots next week?',
    createdAt: new Date(today.getTime() - 3.5 * 60 * 60 * 1000).toISOString(),
    status: 'seen',
  },
];

// Mock user profile for ProfileScreen
export const mockUserProfile: EnhancedUserProfile = {
  id: 'user1',
  fullName: 'John Henderson',
  email: 'john.henderson@email.com',
  phone: '+1 (555) 123-4567',
  profilePhotoUrl: 'https://i.pravatar.cc/150?u=john',
  bio: 'Parent of two young athletes. Supporting my kids in their football development.',
  role: 'Parent',
  joinedDate: new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString(),
  children: [
    { name: 'Tom Henderson', age: 15 },
    { name: 'Emma Henderson', age: 14 },
  ],
};

// Enhanced coach profiles for CoachProfileScreen
export const coachProfiles: EnhancedCoachProfile[] = [
  {
    id: 'coach1',
    fullName: 'Sarah Mitchell',
    primarySport: 'Football',
    sports: ['Football'],
    city: 'London',
    state: 'England',
    distanceMiles: 2.3,
    rating: {
      average: 4.9,
      reviewCount: 47,
    },
    priceRange: {
      minUsd: 50,
      maxUsd: 80,
      unitLabel: 'per session',
    },
    nextAvailability: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    badges: [
      { id: 'b1', label: 'Verified', tone: 'success' },
      { id: 'b2', label: 'Background Check', tone: 'success' },
      { id: 'b3', label: 'Top Rated', tone: 'warning' },
    ],
    sessionFormats: ['In-person', 'Small group'],
    shortBio: '15 years experience coaching goalkeepers at all levels.',
    profilePhotoUrl: 'https://i.pravatar.cc/300?u=sarah',
    coverPhotoUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800',
    footballFocuses: ['Goalkeeping', 'Defending'],
    schoolName: 'Premier Football Academy',
    schoolId: 'school1',
    location: {
      lat: 51.5074,
      lng: -0.1278,
    },
    bio: '15 years experience coaching goalkeepers at all levels. Former professional goalkeeper with expertise in shot-stopping, positioning, and distribution. Passionate about developing young talent and building confidence.',
    phone: '+44 20 1234 5678',
    email: 'sarah.mitchell@coach.com',
    website: 'https://sarahmitchellcoaching.com',
    joinedDate: new Date(today.getTime() - 365 * 3 * 24 * 60 * 60 * 1000).toISOString(),
    totalSessions: 230,
    experiences: [
      {
        id: 'exp1',
        title: 'Head Goalkeeping Coach',
        organization: 'Premier Football Academy',
        startDate: '2018-01-01',
        current: true,
        description: 'Leading goalkeeper development programme for youth players aged 8-18. Developed bespoke training curriculum focusing on shot-stopping, distribution, and game intelligence.',
      },
      {
        id: 'exp2',
        title: 'Academy Goalkeeping Coach',
        organization: 'Chelsea FC Foundation',
        startDate: '2015-06-01',
        endDate: '2017-12-31',
        current: false,
        description: 'Coached goalkeepers in the foundation programme, delivering sessions across South London community venues. Worked with players from grassroots to regional academy level.',
      },
      {
        id: 'exp3',
        title: 'Professional Goalkeeper',
        organization: 'Millwall FC Women',
        startDate: '2005-08-01',
        endDate: '2015-05-31',
        current: false,
        description: 'Professional playing career spanning 10 years. First team goalkeeper making over 150 appearances across all competitions. Club captain for 3 seasons.',
      },
      {
        id: 'exp4',
        title: 'Youth Goalkeeper Coach',
        organization: 'Charlton Athletic Community Trust',
        startDate: '2012-01-01',
        endDate: '2015-05-31',
        current: false,
        description: 'Delivered specialist goalkeeper coaching sessions during off-season. Ran holiday camps and weekend clinics across South East London.',
      },
    ],
    certifications: [
      {
        id: 'cert1',
        name: 'UEFA B Licence',
        issuer: 'The FA',
        issueDate: '2016-06-15',
        expiryDate: undefined,
        credentialUrl: 'https://example.com/uefa-b-cert',
      },
      {
        id: 'cert2',
        name: 'FA Level 3 Certificate in Coaching Goalkeepers',
        issuer: 'The FA',
        issueDate: '2015-03-20',
        expiryDate: undefined,
        credentialUrl: 'https://example.com/fa-level-3-gk',
      },
      {
        id: 'cert3',
        name: 'FA Safeguarding Children Certificate',
        issuer: 'The FA',
        issueDate: '2023-09-10',
        expiryDate: '2026-09-10',
        credentialUrl: 'https://example.com/safeguarding',
      },
      {
        id: 'cert4',
        name: 'FA Youth Award Module 1',
        issuer: 'The FA',
        issueDate: '2014-11-05',
        expiryDate: undefined,
      },
      {
        id: 'cert5',
        name: 'First Aid Qualified',
        issuer: 'St John Ambulance',
        issueDate: '2024-01-15',
        expiryDate: '2027-01-15',
      },
      {
        id: 'cert6',
        name: 'DBS Enhanced Disclosure',
        issuer: 'Disclosure and Barring Service',
        issueDate: '2024-03-20',
        expiryDate: '2027-03-20',
      },
    ],
    posts: [
      {
        id: 'post1',
        coachId: 'coach1',
        content: 'Good training session today with the academy goalkeepers. Pleased with their progress.',
        createdAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        likes: 45,
        comments: 8,
      },
      {
        id: 'post2',
        coachId: 'coach1',
        content: '5 essential tips for young goalkeepers:\n1. Always stay on your toes\n2. Communicate with your defense\n3. Practice distribution daily\n4. Study the game\n5. Stay confident',
        createdAt: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        likes: 89,
        comments: 15,
      },
    ],
    photoGallery: [
      'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=400',
      'https://images.unsplash.com/photo-1556817411-31ae72fa3ea0?w=400',
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400',
    ],
    videoGallery: [],
    languages: [
      { id: 'lang1', name: 'English', proficiency: 'Native' },
      { id: 'lang2', name: 'Spanish', proficiency: 'Conversational' },
      { id: 'lang3', name: 'French', proficiency: 'Basic' },
    ],
    achievements: [
      'UEFA B Licensed Coach',
      'Former Professional Goalkeeper',
      'Over 230 successful training sessions',
      'Helped 15+ athletes join academy programs',
    ],
    socialLinks: {
      instagram: '@coachsarahmitchell',
      twitter: '@SarahMitchellGK',
      youtube: '@SarahMitchellCoaching',
      linkedin: 'sarah-mitchell-coaching',
      website: 'https://sarahmitchellcoaching.com',
    },
  },
];

// Upcoming bookings for BookingsScreen
export const upcomingBookings: BookingSummary[] = MOCK_BOOKINGS.filter(
  (b) => new Date(b.scheduledAt) > today
).map((booking) => ({
  id: booking.id,
  coachName: booking.coachName,
  childName: booking.athleteName,
  service: booking.isGroupSession ? 'Group Coaching Session' : 'Football Coaching',
  start: booking.scheduledAt,
  status: booking.status === 'CONFIRMED' ? 'Confirmed' : booking.status === 'PENDING' ? 'Pending' : 'Completed',
  locationLabel: booking.location,
  coach: {
    name: booking.coachName,
    photoUrl: 'https://i.pravatar.cc/100?u=' + booking.coachId,
  },
  client: {
    name: booking.athleteName,
    photoUrl: 'https://i.pravatar.cc/100?u=' + booking.athleteId,
  },
  coachId: booking.coachId,
  clientId: booking.athleteId,
  // Group booking fields
  isGroupSession: booking.isGroupSession,
  maxParticipants: booking.maxParticipants,
  currentParticipants: booking.currentParticipants,
  participants: booking.participants,
}));

// Session history for StatisticsScreen
export const sessionHistory = MOCK_SESSIONS.map((session) => ({
  id: session.id,
  coachName: session.coachName,
  athleteName: session.athleteName,
  focus: session.skillsWorkedOn[0] || 'General Training',
  durationMinutes: 60, // Standard session duration
  rating: session.performanceRating,
  coachFeedback: session.notes,
  completedAt: session.completedAt,
}));

// Athlete skill levels for StatisticsScreen
export const athleteSkillLevels = [
  { skill: 'Shot Stopping', level: 85 },
  { skill: 'Positioning', level: 78 },
  { skill: 'Distribution', level: 72 },
  { skill: 'Handling', level: 88 },
  { skill: 'Diving Technique', level: 80 },
  { skill: 'Communication', level: 75 },
  { skill: 'Footwork', level: 70 },
  { skill: 'One-on-ones', level: 68 },
  { skill: 'Command of Box', level: 73 },
  { skill: 'Reaction Speed', level: 82 },
];
