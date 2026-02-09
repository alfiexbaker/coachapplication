import { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/useTheme';

import {
  type WelcomeStep,
  WelcomeStepSlide,
  WelcomeBottomControls,
  styles,
} from './welcome-flow-sections';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Types ──────────────────────────────────────────────────────

export interface WelcomeFlowProps {
  clubName: string;
  clubColor?: string;
  squadNames?: string[];
  upcomingEvents?: { title: string; date: string }[];
  coaches?: { name: string; role: string }[];
  onComplete: () => void;
  onSkip?: () => void;
}

// ─── Component ──────────────────────────────────────────────────

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
      title: "You're All Set",
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

  const goToStep = useCallback((step: number) => {
    scrollRef.current?.scrollTo({ x: step * SCREEN_WIDTH, animated: true });
    setCurrentStep(step);
  }, []);

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
      {!isLastStep ? (
        <Pressable style={styles.skipButton} onPress={handleSkip}>
          <ThemedText style={[styles.skipText, { color: palette.muted }]}>Skip</ThemedText>
        </Pressable>
      ) : null}

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
          <WelcomeStepSlide
            key={step.key}
            step={step}
            squadNames={squadNames}
            upcomingEvents={upcomingEvents}
            coaches={coaches}
            brandColor={brandColor}
            palette={palette}
          />
        ))}
      </ScrollView>

      <WelcomeBottomControls
        steps={steps}
        currentStep={currentStep}
        isLastStep={isLastStep}
        brandColor={brandColor}
        onNext={handleNext}
        palette={palette}
      />
    </View>
  );
}
