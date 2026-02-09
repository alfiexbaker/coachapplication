import React, { memo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { SquadInviteHistoryEntry } from '@/constants/types';

interface SquadInviteHistoryProps {
  history: SquadInviteHistoryEntry[];
}

export const SquadInviteHistory = memo(function SquadInviteHistory({ history }: SquadInviteHistoryProps) {
  const { colors: palette } = useTheme();

  if (history.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Recent Invites</ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {history.slice(0, 3).map((entry) => (
          <View key={entry.id} style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <ThemedText type="defaultSemiBold" numberOfLines={1} style={{ ...Typography.small }}>{entry.sessionTitle}</ThemedText>
            <ThemedText style={[styles.meta, { color: palette.muted }]}>
              {entry.inviteCount} sent {'\u2022'} {entry.acceptedCount} accepted
            </ThemedText>
            <ThemedText style={[styles.date, { color: palette.muted }]}>
              {new Date(entry.sentAt).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
            </ThemedText>
          </View>
        ))}
      </ScrollView>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  section: { marginBottom: Spacing.lg, gap: Spacing.sm },
  sectionTitle: { ...Typography.body, marginBottom: Spacing.xs },
  card: { padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1, marginRight: Spacing.sm, minWidth: 160, gap: Spacing.xxs },
  meta: { ...Typography.caption },
  date: { ...Typography.micro },
});
