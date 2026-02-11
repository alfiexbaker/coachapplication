import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { GroupSession } from '@/constants/types';

type HeaderProps = {
  colors: ThemeColors;
  athleteName?: string;
  onClose: () => void;
};

export const AddToSessionHeader = React.memo(function AddToSessionHeader({
  colors,
  athleteName,
  onClose,
}: HeaderProps) {
  return (
    <Row
      align="center"
      justify="space-between"
      style={[styles.header, { borderBottomColor: colors.border }]}
    >
      <Clickable onPress={onClose} hitSlop={8} accessibilityLabel="Close">
        <Ionicons name="close" size={24} color={colors.text} />
      </Clickable>
      <View style={styles.headerCenter}>
        <ThemedText type="defaultSemiBold">Add to Session</ThemedText>
        <ThemedText style={[styles.athleteLabel, { color: colors.muted }]}>
          {athleteName || 'Athlete'}
        </ThemedText>
      </View>
      <View style={styles.headerSpacer} />
    </Row>
  );
});

type SessionCardProps = {
  colors: ThemeColors;
  session: GroupSession;
  index: number;
  isAdding: boolean;
  onAdd: (session: GroupSession) => void;
  formatDate: (value: string) => string;
};

export const AddToSessionCard = React.memo(function AddToSessionCard({
  colors,
  session,
  index,
  isAdding,
  onAdd,
  formatDate,
}: SessionCardProps) {
  const nextSchedule = session.schedule[0];
  const spotsLeft = session.maxParticipants - session.currentParticipants;

  return (
    <Animated.View entering={FadeInDown.delay(index * 50)}>
      <SurfaceCard style={styles.sessionCard}>
        <Row gap="md" style={styles.sessionHeader}>
          <View style={[styles.typeIcon, { backgroundColor: withAlpha(colors.tint, 0.09) }]}>
            <Ionicons
              name={session.sessionType === 'TEAM_TRAINING' ? 'fitness' : 'people'}
              size={20}
              color={colors.tint}
            />
          </View>
          <View style={styles.sessionInfo}>
            <ThemedText type="defaultSemiBold" numberOfLines={1}>
              {session.title}
            </ThemedText>
            <Row align="center" gap="xxs">
              <Ionicons name="calendar-outline" size={12} color={colors.muted} />
              <ThemedText style={[styles.metaText, { color: colors.muted }]}>
                {nextSchedule
                  ? `${formatDate(nextSchedule.date)} at ${nextSchedule.startTime}`
                  : 'No schedule'}
              </ThemedText>
            </Row>
            <Row align="center" gap="xxs">
              <Ionicons name="location-outline" size={12} color={colors.muted} />
              <ThemedText style={[styles.metaText, { color: colors.muted }]} numberOfLines={1}>
                {session.location}
              </ThemedText>
            </Row>
          </View>
        </Row>

        <Row align="center" justify="space-between">
          <View
            style={[
              styles.spotsBadge,
              {
                backgroundColor:
                  spotsLeft <= 3
                    ? withAlpha(colors.warning, 0.09)
                    : withAlpha(colors.success, 0.09),
              },
            ]}
          >
            <ThemedText
              style={[
                styles.spotsText,
                { color: spotsLeft <= 3 ? colors.warning : colors.success },
              ]}
            >
              {spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} left
            </ThemedText>
          </View>

          <Clickable
            style={[
              styles.addButton,
              { backgroundColor: colors.tint, opacity: isAdding ? 0.6 : 1 },
            ]}
            onPress={() => onAdd(session)}
            disabled={isAdding}
            accessibilityLabel={`Add ${session.title} session`}
          >
            <Row align="center" gap="xxs">
              <Ionicons name={isAdding ? 'hourglass' : 'add'} size={16} color={colors.onPrimary} />
              <ThemedText style={[styles.addButtonText, { color: colors.onPrimary }]}>
                {isAdding ? 'Adding...' : 'Add'}
              </ThemedText>
            </Row>
          </Clickable>
        </Row>
      </SurfaceCard>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerCenter: {
    alignItems: 'center',
  },
  athleteLabel: {
    ...Typography.small,
  },
  headerSpacer: {
    width: 24,
  },
  sessionCard: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  sessionHeader: {},
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionInfo: {
    flex: 1,
    gap: Spacing.xxs,
  },
  metaText: {
    ...Typography.caption,
  },
  spotsBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  spotsText: {
    ...Typography.caption,
  },
  addButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    minHeight: 44,
  },
  addButtonText: {
    ...Typography.bodySmallSemiBold,
  },
});
