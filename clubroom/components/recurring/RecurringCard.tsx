import React, { useState } from 'react';
import { StyleSheet, View, Alert, Modal, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Divider } from '@/components/ui/primitives/Divider';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/primitives/button';
import { Colors, Radii, Spacing, Typography, Components } from '@/constants/theme';
import { RecurringBooking, RecurringBookingStatus } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  getDayName,
  getFrequencyLabel,
  getStatusLabel,
} from '@/services/recurring-booking-service';

/**
 * Props for the RecurringCard component
 */
interface RecurringCardProps {
  /** The recurring booking data to display */
  recurring: RecurringBooking;
  /** Called when the user wants to pause the subscription */
  onPause?: (id: string, reason?: string) => Promise<void>;
  /** Called when the user wants to resume the subscription */
  onResume?: (id: string) => Promise<void>;
  /** Called when the user wants to cancel the subscription */
  onCancel?: (id: string, reason?: string) => Promise<void>;
  /** Called when the card is pressed */
  onPress?: (recurring: RecurringBooking) => void;
  /** Whether the card is in a loading state */
  loading?: boolean;
}

/**
 * Get status color based on recurring booking status
 */
function getStatusColor(status: RecurringBookingStatus, palette: typeof Colors.light): string {
  switch (status) {
    case 'ACTIVE':
      return palette.success;
    case 'PAUSED':
      return palette.warning;
    case 'CANCELLED':
      return palette.error;
    case 'EXPIRED':
      return palette.muted;
    default:
      return palette.muted;
  }
}

/**
 * Get status icon based on recurring booking status
 */
function getStatusIcon(status: RecurringBookingStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'checkmark-circle';
    case 'PAUSED':
      return 'pause-circle';
    case 'CANCELLED':
      return 'close-circle';
    case 'EXPIRED':
      return 'time';
    default:
      return 'help-circle';
  }
}

/**
 * Convert hex color to rgba with alpha
 */
