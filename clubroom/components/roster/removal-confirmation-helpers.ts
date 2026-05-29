import type { MemberRemovalReason } from '@/services/club-service';
import type { RemovalReason } from '@/services/roster-service';

export const ATHLETE_REASONS: { value: RemovalReason; label: string; icon: string }[] = [
  { value: 'GRADUATED', label: 'Graduated', icon: 'school-outline' },
  { value: 'MOVED', label: 'Moved away', icon: 'airplane-outline' },
  { value: 'INACTIVE', label: 'Inactive', icon: 'time-outline' },
  { value: 'OTHER', label: 'Other', icon: 'ellipsis-horizontal' },
];

export const MEMBER_REASONS: { value: MemberRemovalReason; label: string; icon: string }[] = [
  { value: 'LEFT_CLUB', label: 'Left club', icon: 'exit-outline' },
  { value: 'INACTIVE', label: 'Inactive', icon: 'time-outline' },
  { value: 'CONDUCT', label: 'Conduct issue', icon: 'warning-outline' },
  { value: 'SEASON_END', label: 'Season ended', icon: 'calendar-outline' },
  { value: 'OTHER', label: 'Other', icon: 'ellipsis-horizontal' },
];
