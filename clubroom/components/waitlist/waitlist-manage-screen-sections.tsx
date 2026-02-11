import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { WaitlistManage } from '@/components/waitlist/WaitlistManage';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { WaitlistEntry, WaitlistSummary } from '@/constants/types';

type HeaderProps = {
  colors: ThemeColors;
  totalWaiting: number;
  summariesCount: number;
  onBack: () => void;
};

export const WaitlistManageHeader = React.memo(function WaitlistManageHeader({
  colors,
  totalWaiting,
  summariesCount,
  onBack,
}: HeaderProps) {
  return (
    <Row align="center" gap="md" style={styles.header}>
      <Clickable onPress={onBack} hitSlop={8} accessibilityLabel="Go back">
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </Clickable>
      <View style={styles.headerTitle}>
        <ThemedText type="title">Manage Waitlists</ThemedText>
        <ThemedText style={[styles.subtitle, { color: colors.muted }]}> 
          {totalWaiting === 0
            ? 'No one waiting'
            : `${totalWaiting} ${totalWaiting === 1 ? 'person' : 'people'} across ${summariesCount} ${summariesCount === 1 ? 'session' : 'sessions'}`}
        </ThemedText>
      </View>
    </Row>
  );
});

type SessionListProps = {
  summaries: WaitlistSummary[];
  selectedSession: string | null;
  sessionEntries: WaitlistEntry[];
  actionLoading: string | null;
  onToggle: (sessionId: string) => void;
  onNotify: (sessionId: string) => void;
  onPromote: (sessionId: string) => void;
  onRemove: (entryId: string, userName: string) => void;
};

export const WaitlistSessionList = React.memo(function WaitlistSessionList({
  summaries,
  selectedSession,
  sessionEntries,
  actionLoading,
  onToggle,
  onNotify,
  onPromote,
  onRemove,
}: SessionListProps) {
  return (
    <View style={styles.list}>
      {summaries.map((summary, index) => (
        <Animated.View key={summary.sessionId} entering={FadeInDown.delay(index * 50).springify()}>
          <WaitlistManage
            summary={summary}
            entries={selectedSession === summary.sessionId ? sessionEntries : []}
            isExpanded={selectedSession === summary.sessionId}
            isLoading={actionLoading === summary.sessionId}
            onToggleExpand={() => onToggle(summary.sessionId)}
            onNotifyNext={() => onNotify(summary.sessionId)}
            onPromote={() => onPromote(summary.sessionId)}
            onRemoveEntry={(entryId, userName) => onRemove(entryId, userName)}
          />
        </Animated.View>
      ))}
    </View>
  );
});

type QuickActionsProps = {
  colors: ThemeColors;
  summaries: WaitlistSummary[];
  onNotify: (sessionId: string) => void;
};

export const WaitlistQuickActions = React.memo(function WaitlistQuickActions({
  colors,
  summaries,
  onNotify,
}: QuickActionsProps) {
  if (summaries.length === 0) return null;

  return (
    <View style={[styles.quickActions, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
      <ThemedText type="defaultSemiBold" style={styles.quickActionsTitle}>Quick Actions</ThemedText>
      <Row gap="sm" style={styles.actionButtons}>
        <Clickable
          onPress={() => summaries.forEach((summary) => onNotify(summary.sessionId))}
          style={[styles.actionButton, { backgroundColor: withAlpha(colors.tint, 0.06) }]}
          accessibilityLabel="Notify all next"
        >
          <Row align="center" gap="xs">
            <Ionicons name="notifications-outline" size={18} color={colors.tint} />
            <ThemedText style={[styles.actionButtonText, { color: colors.tint }]}>Notify All Next</ThemedText>
          </Row>
        </Clickable>
      </Row>
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    flex: 1,
  },
  subtitle: {
    ...Typography.small,
    marginTop: Spacing.micro,
  },
  list: {
    gap: Spacing.md,
  },
  quickActions: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  quickActionsTitle: {
    marginBottom: Spacing.sm,
  },
  actionButtons: {},
  actionButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.sm,
  },
  actionButtonText: {
    ...Typography.smallSemiBold,
  },
});
