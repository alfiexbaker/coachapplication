/**
 * Cancel Booking Screen
 *
 * Multi-step cancellation flow for parents and coaches.
 * All state/logic in useBookingCancel hook.
 * Sections extracted to components/booking/cancel-*.tsx.
 */

import React, { type ReactNode } from 'react';
import { ScrollView, StyleSheet, TextInput, View, Switch, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { PageHeader } from '@/components/primitives/page-header';
import { CancelRefundPreview } from '@/components/booking/cancel-refund-preview';
import { CancelPolicyTiers } from '@/components/booking/cancel-policy-tiers';
import { CancelReasonPicker } from '@/components/booking/cancel-reason-picker';
import { CancelRescheduleStep } from '@/components/booking/cancel-reschedule-step';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useBookingCancel } from '@/hooks/use-booking-cancel';

export default function CancelBookingScreen() {
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: 'coach' | 'parent' }>();
  const cancel = useBookingCancel(id, mode);
  const palette = cancel.colors;
  const renderScreen = ({
    title,
    onBackPress,
    content,
  }: {
    title: string;
    onBackPress: () => void;
    content: ReactNode;
  }) => (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader title={title} showBack onBackPress={onBackPress} />
      {content}
    </SafeAreaView>
  );

  // Loading
  if (cancel.status === 'loading') {
    return renderScreen({
      title: 'Cancel Booking',
      onBackPress: () => router.back(),
      content: <LoadingState variant="detail" />,
    });
  }

  if (cancel.status === 'error') {
    return renderScreen({
      title: 'Cancel Booking',
      onBackPress: () => router.back(),
      content: (
        <ErrorState
          message={cancel.error?.message ?? 'Failed to load booking cancellation details.'}
          onRetry={cancel.retry}
        />
      ),
    });
  }

  if (cancel.status === 'empty') {
    return renderScreen({
      title: 'Cancel Booking',
      onBackPress: () => router.back(),
      content: (
        <EmptyState
          icon="calendar-outline"
          title="Booking not found"
          message="This booking could not be loaded. It may have been removed or already cancelled."
          actionLabel="Go back"
          onPressAction={() => router.back()}
        />
      ),
    });
  }

  // Reschedule suggestion step
  if (cancel.step === 'reschedule_suggest') {
    return renderScreen({
      title: 'Reschedule Instead?',
      onBackPress: cancel.handleGoBack,
      content: (
        <CancelRescheduleStep
          isCoach={cancel.isCoach}
          sessionTime={cancel.sessionTime}
          sessionTitle={cancel.sessionTitle}
          onPropose={cancel.handleOpenCounterOffer}
          onContinueCancel={() => cancel.setStep('details')}
        />
      ),
    });
  }

  // Main details step
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader
        title={cancel.isCoach ? 'Cancel Session' : 'Cancel Booking'}
        showBack
        onBackPress={cancel.handleGoBack}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={cancel.refreshing}
            onRefresh={cancel.onRefresh}
            tintColor={palette.tint}
          />
        }
      >
        {cancel.isCoach && (
          <Row
            style={[
              styles.coachBanner,
              {
                backgroundColor: withAlpha(palette.warning, 0.06),
                borderColor: withAlpha(palette.warning, 0.19),
              },
            ]}
          >
            <Ionicons name="shield-outline" size={20} color={palette.warning} />
            <View style={styles.bannerText}>
              <ThemedText type="defaultSemiBold" style={{ ...Typography.bodySmall }}>
                Coach Cancellation
              </ThemedText>
              <ThemedText style={[styles.bannerDesc, { color: palette.muted }]}>
                The parent will be automatically notified. A reason is required.
              </ThemedText>
            </View>
          </Row>
        )}

        <CancelRefundPreview
          isCoach={cancel.isCoach}
          bookingAmount={cancel.bookingAmount}
          refundCalc={cancel.refundCalc}
        />
        <CancelPolicyTiers
          policy={cancel.effectivePolicy}
          sortedTiers={cancel.sortedTiers}
          refundCalc={cancel.refundCalc}
        />
        <CancelReasonPicker
          isCoach={cancel.isCoach}
          reasons={cancel.filteredReasons}
          selectedReason={cancel.reason}
          onSelectReason={cancel.setReason}
        />

        {/* Message */}
        <SurfaceCard style={styles.messageCard}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            {cancel.isCoach
              ? `Message to ${cancel.athleteName}'s parent (optional)`
              : `Message to ${cancel.coachName} (optional)`}
          </ThemedText>
          <TextInput
            placeholder={
              cancel.isCoach
                ? 'Explain the cancellation to the parent...'
                : "Let them know why you're cancelling..."
            }
            placeholderTextColor={palette.muted}
            style={[
              styles.textArea,
              {
                borderColor: palette.border,
                color: palette.text,
                backgroundColor: palette.surface,
              },
            ]}
            value={cancel.note}
            onChangeText={cancel.setNote}
            multiline
            numberOfLines={4}

            maxLength={500}
          />
        </SurfaceCard>

        {/* Waitlist toggle */}
        <SurfaceCard style={styles.waitlistCard}>
          <Row style={styles.waitlistRow}>
            <Row style={styles.waitlistInfo}>
              <View
                style={[styles.waitlistIcon, { backgroundColor: withAlpha(palette.success, 0.09) }]}
              >
                <Ionicons name="people-outline" size={16} color={palette.success} />
              </View>
              <View style={styles.waitlistTextWrap}>
                <ThemedText type="defaultSemiBold" style={{ ...Typography.bodySmall }}>
                  Notify Waitlist
                </ThemedText>
                <ThemedText style={[styles.waitlistHelper, { color: palette.muted }]}>
                  Alert athletes on the waitlist that a slot has opened
                </ThemedText>
              </View>
            </Row>
            <Switch
              value={cancel.notifyWaitlist}
              onValueChange={(v) => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                cancel.setNotifyWaitlist(v);
              }}
              trackColor={{ false: palette.border, true: palette.success }}
              thumbColor={palette.surface}
            />
          </Row>
        </SurfaceCard>

        {/* Reschedule CTA */}
        <Clickable
          onPress={cancel.handleRescheduleSuggest}
          style={[
            styles.rescheduleCta,
            { borderColor: palette.tint, backgroundColor: withAlpha(palette.tint, 0.02) },
          ]}
        >
          <Row align="center" gap="sm">
            <View
              style={[styles.rescheduleIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}
            >
              <Ionicons name="swap-horizontal" size={20} color={palette.tint} />
            </View>
            <View style={styles.rescheduleText}>
              <ThemedText
                type="defaultSemiBold"
                style={{ color: palette.tint, ...Typography.bodySmall }}
              >
                Reschedule instead?
              </ThemedText>
              <ThemedText style={[styles.rescheduleDesc, { color: palette.muted }]}>
                Move to a different time instead of cancelling
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={palette.tint} />
          </Row>
        </Clickable>
      </ScrollView>

      {/* Footer */}
      <View
        style={[
          styles.footer,
          { borderTopColor: palette.border, backgroundColor: palette.background },
        ]}
      >
        <View style={styles.footerContent}>
          {cancel.refundCalc && cancel.refundCalc.netRefundAmount > 0 && !cancel.isCoach && (
            <ThemedText style={[styles.footerRefund, { color: palette.muted }]}>
              Refund: {'\u00A3'}
              {cancel.refundCalc.netRefundAmount.toFixed(2)}
            </ThemedText>
          )}
          <Clickable
            onPress={cancel.handleCancel}
            disabled={cancel.processing || (cancel.isCoach && !cancel.canProceed)}
            style={[
              styles.cancelBtn,
              {
                backgroundColor: palette.error,
                opacity: cancel.processing || (cancel.isCoach && !cancel.canProceed) ? 0.5 : 1,
              },
            ]}
          >
            <Row align="center" justify="center" gap="sm">
              <Ionicons
                name={cancel.processing ? 'time-outline' : 'close-circle'}
                size={20}
                color={palette.onPrimary}
              />
              <ThemedText style={[styles.cancelBtnText, { color: palette.onPrimary }]}>
                {cancel.processing
                  ? 'Cancelling...'
                  : cancel.isCoach
                    ? 'Cancel Session'
                    : 'Confirm Cancellation'}
              </ThemedText>
            </Row>
          </Clickable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.lg, gap: Spacing.md },
  coachBanner: {
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  bannerText: { flex: 1 },
  bannerDesc: { ...Typography.caption, marginTop: Spacing.micro, lineHeight: 16 },
  messageCard: { padding: Spacing.md, gap: Spacing.sm },
  sectionTitle: { marginBottom: Spacing.xxs },
  textArea: {
    minHeight: 100,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    padding: Spacing.md,
    textAlignVertical: 'top',
    ...Typography.body,
  },
  waitlistCard: { padding: Spacing.sm },
  waitlistRow: { alignItems: 'center', justifyContent: 'space-between' },
  waitlistInfo: { alignItems: 'center', gap: Spacing.sm, flex: 1, marginRight: Spacing.sm },
  waitlistIcon: {
    width: 28,
    height: 28,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitlistTextWrap: { flex: 1 },
  waitlistHelper: { ...Typography.caption, marginTop: 1 },
  rescheduleCta: { padding: Spacing.sm, borderRadius: Radii.card, borderWidth: 1.5 },
  rescheduleIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rescheduleText: { flex: 1 },
  rescheduleDesc: { ...Typography.caption, marginTop: 1 },
  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  footerContent: { gap: Spacing.xs },
  footerRefund: { textAlign: 'center', ...Typography.small },
  cancelBtn: { height: 44, borderRadius: Radii.card },
  cancelBtnText: { ...Typography.subheading },
});
