import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Coach } from '@/services/coach-service';
import { Column, Row } from '@/components/primitives';

interface CoachDetailAboutProps {
  coach: Coach;
}

function SummaryChip({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  const { colors } = useTheme();

  return (
    <Row
      style={[styles.summaryChip, { backgroundColor: withAlpha(colors.tint, 0.08) }]}
      align="center"
      gap="xxs"
    >
      <Ionicons name={icon} size={14} color={colors.tint} />
      <ThemedText style={[styles.summaryChipText, { color: colors.tint }]}>{label}</ThemedText>
    </Row>
  );
}

export const CoachDetailAbout = function CoachDetailAbout({ coach }: CoachDetailAboutProps) {
  const { colors: palette } = useTheme();

  return (
    <Animated.View entering={FadeIn} style={styles.tabContent}>
      {(coach.bio || coach.footballFocuses?.length) && (
        <SurfaceCard style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            What families book them for
          </ThemedText>
          {coach.bio ? <ThemedText style={styles.bioText}>{coach.bio}</ThemedText> : null}

          <Row style={styles.summaryGrid}>
            {(coach.footballFocuses ?? []).slice(0, 4).map((focus) => (
              <SummaryChip key={focus} icon="football-outline" label={focus} />
            ))}
            {(coach.languages ?? []).slice(0, 2).map((language) => (
              <SummaryChip
                key={`${language.name}-${language.proficiency}`}
                icon="language-outline"
                label={`${language.name} • ${language.proficiency}`}
              />
            ))}
          </Row>
        </SurfaceCard>
      )}

      {coach.experiences && coach.experiences.length > 0 && (
        <SurfaceCard style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Background
          </ThemedText>
          {coach.experiences.map((experience, index) => (
            <Row key={`${experience.title}-${index}`} style={styles.experienceItem}>
              <View style={[styles.expDot, { backgroundColor: palette.tint }]} />
              <Column flex style={styles.expContent}>
                <ThemedText type="defaultSemiBold">{experience.title}</ThemedText>
                <ThemedText style={{ color: palette.muted }}>{experience.organization}</ThemedText>
                <ThemedText style={[styles.expDates, { color: palette.muted }]}>
                  {experience.startDate} - {experience.current ? 'Present' : experience.endDate}
                </ThemedText>
                {experience.description ? (
                  <ThemedText style={styles.expDesc}>{experience.description}</ThemedText>
                ) : null}
              </Column>
            </Row>
          ))}
        </SurfaceCard>
      )}

      {(coach.certifications?.length || coach.badges?.length) && (
        <SurfaceCard style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Proof
          </ThemedText>

          {coach.badges && coach.badges.length > 0 ? (
            <Row style={styles.proofGrid}>
              {coach.badges.map((badge, index) => (
                <Row
                  key={`${badge}-${index}`}
                  style={[styles.proofChip, { backgroundColor: withAlpha(palette.success, 0.1) }]}
                  align="center"
                  gap="xxs"
                >
                  <Ionicons name="checkmark-circle" size={12} color={palette.success} />
                  <ThemedText style={[styles.proofChipText, { color: palette.success }]}>
                    {badge}
                  </ThemedText>
                </Row>
              ))}
            </Row>
          ) : null}

          {coach.certifications?.map((certification, index) => (
            <Row key={`${certification.name}-${index}`} style={styles.certItem}>
              <Ionicons name="ribbon-outline" size={20} color={palette.tint} />
              <Column flex>
                <ThemedText type="defaultSemiBold">{certification.name}</ThemedText>
                <ThemedText style={{ color: palette.muted, ...Typography.small }}>
                  {certification.issuer} • {certification.issueDate}
                </ThemedText>
              </Column>
            </Row>
          ))}
        </SurfaceCard>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  tabContent: { padding: Spacing.lg, gap: Spacing.md },
  section: { gap: Spacing.sm },
  sectionTitle: { marginBottom: Spacing.xs },
  bioText: { lineHeight: Typography.body.lineHeight },
  summaryGrid: { flexWrap: 'wrap', gap: Spacing.xs },
  summaryChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  summaryChipText: { ...Typography.smallSemiBold },
  experienceItem: { gap: Spacing.sm, marginTop: Spacing.sm },
  expDot: { width: 8, height: 8, borderRadius: Radii.xs, marginTop: Spacing.xxs },
  expContent: { gap: Spacing.micro },
  expDates: { ...Typography.caption },
  expDesc: { ...Typography.small, marginTop: Spacing.xxs, lineHeight: Typography.caption.lineHeight },
  proofGrid: { flexWrap: 'wrap', gap: Spacing.xs },
  proofChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  proofChipText: {
    ...Typography.caption,
  },
  certItem: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
});
