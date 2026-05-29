import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Coach } from '@/services/coach-service';
import { Row } from '@/components/primitives';

interface PublicProfileSpecialtiesProps {
  coach: Coach;
}

export const PublicProfileSpecialties = function PublicProfileSpecialties({
  coach,
}: PublicProfileSpecialtiesProps) {
  const { colors: palette } = useTheme();

  return (
    <Animated.View entering={FadeIn} style={styles.container}>
      {coach.footballFocuses && coach.footballFocuses.length > 0 ? (
        <SurfaceCard style={styles.section}>
          <ThemedText style={[Typography.heading, { color: palette.text }]}>
            Football Focus Areas
          </ThemedText>
          <Row style={styles.chipGrid}>
            {coach.footballFocuses.map((focus) => (
              <Row
                key={focus}
                style={[styles.chip, { backgroundColor: withAlpha(palette.tint, 0.09) }]}
              >
                <ThemedText style={[Typography.smallSemiBold, { color: palette.tint }]}>
                  {focus}
                </ThemedText>
              </Row>
            ))}
          </Row>
        </SurfaceCard>
      ) : null}

      {coach.sports && coach.sports.length > 0 ? (
        <SurfaceCard style={styles.section}>
          <ThemedText style={[Typography.heading, { color: palette.text }]}>Sports</ThemedText>
          <Row style={styles.chipGrid}>
            {coach.sports.map((sport) => (
              <Row
                key={sport}
                style={[styles.chip, { backgroundColor: withAlpha(palette.secondary, 0.09) }]}
              >
                <Ionicons name="football-outline" size={14} color={palette.secondary} />
                <ThemedText style={[Typography.smallSemiBold, { color: palette.secondary }]}>
                  {sport}
                </ThemedText>
              </Row>
            ))}
          </Row>
        </SurfaceCard>
      ) : null}

      {coach.languages && coach.languages.length > 0 ? (
        <SurfaceCard style={styles.section}>
          <ThemedText style={[Typography.heading, { color: palette.text }]}>Languages</ThemedText>
          <Row style={styles.chipGrid}>
            {coach.languages.map((lang) => (
              <Row
                key={`${lang.name}:${lang.proficiency}`}
                style={[
                  styles.chip,
                  { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1 },
                ]}
              >
                <Ionicons name="language-outline" size={14} color={palette.muted} />
                <ThemedText style={[Typography.small, { color: palette.text }]}>
                  {lang.name} - {lang.proficiency}
                </ThemedText>
              </Row>
            ))}
          </Row>
        </SurfaceCard>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { padding: Spacing.md, gap: Spacing.md },
  section: { gap: Spacing.sm },
  chipGrid: { flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.xs },
  chip: {
    alignItems: 'center',
    gap: Spacing.xs / 2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
  },
});
