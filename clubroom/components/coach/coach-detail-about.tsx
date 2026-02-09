import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Coach } from '@/services/coach-service';

interface CoachDetailAboutProps { coach: Coach; }

export const CoachDetailAbout = memo(function CoachDetailAbout({ coach }: CoachDetailAboutProps) {
  const { colors: palette } = useTheme();

  return (
    <Animated.View entering={FadeIn} style={styles.tabContent}>
      {coach.bio && (
        <SurfaceCard style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>About</ThemedText>
          <ThemedText style={styles.bioText}>{coach.bio}</ThemedText>
        </SurfaceCard>
      )}
      {coach.footballFocuses && coach.footballFocuses.length > 0 && (
        <SurfaceCard style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Specialties</ThemedText>
          <View style={styles.chipGrid}>
            {coach.footballFocuses.map((focus, index) => (
              <View key={index} style={[styles.chip, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                <ThemedText style={[styles.chipText, { color: palette.tint }]}>{focus}</ThemedText>
              </View>
            ))}
          </View>
        </SurfaceCard>
      )}
      {coach.experiences && coach.experiences.length > 0 && (
        <SurfaceCard style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Experience</ThemedText>
          {coach.experiences.map((exp, index) => (
            <View key={index} style={styles.experienceItem}>
              <View style={[styles.expDot, { backgroundColor: palette.tint }]} />
              <View style={styles.expContent}>
                <ThemedText type="defaultSemiBold">{exp.title}</ThemedText>
                <ThemedText style={{ color: palette.muted }}>{exp.organization}</ThemedText>
                <ThemedText style={[styles.expDates, { color: palette.muted }]}>{exp.startDate} - {exp.current ? 'Present' : exp.endDate}</ThemedText>
                {exp.description && <ThemedText style={styles.expDesc}>{exp.description}</ThemedText>}
              </View>
            </View>
          ))}
        </SurfaceCard>
      )}
      {coach.certifications && coach.certifications.length > 0 && (
        <SurfaceCard style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Certifications</ThemedText>
          {coach.certifications.map((cert, index) => (
            <View key={index} style={styles.certItem}>
              <Ionicons name="ribbon-outline" size={20} color={palette.tint} />
              <View style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold">{cert.name}</ThemedText>
                <ThemedText style={{ color: palette.muted, ...Typography.small }}>{cert.issuer} • {cert.issueDate}</ThemedText>
              </View>
            </View>
          ))}
        </SurfaceCard>
      )}
      {coach.languages && coach.languages.length > 0 && (
        <SurfaceCard style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Languages</ThemedText>
          <View style={styles.chipGrid}>
            {coach.languages.map((lang, index) => (
              <View key={index} style={[styles.chip, { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1 }]}>
                <ThemedText style={styles.chipText}>{lang.name} • {lang.proficiency}</ThemedText>
              </View>
            ))}
          </View>
        </SurfaceCard>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  tabContent: { padding: Spacing.lg, gap: Spacing.md },
  section: { gap: Spacing.sm },
  sectionTitle: { marginBottom: Spacing.xs },
  bioText: { lineHeight: 22 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.pill },
  chipText: { ...Typography.smallSemiBold },
  experienceItem: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  expDot: { width: 8, height: 8, borderRadius: Radii.xs, marginTop: Spacing.xxs },
  expContent: { flex: 1, gap: Spacing.micro },
  expDates: { ...Typography.caption },
  expDesc: { ...Typography.small, marginTop: Spacing.xxs, lineHeight: 18 },
  certItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
});
