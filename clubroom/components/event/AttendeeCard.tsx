import { StyleSheet } from 'react-native';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing } from '@/constants/theme';
import type { EventRSVP, EventAttendance } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

import {
  CompactAttendeeCardInner,
  AttendeeDetailContent,
} from './attendee-card-sections';

interface AttendeeCardProps {
  rsvp?: EventRSVP;
  attendance?: EventAttendance;
  onPress?: () => void;
  showCheckInStatus?: boolean;
  compact?: boolean;
}

export function AttendeeCard({
  rsvp,
  attendance,
  onPress,
  showCheckInStatus = false,
  compact = false,
}: AttendeeCardProps) {
  const { colors: palette } = useTheme();

  const userName = attendance?.userId || rsvp?.userId || 'Unknown';
  const userPhotoUrl = undefined;
  const userRole = attendance?.userRole || rsvp?.userRole || 'PARENT';
  const guestCount = attendance?.guestsCheckedIn ?? rsvp?.guestCount ?? 0;
  const isCheckedIn = !!attendance;

  if (compact) {
    return (
      <CompactAttendeeCardInner
        userName={userName}
        userPhotoUrl={userPhotoUrl}
        guestCount={guestCount}
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
        guestCount={guestCount}
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
