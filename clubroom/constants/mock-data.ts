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
];

// ===== POSTS =====
export const MOCK_POSTS: Post[] = [
  {
    id: 'post1',
    authorId: 'user3',
    authorName: 'James Wilson',
    authorAvatar: '🧑',
    content: 'Just achieved my goal of scoring 20 goals this season! Thanks to Coach Mike for all the help! 🎉⚽',
    likes: ['user1', 'parent1', 'coach2'],
    createdAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'post2',
    authorId: 'coach2',
    authorName: 'Mike Thompson',
    authorAvatar: '⚽',
    content: '5 essential drills to improve your first touch:\n1. Wall passes\n2. Close control circles\n3. Cushion control\n4. Directional first touch\n5. Game situations',
    likes: ['user1', 'user2', 'user3', 'parent1', 'parent2'],
    createdAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'post3',
    authorId: 'user1',
    authorName: 'Tom Henderson',
    authorAvatar: '👦',
    content: 'Great session today working on positioning. Feeling more confident! 💪',
    likes: ['parent1', 'coach1', 'user3'],
    createdAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
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
        description: 'Lead goalkeeper development program for youth players',
      },
      {
        id: 'exp2',
        title: 'Professional Goalkeeper',
        organization: 'London United FC',
        startDate: '2005-01-01',
        endDate: '2015-12-31',
        current: false,
        description: 'Professional career spanning 10 years',
      },
    ],
    certifications: [
      {
        id: 'cert1',
        name: 'UEFA B License',
        issuer: 'UEFA',
        issueDate: '2016-06-15',
      },
      {
        id: 'cert2',
        name: 'FA Level 3 Goalkeeping',
        issuer: 'The FA',
        issueDate: '2015-03-20',
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
  service: 'Football Coaching',
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
}));
