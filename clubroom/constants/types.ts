export type SportCategory = 'Football';

export type FootballObjective =
  | 'Dribbling'
  | 'Passing'
  | 'Defending'
  | 'Finishing'
  | 'Goalkeeping'
  | 'Conditioning';

export type TrainingFormat = 'In-person' | 'Virtual' | 'Small group';

export interface CoachBadge {
  id: string;
  label: string;
  tone?: 'success' | 'warning' | 'default';
}

// School & Invite System
export interface School {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  photoUrl?: string;
  description?: string;
  activeCoachesCount: number;
  createdAt: string;
}

export interface InviteCode {
  id: string;
  code: string;
  schoolId: string;
  schoolName: string;
  createdBy: string; // admin user id
  createdAt: string;
  expiresAt: string;
  maxUses: number;
  currentUses: number;
  status: 'active' | 'expired' | 'exhausted';
}

// Enhanced Coach Profile (Facebook-style)
export interface CoachExperience {
  id: string;
  title: string;
  organization: string;
  startDate: string;
  endDate?: string;
  description?: string;
  current: boolean;
}

export interface CoachCertification {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  credentialUrl?: string;
}

export interface CoachPost {
  id: string;
  coachId: string;
  content: string;
  mediaUrls?: string[];
  mediaType?: 'photo' | 'video';
  createdAt: string;
  likes: number;
  comments: number;
}

export interface CoachReview {
  id: string;
  parentName: string;
  parentPhotoUrl?: string;
  rating: number;
  content: string;
  createdAt: string;
  sessionDate: string;
}

export interface CoachProfile {
  id: string;
  fullName: string;
  primarySport: SportCategory;
  sports: SportCategory[];
  city: string;
  state: string;
  distanceMiles: number;
  rating: {
    average: number;
    reviewCount: number;
  };
  priceRange: {
    minUsd: number;
    maxUsd: number;
    unitLabel: string;
  };
  nextAvailability: string;
  badges: CoachBadge[];
  sessionFormats: TrainingFormat[];
  shortBio: string;
  profilePhotoUrl: string;
  coverPhotoUrl?: string;
  footballFocuses: FootballObjective[];
  schoolName?: string;
  schoolId?: string;
  location: {
    lat: number;
    lng: number;
  };

  // Facebook-style additions
  bio?: string; // Full bio (longer than shortBio)
  phone?: string;
  email?: string;
  website?: string;
  joinedDate: string;
  totalSessions: number;
  experiences: CoachExperience[];
  certifications: CoachCertification[];
  posts: CoachPost[];
  photoGallery: string[];
  videoGallery: string[];
  languages: string[];
  achievements: string[];
}

export interface CoachSearchParams {
  availability?: { startDate: string; endDate: string };
  geo?:
    | { boundingBox: { north: number; south: number; east: number; west: number } }
    | { radiusKm: number; center: { lat: number; lng: number } };
  sports?: SportCategory[];
  formats?: TrainingFormat[];
  skillLevels?: string[];
  price?: { minUsd?: number; maxUsd?: number };
  rating?: { min: number };
  coachGender?: 'Male' | 'Female' | 'Non-binary';
  languages?: string[];
}

export interface BookingSummary {
  id: string;
  coachName: string;
  childName: string;
  service: string;
  start: string;
  status: 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled';
  locationLabel: string;
  coach?: {
    name: string;
    photoUrl: string;
  };
  client?: {
    name: string;
    photoUrl: string;
  };
  coachId?: string;
  clientId?: string;
  // Group booking fields
  isGroupSession?: boolean;
  maxParticipants?: number;
  currentParticipants?: number;
  participants?: Array<{
    id: string;
    name: string;
    avatar: string;
    status: 'confirmed' | 'pending' | 'cancelled';
  }>;
}

