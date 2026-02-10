import { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Components, Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { TOTAL_SCREENS } from './parent-welcome-data';
import { WelcomePage, ChildDetailsPage, CoachResultsPage } from './parent-welcome-screens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ParentWelcomeProps {
  childName?: string;
  onComplete: () => void;
  onSkip?: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ParentWelcome({
  childName = 'your child',
  onComplete,
  onSkip,
}: ParentWelcomeProps) {
  const { colors: palette } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // Form state
  const [selectedAge, setSelectedAge] = useState<number | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentPage(page);
  }, []);

  const goToPage = useCallback((page: number) => {
    scrollRef.current?.scrollTo({ x: page * SCREEN_WIDTH, animated: true });
  }, []);

  const handleNext = useCallback(() => {
    if (currentPage < TOTAL_SCREENS - 1) {
      goToPage(currentPage + 1);
    } else {
      onComplete();
    }
  }, [currentPage, goToPage, onComplete]);

  const toggleArea = useCallback((label: string) => {
    setSelectedAreas((prev) =>
      prev.includes(label) ? prev.filter((a) => a !== label) : [...prev, label],
    );
  }, []);

  const isLastPage = currentPage === TOTAL_SCREENS - 1;

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        <WelcomePage childName={childName} />
        <ChildDetailsPage
          childName={childName}
          selectedAge={selectedAge}
          onAgeSelect={setSelectedAge}
          selectedLevel={selectedLevel}
          onLevelSelect={setSelectedLevel}
          selectedAreas={selectedAreas}
          onToggleArea={toggleArea}
        />
        <CoachResultsPage />
      </ScrollView>

      {/* Bottom controls */}
      <View style={[styles.bottomBar, { borderTopColor: palette.border }]}>
        <Row justify="center" align="center" gap="xs">
          {Array.from({ length: TOTAL_SCREENS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === currentPage ? palette.tint : palette.border,
                  width: i === currentPage ? Spacing.sm : Spacing.xs,
                },
              ]}
            />
          ))}
        </Row>

        <Row align="center" justify="space-between">
          {onSkip && currentPage < TOTAL_SCREENS - 1 ? (
            <Clickable onPress={onSkip} style={styles.skipButton}>
              <ThemedText style={[Typography.bodySemiBold, { color: palette.muted }]}>
                Skip
              </ThemedText>
            </Clickable>
          ) : (
            <View style={styles.skipButton} />
          )}

          <Clickable
            onPress={handleNext}
            style={[styles.nextButton, { backgroundColor: palette.tint }]}
          >
            <ThemedText style={[Typography.bodySemiBold, { color: palette.onPrimary }]}>
              {isLastPage ? 'Done' : 'Next'}
            </ThemedText>
            {!isLastPage && (
              <Ionicons name="arrow-forward" size={Components.icon.md} color={palette.onPrimary} />
            )}
          </Clickable>
        </Row>
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bottomBar: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  dotsRow: {
    // layout moved to Row
  },
  dot: {
    height: Spacing.xs,
    borderRadius: Radii.pill,
  },
  buttonsRow: {
    // layout moved to Row
  },
  skipButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    minWidth: 60,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: Components.button.height,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.button,
    gap: Spacing.xs,
  },
});
