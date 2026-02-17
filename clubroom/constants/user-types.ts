/**
 * User Types
 *
 * Core user, coach, athlete profile types.
 * Also includes UserRole (single source of truth), social links,
 * school/invite, and coach discovery/search types.
 */

// ============================================================================
// CORE TYPE ALIASES
// ============================================================================

export type SportCategory = 'Football';

// Core User Roles - Single source of truth
// Legacy alias (PARENT -> USER) kept for backward compatibility
export type UserRole = 'COACH' | 'USER' | 'PARENT' | 'ADMIN';

/** Normalize legacy role values (e.g. 'Coach') to uppercase canonical form */
export function normalizeUserRole(role: string): UserRole {
  return role === 'Coach' ? 'COACH' : role as UserRole;
}

export type FootballObjective =
  | 'Dribbling'
  | 'Passing'
  | 'Defending'
  | 'Finishing'
  | 'Goalkeeping'
  | 'Conditioning';

export type TrainingFormat = 'In-person' | 'Virtual' | 'Small group';

export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE';

// ============================================================================
// SIMPLIFIED USER TYPE SYSTEM
// ============================================================================
// Instead of 4 roles (COACH, USER, PARENT, ADMIN), we use 2 primary types:
// - USER: Can be athlete AND/OR parent
// - COACH: Can be individual OR organization
// Admin is a system flag, not a user type

export type SimplifiedUserType = 'USER' | 'COACH';

export interface ChildReference {
  childId: string;
  childName: string;
  relationshipType: 'PARENT_CHILD' | 'GUARDIAN';
  addedAt: string;
}

export interface GuardianReference {
  guardianId: string;
  guardianName: string;
  relationshipType: 'PARENT_CHILD' | 'GUARDIAN';
  isPrimary: boolean;
}

export type CoachPermission =
  | 'MANAGE_BOOKINGS'
  | 'MANAGE_ROSTER'
  | 'AWARD_BADGES'
  | 'VIEW_EARNINGS'
  | 'MANAGE_SETTINGS'
  | 'INVITE_STAFF'
  | 'POST_AS_COACH';

export interface StaffMember {
  userId: string;
  userName: string;
  userAvatar?: string;
  role: 'HEAD_COACH' | 'COACH' | 'ASSISTANT' | 'ADMIN';
  permissions: CoachPermission[];
  joinedAt: string;
  isActive: boolean;
}

// Simplified User interface (replaces USER + PARENT roles)
export interface SimplifiedUser {
  id: string;
  email: string;
  name: string;
  type: 'USER';
  avatar?: string;
  bio?: string;
  phone?: string;
  dateOfBirth: string;
  postcode: string;
  createdAt: string;

  // Self-athlete properties (optional - if user is also an athlete)
  skillLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE';
  position?: string;

  // Parent properties (optional - if user has children)
  children?: ChildReference[];

  // If managed by a parent
  parentId?: string;
  guardians?: GuardianReference[];

  // Admin flag (instead of separate ADMIN role)
  isSystemAdmin?: boolean;
}

// ============================================================================
// SOCIAL MEDIA LINKS
// ============================================================================

export type SocialPlatform = 'instagram' | 'twitter' | 'facebook' | 'linkedin' | 'youtube' | 'tiktok' | 'website';

export interface SocialLink {
  platform: SocialPlatform;
  url: string;
  username?: string; // Optional display username (e.g., @coachsarah)
}

export interface SocialLinks {
  instagram?: string;
  twitter?: string;
  facebook?: string;
  linkedin?: string;
  youtube?: string;
  tiktok?: string;
  website?: string;
}

// ============================================================================
// COACH PROFILE TYPES
// ============================================================================

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

export interface CoachLanguage {
  id: string;
  name: string;
  proficiency: 'Native' | 'Fluent' | 'Conversational' | 'Basic';
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

export type BadgeCategory = 'technical' | 'physical' | 'psychological' | 'social';
export type BadgeTier = 1 | 2 | 3;  // Foundation, Developing, Advanced

export interface BadgeDefinition {
  id: string;
  label: string;
  tone?: 'success' | 'warning' | 'default';
  description?: string;
  // Progression fields (optional for non-athlete badges like coach verification badges)
  category?: BadgeCategory;
  tier?: BadgeTier;
  pointValue?: number;  // 10, 25, 50 for Bronze, Silver, Gold
}

export type CoachBadge = BadgeDefinition;

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
  sessionRate?: number; // £ GBP per session - alias for priceRange.minUsd
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
  languages: CoachLanguage[];
  achievements: string[];
  socialLinks?: SocialLinks;
}

// Simplified Coach interface (individuals or organizations)
export interface SimplifiedCoach {
  id: string;
  email: string;
  name: string;
  type: 'COACH';
  avatar?: string;
  createdAt: string;

