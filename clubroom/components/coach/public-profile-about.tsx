import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { MOCK_SESSION_TYPES } from '@/hooks/use-public-profile';
import type { Coach } from '@/services/coach-service';
import { Row } from '@/components/primitives';

interface PublicProfileAboutProps {
  coach: Coach;
}

export const PublicProfileAbout = memo(function PublicProfileAbout({ coach }: PublicProfileAboutProps) {
  const { colors: palette } = useTheme();

  return (
    <Animated.View entering={FadeIn} style={styles.container}>
      {coach.bio ? (
        <SurfaceCard style={styles.section}>
          <ThemedText style={[Typography.heading, { color: palette.text }]}>About</ThemedText>
          <ThemedText style={[Typography.body, { color: palette.text, marginTop: Spacing.xs }]}>{coach.bio}</ThemedText>
        </SurfaceCard>
      ) : null}

      <SurfaceCard style={styles.section}>
        <ThemedText style={[Typography.heading, { color: palette.text }]}>Available Sessions</ThemedText>
        {MOCK_SESSION_TYPES.map((session) => (
          <Row key={session.id} style={[styles.sessionRow, { borderBottomColor: palette.border }]}>
            <View style={{ flex: 1 }}>
              <ThemedText style={[Typography.bodySemiBold, { color: palette.text }]}>{session.name}</ThemedText>
              <ThemedText style={[Typography.small, { color: palette.muted, marginTop: Spacing.micro }]}>{session.description}</ThemedText>
              <ThemedText style={[Typography.caption, { color: palette.muted, marginTop: Spacing.xs / 2 }]}>{session.duration} min</ThemedText>
            </View>
            <View style={styles.priceBlock}>
              <ThemedText style={[Typography.heading, { color: palette.tint }]}>{'\u00A3'}{session.price}</ThemedText>
              {session.isTrialAvailable && (
                <View style={[styles.trialBadge, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
                  <ThemedText style={[Typography.micro, { color: palette.success }]}>TRIAL {'\u00A3'}{session.trialPrice}</ThemedText>
                </View>
              )}
            </View>
          </Row>
        ))}
      </SurfaceCard>

      <SurfaceCard style={styles.section}>
        <ThemedText style={[Typography.heading, { color: palette.text }]}>Stats</ThemedText>
        <Row style={styles.statsGrid}>
          <View style={styles.statItem}>
            <ThemedText style={[Typography.title, { color: palette.tint }]}>{coach.totalSessions}</ThemedText>
            <ThemedText style={[Typography.caption, { color: palette.muted }]}>Sessions</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={[Typography.title, { color: palette.tint }]}>{coach.rating.toFixed(1)}</ThemedText>
            <ThemedText style={[Typography.caption, { color: palette.muted }]}>Rating</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={[Typography.title, { color: palette.tint }]}>
              {new Date().getFullYear() - new Date(coach.joinedAt || Date.now()).getFullYear()}+
            </ThemedText>
            <ThemedText style={[Typography.caption, { color: palette.muted }]}>Years</ThemedText>
          </View>
        </Row>
      </SurfaceCard>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: { padding: Spacing.md, gap: Spacing.md },
  section: { gap: Spacing.sm },
  sessionRow: { alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  priceBlock: { alignItems: 'flex-end', gap: Spacing.xs / 2 },
  trialBadge: { paddingHorizontal: Spacing.xs, paddingVertical: Spacing.micro, borderRadius: Radii.sm },
  statsGrid: { justifyContent: 'space-around', marginTop: Spacing.xs },
  statItem: { alignItems: 'center', gap: Spacing.xs / 2 },
});
