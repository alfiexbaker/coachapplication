import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Typography } from '@/constants/theme';
import type { Coach } from '@/services/coach-service';
import type { SessionOffering } from '@/constants/types';
import type { CoachOfferingSummary } from '@/utils/coach-profile-offerings';
import { useTheme } from '@/hooks/useTheme';

import { CoachOfferingsShowcase } from './coach-offerings-showcase';

interface PublicProfileAboutProps {
  coach: Coach;
  sessionOfferings: SessionOffering[];
  offeringSummary: CoachOfferingSummary;
  onOfferingPress: (offering: SessionOffering) => void;
  onBook: () => void;
}

export const PublicProfileAbout = function PublicProfileAbout({
  coach,
  sessionOfferings,
  offeringSummary,
  onOfferingPress,
  onBook,
}: PublicProfileAboutProps) {
  const { colors: palette } = useTheme();

  return (
    <Animated.View entering={FadeIn} style={styles.container}>
      {coach.bio ? (
        <SurfaceCard style={styles.section}>
          <ThemedText style={[Typography.heading, { color: palette.text }]}>About</ThemedText>
          <ThemedText style={[Typography.body, { color: palette.text, marginTop: Spacing.xs }]}>
            {coach.bio}
          </ThemedText>
        </SurfaceCard>
      ) : null}

      <CoachOfferingsShowcase
        minPrice={coach.minPrice}
        maxPrice={coach.maxPrice}
        nextAvailable={coach.nextAvailable}
        sessionOfferings={sessionOfferings}
        offeringSummary={offeringSummary}
        onOfferingPress={onOfferingPress}
        onPrimaryAction={onBook}
        primaryActionLabel="Book a session"
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { padding: Spacing.md, gap: Spacing.md },
  section: { gap: Spacing.sm },
});
