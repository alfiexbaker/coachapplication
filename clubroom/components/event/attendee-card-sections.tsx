/**
 * Extracted sub-components for AttendeeCard.
 *
 * CompactAttendeeCardInner — compact variant with avatar + name + status dot.
 * AttendeeDetailContent — full card content with RSVP status, role, check-in, note.
 */

import React, { memo } from 'react';
import { StyleSheet, View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, withAlpha } from '@/constants/theme';
import type { EventRSVP, EventAttendance } from '@/constants/types';
import { eventService } from '@/services/event-service';
import { scaleFont } from '@/utils/scale';
import type { ThemeColors } from '@/hooks/useTheme';

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
    <View style={styles.content}>
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
        <View style={styles.nameRow}>
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
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.roleTag}>
            <Ionicons name={getRoleIcon(userRole)} size={12} color={palette.muted} />
            <ThemedText style={[styles.roleText, { color: palette.muted }]}>
              {getRoleLabel(userRole)}
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

        {rsvp && !attendance && (
          <ThemedText style={[styles.rsvpTime, { color: palette.muted }]}>
            Responded {eventService.formatTimeAgo(rsvp.respondedAt)}
          </ThemedText>
        )}

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
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarImage: { width: 48, height: 48, borderRadius: Radii.xl },
  avatarInitial: { fontSize: scaleFont(18), fontWeight: '600' },
  checkInBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  info: { flex: 1, gap: Spacing.xxs },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  name: { fontSize: scaleFont(15), flex: 1 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: 8,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  statusBadgeText: { fontSize: scaleFont(11), fontWeight: '600' },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  roleTag: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
  roleText: { fontSize: scaleFont(12) },
  guestTag: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
  guestText: { fontSize: scaleFont(12) },
  checkInInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    marginTop: Spacing.micro,
  },
  checkInTime: { fontSize: scaleFont(12), fontWeight: '500' },
  locationVerified: { marginLeft: Spacing.micro },
  rsvpTime: { fontSize: scaleFont(12), marginTop: Spacing.micro },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xxs,
    padding: Spacing.xs,
    borderRadius: Radii.sm,
    marginTop: Spacing.xxs,
  },
  noteText: { flex: 1, fontSize: scaleFont(12), fontStyle: 'italic' },
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
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactAvatarImage: { width: 32, height: 32, borderRadius: Radii.lg },
  compactAvatarInitial: { fontSize: scaleFont(14), fontWeight: '600' },
  compactInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  compactName: { fontSize: scaleFont(14), flex: 1 },
  compactGuests: { fontSize: scaleFont(12) },
  compactStatusDot: { width: 8, height: 8, borderRadius: Radii.xs },
});
