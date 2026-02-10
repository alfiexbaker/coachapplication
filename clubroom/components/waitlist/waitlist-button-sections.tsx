/**
 * Extracted sub-components for WaitlistButton.
 *
 * OnWaitlistCard — shows position, auto-book toggle, leave button.
 * WaitlistOptionsCard — join confirmation with auto-book checkbox.
 * JoinWaitlistButton — initial CTA to open options.
 */

import React, { memo } from 'react';
import { View, StyleSheet, ActivityIndicator, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Row } from '@/components/primitives/row';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

// ─── OnWaitlistCard ───────────────────────────────────────────────────────────

interface OnWaitlistCardProps {
  position?: number;
  totalWaiting?: number;
  compact: boolean;
  localAutoBook: boolean;
  onToggleAutoBook?: (value: boolean) => void;
  onLeave: () => void;
  isLoading: boolean;
  disabled: boolean;
  showAutoBookToggle: boolean;
  palette: ThemeColors;
}

export const OnWaitlistCard = memo(function OnWaitlistCard({
  position,
  totalWaiting,
  compact,
  localAutoBook,
  onToggleAutoBook,
  onLeave,
  isLoading,
  disabled,
  showAutoBookToggle,
  palette,
}: OnWaitlistCardProps) {
  return (
    <View style={styles.container}>
      <Row
        align="center"
        justify="space-between"
        style={[
          styles.onWaitlistCard,
          compact ? styles.onWaitlistCardCompact : undefined,
          { backgroundColor: withAlpha(palette.warning, 0.06), borderColor: palette.warning },
        ]}
      >
        <View style={styles.waitlistInfo}>
          <Row align="center" gap="xxs">
            <Ionicons name="time" size={14} color={palette.warning} />
            <ThemedText style={[styles.positionText, { color: palette.warning }]}>
              {position ? `#${position}` : 'On waitlist'}
              {totalWaiting && totalWaiting > 1 ? ` of ${totalWaiting}` : ''}
            </ThemedText>
          </Row>
          {!compact && (
            <ThemedText style={[styles.waitlistLabel, { color: palette.muted }]}>
              You&apos;re on the waitlist
            </ThemedText>
          )}
        </View>

        <Row align="center" gap="sm">
          {showAutoBookToggle && onToggleAutoBook && (
            <Row align="center" gap="xxs">
              <Ionicons
                name={localAutoBook ? 'flash' : 'flash-outline'}
                size={14}
                color={localAutoBook ? palette.success : palette.muted}
              />
              <ThemedText
                style={[
                  styles.autoBookLabel,
                  { color: localAutoBook ? palette.success : palette.muted },
                ]}
              >
                Auto
              </ThemedText>
              <Switch
                value={localAutoBook}
                onValueChange={onToggleAutoBook}
                trackColor={{ false: palette.border, true: withAlpha(palette.success, 0.31) }}
                thumbColor={localAutoBook ? palette.success : palette.muted}
                ios_backgroundColor={palette.border}
                style={styles.switch}
              />
            </Row>
          )}

          <Clickable
            onPress={onLeave}
            disabled={isLoading || disabled}
            style={[
              styles.leaveButton,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={palette.error} />
            ) : (
              <>
                <Ionicons name="close" size={14} color={palette.error} />
                {!compact && (
                  <ThemedText style={[styles.leaveButtonText, { color: palette.error }]}>
                    Leave
                  </ThemedText>
                )}
              </>
            )}
          </Clickable>
        </Row>
      </Row>
    </View>
  );
});

// ─── WaitlistOptionsCard ──────────────────────────────────────────────────────

