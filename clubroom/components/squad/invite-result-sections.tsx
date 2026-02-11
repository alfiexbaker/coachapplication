/**
 * Extracted sub-components for InviteResultCard.
 *
 * InviteStatusHeader — icon + title + subtitle based on result status.
 * InviteContextRow — squad/session context labels.
 * InviteStatsBreakdown — sent/failed/skipped dots + counts.
 * InviteErrorDetails — expandable error list.
 * InviteActionRow — view/retry/done action buttons.
 * CompactInviteResultInner — compact inline result banner.
 */

import React, { memo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { BulkInviteResult } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';

// ─── Status Config ───────────────────────────────────────────────────────────

export interface StatusConfig {
  icon: 'checkmark-circle' | 'close-circle' | 'warning';
  color: string;
  bgColor: string;
  title: string;
  subtitle: string;
}

export function getStatusConfig(result: BulkInviteResult, palette: ThemeColors): StatusConfig {
  const { sent, failed, skipped, totalAttempted } = result;
  const isFullSuccess = failed === 0 && skipped === 0;
  const isFullFailure = sent === 0 && totalAttempted > 0;

  if (isFullSuccess) {
    return {
      icon: 'checkmark-circle',
      color: palette.success,
      bgColor: withAlpha(palette.success, 0.12),
      title: 'All Invites Sent!',
      subtitle: `${sent} invite${sent !== 1 ? 's' : ''} sent successfully`,
    };
  }
  if (isFullFailure) {
    return {
      icon: 'close-circle',
      color: palette.error,
      bgColor: withAlpha(palette.error, 0.12),
      title: 'Invites Failed',
      subtitle: 'Unable to send invites. Please try again.',
    };
  }
  return {
    icon: 'warning',
    color: palette.warning,
    bgColor: withAlpha(palette.warning, 0.12),
    title: 'Partially Sent',
    subtitle: `${sent} sent, ${failed} failed${skipped > 0 ? `, ${skipped} skipped` : ''}`,
  };
}

// ─── InviteStatusHeader ──────────────────────────────────────────────────────

interface InviteStatusHeaderProps {
  config: StatusConfig;
  palette: ThemeColors;
}

export const InviteStatusHeader = memo(function InviteStatusHeader({
  config,
  palette,
}: InviteStatusHeaderProps) {
  return (
    <Row align="center" gap="md">
      <View style={[styles.statusIcon, { backgroundColor: config.bgColor }]}>
        <Ionicons name={config.icon} size={32} color={config.color} />
      </View>
      <View style={styles.statusText}>
        <ThemedText type="subtitle">{config.title}</ThemedText>
        <ThemedText style={[styles.subtitleText, { color: palette.muted }]}>
          {config.subtitle}
        </ThemedText>
      </View>
    </Row>
  );
});

// ─── InviteContextRow ────────────────────────────────────────────────────────

interface InviteContextRowProps {
  squadName?: string;
  sessionTitle?: string;
  palette: ThemeColors;
}

export const InviteContextRow = memo(function InviteContextRow({
  squadName,
  sessionTitle,
  palette,
}: InviteContextRowProps) {
  if (!squadName && !sessionTitle) return null;

  return (
    <Row wrap gap="md" style={[styles.contextRow, { borderTopColor: palette.border }]}>
      {squadName && (
        <Row align="center" gap="xs">
          <Ionicons name="people" size={14} color={palette.muted} />
          <ThemedText style={[styles.contextText, { color: palette.muted }]}>
            {squadName}
          </ThemedText>
        </Row>
      )}
      {sessionTitle && (
        <Row align="center" gap="xs">
          <Ionicons name="calendar" size={14} color={palette.muted} />
          <ThemedText style={[styles.contextText, { color: palette.muted }]} numberOfLines={1}>
            {sessionTitle}
          </ThemedText>
        </Row>
      )}
    </Row>
  );
});

// ─── InviteStatsBreakdown ────────────────────────────────────────────────────

interface InviteStatsBreakdownProps {
  sent: number;
  failed: number;
  skipped: number;
  palette: ThemeColors;
}

export const InviteStatsBreakdown = memo(function InviteStatsBreakdown({
  sent,
  failed,
  skipped,
  palette,
}: InviteStatsBreakdownProps) {
  return (
    <Row justify="start" gap="lg">
      <Row align="center" gap="xs">
        <View style={[styles.statDot, { backgroundColor: palette.success }]} />
        <ThemedText style={styles.statValue}>{sent}</ThemedText>
        <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Sent</ThemedText>
      </Row>
      {failed > 0 && (
        <Row align="center" gap="xs">
          <View style={[styles.statDot, { backgroundColor: palette.error }]} />
          <ThemedText style={styles.statValue}>{failed}</ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Failed</ThemedText>
        </Row>
      )}
      {skipped > 0 && (
        <Row align="center" gap="xs">
          <View style={[styles.statDot, { backgroundColor: palette.warning }]} />
          <ThemedText style={styles.statValue}>{skipped}</ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Skipped</ThemedText>
        </Row>
      )}
    </Row>
  );
});

// ─── InviteErrorDetails ──────────────────────────────────────────────────────

interface InviteErrorDetailsProps {
  errors: BulkInviteResult['errors'];
  palette: ThemeColors;
}

export const InviteErrorDetails = memo(function InviteErrorDetails({
  errors,
  palette,
}: InviteErrorDetailsProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (errors.length === 0) return null;

  return (
    <View style={styles.errorSection}>
      <Clickable
        onPress={() => setShowDetails(!showDetails)}
      >
        <Row align="center" gap="xs">
          <Ionicons
            name={showDetails ? 'chevron-down' : 'chevron-forward'}
            size={16}
            color={palette.error}
          />
          <ThemedText style={[styles.errorToggleText, { color: palette.error }]}>
            View {errors.length} error{errors.length !== 1 ? 's' : ''}
          </ThemedText>
        </Row>
      </Clickable>

      {showDetails && (
        <Animated.View entering={FadeInUp.duration(200)} style={styles.errorList}>
          {errors.map((error, index) => (
            <View
              key={`${error.memberId}-${index}`}
              style={[styles.errorItem, { backgroundColor: withAlpha(palette.error, 0.03) }]}
            >
              <ThemedText type="defaultSemiBold" style={{ ...Typography.small }}>
                {error.memberId}
              </ThemedText>
              <ThemedText style={[styles.errorMessage, { color: palette.muted }]}>
                {error.error}
              </ThemedText>
            </View>
          ))}
        </Animated.View>
      )}
    </View>
  );
});

// ─── InviteActionRow ─────────────────────────────────────────────────────────

interface InviteActionRowProps {
  sent: number;
  failed: number;
  failedMemberIds: string[];
  onViewInvites?: () => void;
  onRetryFailed?: (failedMemberIds: string[]) => void;
  onDone?: () => void;
  palette: ThemeColors;
}

export const InviteActionRow = memo(function InviteActionRow({
  sent,
  failed,
  failedMemberIds,
  onViewInvites,
  onRetryFailed,
  onDone,
  palette,
}: InviteActionRowProps) {
  return (
    <Row wrap gap="sm" style={styles.actionRow}>
      {onViewInvites && sent > 0 && (
        <Clickable
          onPress={onViewInvites}
          style={[styles.actionButton, { borderColor: palette.tint }]}
        >
          <Row align="center" gap="xs">
            <Ionicons name="eye-outline" size={16} color={palette.tint} />
            <ThemedText style={[styles.actionButtonText, { color: palette.tint }]}>
              View Invites
            </ThemedText>
          </Row>
        </Clickable>
      )}

      {onRetryFailed && failed > 0 && (
        <Clickable
          onPress={() => onRetryFailed(failedMemberIds)}
          style={[styles.actionButton, { borderColor: palette.warning }]}
        >
          <Row align="center" gap="xs">
            <Ionicons name="refresh" size={16} color={palette.warning} />
            <ThemedText style={[styles.actionButtonText, { color: palette.warning }]}>
              Retry Failed
            </ThemedText>
          </Row>
        </Clickable>
      )}

      {onDone && (
        <Clickable
          onPress={onDone}
          style={[styles.primaryButton, { backgroundColor: palette.tint }]}
        >
          <ThemedText style={[styles.primaryButtonText, { color: palette.onPrimary }]}>Done</ThemedText>
        </Clickable>
      )}
    </Row>
  );
});

// ─── CompactInviteResultInner ────────────────────────────────────────────────

interface CompactInviteResultInnerProps {
  result: BulkInviteResult;
  onDismiss?: () => void;
  palette: ThemeColors;
}

export const CompactInviteResultInner = memo(function CompactInviteResultInner({
  result,
  onDismiss,
  palette,
}: CompactInviteResultInnerProps) {
  const isSuccess = result.failed === 0;

  return (
    <Row
      align="center"
      gap="sm"
      style={[
        styles.compactContainer,
        {
          backgroundColor: isSuccess ? withAlpha(palette.success, 0.12) : withAlpha(palette.warning, 0.12),
        },
      ]}
    >
      <Ionicons
        name={isSuccess ? 'checkmark-circle' : 'warning'}
        size={18}
        color={isSuccess ? palette.success : palette.warning}
      />
      <ThemedText
        style={[
          styles.compactText,
          { color: isSuccess ? palette.success : palette.warning },
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
            color={isSuccess ? palette.success : palette.warning}
          />
        </Clickable>
      )}
    </Row>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  statusIcon: {
    width: 56,
    height: 56,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    flex: 1,
    gap: Spacing.micro,
  },
  subtitleText: { ...Typography.small },
  contextRow: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  contextText: { ...Typography.caption },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
  },
  statValue: { ...Typography.subheading },
  statLabel: { ...Typography.caption },
  errorSection: {
    gap: Spacing.xs,
  },
  errorToggleText: { ...Typography.smallSemiBold },
  errorList: {
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  errorItem: {
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    gap: Spacing.micro,
  },
  errorMessage: { ...Typography.caption },
  actionRow: {
    marginTop: Spacing.xs,
  },
  actionButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  actionButtonText: { ...Typography.smallSemiBold },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    minWidth: 100,
  },
  primaryButtonText: { ...Typography.bodySmallSemiBold },
  compactContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  compactText: { ...Typography.smallSemiBold, flex: 1 },
});
