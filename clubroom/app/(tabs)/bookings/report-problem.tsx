import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { Booking } from '@/constants/types';
import { bookingService } from '@/services/booking-service';
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import { clubAuthorityService } from '@/services/club-authority-service';
import { safeguardingService } from '@/services/trust';
import type { CreateSafeguardingIncidentInput } from '@/services/trust/safeguarding-service';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { useRequiredParam } from '@/hooks/use-required-param';
import { Routes } from '@/navigation/routes';
import { createLogger } from '@/utils/logger';
import { uiFeedback } from '@/services/ui-feedback';
import {
  getBookingRelationshipContext,
  getBookingServiceLabel,
  safeDisplayLabel,
} from '@/utils/booking-display';
import { bookingCommunicationsService } from '@/services/booking-communications-service';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('ReportProblem');
const MIN_DETAILS_LENGTH = 10;

type ProblemCategory = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
};

type SupportContext = {
  booking: Booking;
  supportLabel: string;
};

type LoadState = 'loading' | 'ready' | 'unavailable' | 'error';

const problemCategories: ProblemCategory[] = [
  { id: 'coach-late', icon: 'time-outline', label: 'Coach was late' },
  { id: 'coach-noshow', icon: 'close-circle-outline', label: "Coach didn't arrive" },
  { id: 'location-issue', icon: 'location-outline', label: 'Location problem' },
  { id: 'quality', icon: 'star-outline', label: 'Session quality' },
  { id: 'safety', icon: 'shield-outline', label: 'Safety concern' },
  { id: 'other', icon: 'ellipsis-horizontal-outline', label: 'Other issue' },
];

const getApiReportCategory = (categoryId: string): CreateSafeguardingIncidentInput['category'] =>
  categoryId === 'safety' ? 'booking_issue_safety' : 'other';

const getApiReportSeverity = (categoryId: string): CreateSafeguardingIncidentInput['severity'] =>
  categoryId === 'safety' ? 'high' : 'medium';

function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return undefined;
  }
  return typeof error.code === 'string' ? error.code : undefined;
}

function isPermanentBookingFailure(error: unknown): boolean {
  return ['UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND'].includes(getErrorCode(error) ?? '');
}

