/**
 * Invite Result Card Component
 *
 * Displays the results of a bulk invite operation.
 * Shows:
 * - Success/failure counts
 * - Breakdown of sent, failed, and skipped invites
 * - Error details for failed invites
 * - Actions (view invites, retry failed, done)
 */

import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { BulkInviteResult, SquadInvitedMember } from '@/constants/types';

interface InviteResultCardProps {
  result: BulkInviteResult;
  invitedMembers?: SquadInvitedMember[];
  squadName?: string;
  sessionTitle?: string;
  onViewInvites?: () => void;
  onRetryFailed?: (failedMemberIds: string[]) => void;
  onDone?: () => void;
  showDetails?: boolean;
}

export function InviteResultCard({
  result,
  invitedMembers = [],
  squadName,
  sessionTitle,
  onViewInvites,
  onRetryFailed,
  onDone,
  showDetails = true,
}: InviteResultCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [showErrorDetails, setShowErrorDetails] = useState(false);

  const { sent, failed, skipped, totalAttempted, errors } = result;

  // Determine overall status
  const isFullSuccess = failed === 0 && skipped === 0;
  const isFullFailure = sent === 0 && totalAttempted > 0;

  const getStatusConfig = () => {
    if (isFullSuccess) {
      return {
        icon: 'checkmark-circle' as const,
        color: palette.success || '#10B981',
        bgColor: '#D1FAE5',
        title: 'All Invites Sent!',
        subtitle: `${sent} invite${sent !== 1 ? 's' : ''} sent successfully`,
      };
    }
    if (isFullFailure) {
      return {
        icon: 'close-circle' as const,
        color: palette.error,
        bgColor: '#FEE2E2',
        title: 'Invites Failed',
        subtitle: 'Unable to send invites. Please try again.',
      };
    }
    return {
      icon: 'warning' as const,
      color: palette.warning,
      bgColor: '#FEF3C7',
      title: 'Partially Sent',
      subtitle: `${sent} sent, ${failed} failed${skipped > 0 ? `, ${skipped} skipped` : ''}`,
    };
  };

  const statusConfig = getStatusConfig();

  const failedMemberIds = invitedMembers
    .filter((m) => m.status === 'FAILED')
    .map((m) => m.memberId);

  return (
    <Animated.View entering={FadeInDown.springify()}>
      <SurfaceCard style={styles.card}>
        {/* Status header */}
        <View style={styles.statusHeader}>
          <View style={[styles.statusIcon, { backgroundColor: statusConfig.bgColor }]}>
            <Ionicons name={statusConfig.icon} size={32} color={statusConfig.color} />
          </View>
          <View style={styles.statusText}>
            <ThemedText type="subtitle">{statusConfig.title}</ThemedText>
            <ThemedText style={[styles.subtitleText, { color: palette.muted }]}>
              {statusConfig.subtitle}
            </ThemedText>
          </View>
        </View>

        {/* Context info */}
        {(squadName || sessionTitle) && (
          <View style={[styles.contextRow, { borderTopColor: palette.border }]}>
            {squadName && (
              <View style={styles.contextItem}>
                <Ionicons name="people" size={14} color={palette.muted} />
                <ThemedText style={[styles.contextText, { color: palette.muted }]}>
                  {squadName}
                </ThemedText>
              </View>
            )}
            {sessionTitle && (
              <View style={styles.contextItem}>
                <Ionicons name="calendar" size={14} color={palette.muted} />
                <ThemedText style={[styles.contextText, { color: palette.muted }]} numberOfLines={1}>
                  {sessionTitle}
                </ThemedText>
              </View>
            )}
          </View>
        )}

        {/* Stats breakdown */}
        {showDetails && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: palette.success || '#10B981' }]} />
              <ThemedText style={styles.statValue}>{sent}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Sent</ThemedText>
            </View>
            {failed > 0 && (
              <View style={styles.statItem}>
                <View style={[styles.statDot, { backgroundColor: palette.error }]} />
                <ThemedText style={styles.statValue}>{failed}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Failed</ThemedText>
              </View>
            )}
            {skipped > 0 && (
              <View style={styles.statItem}>
                <View style={[styles.statDot, { backgroundColor: palette.warning }]} />
                <ThemedText style={styles.statValue}>{skipped}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Skipped</ThemedText>
              </View>
            )}
          </View>
        )}

        {/* Error details (expandable) */}
        {errors.length > 0 && showDetails && (
          <View style={styles.errorSection}>
            <Clickable
              onPress={() => setShowErrorDetails(!showErrorDetails)}
              style={styles.errorToggle}
            >
              <Ionicons
                name={showErrorDetails ? 'chevron-down' : 'chevron-forward'}
                size={16}
                color={palette.error}
              />
              <ThemedText style={[styles.errorToggleText, { color: palette.error }]}>
                View {errors.length} error{errors.length !== 1 ? 's' : ''}
              </ThemedText>
            </Clickable>

            {showErrorDetails && (
              <Animated.View entering={FadeInUp.duration(200)} style={styles.errorList}>
                {errors.map((error, index) => (
                  <View
                    key={`${error.memberId}-${index}`}
                    style={[styles.errorItem, { backgroundColor: `${palette.error}08` }]}
                  >
                    <ThemedText type="defaultSemiBold" style={{ fontSize: 13 }}>
                      {error.athleteName}
                    </ThemedText>
                    <ThemedText style={[styles.errorMessage, { color: palette.muted }]}>
                      {error.error}
                    </ThemedText>
                  </View>
                ))}
              </Animated.View>
            )}
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actionRow}>
          {onViewInvites && sent > 0 && (
            <Clickable
              onPress={onViewInvites}
              style={[styles.actionButton, { borderColor: palette.tint }]}
            >
              <Ionicons name="eye-outline" size={16} color={palette.tint} />
              <ThemedText style={[styles.actionButtonText, { color: palette.tint }]}>
                View Invites
              </ThemedText>
            </Clickable>
          )}

          {onRetryFailed && failed > 0 && (
            <Clickable
              onPress={() => onRetryFailed(failedMemberIds)}
              style={[styles.actionButton, { borderColor: palette.warning }]}
            >
              <Ionicons name="refresh" size={16} color={palette.warning} />
              <ThemedText style={[styles.actionButtonText, { color: palette.warning }]}>
                Retry Failed
              </ThemedText>
            </Clickable>
          )}

          {onDone && (
            <Clickable
              onPress={onDone}
              style={[styles.primaryButton, { backgroundColor: palette.tint }]}
            >
              <ThemedText style={styles.primaryButtonText}>Done</ThemedText>
            </Clickable>
          )}
        </View>
      </SurfaceCard>
    </Animated.View>
  );
}

