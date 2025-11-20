import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { CoachCard } from '@/components/discover/coach-card';
import { BookingFlowPreview } from '@/components/discover/booking-flow';
import { MapPreview } from '@/components/discover/map-preview';
import { SectionHeader } from '@/components/primitives/section-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { coachProfiles } from '@/constants/mock-data';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { router } from 'expo-router';

export default function DiscoverScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { width } = useWindowDimensions();
  const isWide = width > 900;
  const { currentUser } = useAuth();
  const [postcode, setPostcode] = useState('');
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const selectedCoach = selectedCoachId ? coachProfiles.find((coach) => coach.id === selectedCoachId) : null;

  const userRole = currentUser?.role;

  const nearbyCoaches = useMemo(() => {
    if (!postcode || postcode.length < 3) return [];
    // Filter by distance first
    let filtered = coachProfiles.filter((coach) => coach.distanceMiles <= 12);

    // Role-based filtering: Coaches shouldn't see other coaches (only Users/Parents book coaches)
    // Admins can see everyone for management purposes
    if (userRole === 'Coach') {
      // Coaches shouldn't be using the Discover tab - they have their own Calendar tab
      return [];
    }

    return filtered;
  }, [postcode, userRole]);

  const handlePostcodeChange = (value: string) => {
    const stripped = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!stripped) {
      setPostcode('');
      return;
    }

    const withSpace =
      stripped.length > 3 ? `${stripped.slice(0, stripped.length - 3)} ${stripped.slice(-3)}` : stripped;
    setPostcode(withSpace);
  };

  if (selectedCoach) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={[styles.detailHeader, { borderBottomColor: palette.border }]}>
          <Pressable onPress={() => setSelectedCoachId(null)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Pressable>
          <ThemedText type="title" style={styles.detailHeaderTitle}>Book session</ThemedText>
        </View>
        <ScrollView>
          <BookingFlowPreview coach={selectedCoach} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>Find a coach</ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            Discover expert football coaches near you
          </ThemedText>
        </View>

        <View style={[styles.searchBar, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Ionicons name="search" size={22} color={palette.icon} />
          <TextInput
            value={postcode}
            onChangeText={handlePostcodeChange}
            placeholder="Search by postcode (e.g., SW1A 1AA)"
            placeholderTextColor={palette.muted}
            keyboardType="default"
            autoCapitalize="characters"
            style={[styles.searchInput, { color: palette.text }]}
          />
          {postcode ? (
            <Pressable onPress={() => setPostcode('')} hitSlop={8}>
              <Ionicons name="close-circle" size={22} color={palette.icon} />
            </Pressable>
          ) : null}
        </View>

        {!postcode || postcode.length < 3 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconCircle, { backgroundColor: palette.surface }]}>
              <Ionicons name="search" size={32} color={palette.icon} />
            </View>
            <ThemedText type="subtitle" style={styles.emptyTitle}>Search for coaches</ThemedText>
            <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
              Enter your postcode to discover expert coaches in your area
            </ThemedText>
          </View>
        ) : (
          <View style={[styles.split, isWide && styles.splitWide]}>
            <View style={[styles.listColumn, isWide && styles.listColumnWide]}>
              {nearbyCoaches.length > 0 ? (
                <>
                  <View style={styles.resultsHeader}>
                    <ThemedText style={styles.resultsText}>
                      {nearbyCoaches.length} {nearbyCoaches.length === 1 ? 'coach' : 'coaches'} near {postcode}
                    </ThemedText>
                  </View>
                  {nearbyCoaches.map((coach) => (
                    <CoachCard
                      key={coach.id}
                      coach={coach}
                      active={coach.id === selectedCoachId}
                      onPress={() => setSelectedCoachId(coach.id)}
                    />
                  ))}
                </>
              ) : (
                <View style={styles.emptyState}>
                  <View style={[styles.emptyIconCircle, { backgroundColor: palette.surface }]}>
                    <Ionicons name="location-outline" size={32} color={palette.icon} />
                  </View>
                  <ThemedText type="subtitle" style={styles.emptyTitle}>No coaches nearby</ThemedText>
                  <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
                    Try searching with a different postcode
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg + 4,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.lg,
  },
  header: {
    gap: Spacing.xs + 2,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md + 2,
    borderWidth: 2,
    borderRadius: Radii.md + 4,
    paddingHorizontal: Spacing.lg + 2,
    paddingVertical: Spacing.md + 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 0,
    letterSpacing: 0.2,
  },
  split: {
    flex: 1,
    gap: Spacing.md,
  },
  splitWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  listColumn: {
    flex: 1,
    gap: 0,
  },
  listColumnWide: {
    maxWidth: 520,
  },
  bookingColumn: {
    flex: 1,
  },
  bookingColumnWide: {
    maxWidth: 540,
  },
  resultsHeader: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  resultsText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  emptyState: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing['2xl'] + Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 260,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  detailHeaderTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  backButton: {
    padding: Spacing.sm,
    marginLeft: -Spacing.sm,
  },
});