  // Organization support
  isOrganization: boolean;
  organizationName?: string;
  organizationLogo?: string;

  // Staff (if organization)
  staffMembers?: StaffMember[];

  // Availability status
  isLive: boolean; // Currently accepting new bookings
  liveStatusReason?: string; // "On vacation", "Fully booked", etc.

  // Profile
  bio: string;
  phone?: string;
  website?: string;
  primarySport: SportCategory;
  sports: SportCategory[];
  specialties: string[];

  // Qualifications
  certifications: CoachCertification[];
  experiences: CoachExperience[];
  languages: CoachLanguage[];

  // Location
  city: string;
  state?: string;
  postcode: string;
  travelRadius?: number; // miles willing to travel

  // Pricing
  priceRange: {
    minUsd: number;
    maxUsd: number;
    unitLabel: string;
  };
  sessionFormats: ('In-person' | 'Virtual' | 'Small group')[];

  // Ratings
  rating: {
    average: number;
    reviewCount: number;
  };

  // Verification
  verificationLevel: 'NONE' | 'BASIC' | 'VERIFIED' | 'PREMIUM';

  // Social
  socialLinks?: SocialLinks;

  // Analytics
  totalSessions: number;
  activeAthletes: number;
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

// ============================================================================
// USER PROFILE (General)
// ============================================================================

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  profilePhotoUrl?: string;
  bio?: string;
  role: UserRole;
  joinedDate: string;
  children?: {
    name: string;
    age: number;
  }[];
  socialLinks?: SocialLinks;
}

// ============================================================================
// SCHOOL & INVITE SYSTEM
// ============================================================================

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

// ============================================================================
// VERIFICATION & TRUST
// ============================================================================

export interface VerificationItem {
  status: 'NOT_STARTED' | 'PENDING' | 'VERIFIED' | 'FAILED' | 'EXPIRED';
  verifiedAt?: string;
  expiresAt?: string;
  documentUrl?: string;
  notes?: string;
}

export interface VerificationStatus {
  coachId: string;
  email: VerificationItem;
  phone: VerificationItem;
  identity: VerificationItem;
  backgroundCheck: VerificationItem;
  credentials: VerificationItem[];
  insurance: VerificationItem;
  overallLevel: 'NONE' | 'BASIC' | 'VERIFIED' | 'PREMIUM';
  lastUpdated: string;
}

// ============================================================================
// COACH FEEDBACK & REVIEWS (Enhanced)
// ============================================================================

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
  skillUpdates: {
    skill: FootballObjective;
    previousLevel: number;
    newLevel: number;
  }[];
  createdAt: string;
}

export interface Review {
  id: string;
  coachId: string;
  coachName: string;
  parentId: string;
  parentName: string;
  parentPhotoUrl?: string;
  athleteId?: string;
  athleteName?: string;
  bookingId?: string;
  rating: number;
  title?: string;
  content: string;
  isPublic: boolean;
  response?: string;
  respondedAt?: string;
  isVerifiedBooking: boolean;
  status: 'PENDING' | 'PUBLISHED' | 'HIDDEN' | 'FLAGGED';
  createdAt: string;
  updatedAt?: string;
  helpfulCount: number;
}

// ============================================================================
// ADVANCED COACH DISCOVERY
// ============================================================================

/**
 * Gender options for coach filtering
 */
export type CoachGender = 'Male' | 'Female' | 'Non-binary' | 'Any';

/**
 * Location data for a coach with distance calculation
 */
export interface CoachLocation {
  /** Latitude coordinate */
  lat: number;
  /** Longitude coordinate */
  lng: number;
  /** City name */
  city: string;
  /** State/region */
  state?: string;
  /** Distance from search origin in kilometers */
  distanceKm?: number;
  /** Distance from search origin in miles */
  distanceMiles?: number;
  /** Formatted address string */
  formattedAddress?: string;
}

/**
 * Comprehensive filters for coach search
 */
export interface CoachSearchFilters {
  /** Minimum price per session in GBP */
  priceMin?: number;
  /** Maximum price per session in GBP */
  priceMax?: number;
  /** Minimum average rating (1-5) */
  rating?: number;
  /** Maximum distance from user in kilometers */
  distance?: number;
  /** Sports/activities to filter by */
  sports?: SportCategory[];
  /** Football objectives/focuses to filter by */
  focuses?: FootballObjective[];
  /** Gender preference */
  gender?: CoachGender;
  /** Languages spoken by coach */
  languages?: string[];
  /** Minimum verification level */
  verified?: 'NONE' | 'BASIC' | 'VERIFIED' | 'PREMIUM';
  /** Session formats supported */
  formats?: TrainingFormat[];
  /** Text search query */
  query?: string;
  /** Only show coaches with availability in date range */
  availableFrom?: string;
  /** End of availability date range */
  availableTo?: string;
  /** Location-based search */
  location?: {
    lat: number;
    lng: number;
    radiusKm: number;
  };
  /** Sort order for results */
  sortBy?: 'distance' | 'rating' | 'price_low' | 'price_high' | 'reviews';
}

