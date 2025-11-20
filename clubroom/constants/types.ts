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
}

export interface AthleteObjective {
  id: string;
  label: FootballObjective | 'Custom';
  status: 'active' | 'upcoming' | 'completed';
  updatedAt: string;
  note?: string;
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
  sender: ChatSender;
  body: string;
  createdAt: string;
  status: 'sent' | 'delivered' | 'seen' | 'pending';
  attachments?: ChatAttachment[];
}

export interface ChatThreadSummary {
  id: string;
  bookingId: string;
  coachName: string;
  childName: string;
  serviceName: string;
  location: string;
  scheduledFor: string;
  unreadCount: number;
  safetyCopy: string;
  pinnedObjectives?: FootballObjective[];
}
