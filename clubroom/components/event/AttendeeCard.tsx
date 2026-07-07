import { StyleSheet } from 'react-native';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing } from '@/constants/theme';
import type { EventRSVP, EventAttendance } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

import { CompactAttendeeCardInner, AttendeeDetailContent } from './attendee-card-sections';

interface AttendeeCardProps {
  rsvp?: EventRSVP;
  attendance?: EventAttendance;
  onPress?: () => void;
  showCheckInStatus?: boolean;
  compact?: boolean;
  fallbackIndex?: number;
}

type AttendeeDisplayFields = {
  avatar?: string;
  name?: string;
  userName?: string;
  userPhotoUrl?: string;
};

const INTERNAL_ID_PATTERN = /\b(?:usr|ath|clb|sqd)_[0-9a-f][0-9a-f-]{6,}\b/i;

function cleanDisplayName(value?: string): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || INTERNAL_ID_PATTERN.test(trimmed)) return undefined;
  return trimmed;
}

function fallbackAttendeeName(role: string, fallbackIndex?: number): string {
  const suffix = fallbackIndex ? ` ${fallbackIndex}` : '';
  if (role === 'COACH') return `Coach${suffix}`;
  if (role === 'ATHLETE') return `Athlete${suffix}`;
  return `Parent/guardian${suffix}`;
}

export function AttendeeCard({
  rsvp,
  attendance,
  onPress,
  showCheckInStatus = false,
  compact = false,
  fallbackIndex,
}: AttendeeCardProps) {
  const { colors: palette } = useTheme();

  const userRole = attendance?.userRole || rsvp?.userRole || 'PARENT';
  const rsvpDisplay = rsvp as (EventRSVP & AttendeeDisplayFields) | undefined;
  const attendanceDisplay = attendance as (EventAttendance & AttendeeDisplayFields) | undefined;
  const userName =
    cleanDisplayName(attendanceDisplay?.userName) ||
    cleanDisplayName(attendanceDisplay?.name) ||
    cleanDisplayName(rsvpDisplay?.userName) ||
    cleanDisplayName(rsvpDisplay?.name) ||
    fallbackAttendeeName(userRole, fallbackIndex);
  const userPhotoUrl =
    attendanceDisplay?.userPhotoUrl ||
    attendanceDisplay?.avatar ||
    rsvpDisplay?.userPhotoUrl ||
    rsvpDisplay?.avatar;
  const isCheckedIn = !!attendance;

  if (compact) {
    return (
      <CompactAttendeeCardInner
        userName={userName}
        userPhotoUrl={userPhotoUrl}
        showCheckInStatus={showCheckInStatus}
        isCheckedIn={isCheckedIn}
        rsvpStatus={rsvp?.status}
        onPress={onPress}
        palette={palette}
      />
    );
  }

  return (
    <SurfaceCard style={styles.card} onPress={onPress}>
      <AttendeeDetailContent
        userName={userName}
        userPhotoUrl={userPhotoUrl}
        userRole={userRole}
        rsvp={rsvp}
        attendance={attendance}
        showCheckInStatus={showCheckInStatus}
        isCheckedIn={isCheckedIn}
        palette={palette}
      />
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.sm },
});
