import { memo, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { LeaderboardEntry } from '@/hooks/use-squad-leaderboard';

type Category = 'streak' | 'sessions' | 'badges';

interface SquadLeaderboardProps {
  entries: LeaderboardEntry[];
  myRank: Record<Category, number>;
  athleteId: string | null;
}

interface CategoryConfig {
  label: string;
  icon: string;
  key: keyof LeaderboardEntry;
  suffix: string;
  color: string;
}

const CATEGORIES: Record<Category, CategoryConfig> = {
  streak: { label: 'Streak', icon: 'flame-outline', key: 'streakWeeks', suffix: 'wk', color: '#FF6B35' },
  sessions: { label: 'Sessions', icon: 'calendar-outline', key: 'totalSessions', suffix: '', color: '#3B82F6' },
  badges: { label: 'Badges', icon: 'ribbon-outline', key: 'badgeCount', suffix: '', color: '#8B5CF6' },
};

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

export const SquadLeaderboard = memo(function SquadLeaderboard({
  entries,
  myRank,
  athleteId,
}: SquadLeaderboardProps) {
  const { colors } = useTheme();
  const [activeCategory, setActiveCategory] = useState<Category>('streak');

  const config = CATEGORIES[activeCategory];

  const ranked = useMemo(() => {
    return [...entries]
      .sort((a, b) => (b[config.key] as number) - (a[config.key] as number))
      .slice(0, 5);
  }, [entries, config.key]);

  const rank = myRank[activeCategory];

  if (entries.length === 0) return null;

  return (
    <SurfaceCard style={styles.card}>
      <Column gap="sm">
        <Row align="center" justify="between">
          <Column gap="micro">
            <ThemedText style={styles.title}>Squad Rankings</ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.muted }]}>
              {rank > 0 ? `You're #${rank} for ${config.label}` : 'See how you compare'}
            </ThemedText>
          </Column>
          <Ionicons name="podium-outline" size={20} color={colors.muted} />
        </Row>

        <Row gap="xs">
          {(Object.keys(CATEGORIES) as Category[]).map((cat) => {
            const c = CATEGORIES[cat];
            const active = cat === activeCategory;
            return (
              <Clickable
                key={cat}
                onPress={() => setActiveCategory(cat)}
                style={[
                  styles.categoryTab,
                  {
                    backgroundColor: active ? withAlpha(c.color, 0.15) : withAlpha(colors.surface, 0.6),
                    borderColor: active ? withAlpha(c.color, 0.35) : withAlpha(colors.border, 0.5),
                  },
                ]}
                accessibilityRole="tab"
                accessibilityLabel={`${c.label} leaderboard`}
              >
                <Ionicons
                  name={c.icon as React.ComponentProps<typeof Ionicons>['name']}
                  size={14}
                  color={active ? c.color : colors.muted}
                />
                <ThemedText
                  style={[
                    styles.categoryLabel,
                    { color: active ? c.color : colors.muted },
                  ]}
                >
                  {c.label}
                </ThemedText>
              </Clickable>
            );
          })}
        </Row>

        <Column gap="xxs">
          {ranked.map((entry, index) => {
            const isMe = entry.athleteId === athleteId;
            const value = entry[config.key] as number;
            const medal = index < 3 ? RANK_MEDALS[index] : null;
            return (
              <Animated.View
                key={entry.athleteId}
                entering={FadeInDown.delay(index * 60).springify()}
              >
                <Row
                  align="center"
                  gap="xs"
                  style={[
                    styles.row,
                    {
                      backgroundColor: isMe
                        ? withAlpha(config.color, 0.08)
                        : 'transparent',
                      borderColor: isMe
                        ? withAlpha(config.color, 0.2)
                        : 'transparent',
                    },
                  ]}
                >
                  <View style={styles.rankCol}>
                    {medal ? (
                      <ThemedText style={styles.medal}>{medal}</ThemedText>
                    ) : (
                      <ThemedText style={[styles.rankNumber, { color: colors.muted }]}>
                        {index + 1}
                      </ThemedText>
                    )}
                  </View>

                  <View
                    style={[
                      styles.avatar,
                      {
                        backgroundColor: isMe
                          ? withAlpha(config.color, 0.2)
                          : withAlpha(colors.border, 0.4),
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.avatarText,
                        { color: isMe ? config.color : colors.muted },
                      ]}
                    >
                      {entry.initials}
                    </ThemedText>
                  </View>

                  {isMe ? (
                    <ThemedText style={[styles.youLabel, { color: config.color }]}>You</ThemedText>
                  ) : (
                    <ThemedText style={[styles.initialsLabel, { color: colors.text }]}>
                      {entry.initials}
                    </ThemedText>
                  )}

                  <View style={styles.spacer} />

                  <ThemedText
                    style={[
                      styles.valueText,
                      { color: isMe ? config.color : colors.text },
                    ]}
                  >
                    {value}{config.suffix}
                  </ThemedText>
                </Row>
              </Animated.View>
            );
          })}
        </Column>
      </Column>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
  },
  title: {
    ...Typography.subheading,
    fontWeight: '700',
  },
  subtitle: {
    ...Typography.caption,
  },
  categoryTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: Radii.sm,
    borderWidth: 1,
    minHeight: 32,
  },
  categoryLabel: {
    ...Typography.micro,
    fontWeight: '600',
  },
  row: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  rankCol: {
    width: 22,
    alignItems: 'center',
  },
  medal: {
    fontSize: 14,
  },
  rankNumber: {
    ...Typography.caption,
    fontWeight: '600',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.micro,
    fontWeight: '700',
  },
  youLabel: {
    ...Typography.bodySmallSemiBold,
    fontWeight: '700',
  },
  initialsLabel: {
    ...Typography.bodySmall,
  },
  spacer: {
    flex: 1,
  },
  valueText: {
    ...Typography.bodySmallSemiBold,
    fontWeight: '700',
  },
});