/**
 * Compact version for inline result display
 */
interface CompactInviteResultProps {
  result: BulkInviteResult;
  onDismiss?: () => void;
}

export function CompactInviteResult({ result, onDismiss }: CompactInviteResultProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const isSuccess = result.failed === 0;

  return (
    <Animated.View
      entering={FadeInDown.duration(200)}
      style={[
        styles.compactContainer,
        {
          backgroundColor: isSuccess ? '#D1FAE5' : '#FEF3C7',
        },
      ]}
    >
      <Ionicons
        name={isSuccess ? 'checkmark-circle' : 'warning'}
        size={18}
        color={isSuccess ? '#10B981' : palette.warning}
      />
      <ThemedText
        style={[
          styles.compactText,
          { color: isSuccess ? '#065F46' : '#92400E' },
        ]}
      >
        {result.sent} invite{result.sent !== 1 ? 's' : ''} sent
        {result.failed > 0 && `, ${result.failed} failed`}
      </ThemedText>
      {onDismiss && (
        <Clickable onPress={onDismiss} hitSlop={8}>
          <Ionicons
            name="close"
            size={16}
            color={isSuccess ? '#065F46' : '#92400E'}
          />
        </Clickable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.md,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  statusIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    flex: 1,
    gap: 2,
  },
  subtitleText: {
    fontSize: 13,
  },
  contextRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  contextItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  contextText: {
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: Spacing.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
  },
  errorSection: {
    gap: Spacing.xs,
  },
  errorToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  errorToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  errorList: {
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  errorItem: {
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    gap: 2,
  },
  errorMessage: {
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    minWidth: 100,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  compactText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
});