export default function ReportProblemScreen() {
  const { colors: palette } = useTheme();
  const { currentUser, isLoading: authLoading } = useAuth();
  const currentUserRole = currentUser?.role;
  const bookingParam = useRequiredParam('bookingId');
  const bookingId = bookingParam.valid ? bookingParam.value : undefined;

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [supportContext, setSupportContext] = useState<SupportContext | null>(null);
  const [loadState, setLoadState] = useState<LoadState>(bookingId ? 'loading' : 'unavailable');

  const loadSupportContext = useCallback(async () => {
    if (authLoading) {
      setLoadState('loading');
      return;
    }
    if (
      !bookingId ||
      !currentUserRole ||
      currentUserRole === 'COACH' ||
      currentUserRole === 'ADMIN'
    ) {
      setSupportContext(null);
      setLoadState('unavailable');
      return;
    }

    setSupportContext(null);
    setLoadState('loading');

    try {
      const booking = await bookingService.getBooking(bookingId);
      if (!booking) {
        setLoadState('unavailable');
        return;
      }

      let organizationLabel: string | null = null;
      if (booking.actingAs === 'club' && booking.clubId) {
        const clubResult = await clubAuthorityService.getClubById(booking.clubId);
        if (!clubResult.success) {
          logger.warn('Failed to load club support context for booking report', {
            bookingId,
            clubId: booking.clubId,
            error: clubResult.error.message,
          });
          setLoadState('error');
          return;
        }
        organizationLabel = clubResult.data.name || safeDisplayLabel(booking.clubId, 'Club');
      }

      const deliveryLabel =
        booking.coachName ||
        safeDisplayLabel(booking.assigneeCoachId, safeDisplayLabel(booking.coachId, 'Coach'));
      const relationshipContext = getBookingRelationshipContext({
        actingAs: booking.actingAs,
        organizationLabel,
        coachLabel: booking.coachName || safeDisplayLabel(booking.coachId, 'Coach'),
        deliveredByLabel: deliveryLabel,
        commercialMode: booking.commercialMode,
      });

      setSupportContext({
        booking,
        supportLabel: relationshipContext.supportLabel,
      });
      setLoadState('ready');
    } catch (error) {
      logger.warn('Booking support context is unavailable', { bookingId, error });
      setSupportContext(null);
      setLoadState(isPermanentBookingFailure(error) ? 'unavailable' : 'error');
    }
  }, [authLoading, bookingId, currentUserRole]);

  useEffect(() => {
    void loadSupportContext();
  }, [loadSupportContext]);

  const trimmedDescription = description.trim();
  const supportDestination =
    supportContext?.supportLabel === 'Coach'
      ? 'the booking coach'
      : supportContext?.supportLabel;
  const canSubmit =
    loadState === 'ready' &&
    Boolean(supportContext) &&
    Boolean(selectedCategory) &&
    trimmedDescription.length >= MIN_DETAILS_LENGTH &&
    !submitting;

  const handleSubmit = async () => {
    if (!canSubmit || !supportContext || !selectedCategory || !bookingId) {
      return;
    }

    setSubmitError(null);
    setSubmitting(true);

    return await runAsyncTryCatchFinally(
      async () => {
        const booking = supportContext.booking;
        const selectedCategoryConfig = problemCategories.find(
          (category) => category.id === selectedCategory,
        );
        const categoryLabel = selectedCategoryConfig?.label ?? 'Booking issue';
        let incidentId: string | undefined;

        if (!apiClient.isMockMode) {
          const incidentResult = await safeguardingService.createIncident({
            athleteId: booking.athleteIds?.[0] ?? booking.athleteId,
            bookingId,
            category: getApiReportCategory(selectedCategory),
            severity: getApiReportSeverity(selectedCategory),
            summary: `${categoryLabel} reported for ${getBookingServiceLabel(booking)}`,
            details: `Issue type: ${categoryLabel}\n\n${trimmedDescription}`,
          });

          if (!incidentResult.success) {
            setSubmitError(incidentResult.error.message);
            return;
          }

          incidentId = incidentResult.data.id;
        }

        const newReport = {
          id: incidentId ?? `report_${Date.now()}`,
          bookingId,
          category: selectedCategory,
          description: trimmedDescription,
          status: 'pending',
          createdAt: new Date().toISOString(),
          ...(incidentId ? { incidentId } : {}),
        };

        if (apiClient.isMockMode) {
          const reports = await apiClient.get<Record<string, unknown>[]>(
            STORAGE_KEYS.PROBLEM_REPORTS,
            [],
          );
          reports.push(newReport);
          await apiClient.set(STORAGE_KEYS.PROBLEM_REPORTS, reports);
        }

        emitTyped(ServiceEvents.PROBLEM_REPORT_CREATED, {
          reportId: newReport.id,
          bookingId,
          clubId: booking.clubId,
        });

        const communicationResult =
          await bookingCommunicationsService.notifySupportIssueReported({
            booking,
            category: selectedCategory,
            description: trimmedDescription,
          });
        if (!communicationResult.success) {
          logger.warn('Problem report was saved but mock notification routing failed', {
            reportId: newReport.id,
            bookingId,
            error: communicationResult.error.message,
          });
        }

        logger.info('Report submitted', { category: selectedCategory, bookingId });
        uiFeedback.showToast(`Report sent to ${supportDestination}.`, 'success');
        router.back();
      },
      async (error) => {
        logger.error('Failed to submit report', error);
        setSubmitError('Report not sent. Try again.');
      },
      () => {
        setSubmitting(false);
      },
    );
  };

  const renderStateShell = (content: ReactNode) => (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['bottom']}
    >
      <View style={styles.stateContent}>{content}</View>
    </SafeAreaView>
  );

  if (!bookingId || loadState === 'unavailable') {
    return renderStateShell(
      <EmptyState
        context="bookings"
        title="Booking unavailable"
        message="This session is not available to your account."
        actionLabel="Back to bookings"
        onPressAction={() => router.replace(Routes.BOOKINGS)}
      />,
    );
  }

  if (loadState === 'loading') {
    return renderStateShell(
      <LoadingState variant="form" accessibilityLabel="Loading booking report" />,
    );
  }

  if (loadState === 'error' || !supportContext) {
    return renderStateShell(
      <ErrorState
        title="Could not load this booking"
        message="Check your connection and try again."
        onRetry={() => void loadSupportContext()}
      />,
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['bottom']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <ThemedText style={[styles.destination, { color: palette.muted }]}>
            Sent to {supportDestination}
          </ThemedText>

          <View style={styles.section}>
            <ThemedText style={styles.label}>What happened?</ThemedText>
            <View style={styles.categoryList}>
              {problemCategories.map((category) => {
                const isSelected = selectedCategory === category.id;
                return (
                  <Clickable
                    key={category.id}
                    onPress={() => {
                      setSelectedCategory(category.id);
                      setSubmitError(null);
                    }}
                    accessibilityLabel={category.label}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    style={({ pressed }) => [
                      styles.categoryRow,
                      {
                        borderColor: isSelected ? palette.tint : palette.border,
                        backgroundColor: isSelected
                          ? withAlpha(palette.tint, 0.08)
                          : palette.surface,
                      },
                      pressed && { opacity: 0.72 },
                    ]}
                  >
                    <Ionicons
                      name={category.icon}
                      size={20}
                      color={isSelected ? palette.tint : palette.icon}
                    />
                    <ThemedText
                      style={[
                        styles.categoryLabel,
                        { color: isSelected ? palette.tint : palette.foreground },
                      ]}
                    >
                      {category.label}
                    </ThemedText>
                    {isSelected ? (
                      <Ionicons name="checkmark" size={20} color={palette.tint} />
                    ) : null}
                  </Clickable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.label}>Details</ThemedText>
            <TextInput
              value={description}
              onChangeText={(value) => {
                setDescription(value);
                setSubmitError(null);
              }}
              accessibilityLabel="Issue details"
              placeholder="Describe what happened"
              placeholderTextColor={palette.muted}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              style={[
                styles.textArea,
                {
                  color: palette.foreground,
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
              maxLength={500}
            />
            <ThemedText style={[styles.helper, { color: palette.muted }]}>
              {description.length}/500 · Minimum {MIN_DETAILS_LENGTH}
            </ThemedText>
          </View>

          {selectedCategory === 'safety' ? (
            <View
              style={[
                styles.safetyNotice,
                {
                  borderColor: withAlpha(palette.warning, 0.36),
                  backgroundColor: withAlpha(palette.warning, 0.08),
                },
              ]}
            >
              <Ionicons name="warning-outline" size={20} color={palette.warning} />
              <ThemedText style={styles.safetyText}>
                If anyone is in immediate danger, contact emergency services.
              </ThemedText>
            </View>
          ) : null}
        </ScrollView>

        <View
          style={[
            styles.footer,
            { backgroundColor: palette.background, borderTopColor: palette.border },
          ]}
        >
          {submitError ? (
            <ThemedText
              accessibilityRole="alert"
              style={[styles.submitError, { color: palette.error }]}
            >
              {submitError}
            </ThemedText>
          ) : null}
          <Clickable
            onPress={handleSubmit}
            disabled={!canSubmit}
            accessibilityLabel="Send report"
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit, busy: submitting }}
            style={({ pressed }) => [
              styles.submitButton,
              { backgroundColor: palette.tint },
              !canSubmit && { opacity: 0.45 },
              pressed && canSubmit && { opacity: 0.8 },
            ]}
          >
            <ThemedText style={[styles.submitText, { color: palette.onPrimary }]}>
              {submitting ? 'Sending…' : 'Send report'}
            </ThemedText>
          </Clickable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stateContent: {
    flex: 1,
    justifyContent: 'center',
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  destination: {
    ...Typography.bodySmall,
  },
  section: {
    gap: Spacing.sm,
  },
  label: {
    ...Typography.bodySemiBold,
  },
  categoryList: {
    gap: Spacing.xs,
  },
  categoryRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radii.md,
  },
  categoryLabel: {
    ...Typography.body,
    flex: 1,
  },
  textArea: {
    minHeight: 136,
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: Radii.md,
    ...Typography.body,
  },
  helper: {
    ...Typography.caption,
    textAlign: 'right',
  },
  safetyNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: Radii.md,
  },
  safetyText: {
    ...Typography.bodySmall,
    flex: 1,
  },
  footer: {
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  submitError: {
    ...Typography.bodySmall,
  },
  submitButton: {
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radii.md,
  },
  submitText: {
    ...Typography.bodySemiBold,
  },
});
