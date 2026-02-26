import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { FootballSkill, PositionRole, QuickRateInput } from '@/types/progress-types';
import type { QuickRateAthlete } from '@/hooks/use-quick-rate';
import { HapticPatterns } from '@/utils/haptics';
import { QuickRateCard } from './quick-rate-card';

interface QuickRateStepProps {
  athletes: QuickRateAthlete[];
  ratingsByAthleteId: Record<string, QuickRateInput>;
  currentIndex: number;
  isPrefilling: boolean;
  onIndexChange: (index: number) => void;
  onPositionChange: (athleteId: string, position: PositionRole) => void;
  onSkillChange: (athleteId: string, skill: FootballSkill, value: number) => void;
  onEffortChange: (athleteId: string, value: number) => void;
  onBadgePress: (athleteId: string) => void;
  onMediaIdsChange: (athleteId: string, mediaIds: string[]) => void;
  onSkipAll: () => void;
  isSubmitting?: boolean;
}

interface QuickRatePagerItemProps {
  athlete: QuickRateAthlete;
  rating: QuickRateInput | null;
  width: number;
  onPositionChange: (athleteId: string, position: PositionRole) => void;
  onSkillChange: (athleteId: string, skill: FootballSkill, value: number) => void;
  onEffortChange: (athleteId: string, value: number) => void;
  onBadgePress: (athleteId: string) => void;
  onMediaIdsChange: (athleteId: string, mediaIds: string[]) => void;
}

const QuickRatePagerItem = memo(function QuickRatePagerItem({
  athlete,
  rating,
  width,
  onPositionChange,
  onSkillChange,
  onEffortChange,
  onBadgePress,
  onMediaIdsChange,
}: QuickRatePagerItemProps) {
  if (!rating) {
    return (
      <View style={[styles.cardWrap, { width }]}>
        <SurfaceCard>
          <ThemedText style={styles.loadingText}>Loading athlete rating...</ThemedText>
        </SurfaceCard>
      </View>
    );
  }

  return (
    <View style={[styles.cardWrap, { width }]}>
      <QuickRateCard
        athleteName={athlete.athleteName}
        rating={rating}
        onPositionChange={(position) => onPositionChange(athlete.athleteId, position)}
        onSkillChange={(skill, value) => onSkillChange(athlete.athleteId, skill, value)}
        onEffortChange={(value) => onEffortChange(athlete.athleteId, value)}
        onBadgePress={() => onBadgePress(athlete.athleteId)}
        onMediaIdsChange={(mediaIds) => onMediaIdsChange(athlete.athleteId, mediaIds)}
      />
    </View>
  );
});