interface WaitlistOptionsCardProps {
  localAutoBook: boolean;
  onToggleAutoBook: (value: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  palette: ThemeColors;
}

export const WaitlistOptionsCard = memo(function WaitlistOptionsCard({
  localAutoBook,
  onToggleAutoBook,
  onCancel,
  onConfirm,
  isLoading,
  palette,
}: WaitlistOptionsCardProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.optionsCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <ThemedText type="defaultSemiBold" style={styles.optionsTitle}>
          Join Waitlist
        </ThemedText>

        <Clickable
          onPress={() => onToggleAutoBook(!localAutoBook)}
          style={styles.autoBookOption}
        >
          <Row align="flex-start" gap="sm">
            <Ionicons
              name={localAutoBook ? 'checkbox' : 'square-outline'}
              size={20}
              color={localAutoBook ? palette.tint : palette.muted}
            />
            <View style={styles.autoBookOptionText}>
              <ThemedText type="defaultSemiBold">Auto-book when available</ThemedText>
              <ThemedText style={[styles.autoBookDescription, { color: palette.muted }]}>
                Automatically book the spot when one opens up
              </ThemedText>
            </View>
          </Row>
        </Clickable>

        <Row gap="sm">
          <Clickable
            onPress={onCancel}
            style={[styles.cancelButton, { borderColor: palette.border }]}
          >
            <ThemedText style={{ color: palette.muted }}>Cancel</ThemedText>
          </Clickable>
          <Clickable
            onPress={onConfirm}
            disabled={isLoading}
            style={[styles.confirmButton, { backgroundColor: palette.warning }]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={palette.onPrimary} />
            ) : (
              <ThemedText style={[styles.confirmButtonText, { color: palette.onPrimary }]}>Join Waitlist</ThemedText>
            )}
          </Clickable>
        </Row>
      </View>
    </View>
  );
});

// ─── JoinWaitlistButton ───────────────────────────────────────────────────────

interface JoinWaitlistButtonProps {
  onPress: () => void;
  isLoading: boolean;
  disabled: boolean;
  compact: boolean;
  totalWaiting?: number;
  palette: ThemeColors;
}

export const JoinWaitlistButton = memo(function JoinWaitlistButton({
  onPress,
  isLoading,
  disabled,
  compact,
  totalWaiting,
  palette,
}: JoinWaitlistButtonProps) {
  const joinButtonStyle = compact
    ? [styles.joinButton, styles.joinButtonCompact, { backgroundColor: palette.warning }]
    : [styles.joinButton, { backgroundColor: palette.warning }];

  return (
    <Clickable
      onPress={onPress}
      disabled={isLoading || disabled}
      style={joinButtonStyle}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={palette.onPrimary} />
      ) : (
        <>
          <Ionicons name="add" size={compact ? 16 : 18} color={palette.onPrimary} />
          <ThemedText style={[styles.joinButtonText, { color: palette.onPrimary }]}>
            {compact ? 'Waitlist' : 'Join Waitlist'}
          </ThemedText>
          {totalWaiting !== undefined && totalWaiting > 0 && (
            <View style={[styles.countBadge, { backgroundColor: withAlpha(palette.onPrimary, 0.2) }]}>
              <ThemedText style={[styles.countText, { color: palette.onPrimary }]}>{totalWaiting}</ThemedText>
            </View>
          )}
        </>
      )}
    </Clickable>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

export const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
  },
  joinButtonCompact: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  joinButtonText: { ...Typography.bodySmallSemiBold },
  countBadge: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.md,
    marginLeft: Spacing.xxs,
  },
  countText: { ...Typography.caption },
  onWaitlistCard: {
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: Spacing.sm,
  },
  onWaitlistCardCompact: {
    padding: Spacing.xs,
  },
  waitlistInfo: {
    gap: Spacing.micro,
  },
  positionBadge: { /* layout moved to Row */ },
  positionText: { ...Typography.smallSemiBold },
  waitlistLabel: { ...Typography.caption },
  waitlistActions: { /* layout moved to Row */ },
  autoBookToggle: { /* layout moved to Row */ },
  autoBookLabel: { ...Typography.caption },
  switch: {
    transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }],
    marginLeft: -4,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.xxs,
    paddingHorizontal: 10,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  leaveButtonText: { ...Typography.caption },
  optionsCard: {
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  optionsTitle: { ...Typography.subheading },
  autoBookOption: {
    padding: Spacing.sm,
    borderRadius: Radii.sm,
  },
  autoBookOptionContent: { /* layout moved to Row */ },
  autoBookOptionText: {
    flex: 1,
    gap: Spacing.micro,
  },
  autoBookDescription: { ...Typography.caption, lineHeight: 16 },
  optionsButtons: { /* layout moved to Row */ },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  confirmButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  confirmButtonText: {
    fontWeight: '600',
  },
});
