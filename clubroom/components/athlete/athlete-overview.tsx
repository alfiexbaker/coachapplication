/**
 * AthleteOverview — Overview tab content for the athlete profile.
 *
 * Shows: next session card, stats row, parent contact, emergency info, special needs, tags.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { RosterEntry } from '@/constants/types';
import type { AthleteEmergencyQuickView } from '@/services/safety-service';
import type { ChildProfile } from '@/services/child-service';

import { NextSessionCard } from './athlete-next-session-card';
import { AthleteStatsRow } from './athlete-stats-row';
import { AthleteContactCard } from './athlete-contact-card';
import { AthleteEmergencyCard } from './athlete-emergency-card';
import { SpecialNeedsSummary, SenSummary } from './athlete-special-needs-summary';

// ============================================================================
// PROPS
// ============================================================================

interface AthleteOverviewProps {
  athlete: RosterEntry;
  emergencyData: AthleteEmergencyQuickView | null;
  childData: ChildProfile | null;
  onTagRemove: (tag: string) => void;
  onTagAdd: () => void;
}

// ============================================================================
// TAGS SECTION
// ============================================================================

const TagsSection = function TagsSection({
  athlete,
  onTagRemove,
  onTagAdd,
}: {
  athlete: RosterEntry;
  onTagRemove: (tag: string) => void;
  onTagAdd: () => void;
}) {
  const { colors } = useTheme();

  return (
    <SurfaceCard style={styles.section}>
      <Row gap="sm" align="center" justify="between">
        <ThemedText type="defaultSemiBold">Tags</ThemedText>
        <Clickable onPress={onTagAdd} accessibilityLabel="Add tag">
          <Ionicons name="add-circle" size={22} color={colors.tint} />
        </Clickable>
      </Row>
      {athlete.tags.length > 0 ? (
        <Row gap="xs" wrap>
          {athlete.tags.map((tag) => (
            <Clickable
              key={tag}
              onPress={() => onTagRemove(tag)}
              style={[styles.tag, { backgroundColor: colors.surfaceSecondary }]}
            >
              <ThemedText style={[styles.tagText, { color: colors.text }]}>{tag}</ThemedText>
              <Ionicons name="close" size={12} color={colors.muted} />
            </Clickable>
          ))}
        </Row>
      ) : (
        <ThemedText style={{ color: colors.muted }}>No tags added yet</ThemedText>
      )}
    </SurfaceCard>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function AthleteOverviewInner({
  athlete,
  emergencyData,
  childData,
  onTagRemove,
  onTagAdd,
}: AthleteOverviewProps) {
  return (
    <Column gap="md" style={styles.container}>
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <NextSessionCard athlete={athlete} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <AthleteStatsRow athlete={athlete} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(150).springify()}>
        <AthleteContactCard athlete={athlete} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).springify()}>
        <AthleteEmergencyCard athlete={athlete} emergencyData={emergencyData} />
      </Animated.View>

      {childData?.hasSpecialNeeds && (
        <Animated.View entering={FadeInDown.delay(225).springify()}>
          <SpecialNeedsSummary childData={childData} />
        </Animated.View>
      )}

      {athlete.senInfo?.hasSen && (
        <Animated.View entering={FadeInDown.delay(230).springify()}>
          <SenSummary athlete={athlete} />
        </Animated.View>
      )}

      <Animated.View entering={FadeInDown.delay(250).springify()}>
        <TagsSection athlete={athlete} onTagRemove={onTagRemove} onTagAdd={onTagAdd} />
      </Animated.View>
    </Column>
  );
}

export const AthleteOverview = AthleteOverviewInner;

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.xl,
  },
  section: {
    gap: Spacing.sm,
  },
  tag: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: 10,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.md,
  },
  tagText: {
    ...Typography.smallSemiBold,
  },
});