function withAlpha(hexColor: string, alpha: number): string {
  const hex = hexColor.replace('#', '');
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * RecurringCard displays a recurring booking subscription with actions
 * to pause, resume, or cancel the subscription.
 */
export function RecurringCard({
  recurring,
  onPause,
  onResume,
  onCancel,
  onPress,
  loading = false,
}: RecurringCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const statusColor = getStatusColor(recurring.status, palette);
  const statusIcon = getStatusIcon(recurring.status);

  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const handlePauseConfirm = async () => {
    if (!onPause) return;
    setActionLoading(true);
    try {
      await onPause(recurring.id, pauseReason || undefined);
      setShowPauseModal(false);
      setPauseReason('');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelConfirm = async () => {
    if (!onCancel) return;
    setActionLoading(true);
    try {
      await onCancel(recurring.id, cancelReason || undefined);
      setShowCancelModal(false);
      setCancelReason('');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    if (!onResume) return;

    Alert.alert(
      'Resume Subscription',
      `Are you sure you want to resume your ${getFrequencyLabel(recurring.frequency).toLowerCase()} sessions with ${recurring.coachName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resume',
          onPress: async () => {
            setActionLoading(true);
            try {
              await onResume(recurring.id);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCardPress = () => {
    if (onPress) {
      onPress(recurring);
    }
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const startDate = new Date(recurring.startDate);
  const startDateLabel = startDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <>
      <SurfaceCard
        style={styles.card}
        onPress={handleCardPress}
        loading={loading || actionLoading}
        outlineGradient={
          recurring.status === 'ACTIVE'
            ? [statusColor, withAlpha(statusColor, 0.4)]
            : undefined
        }
      >
        {/* Header Row */}
        <View style={styles.headerRow}>
          {/* Coach Avatar */}
          {recurring.coachPhotoUrl ? (
            <Image
              source={{ uri: recurring.coachPhotoUrl }}
              style={styles.avatar}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: palette.border }]}>
              <Ionicons name="person" size={20} color={palette.muted} />
            </View>
          )}

          {/* Coach Info */}
          <View style={styles.headerInfo}>
            <ThemedText type="defaultSemiBold" numberOfLines={1}>
              {recurring.coachName}
            </ThemedText>
            <ThemedText style={[styles.sessionType, { color: palette.muted }]}>
              {recurring.sessionType}
            </ThemedText>
          </View>

          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: withAlpha(statusColor, 0.12) }]}>
            <Ionicons
              name={statusIcon as keyof typeof Ionicons.glyphMap}
              size={14}
              color={statusColor}
            />
            <ThemedText style={[styles.statusText, { color: statusColor }]}>
              {getStatusLabel(recurring.status)}
            </ThemedText>
          </View>
        </View>

        {/* Schedule Info */}
        <View style={styles.scheduleRow}>
          <View style={styles.scheduleItem}>
            <Ionicons name="calendar-outline" size={16} color={palette.icon} />
            <ThemedText style={styles.scheduleText}>
              {getDayName(recurring.dayOfWeek)}s
            </ThemedText>
          </View>
          <View style={styles.scheduleItem}>
            <Ionicons name="time-outline" size={16} color={palette.icon} />
            <ThemedText style={styles.scheduleText}>{formatTime(recurring.time)}</ThemedText>
          </View>
          <View style={styles.scheduleItem}>
            <Ionicons name="repeat-outline" size={16} color={palette.icon} />
            <ThemedText style={styles.scheduleText}>
              {getFrequencyLabel(recurring.frequency)}
            </ThemedText>
          </View>
        </View>

        {/* Location */}
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={16} color={palette.icon} />
          <ThemedText style={styles.locationText} numberOfLines={1}>
            {recurring.location}
          </ThemedText>
        </View>

        {/* Athlete Badge (if booking for someone else) */}
        {recurring.athleteName && recurring.athleteName !== recurring.userName && (
          <View style={[styles.athleteBadge, { backgroundColor: withAlpha(palette.tint, 0.1) }]}>
            <Ionicons name="person" size={14} color={palette.tint} />
            <ThemedText style={[styles.athleteText, { color: palette.tint }]}>
              For: {recurring.athleteName}
            </ThemedText>
          </View>
        )}

        {/* Stats Row */}
        <Divider />
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: palette.foreground }]}>
              {recurring.sessionsCompleted}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Completed</ThemedText>
          </View>
          {recurring.sessionsRemaining !== undefined && (
            <View style={styles.statItem}>
              <ThemedText style={[styles.statValue, { color: palette.foreground }]}>
                {recurring.sessionsRemaining}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Remaining</ThemedText>
            </View>
          )}
          {recurring.pricePerSession && (
            <View style={styles.statItem}>
              <ThemedText style={[styles.statValue, { color: palette.foreground }]}>
                ${recurring.pricePerSession}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Per session</ThemedText>
            </View>
          )}
          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: palette.foreground }]}>
              {startDateLabel}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Started</ThemedText>
          </View>
        </View>

        {/* Pause Reason (if paused) */}
        {recurring.status === 'PAUSED' && recurring.pauseReason && (
          <View style={[styles.reasonBox, { backgroundColor: withAlpha(palette.warning, 0.1) }]}>
            <Ionicons name="information-circle" size={16} color={palette.warning} />
            <ThemedText style={[styles.reasonText, { color: palette.warning }]}>
              Paused: {recurring.pauseReason}
            </ThemedText>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          {recurring.status === 'ACTIVE' && onPause && (
            <Pressable
              onPress={() => setShowPauseModal(true)}
              style={[styles.actionButton, { backgroundColor: withAlpha(palette.warning, 0.1) }]}
            >
              <Ionicons name="pause" size={16} color={palette.warning} />
              <ThemedText style={[styles.actionButtonText, { color: palette.warning }]}>
                Pause
              </ThemedText>
            </Pressable>
          )}

          {recurring.status === 'PAUSED' && onResume && (
            <Pressable
              onPress={handleResume}
              style={[styles.actionButton, { backgroundColor: withAlpha(palette.success, 0.1) }]}
            >
              <Ionicons name="play" size={16} color={palette.success} />
              <ThemedText style={[styles.actionButtonText, { color: palette.success }]}>
                Resume
              </ThemedText>
            </Pressable>
          )}

          {recurring.status !== 'CANCELLED' && recurring.status !== 'EXPIRED' && onCancel && (
            <Pressable
              onPress={() => setShowCancelModal(true)}
              style={[styles.actionButton, { backgroundColor: withAlpha(palette.error, 0.1) }]}
            >
              <Ionicons name="close" size={16} color={palette.error} />
              <ThemedText style={[styles.actionButtonText, { color: palette.error }]}>
                Cancel
              </ThemedText>
            </Pressable>
          )}
        </View>
      </SurfaceCard>

      {/* Pause Confirmation Modal */}
      <Modal
        visible={showPauseModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPauseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              Pause Subscription
            </ThemedText>
            <ThemedText style={[styles.modalDescription, { color: palette.muted }]}>
              Your {getFrequencyLabel(recurring.frequency).toLowerCase()} sessions with{' '}
              {recurring.coachName} will be paused. You can resume anytime.
            </ThemedText>

            <TextInput
              style={[
                styles.reasonInput,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                  color: palette.foreground,
                },
              ]}
              placeholder="Reason for pausing (optional)"
              placeholderTextColor={palette.muted}
              value={pauseReason}
              onChangeText={setPauseReason}
              multiline
            />

            <View style={styles.modalActions}>
              <Button variant="outline" onPress={() => setShowPauseModal(false)}>
                Cancel
              </Button>
              <Button onPress={handlePauseConfirm} disabled={actionLoading}>
                {actionLoading ? 'Pausing...' : 'Pause Subscription'}
              </Button>
            </View>
          </ThemedView>
        </View>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              Cancel Subscription
            </ThemedText>
            <ThemedText style={[styles.modalDescription, { color: palette.muted }]}>
              Are you sure you want to cancel your {getFrequencyLabel(recurring.frequency).toLowerCase()}{' '}
              sessions with {recurring.coachName}? This cannot be undone.
            </ThemedText>

            <TextInput
              style={[
                styles.reasonInput,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                  color: palette.foreground,
                },
              ]}
              placeholder="Reason for cancelling (optional)"
              placeholderTextColor={palette.muted}
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
            />

            <View style={styles.modalActions}>
              <Button variant="outline" onPress={() => setShowCancelModal(false)}>
                Go Back
              </Button>
              <Button
                onPress={handleCancelConfirm}
                disabled={actionLoading}
                style={{ backgroundColor: palette.error }}
              >
                {actionLoading ? 'Cancelling...' : 'Cancel Subscription'}
              </Button>
            </View>
          </ThemedView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  sessionType: {
    ...Typography.small,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  statusText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  scheduleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  scheduleText: {
    ...Typography.small,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  locationText: {
    ...Typography.small,
    flex: 1,
  },
  athleteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
    alignSelf: 'flex-start',
  },
  athleteText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.xs,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...Typography.body,
    fontWeight: '600',
  },
  statLabel: {
    ...Typography.caption,
  },
  reasonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
  },
  reasonText: {
    ...Typography.small,
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
  },
  actionButtonText: {
    ...Typography.small,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: Components.modal.maxWidth,
    borderRadius: Components.modal.borderRadius,
    padding: Components.modal.padding,
    gap: Spacing.md,
  },
  modalTitle: {
    textAlign: 'center',
  },
  modalDescription: {
    textAlign: 'center',
    ...Typography.body,
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    minHeight: 80,
    textAlignVertical: 'top',
    ...Typography.body,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
});
