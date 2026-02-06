import { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Components, Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOTAL_SCREENS = 5;

const SPECIALTIES = [
  'Football',
  'Tennis',
  'Swimming',
  'Basketball',
  'Cricket',
  'Rugby',
  'Athletics',
  'Hockey',
  'Netball',
  'Gymnastics',
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const PERIODS = ['AM', 'PM', 'Eve'] as const;

interface ValuePropItem {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}

const VALUE_PROPS: ValuePropItem[] = [
  { icon: 'calendar-outline', text: 'Manage bookings and availability in one place' },
  { icon: 'people-outline', text: 'Build your roster and track athlete progress' },
  { icon: 'wallet-outline', text: 'Get paid directly - no middleman fees' },
];

export interface CoachWelcomeProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export function CoachWelcome({ onComplete, onSkip }: CoachWelcomeProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // Form state
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [rate, setRate] = useState('');
  const [availability, setAvailability] = useState<Record<string, boolean>>({});

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentPage(page);
  }, []);

  const goToPage = useCallback((page: number) => {
    scrollRef.current?.scrollTo({ x: page * SCREEN_WIDTH, animated: true });
  }, []);

  const handleNext = useCallback(() => {
    if (currentPage < TOTAL_SCREENS - 1) {
      goToPage(currentPage + 1);
    } else {
      onComplete();
    }
  }, [currentPage, goToPage, onComplete]);

  const toggleSpecialty = useCallback((specialty: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(specialty) ? prev.filter((s) => s !== specialty) : [...prev, specialty],
    );
  }, []);

  const toggleAvailability = useCallback((day: string, period: string) => {
    const key = `${day}_${period}`;
    setAvailability((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const isLastPage = currentPage === TOTAL_SCREENS - 1;

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Screen 1: Value Proposition */}
        <View style={[styles.page, { width: SCREEN_WIDTH }]}>
          <View style={styles.pageContent}>
            <Ionicons name="fitness-outline" size={64} color={palette.tint} />
            <ThemedText style={[Typography.display, { color: palette.text, textAlign: 'center' }]}>
              Your coaching business starts here
            </ThemedText>
            <View style={styles.valuePropsContainer}>
              {VALUE_PROPS.map((prop) => (
                <View key={prop.text} style={styles.valuePropRow}>
                  <View style={[styles.valuePropIcon, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
                    <Ionicons name={prop.icon} size={Components.icon.lg} color={palette.tint} />
                  </View>
                  <ThemedText style={[Typography.body, { color: palette.text, flex: 1 }]}>
                    {prop.text}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Screen 2: Profile Setup */}
        <View style={[styles.page, { width: SCREEN_WIDTH }]}>
          <ScrollView
            style={styles.scrollInner}
            contentContainerStyle={styles.pageContent}
            showsVerticalScrollIndicator={false}
          >
            <ThemedText style={[Typography.title, { color: palette.text, textAlign: 'center' }]}>
              Set up your profile
            </ThemedText>

            {/* Photo placeholder */}
            <View style={[styles.photoPlaceholder, { backgroundColor: palette.surfaceSecondary, borderColor: palette.border }]}>
              <Ionicons name="camera-outline" size={Components.icon.xl} color={palette.muted} />
              <ThemedText style={[Typography.small, { color: palette.muted }]}>Add Photo</ThemedText>
            </View>

            {/* Headline */}
            <View style={styles.inputGroup}>
              <ThemedText style={[Typography.caption, { color: palette.muted }]}>HEADLINE</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                    color: palette.text,
                  },
                ]}
                placeholder="e.g. FA Level 2 Football Coach"
                placeholderTextColor={palette.muted}
                value={headline}
                onChangeText={setHeadline}
              />
            </View>

            {/* Bio */}
            <View style={styles.inputGroup}>
              <ThemedText style={[Typography.caption, { color: palette.muted }]}>BIO</ThemedText>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                    color: palette.text,
                  },
                ]}
                placeholder="Tell parents about your coaching experience..."
                placeholderTextColor={palette.muted}
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Specialty tags */}
            <View style={styles.inputGroup}>
              <ThemedText style={[Typography.caption, { color: palette.muted }]}>SPECIALTIES</ThemedText>
              <View style={styles.tagsContainer}>
                {SPECIALTIES.map((specialty) => {
                  const selected = selectedSpecialties.includes(specialty);
                  return (
                    <Clickable
                      key={specialty}
                      onPress={() => toggleSpecialty(specialty)}
                      style={[
                        styles.tag,
                        {
                          backgroundColor: selected ? palette.tint : palette.surface,
                          borderColor: selected ? palette.tint : palette.border,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[Typography.small, { color: selected ? palette.onPrimary : palette.text }]}
                      >
                        {specialty}
                      </ThemedText>
                    </Clickable>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </View>

        {/* Screen 3: Set Rate */}
        <View style={[styles.page, { width: SCREEN_WIDTH }]}>
          <View style={styles.pageContent}>
            <Ionicons name="cash-outline" size={48} color={palette.tint} />
            <ThemedText style={[Typography.title, { color: palette.text, textAlign: 'center' }]}>
              Set your hourly rate
            </ThemedText>

            <SurfaceCard style={styles.rateCard} tactile={false}>
              <View style={styles.rateInputRow}>
                <ThemedText style={[Typography.display, { color: palette.muted }]}>£</ThemedText>
                <TextInput
                  style={[styles.rateInput, { color: palette.text }]}
                  placeholder="40"
                  placeholderTextColor={palette.muted}
                  value={rate}
                  onChangeText={setRate}
                  keyboardType="numeric"
                  maxLength={4}
                />
                <ThemedText style={[Typography.body, { color: palette.muted }]}>/hr</ThemedText>
              </View>
            </SurfaceCard>

            <View style={[styles.rateHint, { backgroundColor: withAlpha(palette.tint, 0.03) }]}>
              <Ionicons name="information-circle-outline" size={Components.icon.md} color={palette.tint} />
              <ThemedText style={[Typography.small, { color: palette.muted, flex: 1 }]}>
                Coaches near you charge £30-55/hr
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Screen 4: Availability */}
        <View style={[styles.page, { width: SCREEN_WIDTH }]}>
          <View style={styles.pageContent}>
            <ThemedText style={[Typography.title, { color: palette.text, textAlign: 'center' }]}>
              Quick availability
            </ThemedText>
            <ThemedText style={[Typography.small, { color: palette.muted, textAlign: 'center' }]}>
              Tap slots when you can coach. You can fine-tune later.
            </ThemedText>

            <View style={styles.availabilityGrid}>
              {/* Header row */}
              <View style={styles.availRow}>
                <View style={styles.availLabelCell} />
                {PERIODS.map((period) => (
                  <View key={period} style={styles.availHeaderCell}>
                    <ThemedText style={[Typography.caption, { color: palette.muted }]}>
                      {period}
                    </ThemedText>
                  </View>
                ))}
              </View>

              {/* Day rows */}
              {DAYS.map((day) => (
                <View key={day} style={styles.availRow}>
                  <View style={styles.availLabelCell}>
                    <ThemedText style={[Typography.bodySemiBold, { color: palette.text }]}>
                      {day}
                    </ThemedText>
                  </View>
                  {PERIODS.map((period) => {
                    const key = `${day}_${period}`;
                    const active = availability[key];
                    return (
                      <Clickable
                        key={key}
                        onPress={() => toggleAvailability(day, period)}
                        style={[
                          styles.availCell,
                          {
                            backgroundColor: active ? withAlpha(palette.success, 0.12) : palette.surface,
                            borderColor: active ? palette.success : palette.border,
                          },
                        ]}
                      >
                        {active && (
                          <Ionicons
                            name="checkmark"
                            size={Components.icon.md}
                            color={palette.success}
                          />
                        )}
                      </Clickable>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Screen 5: Ready */}
        <View style={[styles.page, { width: SCREEN_WIDTH }]}>
          <View style={styles.pageContent}>
            <Ionicons name="checkmark-circle" size={80} color={palette.success} />
            <ThemedText style={[Typography.display, { color: palette.text, textAlign: 'center' }]}>
              You&apos;re ready!
            </ThemedText>
            <ThemedText
              style={[Typography.body, { color: palette.muted, textAlign: 'center' }]}
            >
              Share your profile link with parents so they can book you directly.
            </ThemedText>

            <SurfaceCard style={styles.shareLinkCard} tactile={false}>
              <View style={styles.shareLinkRow}>
                <Ionicons name="link-outline" size={Components.icon.lg} color={palette.tint} />
                <View style={styles.shareLinkText}>
                  <ThemedText style={[Typography.small, { color: palette.muted }]}>
                    Your profile link
                  </ThemedText>
                  <ThemedText style={[Typography.bodySemiBold, { color: palette.text }]}>
                    clubroom.app/coach/you
                  </ThemedText>
                </View>
              </View>
              <Clickable
                onPress={() => {}}
                style={[styles.shareButton, { backgroundColor: palette.tint }]}
              >
                <Ionicons name="share-outline" size={Components.icon.md} color={palette.onPrimary} />
                <ThemedText style={[Typography.bodySemiBold, { color: palette.onPrimary }]}>
                  Share Link
                </ThemedText>
              </Clickable>
            </SurfaceCard>
          </View>
        </View>
      </ScrollView>

      {/* Bottom controls */}
      <View style={[styles.bottomBar, { borderTopColor: palette.border }]}>
        {/* Dot indicators */}
        <View style={styles.dotsRow}>
          {Array.from({ length: TOTAL_SCREENS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === currentPage ? palette.tint : palette.border,
                  width: i === currentPage ? Spacing.sm : Spacing.xs,
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.buttonsRow}>
          {onSkip && currentPage < TOTAL_SCREENS - 1 ? (
            <Clickable onPress={onSkip} style={styles.skipButton}>
              <ThemedText style={[Typography.bodySemiBold, { color: palette.muted }]}>
                Skip
              </ThemedText>
            </Clickable>
          ) : (
            <View style={styles.skipButton} />
          )}

          <Clickable
            onPress={handleNext}
            style={[styles.nextButton, { backgroundColor: palette.tint }]}
          >
            <ThemedText style={[Typography.bodySemiBold, { color: palette.onPrimary }]}>
              {isLastPage ? 'Done' : 'Next'}
            </ThemedText>
            {!isLastPage && (
              <Ionicons name="arrow-forward" size={Components.icon.md} color={palette.onPrimary} />
            )}
          </Clickable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  scrollInner: {
    flex: 1,
  },
  pageContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  valuePropsContainer: {
    width: '100%',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  valuePropRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  valuePropIcon: {
    width: 48,
    height: 48,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: Radii['3xl'],
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs / 2,
  },
  inputGroup: {
    width: '100%',
    gap: Spacing.xs,
  },
  input: {
    height: Components.input.height,
    borderRadius: Components.input.borderRadius,
    borderWidth: 1,
    paddingHorizontal: Components.input.paddingHorizontal,
    ...Typography.body,
  },
  textArea: {
    height: 100,
    borderRadius: Components.input.borderRadius,
    borderWidth: 1,
    paddingHorizontal: Components.input.paddingHorizontal,
    paddingVertical: Spacing.sm,
    ...Typography.body,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  tag: {
    paddingHorizontal: Components.chip.paddingHorizontal,
    paddingVertical: Components.chip.paddingVertical,
    borderRadius: Components.chip.borderRadius,
    borderWidth: 1,
  },
  rateCard: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  rateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  rateInput: { ...Typography.display,
    minWidth: 100,
    textAlign: 'center', ...Typography.display },
  rateHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    width: '100%',
  },
  availabilityGrid: {
    width: '100%',
    gap: Spacing.xs,
  },
  availRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    alignItems: 'center',
  },
  availLabelCell: {
    width: 44,
    alignItems: 'center',
  },
  availHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  availCell: {
    flex: 1,
    height: Components.button.height,
    borderRadius: Radii.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareLinkCard: {
    width: '100%',
    gap: Spacing.sm,
  },
  shareLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  shareLinkText: {
    flex: 1,
    gap: Spacing.micro,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: Components.button.height,
    borderRadius: Radii.button,
    gap: Spacing.xs,
  },
  bottomBar: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  dot: {
    height: Spacing.xs,
    borderRadius: Radii.pill,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    minWidth: 60,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: Components.button.height,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.button,
    gap: Spacing.xs,
  },
});
