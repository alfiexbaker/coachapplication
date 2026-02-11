/**
 * CoachWelcome — Composition root.
 * 5-screen onboarding wizard: value prop → profile → rate → availability → ready.
 */
import { View, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Components, Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useCoachWelcome } from '@/hooks/use-coach-welcome';
import { TOTAL_SCREENS } from './coach-welcome-data';
import {
  ValuePropScreen,
  ProfileSetupScreen,
  RateScreen,
  AvailabilityScreen,
  ReadyScreen,
} from './coach-welcome-screens';

export interface CoachWelcomeProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export function CoachWelcome({ onComplete, onSkip }: CoachWelcomeProps) {
  const { colors: palette } = useTheme();
  const w = useCoachWelcome(onComplete);

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView
        ref={w.scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={w.handleScroll}
        scrollEventThrottle={16}
      >
        <ValuePropScreen />
        <ProfileSetupScreen
          headline={w.headline}
          onHeadlineChange={w.setHeadline}
          bio={w.bio}
          onBioChange={w.setBio}
          selectedSpecialties={w.selectedSpecialties}
          onToggleSpecialty={w.toggleSpecialty}
        />
        <RateScreen rate={w.rate} onRateChange={w.setRate} />
        <AvailabilityScreen availability={w.availability} onToggle={w.toggleAvailability} />
        <ReadyScreen />
      </ScrollView>

      <View style={[styles.bottomBar, { borderTopColor: palette.border }]}>
        <Row justify="center" align="center" gap="xs">
          {Array.from({ length: TOTAL_SCREENS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === w.currentPage ? palette.tint : palette.border,
                  width: i === w.currentPage ? Spacing.sm : Spacing.xs,
                },
              ]}
            />
          ))}
        </Row>
        <Row align="center" justify="space-between">
          {onSkip && w.currentPage < TOTAL_SCREENS - 1 ? (
            <Clickable onPress={onSkip} style={styles.skipButton}>
              <ThemedText style={[Typography.bodySemiBold, { color: palette.muted }]}>
                Skip
              </ThemedText>
            </Clickable>
          ) : (
            <View style={styles.skipButton} />
          )}
          <Clickable
            onPress={w.handleNext}
            style={[styles.nextButton, { backgroundColor: palette.tint }]}
          >
            <ThemedText style={[Typography.bodySemiBold, { color: palette.onPrimary }]}>
              {w.isLastPage ? 'Done' : 'Next'}
            </ThemedText>
            {!w.isLastPage && (
              <Ionicons name="arrow-forward" size={Components.icon.md} color={palette.onPrimary} />
            )}
          </Clickable>
        </Row>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bottomBar: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  dotsRow: {
    /* layout moved to Row */
  },
  dot: { height: Spacing.xs, borderRadius: Radii.pill },
  buttonsRow: {
    /* layout moved to Row */
  },
  skipButton: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm, minWidth: 60 },
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
