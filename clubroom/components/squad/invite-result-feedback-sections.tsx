import React, { memo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Typography, withAlpha } from '@/constants/theme';
import type { BulkInviteResult } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';

import { styles } from './invite-result-styles';

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
      <Clickable onPress={() => setShowDetails(!showDetails)}>
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
          <ThemedText style={[styles.primaryButtonText, { color: palette.onPrimary }]}>
            Done
          </ThemedText>
        </Clickable>
      )}
    </Row>
  );
});

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
          backgroundColor: isSuccess
            ? withAlpha(palette.success, 0.12)
            : withAlpha(palette.warning, 0.12),
        },
      ]}
    >
      <Ionicons
        name={isSuccess ? 'checkmark-circle' : 'warning'}
        size={18}
        color={isSuccess ? palette.success : palette.warning}
      />
      <ThemedText
        style={[styles.compactText, { color: isSuccess ? palette.success : palette.warning }]}
      >
        {result.sent} invite{result.sent !== 1 ? 's' : ''} sent
        {result.failed > 0 && `, ${result.failed} failed`}
      </ThemedText>
      {onDismiss && (
        <Clickable onPress={onDismiss} hitSlop={8}>
          <Ionicons name="close" size={16} color={isSuccess ? palette.success : palette.warning} />
        </Clickable>
      )}
    </Row>
  );
});

export const inviteResultCardStyles = StyleSheet.create({
  card: { gap: 16 },
});
