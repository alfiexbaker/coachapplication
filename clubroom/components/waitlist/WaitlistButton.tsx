import { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface WaitlistButtonProps {
  /** Whether the user is already on the waitlist */
  isOnWaitlist: boolean;
  /** Current position if on waitlist */
  position?: number;
  /** Total number of people on waitlist */
  totalWaiting?: number;
  /** Whether auto-book is enabled */
  autoBook?: boolean;
  /** Callback when joining waitlist */
  onJoinWaitlist: (autoBook: boolean) => Promise<void>;
  /** Callback when leaving waitlist */
  onLeaveWaitlist: () => Promise<void>;
  /** Callback when toggling auto-book */
  onToggleAutoBook?: (enabled: boolean) => Promise<void>;
  /** Whether the button is in a loading state */
  loading?: boolean;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Compact mode for smaller displays */
  compact?: boolean;
}

export function WaitlistButton({
  isOnWaitlist,
  position,
  totalWaiting,
  autoBook = false,
  onJoinWaitlist,
  onLeaveWaitlist,
  onToggleAutoBook,
  loading = false,
  disabled = false,
  compact = false,
}: WaitlistButtonProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [showOptions, setShowOptions] = useState(false);
  const [localAutoBook, setLocalAutoBook] = useState(autoBook);
  const [actionLoading, setActionLoading] = useState(false);

  const handleJoin = async () => {
    setActionLoading(true);
    try {
      await onJoinWaitlist(localAutoBook);
    } finally {
      setActionLoading(false);
      setShowOptions(false);
    }
  };

  const handleLeave = async () => {
    setActionLoading(true);
    try {
      await onLeaveWaitlist();
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleAutoBook = async (value: boolean) => {
    setLocalAutoBook(value);
    if (isOnWaitlist && onToggleAutoBook) {
      try {
        await onToggleAutoBook(value);
      } catch {
        setLocalAutoBook(!value); // Revert on error
      }
    }
  };

  const isLoading = loading || actionLoading;

  if (isOnWaitlist) {
    return (
      <View style={styles.container}>
        <View
          style={[
            styles.onWaitlistCard,
            compact ? styles.onWaitlistCardCompact : undefined,
            { backgroundColor: `${palette.warning}10`, borderColor: palette.warning },
          ]}
        >
          <View style={styles.waitlistInfo}>
            <View style={styles.positionBadge}>
              <Ionicons name="time" size={14} color={palette.warning} />
              <ThemedText style={[styles.positionText, { color: palette.warning }]}>
                {position ? `#${position}` : 'On waitlist'}
                {totalWaiting && totalWaiting > 1 ? ` of ${totalWaiting}` : ''}
              </ThemedText>
            </View>
            {!compact && (
              <ThemedText style={[styles.waitlistLabel, { color: palette.muted }]}>
                You&apos;re on the waitlist
              </ThemedText>
            )}
          </View>

          <View style={styles.waitlistActions}>
            {onToggleAutoBook && (
              <View style={styles.autoBookToggle}>
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
                  onValueChange={handleToggleAutoBook}
                  trackColor={{ false: palette.border, true: `${palette.success}50` }}
                  thumbColor={localAutoBook ? palette.success : palette.muted}
                  ios_backgroundColor={palette.border}
                  style={styles.switch}
                />
              </View>
            )}

            <Clickable
              onPress={handleLeave}
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
          </View>
        </View>
      </View>
    );
  }

  if (showOptions) {
    return (
      <View style={styles.container}>
        <View style={[styles.optionsCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <ThemedText type="defaultSemiBold" style={styles.optionsTitle}>
            Join Waitlist
          </ThemedText>

          <Clickable
            onPress={() => handleToggleAutoBook(!localAutoBook)}
            style={styles.autoBookOption}
          >
            <View style={styles.autoBookOptionContent}>
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
            </View>
          </Clickable>

          <View style={styles.optionsButtons}>
            <Clickable
              onPress={() => setShowOptions(false)}
              style={[styles.cancelButton, { borderColor: palette.border }]}
            >
              <ThemedText style={{ color: palette.muted }}>Cancel</ThemedText>
            </Clickable>
            <Clickable
              onPress={handleJoin}
              disabled={isLoading}
              style={[styles.confirmButton, { backgroundColor: palette.warning }]}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <ThemedText style={styles.confirmButtonText}>Join Waitlist</ThemedText>
              )}
            </Clickable>
          </View>
        </View>
      </View>
    );
  }

  const joinButtonStyle = compact
    ? [styles.joinButton, styles.joinButtonCompact, { backgroundColor: palette.warning }]
    : [styles.joinButton, { backgroundColor: palette.warning }];

  return (
    <Clickable
      onPress={() => setShowOptions(true)}
      disabled={isLoading || disabled}
      style={joinButtonStyle}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <>
          <Ionicons name="add" size={compact ? 16 : 18} color="#fff" />
          <ThemedText style={styles.joinButtonText}>
            {compact ? 'Waitlist' : 'Join Waitlist'}
          </ThemedText>
          {totalWaiting !== undefined && totalWaiting > 0 && (
            <View style={[styles.countBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <ThemedText style={styles.countText}>{totalWaiting}</ThemedText>
            </View>
          )}
        </>
      )}
    </Clickable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
  },
  joinButtonCompact: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  countText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  onWaitlistCard: {
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  onWaitlistCardCompact: {
    padding: Spacing.xs,
  },
  waitlistInfo: {
    gap: 2,
  },
  positionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  positionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  waitlistLabel: {
    fontSize: 12,
  },
  waitlistActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  autoBookToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  autoBookLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  switch: {
    transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }],
    marginLeft: -4,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  leaveButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  optionsCard: {
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  optionsTitle: {
    fontSize: 16,
  },
  autoBookOption: {
    padding: Spacing.sm,
    borderRadius: Radii.sm,
  },
  autoBookOptionContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  autoBookOptionText: {
    flex: 1,
    gap: 2,
  },
  autoBookDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  optionsButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
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
    color: '#fff',
    fontWeight: '600',
  },
});
