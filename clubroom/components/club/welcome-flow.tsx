import { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Pressable,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Components, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface WelcomeFlowProps {
  clubName: string;
  clubColor?: string;
  squadNames?: string[];
  upcomingEvents?: { title: string; date: string }[];
  coaches?: { name: string; role: string }[];
  onComplete: () => void;
  onSkip?: () => void;
}

interface WelcomeStep {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export function WelcomeFlow({
  clubName,
  clubColor,
  squadNames = [],
  upcomingEvents = [],
  coaches = [],
  onComplete,
  onSkip,
}: WelcomeFlowProps) {
  const { colors: palette } = useTheme();
  const brandColor = clubColor || palette.tint;

  const scrollRef = useRef<ScrollView>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const steps: WelcomeStep[] = [
    {
      key: 'welcome',
      title: `Welcome to ${clubName}`,
      subtitle: 'Your new home for training, matches, and staying connected with your team.',
      icon: 'home-outline',
    },
    {
      key: 'squad',
      title: 'Your Squads',
      subtitle: squadNames.length > 0
        ? `You are part of: ${squadNames.join(', ')}`
        : 'You will be assigned to a squad soon. Your coach will add you.',
      icon: 'people-outline',
    },
    {
      key: 'upcoming',
      title: 'Upcoming Events',
      subtitle: upcomingEvents.length > 0
        ? `Next up: ${upcomingEvents[0].title} on ${upcomingEvents[0].date}`
        : 'No events scheduled yet. Check back soon for training sessions and matches.',
      icon: 'calendar-outline',
    },
    {
      key: 'coaches',
      title: 'Meet Your Coaches',
      subtitle: coaches.length > 0
        ? coaches.map((c) => `${c.name} (${c.role})`).join(', ')
        : 'Your coaching team will introduce themselves soon.',
      icon: 'shield-outline',
    },
    {
      key: 'done',
      title: 'You\'re All Set',
      subtitle: 'Explore the club feed, check your schedule, and start connecting with your team.',
      icon: 'checkmark-circle-outline',
    },
  ];

  const totalSteps = steps.length;
  const isLastStep = currentStep === totalSteps - 1;

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const page = Math.round(offsetX / SCREEN_WIDTH);
      if (page !== currentStep && page >= 0 && page < totalSteps) {
        setCurrentStep(page);
      }
    },
    [currentStep, totalSteps],
  );

  const goToStep = useCallback(
    (step: number) => {
      scrollRef.current?.scrollTo({ x: step * SCREEN_WIDTH, animated: true });
      setCurrentStep(step);
    },
    [],
  );

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onComplete();
    } else {
      goToStep(currentStep + 1);
    }
  }, [currentStep, goToStep, isLastStep, onComplete]);

  const handleSkip = useCallback(() => {
    if (onSkip) {
      onSkip();
    } else {
      onComplete();
    }
  }, [onComplete, onSkip]);

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      {/* Skip button */}
      {!isLastStep ? (
        <Pressable style={styles.skipButton} onPress={handleSkip}>
          <ThemedText style={[styles.skipText, { color: palette.muted }]}>Skip</ThemedText>
        </Pressable>
      ) : null}

      {/* Carousel */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {steps.map((step) => (
          <View key={step.key} style={[styles.stepContainer, { width: SCREEN_WIDTH }]}>
            <View style={[styles.iconCircle, { backgroundColor: withAlpha(brandColor, 0.09) }]}>
              <Ionicons name={step.icon} size={48} color={brandColor} />
            </View>
            <ThemedText style={[styles.stepTitle, { color: palette.text }]}>{step.title}</ThemedText>
            <ThemedText style={[styles.stepSubtitle, { color: palette.muted }]}>{step.subtitle}</ThemedText>

            {/* Extra content per step */}
            {step.key === 'squad' && squadNames.length > 0 ? (
              <View style={styles.listContainer}>
                {squadNames.map((name) => (
                  <View key={name} style={[styles.listItem, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                    <Ionicons name="people" size={Components.icon.md} color={brandColor} />
                    <ThemedText style={[styles.listItemText, { color: palette.text }]}>{name}</ThemedText>
                  </View>
                ))}
              </View>
            ) : null}

            {step.key === 'upcoming' && upcomingEvents.length > 1 ? (
              <View style={styles.listContainer}>
                {upcomingEvents.slice(0, 3).map((event, idx) => (
                  <View key={idx} style={[styles.listItem, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                    <Ionicons name="calendar" size={Components.icon.md} color={brandColor} />
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[styles.listItemText, { color: palette.text }]}>{event.title}</ThemedText>
                      <ThemedText style={[styles.listItemSub, { color: palette.muted }]}>{event.date}</ThemedText>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {step.key === 'coaches' && coaches.length > 0 ? (
              <View style={styles.listContainer}>
                {coaches.map((coach, idx) => (
                  <View key={idx} style={[styles.listItem, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                    <Ionicons name="shield" size={Components.icon.md} color={brandColor} />
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[styles.listItemText, { color: palette.text }]}>{coach.name}</ThemedText>
                      <ThemedText style={[styles.listItemSub, { color: palette.muted }]}>{coach.role}</ThemedText>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>

      {/* Bottom controls */}
      <View style={styles.bottomControls}>
        {/* Dot indicators */}
        <View style={styles.dotRow}>
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
        </View>

        {/* Next / Get Started button */}
        <Clickable
          onPress={handleNext}
          accessibilityLabel={isLastStep ? 'Get Started' : 'Next'}
          accessibilityRole="button"
          style={{
            backgroundColor: brandColor,
            height: Components.button.height,
            borderRadius: Radii.button,
            paddingHorizontal: Spacing.lg,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            alignSelf: 'stretch',
            gap: Spacing.xs,
          }}
        >
          <ThemedText style={[styles.nextButtonText, { color: palette.onPrimary }]}>
            {isLastStep ? 'Get Started' : 'Next'}
          </ThemedText>
          {!isLastStep ? (
            <Ionicons name="arrow-forward" size={Components.icon.md} color={palette.onPrimary} />
          ) : null}
        </Clickable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    borderWidth: 1,
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
    flexDirection: 'row',
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
});