/**
 * Filter option with count of matching coaches
 */
export interface FilterOption {
  /** Option value/id */
  value: string;
  /** Display label */
  label: string;
  /** Number of coaches matching this option */
  count: number;
  /** Whether this option is currently selected */
  selected?: boolean;
}

/**
 * Available filter options with counts
 */
export interface FilterOptions {
  /** Available sports with counts */
  sports: FilterOption[];
  /** Available focuses with counts */
  focuses: FilterOption[];
  /** Available languages with counts */
  languages: FilterOption[];
  /** Gender options with counts */
  genders: FilterOption[];
  /** Verification levels with counts */
  verificationLevels: FilterOption[];
  /** Session formats with counts */
  formats: FilterOption[];
  /** Price range bounds */
  priceRange: {
    min: number;
    max: number;
  };
  /** Rating distribution */
  ratingDistribution: {
    rating: number;
    count: number;
  }[];
  /** Total coaches matching current filters */
  totalCount: number;
}

/**
 * Coach search result with relevance score
 */
export interface CoachSearchResult {
  /** The coach profile */
  coach: CoachProfile;
  /** Relevance score for search ranking */
  relevanceScore: number;
  /** Distance from search location (if location search) */
  distanceKm?: number;
  /** Matched search terms for highlighting */
  matchedTerms?: string[];
}

/**
 * Paginated search results
 */
export interface CoachSearchResponse {
  /** Search results */
  results: CoachSearchResult[];
  /** Total number of matching coaches */
  totalCount: number;
  /** Current page number */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Whether there are more results */
  hasMore: boolean;
  /** Filter options based on current results */
  filterOptions: FilterOptions;
}

/**
 * Suggested coach with reason for suggestion
 */
export interface SuggestedCoach {
  /** The coach profile */
  coach: CoachProfile;
  /** Reason for the suggestion */
  reason: 'nearby' | 'highly_rated' | 'similar_to_booked' | 'popular' | 'new' | 'available_soon';
  /** Human-readable reason text */
  reasonText: string;
  /** Confidence score for the suggestion */
  confidence: number;
}

/**
 * Active filter for display in filter bar
 */
export interface ActiveFilter {
  /** Filter type/category */
  type: keyof CoachSearchFilters;
  /** Display label */
  label: string;
  /** Filter value */
  value: string | number | string[];
}

// ============================================================================
// COACH COMPARISON
// ============================================================================

/**
 * Criteria for sorting/highlighting in coach comparison
 */
export type ComparisonCriteria = 'PRICE' | 'RATING' | 'EXPERIENCE' | 'AVAILABILITY';

/**
 * Coach data optimized for comparison view
 */
export interface CoachComparison {
  /** Unique coach identifier */
  coachId: string;
  /** Coach display name */
  name: string;
  /** Profile photo URL */
  avatar: string;
  /** Average rating (1-5) */
  rating: number;
  /** Number of reviews */
  reviewCount: number;
  /** Price range for sessions */
  price: {
    min: number;
    max: number;
    currency: string;
  };
  /** List of coaching specialties/focuses */
  specialties: string[];
  /** Available session types/formats */
  sessionTypes: TrainingFormat[];
  /** Next available slot for booking */
  availability: {
    nextSlot: string | null;
    slotsThisWeek: number;
  };
  /** Total sessions conducted */
  totalSessions: number;
  /** Distance from user in miles */
  distanceMiles: number;
  /** Coach's spoken languages */
  languages: string[];
  /** Years of experience (derived from join date) */
  yearsExperience: number;
  /** Verification/badge status */
  badges: { label: string; tone: 'success' | 'warning' | 'default' }[];
  /** Short bio for quick reference */
  shortBio: string;
}

/**
 * Comparison state for tracking selected coaches
 */
export interface ComparisonState {
  /** Currently selected coach IDs for comparison */
  selectedCoachIds: string[];
  /** Comparison data for selected coaches */
  coaches: CoachComparison[];
  /** Maximum coaches allowed in comparison */
  maxCoaches: number;
  /** Criteria to highlight best values */
  highlightCriteria: ComparisonCriteria | null;
}

/**
 * Result of adding a coach to comparison
 */
export interface AddToComparisonResult {
  success: boolean;
  message: string;
  currentCount: number;
  maxCount: number;
}

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

/** Authentication tokens */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/** Authentication state */
export interface AuthState {
  user: SimplifiedUser | SimplifiedCoach | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
