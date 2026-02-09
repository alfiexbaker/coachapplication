/**
 * Cancel Booking Screen
 *
 * Multi-step cancellation flow for parents and coaches.
 * All state/logic in useBookingCancel hook.
 * Sections extracted to components/booking/cancel-*.tsx.
 */

import React from 'react';
import {
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { PageHeader } from '@/components/primitives/page-header';
import { CancelRefundPreview } from '@/components/booking/cancel-refund-preview';
import { CancelPolicyTiers } from '@/components/booking/cancel-policy-tiers';
import { CancelReasonPicker } from '@/components/booking/cancel-reason-picker';
import { CancelRescheduleStep } from '@/components/booking/cancel-reschedule-step';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useBookingCancel } from '@/hooks/use-booking-cancel';

export default function CancelBookingScreen() {
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: 'coach' | 'parent' }>();
  const { colors: palette } = useTheme();
  const cancel = useBookingCancel(id, mode);

  // Loading
  if (cancel.loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <PageHeader title="Cancel Booking" showBack onBackPress={() => router.back()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
        </View>
      </SafeAreaView>
    );
  }

  // Reschedule suggestion step
  if (cancel.step === 'reschedule_suggest') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <PageHeader title="Reschedule Instead?" showBack onBackPress={cancel.handleGoBack} />
        <CancelRescheduleStep
          isCoach={cancel.isCoach}
          sessionTime={cancel.sessionTime}
          sessionTitle={cancel.sessionTitle}
          onPropose={cancel.handleOpenCounterOffer}
          onContinueCancel={() => cancel.setStep('details')}
        />
      </SafeAreaView>
    );
  }

  // Main details step
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <PageHeader
        title={cancel.isCoach ? 'Cancel Session' : 'Cancel Booking'}
        showBack
        onBackPress={cancel.handleGoBack}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {cancel.isCoach && (
          <View style={[styles.coachBanner, { backgroundColor: withAlpha(palette.warning, 0.06), borderColor: withAlpha(palette.warning, 0.19) }]}>
            <Ionicons name="shield-outline" size={20} color={palette.warning} />
            <View style={styles.bannerText}>
              <ThemedText type="defaultSemiBold" style={{ ...Typography.bodySmall }}>Coach Cancellation</ThemedText>
              <ThemedText style={[styles.bannerDesc, { color: palette.muted }]}>
                The parent will be automatically notified. A reason is required.
              </ThemedText>
            </View>
          </View>
        )}

        <CancelRefundPreview isCoach={cancel.isCoach} bookingAmount={cancel.bookingAmount} refundCalc={cancel.refundCalc} />
        <CancelPolicyTiers policy={cancel.effectivePolicy} sortedTiers={cancel.sortedTiers} refundCalc={cancel.refundCalc} />
        <CancelReasonPicker isCoach={cancel.isCoach} reasons={cancel.filteredReasons} selectedReason={cancel.reason} onSelectReason={cancel.setReason} />

        {/* Message */}
        <SurfaceCard style={styles.messageCard}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            {cancel.isCoach ? `Message to ${cancel.athleteName}'s parent (optional)` : `Message to ${cancel.coachName} (optional)`}
          </ThemedText>
          <TextInput
            placeholder={cancel.isCoach ? 'Explain the cancellation to the parent...' : "Let them know why you're cancelling..."}
            placeholderTextColor={palette.muted}
            style={[styles.textArea, { borderColor: palette.border, color: palette.text, backgroundColor: palette.surface }]}
            value={cancel.note}
            onChangeText={cancel.setNote}
            multiline
            numberOfLines={4}
          />
        </SurfaceCard>

        {/* Waitlist toggle */}
        <SurfaceCard style={styles.waitlistCard}>
          <View style={styles.waitlistRow}>
            <View style={styles.waitlistInfo}>
              <View style={[styles.waitlistIcon, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
                <Ionicons name="people-outline" size={16} color={palette.success} />
              </View>
              <View style={styles.waitlistTextWrap}>
                <ThemedText type="defaultSemiBold" style={{ ...Typography.bodySmall }}>Notify Waitlist</ThemedText>
                <ThemedText style={[styles.waitlistHelper, { color: palette.muted }]}>
                  Alert athletes on the waitlist that a slot has opened
                </ThemedText>
              </View>
            </View>
            <Switch
              value={cancel.notifyWaitlist}
              onValueChange={(v) => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); cancel.setNotifyWaitlist(v); }}
              trackColor={{ false: palette.border, true: palette.success }}
              thumbColor={palette.surface}
            />
          </View>
        </SurfaceCard>

        {/* Reschedule CTA */}
        <Clickable
          onPress={cancel.handleRescheduleSuggest}
          style={[styles.rescheduleCta, { borderColor: palette.tint, backgroundColor: withAlpha(palette.tint, 0.02) }]}
        >
          <View style={[styles.rescheduleIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
            <Ionicons name="swap-horizontal" size={20} color={palette.tint} />
          </View>
          <View style={styles.rescheduleText}>
            <ThemedText type="defaultSemiBold" style={{ color: palette.tint, ...Typography.bodySmall }}>Reschedule instead?</ThemedText>
            <ThemedText style={[styles.rescheduleDesc, { color: palette.muted }]}>Move to a different time instead of cancelling</ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={palette.tint} />
        </Clickable>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: palette.border, backgroundColor: palette.background }]}>
        <View style={styles.footerContent}>
          {cancel.refundCalc && cancel.refundCalc.netRefundAmount > 0 && !cancel.isCoach && (
            <ThemedText style={[styles.footerRefund, { color: palette.muted }]}>
              Refund: {'\u00A3'}{cancel.refundCalc.netRefundAmount.toFixed(2)}
            </ThemedText>
          )}
          <Clickable
            onPress={cancel.handleCancel}
            disabled={cancel.processing || (cancel.isCoach && !cancel.canProceed)}
            style={[styles.cancelBtn, { backgroundColor: palette.error, opacity: cancel.processing || (cancel.isCoach && !cancel.canProceed) ? 0.5 : 1 }]}
          >
            {cancel.processing ? (
              <ActivityIndicator size="small" color={palette.onPrimary} />
            ) : (
              <>
                <Ionicons name="close-circle" size={20} color={palette.onPrimary} />
                <ThemedText style={[styles.cancelBtnText, { color: palette.onPrimary }]}>
                  {cancel.isCoach ? 'Cancel Session' : 'Confirm Cancellation'}
                </ThemedText>
              </>
            )}
          </Clickable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.md, paddingBottom: 140, gap: Spacing.md },
  coachBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, padding: Spacing.sm, borderRadius: Radii.sm, borderWidth: 1 },
  bannerText: { flex: 1 },
  bannerDesc: { ...Typography.caption, marginTop: Spacing.micro, lineHeight: 16 },
  messageCard: { padding: Spacing.md, gap: Spacing.sm },
  sectionTitle: { marginBottom: Spacing.xxs },
  textArea: { minHeight: 100, borderRadius: Radii.md, borderWidth: 1.5, padding: Spacing.md, textAlignVertical: 'top', ...Typography.body },
  waitlistCard: { padding: Spacing.sm },
  waitlistRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  waitlistInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1, marginRight: Spacing.sm },
  waitlistIcon: { width: 28, height: 28, borderRadius: Radii.lg, alignItems: 'center', justifyContent: 'center' },
  waitlistTextWrap: { flex: 1 },
  waitlistHelper: { ...Typography.caption, marginTop: 1 },
  rescheduleCta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.sm, borderRadius: Radii.card, borderWidth: 1.5 },
  rescheduleIcon: { width: 36, height: 36, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  rescheduleText: { flex: 1 },
  rescheduleDesc: { ...Typography.caption, marginTop: 1 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.md, borderTopWidth: 1 },
  footerContent: { gap: Spacing.xs },
  footerRefund: { textAlign: 'center', ...Typography.small },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, height: 44, borderRadius: Radii.card },
  cancelBtnText: { ...Typography.subheading },
});
