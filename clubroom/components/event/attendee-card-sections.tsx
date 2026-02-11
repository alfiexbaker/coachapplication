/**
 * Extracted sub-components for AttendeeCard.
 *
 * CompactAttendeeCardInner — compact variant with avatar + name + status dot.
 * AttendeeDetailContent — full card content with RSVP status, role, check-in, note.
 */

import React, { memo } from 'react';
import { View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { withAlpha } from '@/constants/theme';
import type { EventRSVP, EventAttendance } from '@/constants/types';
import { eventService } from '@/services/event-service';
import type { ThemeColors } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';
import { styles } from './attendee-card-styles';

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getRoleIcon(role: string): keyof typeof Ionicons.glyphMap {
  switch (role) {
    case 'COACH': return 'megaphone-outline';
    case 'ATHLETE': return 'football-outline';
    default: return 'person-outline';
  }
}

export function getRoleLabel(role: string): string {
  switch (role) {
    case 'COACH': return 'Coach';
    case 'ATHLETE': return 'Athlete';
    default: return 'Parent';
  }
}

// ─── CompactAttendeeCardInner ────────────────────────────────────────────────

interface CompactAttendeeCardInnerProps {
  userName: string;
  userPhotoUrl?: string;
  guestCount: number;
  showCheckInStatus: boolean;
  isCheckedIn: boolean;
  rsvpStatus?: string;
  onPress?: () => void;
  palette: ThemeColors;
}

export const CompactAttendeeCardInner = memo(function CompactAttendeeCardInner({
  userName,
  userPhotoUrl,
  guestCount,
  showCheckInStatus,
  isCheckedIn,
  rsvpStatus,
  onPress,
  palette,
}: CompactAttendeeCardInnerProps) {
  return (
    <SurfaceCard style={styles.compactCard} onPress={onPress}>
      <View style={[styles.compactAvatar, { backgroundColor: palette.surface }]}>
        {userPhotoUrl ? (
          <Image source={{ uri: userPhotoUrl }} style={styles.compactAvatarImage} />
        ) : (
          <ThemedText style={styles.compactAvatarInitial}>
            {userName.charAt(0).toUpperCase()}
          </ThemedText>
        )}
      </View>

      <Row style={styles.compactInfo}>
        <ThemedText style={styles.compactName} numberOfLines={1}>
          {userName}
        </ThemedText>
        {guestCount > 0 && (
          <ThemedText style={[styles.compactGuests, { color: palette.muted }]}>
            +{guestCount} guest{guestCount > 1 ? 's' : ''}
          </ThemedText>
        )}
      </Row>

      {showCheckInStatus && (
        <View
          style={[
            styles.compactStatusDot,
            { backgroundColor: isCheckedIn ? palette.success : palette.warning },
          ]}
        />
      )}
      {rsvpStatus && !showCheckInStatus && (
        <View
          style={[
            styles.compactStatusDot,
            { backgroundColor: eventService.getRSVPStatusColor(rsvpStatus as 'GOING' | 'MAYBE' | 'NOT_GOING') },
          ]}
        />
      )}
    </SurfaceCard>
  );
});

// ─── AttendeeDetailContent ───────────────────────────────────────────────────

interface AttendeeDetailContentProps {
  userName: string;
  userPhotoUrl?: string;
  userRole: string;
  guestCount: number;
  rsvp?: EventRSVP;
  attendance?: EventAttendance;
  showCheckInStatus: boolean;
  isCheckedIn: boolean;
  palette: ThemeColors;
}

export const AttendeeDetailContent = memo(function AttendeeDetailContent({
  userName,
  userPhotoUrl,
  userRole,
  guestCount,
  rsvp,
  attendance,
  showCheckInStatus,
  isCheckedIn,
  palette,
}: AttendeeDetailContentProps) {
  return (
    <Row style={styles.content}>
      <View style={[styles.avatar, { backgroundColor: palette.border }]}>
        {userPhotoUrl ? (
          <Image source={{ uri: userPhotoUrl }} style={styles.avatarImage} />
        ) : (
          <ThemedText style={styles.avatarInitial}>
            {userName.charAt(0).toUpperCase()}
          </ThemedText>
        )}
        {showCheckInStatus && isCheckedIn && (
          <View style={[styles.checkInBadge, { backgroundColor: palette.success, borderColor: palette.surface }]}>
            <Ionicons name="checkmark" size={10} color={palette.onSuccess} />
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Row style={styles.nameRow}>
          <ThemedText type="defaultSemiBold" style={styles.name}>{userName}</ThemedText>
          {rsvp && (
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: withAlpha(eventService.getRSVPStatusColor(rsvp.status), 0.09) },
              ]}
            >
              <Ionicons
                name={eventService.getRSVPStatusIcon(rsvp.status) as keyof typeof Ionicons.glyphMap}
                size={12}
                color={eventService.getRSVPStatusColor(rsvp.status)}
              />
              <ThemedText
                style={[styles.statusBadgeText, { color: eventService.getRSVPStatusColor(rsvp.status) }]}
              >
                {eventService.formatRSVPStatus(rsvp.status)}
              </ThemedText>
            </View>
          )}
        </Row>

        <Row style={styles.detailsRow}>
          <Row style={styles.roleTag}>
            <Ionicons name={getRoleIcon(userRole)} size={12} color={palette.muted} />
            <ThemedText style={[styles.roleText, { color: palette.muted }]}>
              {getRoleLabel(userRole)}
            </ThemedText>
          </Row>
          {guestCount > 0 && (
            <Row style={styles.guestTag}>
              <Ionicons name="people" size={12} color={palette.muted} />
              <ThemedText style={[styles.guestText, { color: palette.muted }]}>
                +{guestCount} guest{guestCount > 1 ? 's' : ''}
              </ThemedText>
            </Row>
          )}
        </Row>

        {attendance && (
          <Row style={styles.checkInInfo}>
            <Ionicons name="time-outline" size={12} color={palette.success} />
            <ThemedText style={[styles.checkInTime, { color: palette.success }]}>
              Checked in {eventService.formatTimeAgo(attendance.checkedInAt)}
            </ThemedText>
            {attendance.locationValidated && (
              <View style={styles.locationVerified}>
                <Ionicons name="location" size={12} color={palette.success} />
              </View>
            )}
          </Row>
        )}

        {rsvp && !attendance && (
          <ThemedText style={[styles.rsvpTime, { color: palette.muted }]}>
            Responded {eventService.formatTimeAgo(rsvp.respondedAt)}
          </ThemedText>
        )}

        {rsvp?.note && (
          <Row style={[styles.noteContainer, { backgroundColor: palette.surface }]}>
            <Ionicons name="chatbubble-outline" size={12} color={palette.muted} />
            <ThemedText style={[styles.noteText, { color: palette.muted }]} numberOfLines={2}>
              {rsvp.note}
            </ThemedText>
          </Row>
        )}
      </View>
    </Row>
  );
});

export { styles };
