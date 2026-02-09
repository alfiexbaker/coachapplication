import { memo } from 'react';
import { Dimensions, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import {
  AGE_OPTIONS,
  SKILL_LEVELS,
  IMPROVEMENT_AREAS,
  PLACEHOLDER_COACHES,
} from './parent-welcome-data';

import {
  AgePickerRow,
  SkillLevelRow,
  ImprovementAreaGrid,
  CoachPreviewCard,
  styles,
} from './parent-welcome-screens-sections';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Screen 1: Welcome ─────────────────────────────────────────────────────

interface WelcomePageProps {
  childName: string;
}

export const WelcomePage = memo(function WelcomePage({ childName }: WelcomePageProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={[styles.page, { width: SCREEN_WIDTH }]}>
      <View style={styles.pageContent}>
        <Ionicons name="happy-outline" size={64} color={palette.tint} />
        <ThemedText style={[Typography.display, { color: palette.text, textAlign: 'center' }]}>
          Welcome!
        </ThemedText>
        <ThemedText style={[Typography.title, { color: palette.muted, textAlign: 'center' }]}>
          Let&apos;s set up for {childName}
        </ThemedText>
        <ThemedText
          style={[Typography.body, { color: palette.muted, textAlign: 'center', marginTop: Spacing.sm }]}
        >
          We&apos;ll help you find the perfect coach based on your child&apos;s needs and goals.
        </ThemedText>
      </View>
    </View>
  );
});

// ─── Screen 2: Child Details ────────────────────────────────────────────────

interface ChildDetailsPageProps {
  childName: string;
  selectedAge: number | null;
  onAgeSelect: (age: number) => void;
  selectedLevel: string | null;
  onLevelSelect: (level: string) => void;
  selectedAreas: string[];
  onToggleArea: (label: string) => void;
}

export const ChildDetailsPage = memo(function ChildDetailsPage({
  childName,
  selectedAge,
  onAgeSelect,
  selectedLevel,
  onLevelSelect,
  selectedAreas,
  onToggleArea,
}: ChildDetailsPageProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={[styles.page, { width: SCREEN_WIDTH }]}>
      <ScrollView
        style={styles.scrollInner}
        contentContainerStyle={styles.pageContent}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={[Typography.title, { color: palette.text }]}>
          About {childName}
        </ThemedText>

        <View style={styles.sectionBlock}>
          <ThemedText style={[Typography.caption, { color: palette.muted }]}>AGE</ThemedText>
          <AgePickerRow
            ages={AGE_OPTIONS}
            selectedAge={selectedAge}
            onAgeSelect={onAgeSelect}
            palette={palette}
          />
        </View>

        <View style={styles.sectionBlock}>
          <ThemedText style={[Typography.caption, { color: palette.muted }]}>SKILL LEVEL</ThemedText>
          <SkillLevelRow
            levels={[...SKILL_LEVELS]}
            selectedLevel={selectedLevel}
            onLevelSelect={onLevelSelect}
            palette={palette}
          />
        </View>

        <View style={styles.sectionBlock}>
          <ThemedText style={[Typography.caption, { color: palette.muted }]}>WHAT TO IMPROVE</ThemedText>
          <ImprovementAreaGrid
            areas={IMPROVEMENT_AREAS}
            selectedAreas={selectedAreas}
            onToggleArea={onToggleArea}
            palette={palette}
          />
        </View>
      </ScrollView>
    </View>
  );
});

// ─── Screen 3: Coach Results ────────────────────────────────────────────────

export const CoachResultsPage = memo(function CoachResultsPage() {
  const { colors: palette } = useTheme();

  return (
    <View style={[styles.page, { width: SCREEN_WIDTH }]}>
      <View style={styles.pageContent}>
        <Ionicons name="search-outline" size={48} color={palette.tint} />
        <ThemedText style={[Typography.title, { color: palette.text, textAlign: 'center' }]}>
          Here are coaches near you!
        </ThemedText>

        <View style={styles.coachList}>
          {PLACEHOLDER_COACHES.map((coach) => (
            <CoachPreviewCard key={coach.name} coach={coach} palette={palette} />
          ))}
        </View>
      </View>
    </View>
  );
});
