/**
 * BookingFlowStepper -- Flow header, step icons, context cards, and callout.
 */
import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { CoachProfile } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

import { athleteProfile, bookingSteps } from './booking-flow-types';
import { Row } from '@/components/primitives';

interface BookingFlowStepperProps {
  coach?: CoachProfile;
}

function BookingFlowStepperInner({ coach }: BookingFlowStepperProps) {
  const { colors: palette } = useTheme();

  return (
    <SurfaceCard style={styles.flowCard}>
      <Row style={styles.flowHeader}>
        <ThemedText type="eyebrow">Booking flow</ThemedText>
        <Row style={[styles.liveBadge, { backgroundColor: withAlpha(palette.tint, 0.07) }]}>
          <Ionicons name="sparkles-outline" size={16} color={palette.tint} />
          <ThemedText style={[styles.badgeLabel, { color: palette.tint }]}>Coach-led</ThemedText>
        </Row>
      </Row>
      <ThemedText type="title" style={styles.flowTitle}>A coaching-first journey</ThemedText>
      <ThemedText style={styles.flowSubtitle}>
        Instead of generic sports marketplaces, families move through a bespoke coaching intake—context,
        schedule, and confirmation—so every rep has purpose.
      </ThemedText>

      {/* Stepper */}
      <Row style={styles.stepper}>
        {bookingSteps.map((step, index) => (
          <View key={step.id} style={styles.stepItem}>
            <View style={[
              styles.stepIcon,
              step.status === 'complete' && { backgroundColor: palette.tint },
              step.status === 'current' && { borderColor: palette.tint },
              step.status === 'upcoming' && { borderColor: palette.border },
            ]}>
              {step.status === 'complete' ? (
                <Ionicons name="checkmark" size={16} color={palette.onPrimary} />
              ) : (
                <ThemedText style={[
                  styles.stepCount,
                  step.status === 'current' && { color: palette.tint },
                  step.status === 'upcoming' && { color: palette.muted },
                ]}>
                  {index + 1}
                </ThemedText>
              )}
            </View>
            <ThemedText type="defaultSemiBold">{step.title}</ThemedText>
            <ThemedText style={styles.stepDescription}>{step.description}</ThemedText>
          </View>
        ))}
      </Row>

      {/* Context cards */}
      <Row style={styles.contextRow}>
        <View style={[styles.contextCard, { borderColor: palette.border, backgroundColor: palette.surface }]}>
          <ThemedText type="defaultSemiBold">Selected coach</ThemedText>
          <ThemedText style={styles.contextPrimary}>{coach?.fullName ?? 'Tap a coach to preview'}</ThemedText>
          <ThemedText style={styles.contextMeta}>
            {coach ? coach.footballFocuses.slice(0, 2).join(' \u00B7 ') : 'Focus areas appear here'}
          </ThemedText>
        </View>
        <View style={[styles.contextCard, { borderColor: palette.border, backgroundColor: palette.surface }]}>
          <ThemedText type="defaultSemiBold">Athlete lane</ThemedText>
          <ThemedText style={styles.contextPrimary}>{athleteProfile.name}</ThemedText>
          <ThemedText style={styles.contextMeta}>
            {athleteProfile.readiness} {'\u00B7'} {athleteProfile.cadence}
          </ThemedText>
        </View>
      </Row>

      {/* Callout */}
      <Row style={[styles.callout, { backgroundColor: withAlpha(palette.warning, 0.1) }]}>
        <Ionicons name="document-text-outline" size={20} color={palette.secondary} />
        <View style={styles.calloutCopy}>
          <ThemedText type="defaultSemiBold">Session blueprint ready</ThemedText>
          <ThemedText style={styles.flowSubtitle}>
            Once the slot is locked, Clubroom auto-generates prep docs, checklists, and shareable recaps.
          </ThemedText>
        </View>
      </Row>
    </SurfaceCard>
  );
}

export const BookingFlowStepper = memo(BookingFlowStepperInner);

const styles = StyleSheet.create({
  flowCard: { gap: Spacing.sm },
  flowHeader: { justifyContent: 'space-between', alignItems: 'center' },
  flowTitle: { lineHeight: 32 },
  flowSubtitle: { opacity: 0.8 },
  liveBadge: { alignItems: 'center', gap: Spacing.xs, borderRadius: Radii.pill, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs },
  badgeLabel: { ...Typography.caption, textTransform: 'uppercase' },
  stepper: { flexWrap: 'wrap', gap: Spacing.sm },
  stepItem: { flex: 1, minWidth: 140, gap: Spacing.xs },
  stepIcon: { width: 36, height: 36, borderRadius: Radii.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepCount: { fontWeight: '600' },
  stepDescription: { opacity: 0.8 },
  contextRow: { flexWrap: 'wrap', gap: Spacing.sm },
  contextCard: { flex: 1, minWidth: 180, padding: Spacing.sm, borderRadius: Radii.lg, borderWidth: 1 },
  contextPrimary: { ...Typography.lg, fontWeight: '600' },
  contextMeta: { opacity: 0.75 },
  callout: { gap: Spacing.sm, borderRadius: Radii.lg, padding: Spacing.sm, alignItems: 'center' },
  calloutCopy: { flex: 1, gap: Spacing.micro },
});
