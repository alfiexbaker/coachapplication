import { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Components, Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOTAL_SCREENS = 3;

const AGE_OPTIONS = Array.from({ length: 13 }, (_, i) => i + 4); // 4 to 16
const SKILL_LEVELS = ['Beginner', 'Developing', 'Intermediate', 'Advanced'] as const;

interface ImprovementArea {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

const IMPROVEMENT_AREAS: ImprovementArea[] = [
  { icon: 'football-outline', label: 'Ball Control' },
  { icon: 'speedometer-outline', label: 'Speed & Agility' },
  { icon: 'body-outline', label: 'Fitness' },
  { icon: 'people-outline', label: 'Teamwork' },
  { icon: 'trophy-outline', label: 'Competition Prep' },
  { icon: 'happy-outline', label: 'Confidence' },
];

interface PlaceholderCoach {
  name: string;
  specialty: string;
  rating: number;
  distance: string;
}

const PLACEHOLDER_COACHES: PlaceholderCoach[] = [
  { name: 'Coach Alex', specialty: 'Football', rating: 4.9, distance: '0.8 mi' },
  { name: 'Coach Jamie', specialty: 'Tennis', rating: 4.8, distance: '1.2 mi' },
  { name: 'Coach Sam', specialty: 'Swimming', rating: 5.0, distance: '2.1 mi' },
];

export interface ParentWelcomeProps {
  childName?: string;
  onComplete: () => void;
  onSkip?: () => void;
}

export function ParentWelcome({
  childName = 'your child',
  onComplete,
  onSkip,
}: ParentWelcomeProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // Form state
  const [selectedAge, setSelectedAge] = useState<number | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);

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

  const toggleArea = useCallback((label: string) => {
    setSelectedAreas((prev) =>
      prev.includes(label) ? prev.filter((a) => a !== label) : [...prev, label],
    );
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
        {/* Screen 1: Welcome */}
        <View style={[styles.page, { width: SCREEN_WIDTH }]}>
          <View style={styles.pageContent}>
            <Ionicons name="happy-outline" size={64} color={palette.tint} />
            <ThemedText style={[Typography.display, { color: palette.text, textAlign: 'center' }]}>
              Welcome!
            </ThemedText>
            <ThemedText
              style={[Typography.title, { color: palette.muted, textAlign: 'center' }]}
            >
              Let&apos;s set up for {childName}
            </ThemedText>
            <ThemedText
              style={[Typography.body, { color: palette.muted, textAlign: 'center', marginTop: Spacing.sm }]}
            >
              We&apos;ll help you find the perfect coach based on your child&apos;s needs and goals.
            </ThemedText>
          </View>
        </View>

        {/* Screen 2: Child Details */}
        <View style={[styles.page, { width: SCREEN_WIDTH }]}>
          <ScrollView
            style={styles.scrollInner}
            contentContainerStyle={styles.pageContent}
            showsVerticalScrollIndicator={false}
          >
            <ThemedText style={[Typography.title, { color: palette.text }]}>
              About {childName}
            </ThemedText>

            {/* Age picker */}
            <View style={styles.sectionBlock}>
              <ThemedText style={[Typography.caption, { color: palette.muted }]}>AGE</ThemedText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.agePicker}
              >
                {AGE_OPTIONS.map((age) => {
                  const selected = selectedAge === age;
                  return (
                    <Clickable
                      key={age}
                      onPress={() => setSelectedAge(age)}
                      style={[
                        styles.ageChip,
                        {
                          backgroundColor: selected ? palette.tint : palette.surface,
                          borderColor: selected ? palette.tint : palette.border,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[Typography.bodySemiBold, { color: selected ? palette.onPrimary : palette.text }]}
                      >
                        {age}
                      </ThemedText>
                    </Clickable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Skill level */}
            <View style={styles.sectionBlock}>
              <ThemedText style={[Typography.caption, { color: palette.muted }]}>
                SKILL LEVEL
              </ThemedText>
              <View style={styles.levelRow}>
                {SKILL_LEVELS.map((level) => {
                  const selected = selectedLevel === level;
                  return (
                    <Clickable
                      key={level}
                      onPress={() => setSelectedLevel(level)}
                      style={[
                        styles.levelChip,
                        {
                          backgroundColor: selected ? palette.tint : palette.surface,
                          borderColor: selected ? palette.tint : palette.border,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[Typography.small, { color: selected ? palette.onPrimary : palette.text }]}
                      >
                        {level}
                      </ThemedText>
                    </Clickable>
                  );
                })}
              </View>
            </View>

            {/* What to improve */}
            <View style={styles.sectionBlock}>
              <ThemedText style={[Typography.caption, { color: palette.muted }]}>
                WHAT TO IMPROVE
              </ThemedText>
              <View style={styles.areasGrid}>
                {IMPROVEMENT_AREAS.map((area) => {
                  const selected = selectedAreas.includes(area.label);
                  return (
                    <Clickable
                      key={area.label}
                      onPress={() => toggleArea(area.label)}
                      style={[
                        styles.areaCard,
                        {
                          backgroundColor: selected ? withAlpha(palette.tint, 0.06) : palette.surface,
                          borderColor: selected ? palette.tint : palette.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name={area.icon}
                        size={Components.icon.lg}
                        color={selected ? palette.tint : palette.muted}
                      />
                      <ThemedText
                        style={[
                          Typography.small,
                          { color: selected ? palette.tint : palette.text, textAlign: 'center' },
                        ]}
                      >
                        {area.label}
                      </ThemedText>
                      {selected && (
                        <View style={[styles.checkBadge, { backgroundColor: palette.tint }]}>
                          <Ionicons name="checkmark" size={12} color={palette.onPrimary} />
                        </View>
                      )}
                    </Clickable>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </View>

        {/* Screen 3: Coach Results */}
        <View style={[styles.page, { width: SCREEN_WIDTH }]}>
          <View style={styles.pageContent}>
            <Ionicons name="search-outline" size={48} color={palette.tint} />
            <ThemedText style={[Typography.title, { color: palette.text, textAlign: 'center' }]}>
              Here are coaches near you!
            </ThemedText>

            <View style={styles.coachList}>
              {PLACEHOLDER_COACHES.map((coach) => (
                <SurfaceCard key={coach.name} style={styles.coachCard} tactile={false}>
                  <View style={styles.coachRow}>
                    <View
                      style={[
                        styles.coachAvatar,
                        { backgroundColor: palette.surfaceSecondary },
                      ]}
                    >
                      <Ionicons
                        name="person-outline"
                        size={Components.icon.lg}
                        color={palette.muted}
                      />
                    </View>
                    <View style={styles.coachInfo}>
                      <ThemedText style={[Typography.bodySemiBold, { color: palette.text }]}>
                        {coach.name}
                      </ThemedText>
                      <ThemedText style={[Typography.small, { color: palette.muted }]}>
                        {coach.specialty}
                      </ThemedText>
                    </View>
                    <View style={styles.coachMeta}>
                      <View style={styles.ratingRow}>
                        <Ionicons name="star" size={14} color={palette.warning} />
                        <ThemedText style={[Typography.small, { color: palette.text }]}>
                          {coach.rating}
                        </ThemedText>
                      </View>
                      <ThemedText style={[Typography.caption, { color: palette.muted }]}>
                        {coach.distance}
                      </ThemedText>
                    </View>
                  </View>
                </SurfaceCard>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom controls */}
      <View style={[styles.bottomBar, { borderTopColor: palette.border }]}>
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
  sectionBlock: {
    width: '100%',
    gap: Spacing.xs,
  },
  agePicker: {
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  ageChip: {
    width: 44,
    height: Components.button.height,
    borderRadius: Radii.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  levelChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  areasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  areaCard: {
    width: '48%',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.card,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    position: 'relative',
  },
  checkBadge: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    width: 20,
    height: 20,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachList: {
    width: '100%',
    gap: Spacing.sm,
  },
  coachCard: {
    width: '100%',
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  coachAvatar: {
    width: Components.avatar.md,
    height: Components.avatar.md,
    borderRadius: Components.avatar.md / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachInfo: {
    flex: 1,
    gap: Spacing.micro,
  },
  coachMeta: {
    alignItems: 'flex-end',
    gap: Spacing.micro,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
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