export const QuickRateStep = memo(function QuickRateStep({
  athletes,
  ratingsByAthleteId,
  currentIndex,
  isPrefilling,
  onIndexChange,
  onPositionChange,
  onSkillChange,
  onEffortChange,
  onBadgePress,
  onMediaIdsChange,
  onSkipAll,
  isSubmitting = false,
}: QuickRateStepProps) {
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const flatListRef = useRef<FlatList<QuickRateAthlete>
        accessibilityRole="list">(null);
  const previousIndexRef = useRef(currentIndex);
  const cardWidth = useMemo(() => Math.max(windowWidth - Spacing.md * 2, 280), [windowWidth]);

  // Time tracker
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (athletes.length > 0 && !timerRef.current) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [athletes.length]);

  const ratedCount = useMemo(() => {
    let count = 0;
    for (const athlete of athletes) {
      const rating = ratingsByAthleteId[athlete.athleteId];
      const hasSkillChange = (rating?.positionSkillRatings ?? []).some((entry) => entry.rating !== 3);
      if (rating && hasSkillChange) {
        count++;
      }
    }
    return count;
  }, [athletes, ratingsByAthleteId]);

  const clampedIndex = Math.max(0, Math.min(currentIndex, Math.max(athletes.length - 1, 0)));
  const canGoPrev = clampedIndex > 0;
  const canGoNext = clampedIndex < athletes.length - 1;

  useEffect(() => {
    previousIndexRef.current = clampedIndex;
  }, [clampedIndex]);

  const scrollToIndex = useCallback(
    (index: number) => {
      const nextIndex = Math.max(0, Math.min(index, Math.max(athletes.length - 1, 0)));
      flatListRef.current?.scrollToOffset({
        offset: nextIndex * cardWidth,
        animated: true,
      });
      onIndexChange(nextIndex);
      if (nextIndex !== previousIndexRef.current) {
        previousIndexRef.current = nextIndex;
        void HapticPatterns.tap();
      }
    },
    [athletes.length, cardWidth, onIndexChange],
  );

  const handleMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const rawIndex = Math.round(event.nativeEvent.contentOffset.x / cardWidth);
      const nextIndex = Math.max(0, Math.min(rawIndex, Math.max(athletes.length - 1, 0)));
      onIndexChange(nextIndex);
      if (nextIndex !== previousIndexRef.current) {
        previousIndexRef.current = nextIndex;
        void HapticPatterns.tap();
      }
    },
    [athletes.length, cardWidth, onIndexChange],
  );

  const renderItem = useCallback<ListRenderItem<QuickRateAthlete>>(
    ({ item }) => (
      <QuickRatePagerItem
        athlete={item}
        rating={ratingsByAthleteId[item.athleteId] ?? null}
        width={cardWidth}
        onPositionChange={onPositionChange}
        onSkillChange={onSkillChange}
        onEffortChange={onEffortChange}
        onBadgePress={onBadgePress}
        onMediaIdsChange={onMediaIdsChange}
      />
    ),
    [
      cardWidth,
      onBadgePress,
      onPositionChange,
      onSkillChange,
      onEffortChange,
      onMediaIdsChange,
      ratingsByAthleteId,
    ],
  );

  if (athletes.length === 0) {
    return (
      <SurfaceCard>
        <ThemedText style={[styles.emptyText, { color: colors.muted }]}>
          No present athletes to rate.
        </ThemedText>
      </SurfaceCard>
    );
  }

  return (
    <Column gap="sm">
      <Row align="center" justify="between">
        <Column gap="xxs">
          <ThemedText style={styles.title}>Quick Rate</ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.muted }]}>
            {ratedCount}/{athletes.length} athletes · {elapsedSeconds}s
          </ThemedText>
        </Column>
        <ThemedText style={[styles.counter, { color: colors.muted }]}>
          {clampedIndex + 1}/{athletes.length}
        </ThemedText>
      </Row>

      {isPrefilling && (
        <ThemedText style={[styles.prefillText, { color: colors.muted }]}>
          Pulling previous ratings...
        </ThemedText>
      )}

      <FlatList
        accessibilityRole="list"
        ref={flatListRef}
        data={athletes}
        horizontal
        pagingEnabled
        snapToAlignment="center"
        decelerationRate="fast"
        keyExtractor={(item) => item.athleteId}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        getItemLayout={(_, index) => ({
          length: cardWidth,
          offset: cardWidth * index,
          index,
        })}
      />

      <Row align="center" justify="center" gap="xxs">
        {athletes.map((athlete, index) => {
          const isActive = index === clampedIndex;
          return (
            <View
              key={`${athlete.athleteId}-dot`}
              style={[
                styles.pagerDot,
                {
                  backgroundColor: isActive ? colors.tint : withAlpha(colors.tint, 0.2),
                },
              ]}
            />
          );
        })}
      </Row>

      <Row align="center" justify="between">
        <Clickable
          style={styles.skipButton}
          onPress={onSkipAll}
          disabled={isSubmitting}
          accessibilityLabel="Skip quick rate step"
          accessibilityRole="button"
        >
          <ThemedText style={[styles.skipText, { color: colors.muted }]}>
            {isSubmitting ? 'Saving...' : 'Skip All'}
          </ThemedText>
        </Clickable>

        <Row gap="xs">
          <Clickable
            style={[styles.navButton, { borderColor: colors.border }]}
            onPress={() => scrollToIndex(clampedIndex - 1)}
            disabled={!canGoPrev || isSubmitting}
            accessibilityLabel="Show previous athlete"
            accessibilityRole="button"
          >
            <ThemedText style={[styles.navText, { color: colors.text }]}>Previous</ThemedText>
          </Clickable>

          <Clickable
            style={[
              styles.navButton,
              {
                borderColor: colors.tint,
                backgroundColor: withAlpha(colors.tint, 0.1),
              },
            ]}
            onPress={() => scrollToIndex(clampedIndex + 1)}
            disabled={!canGoNext || isSubmitting}
            accessibilityLabel="Show next athlete"
            accessibilityRole="button"
          >
            <ThemedText style={[styles.navText, { color: colors.tint }]}>
              {isSubmitting ? 'Saving...' : 'Next'}
            </ThemedText>
          </Clickable>
        </Row>
      </Row>
    </Column>
  );
});

const styles = StyleSheet.create({
  cardWrap: {
    paddingHorizontal: Spacing.xxs,
  },
  title: {
    ...Typography.subheading,
  },
  subtitle: {
    ...Typography.caption,
  },
  counter: {
    ...Typography.bodySmallSemiBold,
  },
  prefillText: {
    ...Typography.caption,
  },
  pagerDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.pill,
  },
  navButton: {
    minHeight: 44,
    minWidth: 90,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    ...Typography.bodySmallSemiBold,
  },
  skipButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  skipText: {
    ...Typography.bodySmallSemiBold,
  },
  emptyText: {
    ...Typography.bodySmall,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  loadingText: {
    ...Typography.bodySmall,
    paddingVertical: Spacing.md,
    textAlign: 'center',
  },
});
