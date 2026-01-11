import { StyleSheet, View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import type { EventRSVP, EventAttendance } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { eventService } from '@/services/event-service';
import { scaleFont } from '@/utils/scale';

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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  // Use attendance data if available, otherwise fall back to RSVP
  const userName = attendance?.userName || rsvp?.userName || 'Unknown';
  const userPhotoUrl = attendance?.userPhotoUrl || rsvp?.userPhotoUrl;
  const userRole = attendance?.userRole || rsvp?.userRole || 'PARENT';
  const guestCount = attendance?.guestsCheckedIn ?? rsvp?.guestCount ?? 0;
  const isCheckedIn = !!attendance;

  const getRoleIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (userRole) {
      case 'COACH':
        return 'megaphone-outline';
      case 'ATHLETE':
        return 'football-outline';
      case 'PARENT':
      default:
        return 'person-outline';
    }
  };

  const getRoleLabel = (): string => {
    switch (userRole) {
      case 'COACH':
        return 'Coach';
      case 'ATHLETE':
        return 'Athlete';
      case 'PARENT':
      default:
        return 'Parent';
    }
  };

  if (compact) {
    return (
      <SurfaceCard style={styles.compactCard} onPress={onPress}>
        {/* Avatar */}
        <View style={[styles.compactAvatar, { backgroundColor: palette.surface }]}>
          {userPhotoUrl ? (
            <Image source={{ uri: userPhotoUrl }} style={styles.compactAvatarImage} />
          ) : (
            <ThemedText style={styles.compactAvatarInitial}>
              {userName.charAt(0).toUpperCase()}
            </ThemedText>
          )}
        </View>

        {/* Name */}
        <View style={styles.compactInfo}>
          <ThemedText style={styles.compactName} numberOfLines={1}>
            {userName}
          </ThemedText>
          {guestCount > 0 && (
            <ThemedText style={[styles.compactGuests, { color: palette.muted }]}>
              +{guestCount} guest{guestCount > 1 ? 's' : ''}
            </ThemedText>
          )}
        </View>

        {/* Status indicator */}
        {showCheckInStatus && (
          <View
            style={[
              styles.compactStatusDot,
              { backgroundColor: isCheckedIn ? palette.success : palette.warning },
            ]}
          />
        )}
        {rsvp && !showCheckInStatus && (
          <View
            style={[
              styles.compactStatusDot,
              { backgroundColor: eventService.getRSVPStatusColor(rsvp.status) },
            ]}
          />
        )}
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard style={styles.card} onPress={onPress}>
      <View style={styles.content}>
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: palette.border }]}>
          {userPhotoUrl ? (
            <Image source={{ uri: userPhotoUrl }} style={styles.avatarImage} />
          ) : (
            <ThemedText style={styles.avatarInitial}>
              {userName.charAt(0).toUpperCase()}
            </ThemedText>
          )}
          {/* Check-in indicator */}
          {showCheckInStatus && isCheckedIn && (
            <View style={[styles.checkInBadge, { backgroundColor: palette.success }]}>
              <Ionicons name="checkmark" size={10} color="#FFFFFF" />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <ThemedText type="defaultSemiBold" style={styles.name}>
              {userName}
            </ThemedText>
            {/* RSVP status badge */}
            {rsvp && (
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: `${eventService.getRSVPStatusColor(rsvp.status)}15` },
                ]}
              >
                <Ionicons
                  name={eventService.getRSVPStatusIcon(rsvp.status) as keyof typeof Ionicons.glyphMap}
                  size={12}
                  color={eventService.getRSVPStatusColor(rsvp.status)}
                />
                <ThemedText
                  style={[
                    styles.statusBadgeText,
                    { color: eventService.getRSVPStatusColor(rsvp.status) },
                  ]}
                >
                  {eventService.formatRSVPStatus(rsvp.status)}
                </ThemedText>
              </View>
            )}
          </View>

          {/* Role and details */}
          <View style={styles.detailsRow}>
            <View style={styles.roleTag}>
              <Ionicons name={getRoleIcon()} size={12} color={palette.muted} />
              <ThemedText style={[styles.roleText, { color: palette.muted }]}>
                {getRoleLabel()}
              </ThemedText>
            </View>

            {guestCount > 0 && (
              <View style={styles.guestTag}>
                <Ionicons name="people" size={12} color={palette.muted} />
                <ThemedText style={[styles.guestText, { color: palette.muted }]}>
                  +{guestCount} guest{guestCount > 1 ? 's' : ''}
                </ThemedText>
              </View>
            )}
          </View>

          {/* Check-in time */}
          {attendance && (
            <View style={styles.checkInInfo}>
              <Ionicons name="time-outline" size={12} color={palette.success} />
              <ThemedText style={[styles.checkInTime, { color: palette.success }]}>
                Checked in {eventService.formatTimeAgo(attendance.checkedInAt)}
              </ThemedText>
              {attendance.locationValidated && (
                <View style={styles.locationVerified}>
                  <Ionicons name="location" size={12} color={palette.success} />
                </View>
              )}
            </View>
          )}

          {/* RSVP time */}
          {rsvp && !attendance && (
            <ThemedText style={[styles.rsvpTime, { color: palette.muted }]}>
              Responded {eventService.formatTimeAgo(rsvp.respondedAt)}
            </ThemedText>
          )}

          {/* RSVP note */}
          {rsvp?.note && (
            <View style={[styles.noteContainer, { backgroundColor: palette.surface }]}>
              <Ionicons name="chatbubble-outline" size={12} color={palette.muted} />
              <ThemedText style={[styles.noteText, { color: palette.muted }]} numberOfLines={2}>
                {rsvp.note}
              </ThemedText>
            </View>
          )}
        </View>
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarInitial: {
    fontSize: scaleFont(18),
    fontWeight: '600',
  },
  checkInBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  info: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  name: {
    fontSize: scaleFont(15),
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.sm,
  },
  statusBadgeText: {
    fontSize: scaleFont(11),
    fontWeight: '600',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  roleText: {
    fontSize: scaleFont(12),
  },
  guestTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  guestText: {
    fontSize: scaleFont(12),
  },
  checkInInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  checkInTime: {
    fontSize: scaleFont(12),
    fontWeight: '500',
  },
  locationVerified: {
    marginLeft: 2,
  },
  rsvpTime: {
    fontSize: scaleFont(12),
    marginTop: 2,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: Spacing.xs,
    borderRadius: Radii.sm,
    marginTop: 4,
  },
  noteText: {
    flex: 1,
    fontSize: scaleFont(12),
    fontStyle: 'italic',
  },

  // Compact styles
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  compactAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  compactAvatarInitial: {
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  compactInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  compactName: {
    fontSize: scaleFont(14),
    flex: 1,
  },
  compactGuests: {
    fontSize: scaleFont(12),
  },
  compactStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
