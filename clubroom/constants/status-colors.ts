/**
 * Centralized status and role colors used throughout the application.
 * Import from here instead of defining inline colors in services.
 */

// ============================================================================
// CLUB ROLE COLORS
// ============================================================================

export type ClubRole = 'OWNER' | 'ADMIN' | 'HEAD_COACH' | 'COACH' | 'MEMBER';

export const ClubRoleColors: Record<ClubRole, string> = {
  OWNER: '#7C3AED',      // Purple
  ADMIN: '#2563EB',      // Blue
  HEAD_COACH: '#16A34A', // Green
  COACH: '#0891B2',      // Cyan
  MEMBER: '#6B7280',     // Gray
};

export function getClubRoleColor(role: ClubRole): string {
  return ClubRoleColors[role] || '#6B7280';
}

// ============================================================================
// MATCH TYPE COLORS
// ============================================================================

export type MatchType = 'FRIENDLY' | 'LEAGUE' | 'CUP' | 'TOURNAMENT';

export const MatchTypeColors: Record<MatchType, string> = {
  FRIENDLY: '#0891B2',   // Cyan
  LEAGUE: '#16A34A',     // Green
  CUP: '#7C3AED',        // Purple
  TOURNAMENT: '#EA580C', // Orange
};

export function getMatchTypeColor(type: MatchType): string {
  return MatchTypeColors[type] || '#6B7280';
}

// ============================================================================
// MATCH STATUS COLORS
// ============================================================================

export type MatchStatus = 'SCHEDULED' | 'LINEUP_SET' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export const MatchStatusColors: Record<MatchStatus, string> = {
  SCHEDULED: '#0891B2',   // Cyan
  LINEUP_SET: '#16A34A',  // Green
  IN_PROGRESS: '#EA580C', // Orange
  COMPLETED: '#6B7280',   // Gray
  CANCELLED: '#DC2626',   // Red
};

export function getMatchStatusColor(status: MatchStatus): string {
  return MatchStatusColors[status] || '#6B7280';
}

// ============================================================================
// MATCH PLAYER STATUS COLORS
// ============================================================================

export type MatchPlayerStatus = 'INVITED' | 'AVAILABLE' | 'UNAVAILABLE' | 'SELECTED' | 'RESERVE';

export const MatchPlayerStatusColors: Record<MatchPlayerStatus, string> = {
  INVITED: '#F59E0B',     // Amber
  AVAILABLE: '#16A34A',   // Green
  UNAVAILABLE: '#DC2626', // Red
  SELECTED: '#7C3AED',    // Purple
  RESERVE: '#0891B2',     // Cyan
};

export function getMatchPlayerStatusColor(status: MatchPlayerStatus): string {
  return MatchPlayerStatusColors[status] || '#6B7280';
}

// ============================================================================
// ROSTER STATUS COLORS
// ============================================================================

export type RosterStatus = 'ACTIVE' | 'PAUSED' | 'GRADUATED' | 'INACTIVE';

export const RosterStatusColors: Record<RosterStatus, string> = {
  ACTIVE: '#16A34A',    // Green
  PAUSED: '#CA8A04',    // Yellow
  GRADUATED: '#2563EB', // Blue
  INACTIVE: '#6B7280',  // Gray
};

export function getRosterStatusColor(status: RosterStatus): string {
  return RosterStatusColors[status] || '#6B7280';
}

// ============================================================================
// BOOKING STATUS COLORS
// ============================================================================

export type BookingStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';

export const BookingStatusColors: Record<BookingStatus, string> = {
  Pending: '#F59E0B',   // Amber/Warning
  Confirmed: '#16A34A', // Green/Success
  Completed: '#6B7280', // Gray/Muted
  Cancelled: '#DC2626', // Red/Error
};

export function getBookingStatusColor(status: BookingStatus): string {
  return BookingStatusColors[status] || '#6B7280';
}

// ============================================================================
// COMMON STATUS COLORS (for generic use)
// ============================================================================

export const StatusColors = {
  success: '#16A34A',
  warning: '#F59E0B',
  error: '#DC2626',
  info: '#0891B2',
  neutral: '#6B7280',
  purple: '#7C3AED',
  blue: '#2563EB',
  orange: '#EA580C',
  yellow: '#CA8A04',
} as const;
