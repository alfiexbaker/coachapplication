import React from 'react';
import { View, StyleSheet, FlatList, type ListRenderItemInfo } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { SquadInviteHistoryEntry } from '@/constants/types';

interface SquadInviteHistoryProps {
  history: SquadInviteHistoryEntry[];
}

export const SquadInviteHistory = function SquadInviteHistory({
  history,
}: SquadInviteHistoryProps) {
  const { colors: palette } = useTheme();

  if (history.length === 0) return null;
  const inviteItems = getSquadInviteHistoryItems(history, palette);

  return (
    <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
        Recent Invites
      </ThemedText>
      <FlatList
        horizontal
        data={inviteItems}
        keyExtractor={keySquadInviteHistoryItem}
        renderItem={renderSquadInviteHistoryItem}
        showsHorizontalScrollIndicator={false}
      />
    </Animated.View>
  );
};

interface SquadInviteHistoryItem {
  key: string;
  title: string;
  inviteCount: number;
  acceptedCount: number;
  sentAt: string;
  surface: string;
  border: string;
  muted: string;
}

function getSquadInviteHistoryItems(
  history: SquadInviteHistoryEntry[],
  palette: ReturnType<typeof useTheme>['colors'],
): SquadInviteHistoryItem[] {
  return history.slice(0, 3).map((entry) => ({
    key: entry.id,
    title: entry.sessionType || entry.sessionId,
    inviteCount: entry.inviteCount,
    acceptedCount: entry.acceptedCount,
    sentAt: entry.sentAt,
    surface: palette.surface,
    border: palette.border,
    muted: palette.muted,
  }));
}

function keySquadInviteHistoryItem(item: SquadInviteHistoryItem) {
  return item.key;
}

function renderSquadInviteHistoryItem({ item }: ListRenderItemInfo<SquadInviteHistoryItem>) {
  return (
    <View style={[styles.card, { backgroundColor: item.surface, borderColor: item.border }]}>
      <ThemedText type="defaultSemiBold" numberOfLines={1} style={{ ...Typography.small }}>
        {item.title}
      </ThemedText>
      <ThemedText style={[styles.meta, { color: item.muted }]}>
        {item.inviteCount} sent {'\u2022'} {item.acceptedCount} accepted
      </ThemedText>
      <ThemedText style={[styles.date, { color: item.muted }]}>
        {new Date(item.sentAt).toLocaleDateString('en-GB', {
          month: 'short',
          day: 'numeric',
        })}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: Spacing.lg, gap: Spacing.sm },
  sectionTitle: { ...Typography.body, marginBottom: Spacing.xs },
  card: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginRight: Spacing.sm,
    minWidth: 160,
    gap: Spacing.xxs,
  },
  meta: { ...Typography.caption },
  date: { ...Typography.micro },
});
