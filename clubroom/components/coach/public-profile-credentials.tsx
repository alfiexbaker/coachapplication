import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Components, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Coach } from '@/services/coach-service';
import { Row } from '@/components/primitives';

interface PublicProfileCredentialsProps {
  coach: Coach;
}

export const PublicProfileCredentials = memo(function PublicProfileCredentials({
  coach,
}: PublicProfileCredentialsProps) {
  const { colors: palette } = useTheme();

  return (
    <Animated.View entering={FadeIn} style={styles.container}>
      {coach.experiences && coach.experiences.length > 0 ? (
        <SurfaceCard style={styles.section}>
          <ThemedText style={[Typography.heading, { color: palette.text }]}>Experience</ThemedText>
          {coach.experiences.map((exp, i) => (
            <Row key={i} style={styles.expItem}>
              <View style={[styles.expDot, { backgroundColor: palette.tint }]} />
              <View style={{ flex: 1 }}>
                <ThemedText style={[Typography.bodySemiBold, { color: palette.text }]}>
                  {exp.title}
                </ThemedText>
                <ThemedText style={[Typography.body, { color: palette.muted }]}>
                  {exp.organization}
                </ThemedText>
                <ThemedText
                  style={[Typography.caption, { color: palette.muted, marginTop: Spacing.micro }]}
                >
                  {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
                </ThemedText>
                {exp.description ? (
                  <ThemedText
                    style={[Typography.small, { color: palette.text, marginTop: Spacing.xs / 2 }]}
                  >
                    {exp.description}
                  </ThemedText>
                ) : null}
              </View>
            </Row>
          ))}
        </SurfaceCard>
      ) : null}

      {coach.certifications && coach.certifications.length > 0 ? (
        <SurfaceCard style={styles.section}>
          <ThemedText style={[Typography.heading, { color: palette.text }]}>
            Certifications
          </ThemedText>
          {coach.certifications.map((cert, i) => (
            <Row key={i} style={styles.certItem}>
              <View style={[styles.certIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                <Ionicons name="ribbon-outline" size={Components.icon.md} color={palette.tint} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={[Typography.bodySemiBold, { color: palette.text }]}>
                  {cert.name}
                </ThemedText>
                <ThemedText style={[Typography.small, { color: palette.muted }]}>
                  {cert.issuer} {'\u2022'} {cert.issueDate}
                </ThemedText>
              </View>
            </Row>
          ))}
        </SurfaceCard>
      ) : null}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: { padding: Spacing.md, gap: Spacing.md },
  section: { gap: Spacing.sm },
  expItem: { gap: Spacing.sm, marginTop: Spacing.sm },
  expDot: { width: 8, height: 8, borderRadius: Radii.xs, marginTop: Spacing.xxs },
  certItem: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  certIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
