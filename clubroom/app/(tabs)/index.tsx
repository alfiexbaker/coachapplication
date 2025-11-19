import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionHeader
          eyebrow="Discover · Clubroom"
          title="Join → browse → book"
          subtitle="Minimal flow with Shadcn polish. Postcode first, curated list, instant booking preview."
        />

        <SurfaceCard style={[styles.heroCard, { backgroundColor: `${palette.tint}08` }]}>
          <View style={styles.heroHeader}>
            <View style={styles.heroIconStack}>
              <Animated.View
                style={{
                  position: 'absolute',
                  width: 82,
                  height: 82,
                  borderRadius: 999,
                  backgroundColor: `${palette.tint}18`,
                  transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.04] }) }],
                  opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0.25] }),
                }}
              />
              <View style={[styles.heroAvatar, { backgroundColor: palette.tint }]}>
                <Ionicons name="sparkles" size={24} color="#fff" />
              </View>
            </View>
            <View style={styles.heroCopy}>
              <ThemedText type="title">Postcode in, coach out</ThemedText>
              <ThemedText style={styles.heroSubtitle}>Join with an English postcode, see nearby pros, tap to book.</ThemedText>
            </View>
          </View>

          <View style={styles.joinRow}>
            <View style={[styles.inputShell, { borderColor: hasJoined ? palette.tint : palette.border }]}>
              <Ionicons name="location" size={18} color={palette.icon} />
              <TextInput
                value={postcode}
                onChangeText={handlePostcodeChange}
                placeholder="S33 9GF"
                placeholderTextColor={palette.muted}
                keyboardType="default"
                style={styles.input}
              />
              <Pressable
                accessibilityRole="button"
                disabled={!postcodeRegex.test(postcode)}
                onPress={handleJoin}
                style={({ pressed }) => [
                  styles.joinButton,
                  {
                    backgroundColor: postcodeRegex.test(postcode) ? palette.tint : palette.border,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
                <ThemedText style={styles.joinLabel} lightColor="#fff" darkColor="#fff">
                  Join & browse
                </ThemedText>
              </Pressable>
            </View>
            <ThemedText style={styles.helper}>English format only (e.g. S33 9GF). Auto-spaces for you.</ThemedText>
            <View style={styles.signalPills}>
              <View style={[styles.signalPill, { backgroundColor: `${palette.tint}15` }]}>
                <Ionicons name="flash" size={14} color={palette.tint} />
                <ThemedText style={styles.signalLabel}>Live availability</ThemedText>
              </View>
              <View style={[styles.signalPill, { backgroundColor: `${palette.secondary}15` }]}>
                <Ionicons name="shield-checkmark" size={14} color={palette.secondary} />
                <ThemedText style={[styles.signalLabel, { color: palette.secondary }]}>Background checked</ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.stagesRow}>
            {[
              { id: 'join', label: 'Join with postcode', icon: 'locate' as const, meta: 'Enter and validate instantly.' },
              { id: 'browse', label: 'Browse nearby coaches', icon: 'map' as const, meta: 'Curated within 12 miles.' },
              { id: 'book', label: 'Book & lock a slot', icon: 'calendar' as const, meta: 'Preview the confirm screen.' },
            ].map((step) => {
              const isActive = stage === step.id;
              const isComplete = ['browse', 'book'].includes(stage) && step.id === 'join';
              return (
                <View
                  key={step.id}
                  style={[
                    styles.stageCard,
                    {
                      borderColor: isActive || isComplete ? palette.tint : palette.border,
                      backgroundColor: isActive ? `${palette.tint}12` : palette.surface,
                    },
                  ]}>
                  <View
                    style={[
                      styles.stageIcon,
                      {
                        backgroundColor: isActive ? palette.tint : `${palette.tint}15`,
                      },
                    ]}>
                    <Ionicons
                      name={isComplete ? 'checkmark' : step.icon}
                      size={16}
                      color={isActive || isComplete ? '#fff' : palette.tint}
                    />
                  </View>
                  <View style={styles.stageCopy}>
                    <ThemedText type="defaultSemiBold">{step.label}</ThemedText>
                    <ThemedText style={styles.stageMeta}>{step.meta}</ThemedText>
                  </View>
                </View>
              );
            })}
          </View>
        </SurfaceCard>

        <View style={[styles.split, isWide && styles.splitWide]}>
          <View style={[styles.listColumn, isWide && styles.listColumnWide]}>
            <SurfaceCard style={styles.nearbyHeader}>
              <View>
                <ThemedText type="subtitle">Coaches near {postcode || 'you'}</ThemedText>
                <ThemedText style={styles.heroSubtitle}>Tap a card to jump into the booking preview.</ThemedText>
              </View>
              <View style={[styles.signalPill, { backgroundColor: `${palette.tint}15` }]}>
                <Ionicons name="sparkles-outline" size={16} color={palette.tint} />
                <ThemedText style={[styles.signalLabel, { color: palette.tint }]}>Curated</ThemedText>
              </View>
            </SurfaceCard>
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
            {!nearbyCoaches.length ? (
              <View style={styles.emptyState}>
                <ThemedText type="subtitle">No coaches yet</ThemedText>
                <ThemedText>As soon as calendars sync, the roster appears here.</ThemedText>
              </View>
            ) : null}
            <MapPreview coaches={nearbyCoaches} selectedCoachId={selectedCoachId} onCoachFocus={setSelectedCoachId} />
          </View>
          <View style={[styles.bookingColumn, isWide && styles.bookingColumnWide]}>
            <BookingFlowPreview coach={selectedCoach} />
          </View>
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
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    gap: Spacing.lg,
  },
  heroCard: {
    gap: Spacing.lg,
    overflow: 'hidden',
  },
  heroHeader: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  heroIconStack: {
    width: 86,
    height: 86,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatar: {
    width: 64,
    height: 64,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  heroSubtitle: {
    opacity: 0.8,
  },
  joinRow: {
    gap: Spacing.sm,
  },
  helper: {
    opacity: 0.7,
    fontSize: 13,
    paddingHorizontal: Spacing.xs,
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 4,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
  },
  joinLabel: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  signalPills: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  signalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 999,
  },
  signalLabel: {
    fontWeight: '600',
    fontSize: 12,
  },
  stagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  stageCard: {
    flex: 1,
    minWidth: 200,
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  stageIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageCopy: {
    gap: 4,
  },
  stageMeta: {
    opacity: 0.75,
  },
  nearbyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  split: {
    flex: 1,
    gap: Spacing.lg,
  },
  splitWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  listColumn: {
    flex: 1,
    gap: Spacing.md,
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
    paddingVertical: Spacing['2xl'],
  },
});
