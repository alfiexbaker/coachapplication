import { useState, useMemo, useCallback, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/useTheme';
import { discoverService } from '@/services/discover-service';
import type { CoachProfile } from '@/constants/types';

import {
  FindCoachSearchBar,
  FindCoachEmptyState,
  CoachResultCard,
  styles,
} from './find-coach-screen-sections';

type CoachWithDistance = {
  id: string;
  name: string;
  avatar?: string;
  postcode: string;
  distance: number;
  profile: {
    bio: string;
    rating: number;
    totalReviews: number;
    sessionRate: number;
    specialties: string[];
  };
};

const mapCoachToSearchResult = (coach: CoachProfile): CoachWithDistance => ({
  id: coach.id,
  name: coach.fullName,
  avatar: coach.profilePhotoUrl,
  postcode: '',
  distance: coach.distanceMiles,
  profile: {
    bio: coach.shortBio || coach.bio || 'No bio available',
    rating: coach.rating.average,
    totalReviews: coach.rating.reviewCount,
    sessionRate: coach.sessionRate ?? coach.priceRange.minUsd,
    specialties: coach.footballFocuses || [],
  },
});

// ─── Component ──────────────────────────────────────────────────

export function UserFindCoachScreen() {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();
  const [postcode, setPostcode] = useState('');
  const [allCoaches, setAllCoaches] = useState<CoachWithDistance[]>([]);

  useEffect(() => {
    let active = true;

    const loadCoaches = async () => {
      const result = await discoverService.getAllCoaches();
      if (!active) {
        return;
      }

      if (!result.success) {
        setAllCoaches([]);
        return;
      }

      setAllCoaches(result.data.map(mapCoachToSearchResult));
    };

    void loadCoaches();

    return () => {
      active = false;
    };
  }, []);

  const nearbyCoaches = useMemo(() => {
    if (!postcode || postcode.length < 3 || !currentUser) return [];

    return allCoaches
      .filter((coach) => coach.distance <= 5)
      .sort((a, b) => a.distance - b.distance);
  }, [allCoaches, postcode, currentUser]);

  const handlePostcodeChange = useCallback((value: string) => {
    const stripped = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!stripped) {
      setPostcode('');
      return;
    }

    const withSpace =
      stripped.length > 3
        ? `${stripped.slice(0, stripped.length - 3)} ${stripped.slice(-3)}`
        : stripped;
    setPostcode(withSpace);
  }, []);

  const handleClear = useCallback(() => setPostcode(''), []);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Find a Coach
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            Discover expert football coaches near you
          </ThemedText>
        </View>

        <FindCoachSearchBar
          postcode={postcode}
          onChangePostcode={handlePostcodeChange}
          onClear={handleClear}
          palette={palette}
        />

        {!postcode || postcode.length < 3 ? (
          <FindCoachEmptyState variant="search" palette={palette} />
        ) : nearbyCoaches.length === 0 ? (
          <FindCoachEmptyState variant="no-results" palette={palette} />
        ) : (
          <View style={styles.coachList}>
            <ThemedText style={styles.resultsText}>
              {nearbyCoaches.length} {nearbyCoaches.length === 1 ? 'coach' : 'coaches'} near{' '}
              {postcode}
            </ThemedText>

            {nearbyCoaches.map((coach) => (
              <CoachResultCard key={coach.id} coach={coach} palette={palette} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
