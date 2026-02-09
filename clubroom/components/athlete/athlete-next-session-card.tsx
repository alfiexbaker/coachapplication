import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { RosterEntry } from '@/constants/types';

export const NextSessionCard = React.memo(function NextSessionCard({
  athlete,
}: {
  athlete: RosterEntry;
}) {
  const { colors } = useTheme();

  const handleBook = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(Routes.rosterAthleteAddToSession(athlete.athleteId));
  }, [athlete.athleteId]);

  if (athlete.nextSessionDate) {
    const date = new Date(athlete.nextSessionDate);
    return (
      <SurfaceCard style={styles.card}>
        <Row gap="sm" align="center">
          <View style={[styles.calendarIcon, { backgroundColor: withAlpha(colors.success, 0.09) }]}>
            <Ionicons name="calendar" size={20} color={colors.success} />
          </View>
          <Column gap="micro" style={styles.flex1}>
            <ThemedText type="defaultSemiBold">Next Session</ThemedText>
            <ThemedText style={[styles.sessionDate, { color: colors.success }]}>
              {date.toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </ThemedText>
          </Column>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </Row>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard style={[styles.card, { borderColor: withAlpha(colors.warning, 0.2) }]}>
      <Row gap="sm" align="center">
        <View style={[styles.calendarIcon, { backgroundColor: withAlpha(colors.warning, 0.09) }]}>
          <Ionicons name="calendar-outline" size={20} color={colors.warning} />
        </View>
        <Column gap="micro" style={styles.flex1}>
          <ThemedText type="defaultSemiBold">No Upcoming Session</ThemedText>
          <ThemedText style={[styles.hint, { color: colors.muted }]}>
            Book a session to keep progress on track
          </ThemedText>
        </Column>
      </Row>
      <Button onPress={handleBook} style={styles.bookButton}>
        Book Now
      </Button>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
  },
  flex1: { flex: 1 },
  calendarIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionDate: {
    ...Typography.bodySemiBold,
  },
  hint: {
    ...Typography.bodySmall,
  },
  bookButton: {
    alignSelf: 'flex-start',
    marginTop: Spacing.xxs,
  },
});
