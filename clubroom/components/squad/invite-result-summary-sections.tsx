import React, { memo } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import type { ThemeColors } from '@/hooks/useTheme';

import type { StatusConfig } from './invite-result-config';
import { styles } from './invite-result-styles';

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
