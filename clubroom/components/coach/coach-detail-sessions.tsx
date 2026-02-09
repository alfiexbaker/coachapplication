import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Button } from '@/components/primitives/button';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Coach } from '@/services/coach-service';

interface CoachDetailSessionsProps { coach: Coach; onBook: () => void; }

export const CoachDetailSessions = memo(function CoachDetailSessions({ coach, onBook }: CoachDetailSessionsProps) {
  const { colors: palette } = useTheme();

  return (
    <Animated.View entering={FadeIn} style={styles.tabContent}>
      {/* Pricing */}
      <SurfaceCard style={styles.section}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Pricing</ThemedText>
        <View style={styles.pricingRow}>
          <View style={styles.priceBox}>
            <ThemedText style={[styles.priceLabel, { color: palette.muted }]}>From</ThemedText>
            <ThemedText type="title" style={{ color: palette.tint }}>£{coach.minPriceUsd}</ThemedText>
            <ThemedText style={{ color: palette.muted, ...Typography.caption }}>per session</ThemedText>
          </View>
          {coach.maxPriceUsd && coach.maxPriceUsd !== coach.minPriceUsd && (
            <View style={styles.priceBox}>
              <ThemedText style={[styles.priceLabel, { color: palette.muted }]}>Up to</ThemedText>
              <ThemedText type="title" style={{ color: palette.tint }}>£{coach.maxPriceUsd}</ThemedText>
              <ThemedText style={{ color: palette.muted, ...Typography.caption }}>per session</ThemedText>
            </View>
          )}
        </View>
      </SurfaceCard>

      {/* Availability */}
      <SurfaceCard style={styles.section}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Availability</ThemedText>
        {coach.nextAvailable ? (
          <View style={styles.availabilityRow}>
            <Ionicons name="calendar-outline" size={20} color={palette.success} />
            <ThemedText>
              Next available:{' '}
              <ThemedText type="defaultSemiBold" style={{ color: palette.success }}>
                {new Date(coach.nextAvailable).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
              </ThemedText>
            </ThemedText>
          </View>
        ) : (
          <ThemedText style={{ color: palette.muted }}>Check availability when booking</ThemedText>
        )}
      </SurfaceCard>

      {/* Stats */}
      <SurfaceCard style={styles.section}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Stats</ThemedText>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <ThemedText type="title" style={{ color: palette.tint }}>{coach.totalSessions}</ThemedText>
            <ThemedText style={{ color: palette.muted, ...Typography.caption }}>Sessions</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText type="title" style={{ color: palette.tint }}>{coach.rating.toFixed(1)}</ThemedText>
            <ThemedText style={{ color: palette.muted, ...Typography.caption }}>Rating</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText type="title" style={{ color: palette.tint }}>{new Date().getFullYear() - new Date(coach.joinedAt || Date.now()).getFullYear()}+</ThemedText>
            <ThemedText style={{ color: palette.muted, ...Typography.caption }}>Years</ThemedText>
          </View>
        </View>
      </SurfaceCard>

      <Button onPress={onBook} style={styles.bookButton}>
        <Ionicons name="calendar" size={18} color={palette.onPrimary} />
        <ThemedText style={{ color: palette.onPrimary, fontWeight: '700', marginLeft: 8 }}>Book a Session</ThemedText>
      </Button>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  tabContent: { padding: Spacing.lg, gap: Spacing.md },
  section: { gap: Spacing.sm },
  sectionTitle: { marginBottom: Spacing.xs },
  pricingRow: { flexDirection: 'row', gap: Spacing.md },
  priceBox: { flex: 1, alignItems: 'center', padding: Spacing.md },
  priceLabel: { ...Typography.caption },
  availabilityRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', gap: Spacing.xxs },
  bookButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md },
});
