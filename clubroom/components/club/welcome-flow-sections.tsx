/**
 * Extracted sub-components for WelcomeFlow.
 *
 * WelcomeStepSlide — single carousel page with icon + title + subtitle + list.
 * WelcomeBottomControls — dot indicators + next/get started button.
 */

import React, { memo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Components, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WelcomeStep {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

// ─── StepListContent ─────────────────────────────────────────────────────────

interface StepListContentProps {
  stepKey: string;
  squadNames: string[];
  upcomingEvents: { title: string; date: string }[];
  coaches: { name: string; role: string }[];
  brandColor: string;
  palette: ThemeColors;
}

const StepListContent = memo(function StepListContent({
  stepKey,
  squadNames,
  upcomingEvents,
  coaches,
  brandColor,
  palette,
}: StepListContentProps) {
  if (stepKey === 'squad' && squadNames.length > 0) {
    return (
      <View style={styles.listContainer}>
        {squadNames.map((name) => (
          <Row key={name} style={[styles.listItem, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Ionicons name="people" size={Components.icon.md} color={brandColor} />
            <ThemedText style={[styles.listItemText, { color: palette.text }]}>{name}</ThemedText>
          </Row>
        ))}
      </View>
    );
  }

  if (stepKey === 'upcoming' && upcomingEvents.length > 1) {
    return (
      <View style={styles.listContainer}>
        {upcomingEvents.slice(0, 3).map((event, idx) => (
          <Row key={idx} style={[styles.listItem, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Ionicons name="calendar" size={Components.icon.md} color={brandColor} />
            <View style={styles.listItemInner}>
              <ThemedText style={[styles.listItemText, { color: palette.text }]}>{event.title}</ThemedText>
              <ThemedText style={[styles.listItemSub, { color: palette.muted }]}>{event.date}</ThemedText>
            </View>
          </Row>
        ))}
      </View>
    );
  }

  if (stepKey === 'coaches' && coaches.length > 0) {
    return (
      <View style={styles.listContainer}>
        {coaches.map((coach, idx) => (
          <Row key={idx} style={[styles.listItem, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Ionicons name="shield" size={Components.icon.md} color={brandColor} />
            <View style={styles.listItemInner}>
              <ThemedText style={[styles.listItemText, { color: palette.text }]}>{coach.name}</ThemedText>
              <ThemedText style={[styles.listItemSub, { color: palette.muted }]}>{coach.role}</ThemedText>
            </View>
          </Row>
        ))}
      </View>
    );
  }

  return null;
});

// ─── WelcomeStepSlide ────────────────────────────────────────────────────────

interface WelcomeStepSlideProps {
  step: WelcomeStep;
  squadNames: string[];
  upcomingEvents: { title: string; date: string }[];
  coaches: { name: string; role: string }[];
  brandColor: string;
  palette: ThemeColors;
}

export const WelcomeStepSlide = memo(function WelcomeStepSlide({
  step,
  squadNames,
  upcomingEvents,
  coaches,
  brandColor,
  palette,
}: WelcomeStepSlideProps) {
  return (
    <View style={[styles.stepContainer, { width: SCREEN_WIDTH }]}>
      <View style={[styles.iconCircle, { backgroundColor: withAlpha(brandColor, 0.09) }]}>
        <Ionicons name={step.icon} size={48} color={brandColor} />
      </View>
      <ThemedText style={[styles.stepTitle, { color: palette.text }]}>{step.title}</ThemedText>
      <ThemedText style={[styles.stepSubtitle, { color: palette.muted }]}>{step.subtitle}</ThemedText>

      <StepListContent
        stepKey={step.key}
        squadNames={squadNames}
        upcomingEvents={upcomingEvents}
        coaches={coaches}
        brandColor={brandColor}
        palette={palette}
      />
    </View>
  );
});

// ─── WelcomeBottomControls ───────────────────────────────────────────────────

interface WelcomeBottomControlsProps {
  steps: WelcomeStep[];
  currentStep: number;
  isLastStep: boolean;
  brandColor: string;
  onNext: () => void;
  palette: ThemeColors;
}

export const WelcomeBottomControls = memo(function WelcomeBottomControls({
  steps,
  currentStep,
  isLastStep,
  brandColor,
  onNext,
  palette,
}: WelcomeBottomControlsProps) {
  return (
    <View style={styles.bottomControls}>
      {/* Dot indicators */}
      <Row style={styles.dotRow}>
        {steps.map((_, idx) => (
          <View
            key={idx}
            style={[
              styles.dot,
              {
                backgroundColor: idx === currentStep ? brandColor : palette.border,
                width: idx === currentStep ? Spacing.md : Spacing.xs,
              },
            ]}
          />
        ))}
      </Row>

      {/* Next / Get Started button */}
      <Clickable
        onPress={onNext}
        accessibilityLabel={isLastStep ? 'Get Started' : 'Next'}
        accessibilityRole="button"
        style={styles.nextButton(brandColor)}
      >
        <ThemedText style={[styles.nextButtonText, { color: palette.onPrimary }]}>
          {isLastStep ? 'Get Started' : 'Next'}
        </ThemedText>
        {!isLastStep ? (
          <Ionicons name="arrow-forward" size={Components.icon.md} color={palette.onPrimary} />
        ) : null}
      </Clickable>
    </View>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: Spacing.xl + Spacing.lg,
    right: Spacing.md,
    zIndex: 10,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  skipText: {
    ...Typography.bodySemiBold,
  },
  scrollView: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: Radii['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  stepTitle: {
    ...Typography.title,
    textAlign: 'center',
  },
  stepSubtitle: {
    ...Typography.body,
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
  },
  listContainer: {
    width: '100%',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  listItem: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  listItemInner: {
    flex: 1,
  },
  listItemText: {
    ...Typography.bodySemiBold,
  },
  listItemSub: {
    ...Typography.small,
  },
  bottomControls: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
    alignItems: 'center',
  },
  dotRow: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  dot: {
    height: Spacing.xs,
    borderRadius: Radii.pill,
  },
  nextButtonText: {
    ...Typography.bodySemiBold,
  },
}) as any;

// Dynamic style — can't be in StyleSheet.create
(styles as any).nextButton = (brandColor: string) => ({
  backgroundColor: brandColor,
  height: Components.button.height,
  borderRadius: Radii.button,
  paddingHorizontal: Spacing.lg,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  alignSelf: 'stretch' as const,
  gap: Spacing.xs,
});
