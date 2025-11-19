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

export default function DiscoverScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { width } = useWindowDimensions();
  const isWide = width > 900;
  const [postcode, setPostcode] = useState('');
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const selectedCoach = selectedCoachId ? coachProfiles.find((coach) => coach.id === selectedCoachId) : null;

  const nearbyCoaches = useMemo(() => {
    if (!postcode || postcode.length < 3) return [];
    return coachProfiles.filter((coach) => coach.distanceMiles <= 12);
  }, [postcode]);

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
        <View style={styles.detailHeader}>
          <Pressable onPress={() => setSelectedCoachId(null)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Pressable>
          <ThemedText type="title">Book session</ThemedText>
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
          <ThemedText type="title">Find a coach</ThemedText>
        </View>

        <View style={[styles.searchBar, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Ionicons name="search" size={18} color={palette.icon} />
          <TextInput
            value={postcode}
            onChangeText={handlePostcodeChange}
            placeholder="Enter postcode"
            placeholderTextColor={palette.muted}
            keyboardType="default"
            style={[styles.searchInput, { color: palette.text }]}
          />
          {postcode ? (
            <Pressable onPress={() => setPostcode('')}>
              <Ionicons name="close-circle" size={18} color={palette.icon} />
            </Pressable>
          ) : null}
        </View>

        {!postcode || postcode.length < 3 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={48} color={palette.icon} style={styles.emptyIcon} />
            <ThemedText type="subtitle">Search for coaches</ThemedText>
            <ThemedText style={styles.emptyText}>Enter your postcode to find coaches near you</ThemedText>
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
                  <Ionicons name="location-outline" size={48} color={palette.icon} style={styles.emptyIcon} />
                  <ThemedText type="subtitle">No coaches nearby</ThemedText>
                  <ThemedText style={styles.emptyText}>Try a different postcode</ThemedText>
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.md,
  },
  header: {
    paddingVertical: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 4,
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
    gap: Spacing.sm,
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
  },
  resultsText: {
    fontSize: 13,
    opacity: 0.6,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing['3xl'],
  },
  emptyIcon: {
    opacity: 0.3,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    opacity: 0.5,
    fontSize: 13,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  backButton: {
    padding: Spacing.xs,
  },
});
