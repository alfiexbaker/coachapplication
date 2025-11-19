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
import { Colors, Spacing } from '@/constants/theme';
import { coachProfiles } from '@/constants/mock-data';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function DiscoverScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { width } = useWindowDimensions();
  const isWide = width > 900;
  const [postcode, setPostcode] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [stage, setStage] = useState<'join' | 'browse' | 'book'>('join');
  const [selectedCoachId, setSelectedCoachId] = useState(coachProfiles[0]?.id);
  const flowPagerRef = useRef<ScrollView | null>(null);
  const selectedCoach = coachProfiles.find((coach) => coach.id === selectedCoachId);
  const pulse = useRef(new Animated.Value(0)).current;

  const nearbyCoaches = useMemo(() => coachProfiles.filter((coach) => coach.distanceMiles <= 12), []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulse]);

  const postcodeRegex = /^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/;

  const pagerWidth = Math.max(320, width - Spacing.lg * 2);

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

  const handleJoin = () => {
    setHasJoined(true);
    setStage('browse');
  };

  const handleStageSnap = (targetStage: 'join' | 'browse' | 'book', index: number) => {
    setStage(targetStage);
    flowPagerRef.current?.scrollTo({ x: index * pagerWidth, animated: true });
  };

  const flowShots: { id: 'join' | 'browse' | 'book'; title: string; meta: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'join', title: 'Join', meta: 'Drop postcode', icon: 'location' },
    { id: 'browse', title: 'Browse', meta: 'Pick a coach', icon: 'person-circle' },
    { id: 'book', title: 'Book', meta: 'Lock the slot', icon: 'flash' },
  ];

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

        <View style={[styles.split, isWide && styles.splitWide]}>
          <View style={[styles.listColumn, isWide && styles.listColumnWide]}>
            {nearbyCoaches.map((coach) => (
              <CoachCard
                key={coach.id}
                coach={coach}
                active={coach.id === selectedCoachId}
                onPress={() => {
                  setSelectedCoachId(coach.id);
                  setStage('book');
                }}
              />
            ))}
            {!nearbyCoaches.length && postcode ? (
              <View style={styles.emptyState}>
                <Ionicons name="location-outline" size={48} color={palette.icon} style={styles.emptyIcon} />
                <ThemedText type="subtitle">No coaches nearby</ThemedText>
                <ThemedText style={styles.emptyText}>Try a different postcode</ThemedText>
              </View>
            ) : null}
          </View>
          {isWide && selectedCoach ? (
            <View style={[styles.bookingColumn, styles.bookingColumnWide]}>
              <BookingFlowPreview coach={selectedCoach} />
            </View>
          ) : null}
        </View>
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
});
