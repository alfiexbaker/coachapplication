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
} from './types';

// ===== USERS =====
export const MOCK_USERS: User[] = [
  // Coaches
  {
    id: 'coach1',
    email: 'sarah.mitchell@coach.com',
    role: 'COACH',
    name: 'Sarah Mitchell',
    avatar: '🧤',
    postcode: 'SW1A 1AA',
    dateOfBirth: '1988-03-15',
  },
  {
    id: 'coach2',
    email: 'mike.thompson@coach.com',
    role: 'COACH',
    name: 'Mike Thompson',
    avatar: '⚽',
    postcode: 'SW1A 2AA',
    dateOfBirth: '1985-07-22',
  },
  {
    id: 'coach3',
    email: 'david.roberts@coach.com',
    role: 'COACH',
    name: 'David Roberts',
    avatar: '🥅',
    postcode: 'SW2A 1BB',
    dateOfBirth: '1990-11-08',
  },
  {
    id: 'coach4',
    email: 'amy.taylor@coach.com',
    role: 'COACH',
    name: 'Amy Taylor',
    avatar: '🏃‍♀️',
    postcode: 'SW5A 2CC',
    dateOfBirth: '1991-06-18',
  },
  {
    id: 'coach5',
    email: 'oliver.jones@coach.com',
    role: 'COACH',
    name: 'Oliver Jones',
    avatar: '📊',
    postcode: 'SW6A 3DD',
    dateOfBirth: '1987-10-02',
  },
  {
    id: 'coach6',
    email: 'lucy.brown@coach.com',
    role: 'COACH',
    name: 'Lucy Brown',
    avatar: '🎯',
    postcode: 'SW7A 4EE',
    dateOfBirth: '1989-01-12',
  },
  {
    id: 'coach7',
    email: 'harry.clark@coach.com',
    role: 'COACH',
    name: 'Harry Clark',
    avatar: '🧠',
    postcode: 'SW8A 5FF',
    dateOfBirth: '1984-09-30',
  },

  // Users (Athletes)
  {
    id: 'user1',
    email: 'tom.henderson@email.com',
    role: 'USER',
    name: 'Tom Henderson',
    avatar: '👦',
    postcode: 'SW1A 3CC',
    dateOfBirth: '2008-05-12',
  },
  {
    id: 'user2',
    email: 'emma.henderson@email.com',
    role: 'USER',
    name: 'Emma Henderson',
    avatar: '👧',
    postcode: 'SW1A 3CC',
    dateOfBirth: '2009-08-20',
  },
  {
    id: 'user3',
    email: 'james.wilson@email.com',
    role: 'USER',
    name: 'James Wilson',
    avatar: '🧑',
    postcode: 'SW1A 4DD',
    dateOfBirth: '2007-12-03',
  },
  {
    id: 'user4',
    email: 'sophie.taylor@email.com',
    role: 'USER',
    name: 'Sophie Taylor',
    avatar: '👧',
    postcode: 'SW2A 1EE',
    dateOfBirth: '2008-04-18',
  },
  {
    id: 'user5',
    email: 'liam.davies@email.com',
    role: 'USER',
    name: 'Liam Davies',
    avatar: '🧒',
    postcode: 'SW3A 2FF',
    dateOfBirth: '2009-06-22',
  },
  {
    id: 'user6',
    email: 'ella.martinez@email.com',
    role: 'USER',
    name: 'Ella Martinez',
    avatar: '👧',
    postcode: 'SW1A 5GG',
    dateOfBirth: '2008-11-09',
  },

  // Parents
  {
    id: 'parent1',
    email: 'john.henderson@email.com',
    role: 'PARENT',
    name: 'John Henderson',
    avatar: '👨',
    postcode: 'SW1A 3CC',
    dateOfBirth: '1980-02-14',
  },
  {
    id: 'parent2',
    email: 'lisa.wilson@email.com',
    role: 'PARENT',
    name: 'Lisa Wilson',
    avatar: '👩',
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
      { id: 'user1', name: 'Tom Henderson', avatar: '👦', status: 'confirmed' },
      { id: 'user3', name: 'James Wilson', avatar: '🧑', status: 'confirmed' },
      { id: 'user4', name: 'Sophie Taylor', avatar: '👧', status: 'confirmed' },
      { id: 'user5', name: 'Liam Davies', avatar: '🧒', status: 'confirmed' },
      { id: 'user6', name: 'Ella Martinez', avatar: '👧', status: 'pending' },
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
    lastMessage: 'See you tomorrow at 3!',
    unreadCount: 0,
    coachName: 'Sarah Mitchell',
    athleteName: 'Tom Henderson',
  },
  {
    id: 'conv2',
    participants: ['coach2', 'parent1'],
    relatedAthleteId: 'user1',
    lastMessageAt: new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    lastMessage: 'Tom is making great progress with his finishing!',
    unreadCount: 1,
    coachName: 'Mike Thompson',
    athleteName: 'Tom Henderson',
  },
  {
    id: 'conv3',
    participants: ['coach3', 'parent1'],
    relatedAthleteId: 'user2',
    lastMessageAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    lastMessage: 'Emma did really well in her first session',
    unreadCount: 0,
    coachName: 'David Roberts',
    athleteName: 'Emma Henderson',
  },
  {
    id: 'conv4',
    participants: ['coach2', 'user3'],
    relatedAthleteId: 'user3',
    lastMessageAt: new Date(today.getTime() - 3 * 60 * 60 * 1000).toISOString(),
    lastMessage: 'Thanks for the session coach!',
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
    lastMessage: 'Looking forward to the group session on Saturday!',
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
    content: 'Yes that works perfectly! Hyde Park as usual?',
    sentAt: new Date(today.getTime() - 3 * 60 * 60 * 1000).toISOString(),
    read: true,
  },
  {
    id: 'msg3',
    conversationId: 'conv1',
    senderId: 'parent1',
    senderName: 'John Henderson',
    content: 'Perfect, yes please. Tom is really looking forward to it.',
    sentAt: new Date(today.getTime() - 2.5 * 60 * 60 * 1000).toISOString(),
    read: true,
  },
  {
    id: 'msg4',
    conversationId: 'conv1',
    senderId: 'coach1',
    senderName: 'Sarah Mitchell',
    content: 'See you tomorrow at 3!',
    sentAt: new Date(today.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    read: true,
  },

  // Conversation 2 (coach2 <-> parent1 about user1)
  {
    id: 'msg5',
    conversationId: 'conv2',
    senderId: 'coach2',
    senderName: 'Mike Thompson',
    content: 'Tom is making great progress with his finishing!',
    sentAt: new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    read: false,
  },

  // Group booking messages - Sophie Taylor
  {
    id: 'msg6',
    conversationId: 'conv5',
    senderId: 'user4',
    senderName: 'Sophie Taylor',
    content: 'Hi Coach Mike! I\'m really excited about the group clinic this weekend.',
    sentAt: new Date(today.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    read: true,
  },
  {
    id: 'msg7',
    conversationId: 'conv5',
    senderId: 'coach2',
    senderName: 'Mike Thompson',
    content: 'Great to hear Sophie! We\'ll be working on advanced finishing techniques. See you Saturday!',
    sentAt: new Date(today.getTime() - 1.5 * 60 * 60 * 1000).toISOString(),
    read: true,
  },
  {
    id: 'msg8',
    conversationId: 'conv5',
    senderId: 'user4',
    senderName: 'Sophie Taylor',
    content: 'Looking forward to the group session on Saturday!',
    sentAt: new Date(today.getTime() - 1 * 60 * 60 * 1000).toISOString(),
    read: true,
  },

  // Group booking messages - Liam Davies
  {
    id: 'msg9',
    conversationId: 'conv6',
    senderId: 'user5',
    senderName: 'Liam Davies',
    content: 'Hi Coach! This is my first group session. Should I bring my own ball?',
    sentAt: new Date(today.getTime() - 6 * 60 * 60 * 1000).toISOString(),
    read: true,
  },
  {
    id: 'msg10',
    conversationId: 'conv6',
    senderId: 'coach2',
    senderName: 'Mike Thompson',
    content: 'Hi Liam! No need to bring a ball, I\'ll have plenty for the whole group. Just bring your boots and water!',
    sentAt: new Date(today.getTime() - 5.5 * 60 * 60 * 1000).toISOString(),
    read: true,
  },

  // Group booking messages - Ella Martinez (pending confirmation)
  {
    id: 'msg11',
    conversationId: 'conv7',
    senderId: 'user6',
    senderName: 'Ella Martinez',
    content: 'Hi Coach Mike, I\'m interested in joining the striker clinic this Saturday. Can you confirm my spot for the clinic?',
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
    authorAvatar: '🧑',
    content: 'Just achieved my goal of scoring 20 goals this season! Thanks to Coach Mike for all the help! 🎉⚽',
    likes: ['user1', 'parent1', 'coach2', 'coach1', 'user2'],
    commentCount: 4,
    createdAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'post2',
    authorId: 'coach2',
    authorName: 'Mike Thompson',
    authorAvatar: '⚽',
    content: '5 essential drills to improve your first touch:\n1. Wall passes\n2. Close control circles\n3. Cushion control\n4. Directional first touch\n5. Game situations',
    likes: ['user1', 'user2', 'user3', 'parent1', 'parent2', 'coach1', 'coach3'],
    commentCount: 6,
    createdAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'post3',
    authorId: 'user1',
    authorName: 'Tom Henderson',
    authorAvatar: '👦',
    content: 'Great session today working on positioning. Feeling more confident! 💪',
    likes: ['parent1', 'coach1', 'user3'],
    commentCount: 2,
    createdAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'post4',
    authorId: 'coach1',
    authorName: 'Sarah Mitchell',
    authorAvatar: '🧤',
    content: 'Reminder: Consistency is key! Even 15 minutes of daily practice can make a huge difference. Keep pushing! 💪',
    likes: ['user1', 'user2', 'parent1', 'coach3'],
    commentCount: 3,
    createdAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'post5',
    authorId: 'user2',
    authorName: 'Emma Henderson',
    authorAvatar: '👧',
    content: 'First session with Coach David was amazing! Learned so much about ball control 🙌',
    likes: ['parent1', 'coach3', 'user1'],
    commentCount: 1,
    createdAt: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'post6',
    authorId: 'coach3',
    authorName: 'David Roberts',
    authorAvatar: '🥅',
    content: 'The best players are the ones who practice with purpose. Set clear goals for each training session!',
    likes: ['user1', 'user2', 'user3', 'coach2'],
    commentCount: 2,
    createdAt: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'post7',
    authorId: 'parent1',
    authorName: 'John Henderson',
    authorAvatar: '👨',
    content: 'So proud of Tom and Emma\'s progress! The coaches here are fantastic 👏',
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
    authorAvatar: '⚽',
    content: 'So proud of you James! Your hard work really paid off 🌟',
    likes: ['user3', 'user1'],
    createdAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comment2',
    postId: 'post1',
    authorId: 'user1',
    authorName: 'Tom Henderson',
    authorAvatar: '👦',
    content: 'Congrats James! That\'s amazing! 🎉',
    likes: ['user3'],
    createdAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comment3',
    postId: 'post1',
    authorId: 'parent1',
    authorName: 'John Henderson',
    authorAvatar: '👨',
    content: 'Well done! Keep up the great work!',
    likes: [],
    createdAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comment4',
    postId: 'post1',
    authorId: 'coach1',
    authorName: 'Sarah Mitchell',
    authorAvatar: '🧤',
    content: 'Fantastic achievement James! 👏',
    likes: ['user3', 'coach2'],
    createdAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
  },

  // Comments for post2 (Mike's training tips)
  {
    id: 'comment5',
    postId: 'post2',
    authorId: 'user1',
    authorName: 'Tom Henderson',
    authorAvatar: '👦',
    content: 'Thanks Coach! Going to try these today',
    likes: ['coach2', 'user2'],
    createdAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comment6',
    postId: 'post2',
    authorId: 'user3',
    authorName: 'James Wilson',
    authorAvatar: '🧑',
    content: 'Wall passes are my favorite! So effective',
    likes: ['coach2', 'user1', 'user2'],
    createdAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comment7',
    postId: 'post2',
    authorId: 'parent1',
    authorName: 'John Henderson',
    authorAvatar: '👨',
    content: 'Great tips! Will work on these with the kids',
    likes: ['coach2'],
    createdAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comment8',
    postId: 'post2',
    authorId: 'coach1',
    authorName: 'Sarah Mitchell',
    authorAvatar: '🧤',
    content: 'Excellent drills Mike! I use these with my goalkeepers too',
    likes: ['coach2', 'user1'],
    createdAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comment9',
    postId: 'post2',
    authorId: 'user2',
    authorName: 'Emma Henderson',
    authorAvatar: '👧',
    content: 'Can\'t wait to practice these! 💪',
    likes: ['parent1', 'coach2'],
    createdAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comment10',
    postId: 'post2',
    authorId: 'coach3',
    authorName: 'David Roberts',
    authorAvatar: '🥅',
    content: 'Perfect fundamentals! These are game-changers',
    likes: ['coach2'],
    createdAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000 + 7 * 60 * 60 * 1000).toISOString(),
  },

  // Comments for post3 (Tom's positioning session)
  {
    id: 'comment11',
    postId: 'post3',
    authorId: 'coach1',
    authorName: 'Sarah Mitchell',
    authorAvatar: '🧤',
    content: 'You did great today Tom! Keep it up 👍',
    likes: ['user1', 'parent1'],
    createdAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comment12',
    postId: 'post3',
    authorId: 'parent1',
    authorName: 'John Henderson',
    authorAvatar: '👨',
    content: 'Proud of you son! 😊',
    likes: ['user1'],
    createdAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
  },

  // Comments for post4 (Sarah's consistency reminder)
  {
    id: 'comment13',
    postId: 'post4',
    authorId: 'user1',
    authorName: 'Tom Henderson',
    authorAvatar: '👦',
    content: 'This is so true! Been practicing every day this week',
    likes: ['coach1', 'parent1'],
    createdAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comment14',
    postId: 'post4',
    authorId: 'user2',
    authorName: 'Emma Henderson',
    authorAvatar: '👧',
    content: 'Thanks for the motivation Coach! ⚽',
    likes: ['coach1'],
    createdAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comment15',
    postId: 'post4',
    authorId: 'coach3',
    authorName: 'David Roberts',
    authorAvatar: '🥅',
    content: 'Absolutely! Small consistent steps = big results',
    likes: ['coach1', 'user1', 'user2'],
    createdAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
  },

  // Comments for post5 (Emma's first session)
  {
    id: 'comment16',
    postId: 'post5',
    authorId: 'coach3',
    authorName: 'David Roberts',
    authorAvatar: '🥅',
    content: 'You were a star student Emma! Great first session 🌟',
    likes: ['user2', 'parent1'],
    createdAt: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
  },

  // Comments for post6 (David's training purpose)
  {
    id: 'comment17',
    postId: 'post6',
    authorId: 'user3',
    authorName: 'James Wilson',
    authorAvatar: '🧑',
    content: 'This has helped me so much! Always have a plan now',
    likes: ['coach3', 'user1'],
    createdAt: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comment18',
    postId: 'post6',
    authorId: 'coach2',
    authorName: 'Mike Thompson',
    authorAvatar: '⚽',
    content: 'Spot on David! Purpose drives progress',
    likes: ['coach3'],
    createdAt: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
  },

  // Comments for post7 (John's proud parent post)
  {
    id: 'comment19',
    postId: 'post7',
    authorId: 'coach1',
    authorName: 'Sarah Mitchell',
    authorAvatar: '🧤',
    content: 'Thank you John! Tom and Emma are wonderful to work with',
    likes: ['parent1', 'user1', 'user2'],
    createdAt: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comment20',
    postId: 'post7',
    authorId: 'coach2',
    authorName: 'Mike Thompson',
    authorAvatar: '⚽',
    content: 'They\'re both doing fantastic! Great to have such supportive parents',
    likes: ['parent1', 'coach1'],
    createdAt: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comment21',
    postId: 'post7',
    authorId: 'user1',
    authorName: 'Tom Henderson',
    authorAvatar: '👦',
    content: 'Thanks Dad! Love the coaching sessions',
    likes: ['parent1', 'user2'],
    createdAt: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comment22',
    postId: 'post7',
    authorId: 'user2',
    authorName: 'Emma Henderson',
    authorAvatar: '👧',
    content: 'Best dad ever! ❤️',
    likes: ['parent1', 'user1'],
    createdAt: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comment23',
    postId: 'post7',
    authorId: 'parent2',
    authorName: 'Lisa Wilson',
    authorAvatar: '👩',
    content: 'Couldn\'t agree more! The coaching quality here is outstanding',
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
    comment: 'Amazing coach! Sarah has really helped Tom develop his goalkeeping skills. He\'s so much more confident now.',
    createdAt: new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    athleteName: 'Tom Henderson',
  },
  {
    id: 'rev2',
    coachId: 'coach2',
    athleteId: 'user1',
    rating: 5,
    comment: 'Mike is excellent at teaching finishing techniques. Tom\'s goal-scoring has improved dramatically.',
    createdAt: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    athleteName: 'Tom Henderson',
  },
  {
    id: 'rev3',
    coachId: 'coach2',
    athleteId: 'user3',
    rating: 5,
    comment: 'Outstanding coach. Very professional and knows how to get the best out of players.',
    createdAt: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    athleteName: 'James Wilson',
  },
  {
    id: 'rev4',
    coachId: 'coach4',
    athleteId: 'user2',
    rating: 5,
    comment: 'Amy pushed my pace and shared a warmup PDF—really helpful.',
    createdAt: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    athleteName: 'Emma Henderson',
  },
  {
    id: 'rev5',
    coachId: 'coach5',
    athleteId: 'user4',
    rating: 4,
    comment: 'Loved the video review showing my positioning mistakes.',
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
    responseMessage: 'Great! Emma is confirmed for the clinic. Looking forward to it!',
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

// ===== ADDITIONAL EXPORTS FOR COMPATIBILITY =====

// Chat threads for MessagesScreen
export const chatThreads: ChatThreadSummary[] = MOCK_CONVERSATIONS.map((conv) => ({
  id: conv.id,
  bookingId: 'book1', // Mock booking ID
  coachName: conv.coachName,
  childName: conv.athleteName,
  serviceName: 'Coaching Session',
  location: 'Hyde Park',
  scheduledFor: conv.lastMessageAt,
  unreadCount: conv.unreadCount,
  safetyCopy: 'All conversations are monitored for safety',
  pinnedObjectives: ['Finishing', 'Passing'],
}));

// Chat messages for MessagesScreen
export const chatMessages: ChatMessage[] = MOCK_MESSAGES.map((msg) => ({
  id: msg.id,
  sender: msg.senderId.startsWith('coach') ? 'coach' : 'parent',
  body: msg.content,
  createdAt: msg.sentAt,
  status: msg.read ? 'seen' : 'delivered',
}));

// Mock user profile for ProfileScreen
export const mockUserProfile: EnhancedUserProfile = {
  id: 'user1',
  fullName: 'John Henderson',
  email: 'john.henderson@email.com',
  phone: '+1 (555) 123-4567',
  profilePhotoUrl: 'https://i.pravatar.cc/150?u=john',
  bio: 'Proud parent of two young athletes. Love supporting my kids in their football journey!',
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
        content: 'Great training session today with the academy goalkeepers! Proud of their progress. 🧤⚽',
        createdAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        likes: 45,
        comments: 8,
      },
      {
        id: 'post2',
        coachId: 'coach1',
        content: '5 essential tips for young goalkeepers:\n1. Always stay on your toes\n2. Communicate with your defense\n3. Practice distribution daily\n4. Study the game\n5. Stay confident!',
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
    languages: ['English', 'Spanish'],
    achievements: [
      'UEFA B Licensed Coach',
      'Former Professional Goalkeeper',
      'Over 230 successful training sessions',
      'Helped 15+ athletes join academy programs',
    ],
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
