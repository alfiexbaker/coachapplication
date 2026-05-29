import React from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import { StyleSheet } from 'react-native';

import type { CoachOfferingSummary } from '@/utils/coach-profile-offerings';
import type { Coach } from '@/services/coach-service';
import type { SessionOffering } from '@/constants/types';
import { Spacing } from '@/constants/theme';

import { CoachOfferingsShowcase } from './coach-offerings-showcase';

interface CoachDetailSessionsProps {
  coach: Coach;
  sessionOfferings: SessionOffering[];
  offeringSummary: CoachOfferingSummary;
  onBook: () => void;
  onOfferingPress: (offering: SessionOffering) => void;
}

export const CoachDetailSessions = function CoachDetailSessions({
  coach,
  sessionOfferings,
  offeringSummary,
  onBook,
  onOfferingPress,
}: CoachDetailSessionsProps) {
  return (
    <Animated.View entering={FadeIn} style={styles.tabContent}>
      <CoachOfferingsShowcase
        minPrice={coach.minPrice}
        maxPrice={coach.maxPrice}
        nextAvailable={coach.nextAvailable}
        sessionOfferings={sessionOfferings}
        offeringSummary={offeringSummary}
        onOfferingPress={onOfferingPress}
        onPrimaryAction={onBook}
        primaryActionLabel="Book this coach"
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  tabContent: { padding: Spacing.lg, gap: Spacing.md },
});