// Session Offering System
export interface SessionRegistration {
  id: string;
  userId: string;
  userName: string;
  userPhotoUrl?: string;
  bookedAt: string;
  status: 'confirmed' | 'cancelled' | 'completed';
}

export interface SessionOffering {
  id: string;
  coachId: string;
  coachName: string;
  coachPhotoUrl?: string;
  title: string; // Session name/title
  description?: string;
  sessionType: '1on1' | 'group';
  maxParticipants: number;
  location: string;
  scheduledAt: string; // ISO date string
  isRecurring: boolean;
  recurrenceType: 'none' | 'weekly';
  dayOfWeek?: number; // 0-6 (Sunday-Saturday) for recurring sessions
  timeOfDay?: string; // "18:00" format for recurring sessions
  status: 'active' | 'cancelled' | 'completed' | 'full';
  registrations: SessionRegistration[];
  createdAt: string;
  priceUsd?: number;
  ageMin?: number; // Minimum age (e.g., 10 for U12)
  ageMax?: number; // Maximum age (e.g., 12 for U12)
  footballSkill?: FootballObjective; // Primary skill focus
}

export interface AthleteObjective {
  id: string;
  label: FootballObjective | 'Custom';
  status: 'active' | 'upcoming' | 'completed';
  updatedAt: string;
  note?: string;
  coachName: string;
  progress: number; // 0-100
  sessionsCompleted: number;
  startDate: string;
  targetSessions?: number;
}

export interface SessionHistoryEntry {
  id: string;
  date: string;
  coachName: string;
  focus: FootballObjective;
  location: string;
  highlight: string;
  resultBadge?: string;
  clipLabel?: string;
  durationMinutes: number;
  sessionType: string;
  dateCompleted: string;
  rating?: number; // 1-5
  coachFeedback?: string;
}

export interface PaymentReminder {
  id: string;
  title: string;
  amountUsd: number;
  dueDate: string;
  status: 'placeholder' | 'pending' | 'paid';
  description: string;
}

export type ChatSender = 'parent' | 'coach';

export interface ChatAttachment {
  id: string;
  type: 'photo' | 'video' | 'pdf';
  title: string;
  subtitle?: string;
  thumbnailUrl?: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  sender: ChatSender;
  senderName?: string;
  body: string;
  createdAt: string;
  status: 'sent' | 'delivered' | 'seen' | 'pending';
  attachments?: ChatAttachment[];
}

export interface ChatThreadSummary {
  id: string;
  kind?: 'direct' | 'group';
  groupType?: 'club' | 'squad' | 'class' | 'announcement';
  bookingId: string;
  coachName: string;
  childName: string;
  serviceName: string;
  location: string;
  scheduledFor: string;
  unreadCount: number;
  unreadMentions?: number;
  memberCount?: number;
  title?: string;
  subtitle?: string;
  scopeLabel?: string;
  postingAsOptions?: string[];
  safetyCopy: string;
  pinnedObjectives?: FootballObjective[];
  lastMessageSnippet?: string;
  lastMessageSender?: string;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  profilePhotoUrl?: string;
  bio?: string;
  role: 'User' | 'Parent' | 'Coach' | 'Admin';
  joinedDate: string;
  children?: Array<{
    name: string;
    age: number;
  }>;
}

export interface CoachFeedback {
  id: string;
  sessionId: string;
  coachId: string;
  athleteId: string;
  rating: number; // 1-5
  notes: string;
  highlights: string[];
  areasToImprove: string[];
  skillsWorked: FootballObjective[];
  skillUpdates: Array<{
    skill: FootballObjective;
    previousLevel: number;
    newLevel: number;
  }>;
  createdAt: string;
}

export interface SkillLevel {
  skill: FootballObjective;
  level: number; // 0-100
  lastUpdated: string;
}

export interface NotificationItem {
  id: string;
  type: 'booking' | 'message' | 'review' | 'payment' | 'reminder';
  title: string;
  body: string;
  timeLabel?: string;
  read?: boolean;
}
