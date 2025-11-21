// Core User Types
export type UserRole = 'COACH' | 'USER' | 'PARENT';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  avatar?: string;
  postcode: string;
  dateOfBirth: string;
}

// Coach Profile
export interface CoachProfile {
  userId: string;
  bio: string;
  qualifications: string[];
  specialties: string[]; // e.g., ['Striker Training', 'Goalkeeping']
  yearsExperience: number;
  sessionRate: number; // £ GBP per session
  availability: AvailabilitySlot[];
  rating: number; // Calculated from reviews
  totalReviews: number;
  totalSessions: number;
}

export interface AvailabilitySlot {
  id: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:mm format
  endTime: string;
  location: string;
}

// User/Athlete Profile
export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE';

export interface UserProfile {
  userId: string;
  bio: string;
  skillLevel: SkillLevel;
  position?: string; // e.g., 'Midfielder', 'Striker'
  goals: Goal[];
  parentId?: string; // If managed by parent
}

// Parent-Child Relationship
export interface Relationship {
  id: string;
  parentId: string;
  childId: string; // Child is a User with role='USER'
  relationshipType: 'PARENT_CHILD' | 'GUARDIAN';
}

// Bookings & Sessions
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export interface Booking {
  id: string;
  coachId: string;
  athleteId: string; // The user being coached
  bookedById: string; // Could be parent or athlete
  status: BookingStatus;
  scheduledAt: string; // ISO date string
  duration: number; // minutes (default 60)
  location: string;
  notes?: string;
  coachName?: string; // Denormalized for easy display
  athleteName?: string; // Denormalized for easy display
}

export type AttendanceStatus = 'ATTENDED' | 'NO_SHOW';

export interface Session {
  id: string;
  bookingId: string;
  coachId: string;
  athleteId: string;
  completedAt: string;
  attendance: AttendanceStatus;
  notes: string; // Coach's session notes
  skillsWorkedOn: string[];
  performanceRating: number; // 1-5
  nextFocusAreas: string[];
  videoUrls?: string[]; // Session videos uploaded by coach
  coachName?: string; // Denormalized
  athleteName?: string; // Denormalized
}

// Goals & Progress
export type GoalStatus = 'ACTIVE' | 'ACHIEVED' | 'PAUSED';

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  targetDate?: string;
  status: GoalStatus;
  progress: number; // 0-100%
  createdAt: string;
}

// Messages
export interface Conversation {
  id: string;
  participants: string[]; // User IDs
  relatedAthleteId?: string; // If parent chatting about kid
  lastMessageAt: string;
  lastMessage?: string;
  unreadCount?: number;
  coachName?: string; // Denormalized
  athleteName?: string; // Denormalized
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  content: string;
  sentAt: string;
  read: boolean;
}

// Social Posts
export interface Post {
  id: string;
  authorId: string;
  authorName?: string;
  authorAvatar?: string;
  content: string;
  images?: string[];
  likes: string[]; // User IDs who liked
  commentCount?: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName?: string;
  authorAvatar?: string;
  content: string;
  likes: string[]; // User IDs who liked
  createdAt: string;
}

// Reviews
export interface Review {
  id: string;
  coachId: string;
  athleteId: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
  athleteName?: string;
}

// Analytics Types
export interface CoachAnalytics {
  coachId: string;
  period: 'week' | 'month' | 'year';
  sessionsCount: number;
  activeClients: number;
  averageRating: number;
  topSkills: { skill: string; count: number }[];
  busiestDay: string;
  peakHour: number;
  revenueTotal: number; // GBP
}

export interface AthleteProgress {
  athleteId: string;
  totalSessions: number;
  averagePerformance: number;
  skillsProgress: { skill: string; level: number; trend: 'up' | 'down' | 'stable' }[];
  goalsActive: number;
  goalsAchieved: number;
}
