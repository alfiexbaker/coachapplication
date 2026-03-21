import { useCallback, useEffect, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { BookingWizardHeader } from '@/components/ui/booking/booking-wizard';
import { SessionTypeSelector } from '@/components/ui/booking/session-type-selector';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { ErrorState } from '@/components/ui/screen-states';
import { Radii, Spacing, withAlpha } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { err, ok, serviceError } from '@/types/result';
import { useBookingFlow } from '@/context/booking-flow-context';
import { apiClient } from '@/services/api-client';
import { bookingStepAnalyticsService } from '@/services/booking/booking-step-analytics-service';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { SessionOffering } from '@/constants/session-types';
import { getSessionOfferingHeadcount } from '@/utils/session-offering-capacity';
import { accountIdsMatch } from '@/utils/account-id';
import {
  buildBookingDraftPatchFromOffering,
  getOfferingDuration,
} from '@/utils/booking-draft-prefill';
import { useChildContext } from '@/hooks/use-child-context';
import { useAuth } from '@/hooks/use-auth';
import { hasAccountChildren } from '@/utils/booking-self-capability';

function formatOfferingCategory(offering: SessionOffering): string {
  if (offering.sessionType === '1on1') {
    return '1-to-1 Training';
  }
  if (offering.maxParticipants <= 6) {
    return 'Small Group Training';
  }
  return 'Group Training';
}

function formatCapacityLabel(offering: SessionOffering): string {
  return offering.sessionType === '1on1' ? '1 athlete' : `up to ${offering.maxParticipants}`;
}

function formatAgeBand(offering: SessionOffering): string | null {
  if (typeof offering.ageMin === 'number' && typeof offering.ageMax === 'number') {
    return `Ages ${offering.ageMin}-${offering.ageMax}`;
  }
  if (typeof offering.ageMin === 'number') {
    return `Ages ${offering.ageMin}+`;
  }
  if (typeof offering.ageMax === 'number') {
    return `Ages up to ${offering.ageMax}`;
  }
  return null;
}

function formatOfferingLocation(offering: SessionOffering): string {
  if (offering.venueName) {
    return `${offering.venueName} · ${offering.location}`;
  }
  return offering.location;
}

function sortOfferings(offerings: SessionOffering[]): SessionOffering[] {
  return [...offerings].sort((a, b) => {
    const typeOrderA = a.sessionType === '1on1' ? 0 : 1;
    const typeOrderB = b.sessionType === '1on1' ? 0 : 1;
    if (typeOrderA !== typeOrderB) return typeOrderA - typeOrderB;
    const priceA = a.price ?? 0;
    const priceB = b.price ?? 0;
    if (priceA !== priceB) return priceA - priceB;
    return a.title.localeCompare(b.title);
  });
}

function dedupeOfferings(offerings: SessionOffering[], preferredOfferingId?: string): SessionOffering[] {
  const bySignature = new Map<string, SessionOffering>();
  for (const offering of offerings) {
    const signature = [
      offering.title.trim().toLowerCase(),
      offering.sessionType,
      getOfferingDuration(offering),
      offering.price ?? 0,
      offering.maxParticipants,
    ].join('|');
    const existing = bySignature.get(signature);
    if (!existing) {
      bySignature.set(signature, offering);
      continue;
    }

    if (preferredOfferingId && offering.id === preferredOfferingId) {
      bySignature.set(signature, offering);
      continue;
    }

    const existingTime = new Date(existing.scheduledAt).getTime();
    const currentTime = new Date(offering.scheduledAt).getTime();
    if (Number.isFinite(currentTime) && (!Number.isFinite(existingTime) || currentTime < existingTime)) {
      bySignature.set(signature, offering);
    }
  }
  return sortOfferings(Array.from(bySignature.values()));
}

export default function SessionTypeScreen() {
  const { coachId, offeringId, childId, source, weeks } = useLocalSearchParams<{
    coachId: string;
    offeringId?: string;
    childId?: string;
    weeks?: string;
    source?: string;
  }>();
  const { children } = useChildContext();
  const { currentUser } = useAuth();
  const { draft, updateDraft } = useBookingFlow();
  const accountHasChildren = hasAccountChildren({
    contextChildCount: children.length,
    accountChildRefCount: currentUser?.children?.length ?? 0,
  });
  const preselectedChild = useMemo(() => {
    if (!childId) return null;
    if (currentUser?.id && childId === currentUser.id) {
      return {
        id: currentUser.id,
        name: currentUser.name || currentUser.fullName || 'Athlete',
      };
    }
    const matchedChild = children.find((child) => child.id === childId);
    if (!matchedChild) return null;
    return {
      id: matchedChild.id,
      name: matchedChild.name,
    };
  }, [childId, children, currentUser?.fullName, currentUser?.id, currentUser?.name]);
  const loadOfferings = useCallback(async () => {
    if (!coachId) {
      return err(serviceError('VALIDATION', 'Coach information is missing for booking.'));
    }

    try {
      const now = Date.now();
      const offerings = await apiClient.get<SessionOffering[]>(STORAGE_KEYS.SESSION_OFFERINGS, []);
      const coachOfferings = offerings.filter((offering) => {
        if (!accountIdsMatch(offering.coachId, coachId)) return false;
        if (offering.status !== 'active') return false;

        const startsAt = new Date(offering.scheduledAt).getTime();
        const isUpcoming = offering.isRecurring || (Number.isFinite(startsAt) && startsAt >= now);
        if (!isUpcoming) return false;

        const headcount = getSessionOfferingHeadcount(offering);
        return headcount < offering.maxParticipants;
      });

      return ok(dedupeOfferings(coachOfferings, offeringId));
    } catch (loadError) {
      return err(serviceError('UNKNOWN', 'Failed to load coach offerings.', loadError));
    }
  }, [coachId, offeringId]);

  const {
    data: offerings,
    status,
    error,
    retry,
    colors: palette,
  } = useScreen<SessionOffering[]>({
    load: loadOfferings,
    deps: [loadOfferings],
    isEmpty: () => false,
    refetchOnFocus: true,
  });

  const resolvedOfferings = useMemo(() => offerings ?? [], [offerings]);
  const selectedOffering = useMemo(
    () => resolvedOfferings.find((offering) => offering.id === draft.sessionOfferingId),
    [resolvedOfferings, draft.sessionOfferingId],
  );

  useEffect(() => {
    if (!coachId || resolvedOfferings.length === 0) return;
    const currentlySelected = resolvedOfferings.find(
      (offering) => offering.id === draft.sessionOfferingId,
    );
    if (currentlySelected) return;

    const preferred =
      (offeringId ? resolvedOfferings.find((offering) => offering.id === offeringId) : undefined) ??
      resolvedOfferings[0];
    if (!preferred) return;

    updateDraft(
      buildBookingDraftPatchFromOffering({
        coachId,
        offering: preferred,
        child: preselectedChild,
        entrySource: source,
      }),
    );
  }, [
    coachId,
    draft.sessionOfferingId,
    offeringId,
    preselectedChild,
    resolvedOfferings,
    source,
    updateDraft,
  ]);

  useEffect(() => {
    if (!preselectedChild) return;
    if (draft.childId === preselectedChild.id && draft.athleteName === preselectedChild.name) {
      return;
    }
    updateDraft({
      childId: preselectedChild.id,
      athleteName: preselectedChild.name,
      targetLocked: true,
    });
  }, [
    draft.athleteName,
    draft.childId,
    preselectedChild,
    updateDraft,
  ]);

  const offeringOptions = useMemo(
    () =>
      resolvedOfferings.map((offering) => ({
        id: offering.id,
        title: offering.title,
        priceText: offering.price && offering.price > 0 ? `£${offering.price}` : 'Free',
        categoryLabel: formatOfferingCategory(offering),
        description: offering.description || formatOfferingCategory(offering),
        detailText: `${getOfferingDuration(offering)} mins · ${formatCapacityLabel(offering)}`,
        metaText: [formatOfferingLocation(offering), formatAgeBand(offering)].filter(Boolean).join(' · '),
      })),
    [resolvedOfferings],
  );

  const handleSelectOffering = useCallback(
    (offeringId: string) => {
      const offering = resolvedOfferings.find((item) => item.id === offeringId);
      if (!offering || !coachId) return;
      updateDraft(
        buildBookingDraftPatchFromOffering({
          coachId,
          offering,
          child: preselectedChild,
          entrySource: source,
        }),
      );
    },
    [coachId, preselectedChild, resolvedOfferings, source, updateDraft],
  );

  const handleMessageCoach = useCallback(() => {
    if (!coachId) return;
    router.push(Routes.messagesWith({ coachId }));
  }, [coachId]);

  const requestedWeeks = useMemo(() => {
    const parsed = Number.parseInt(weeks ?? '', 10);
    return Number.isFinite(parsed) && parsed > 1 ? parsed : 1;
  }, [weeks]);
  const handleBack = useCallback(() => {
    void bookingStepAnalyticsService.track({
      step: 'type',
      status: 'abandoned',
      failure_code: 'back_navigation',
      source,
      role: currentUser?.role,
      currentUserId: currentUser?.id,
      hasChildren: accountHasChildren,
      actingAs: draft.actingAs,
      draft,
    });
    router.back();
  }, [accountHasChildren, source, currentUser?.role, currentUser?.id, draft]);

  const handleContinue = useCallback(() => {
    if (!coachId) {
      void bookingStepAnalyticsService.track({
        step: 'type',
        status: 'validation_fail',
        failure_code: 'missing_coach_id',
        source,
        role: currentUser?.role,
        currentUserId: currentUser?.id,
        hasChildren: accountHasChildren,
        actingAs: draft.actingAs,
        draft,
      });
      return;
    }

    if (!draft.sessionOfferingId) {
      void bookingStepAnalyticsService.track({
        step: 'type',
        status: 'validation_fail',
        failure_code: 'missing_session_offering',
        source,
        role: currentUser?.role,
        currentUserId: currentUser?.id,
        hasChildren: accountHasChildren,
        actingAs: draft.actingAs,
        draft,
      });
      return;
    }

    void bookingStepAnalyticsService.track({
      step: 'type',
      status: 'success',
      source,
      role: currentUser?.role,
      currentUserId: currentUser?.id,
      hasChildren: accountHasChildren,
      actingAs: draft.actingAs,
      draft,
    });

    if (selectedOffering?.isRecurring && requestedWeeks > 1) {
      router.push(Routes.bookMultiWeek(coachId));
      return;
    }
    if (!draft.date || !draft.slot) {
      router.push(Routes.bookSchedule(coachId));
      return;
    }
    if (!draft.childId) {
      router.push(Routes.bookDetails(coachId));
      return;
    }
    router.push(Routes.bookReview(coachId));
  }, [
    coachId,
    draft.childId,
    draft.date,
    draft.sessionOfferingId,
    draft.slot,
    requestedWeeks,
    selectedOffering?.isRecurring,
    source,
    currentUser?.role,
    currentUser?.id,
    accountHasChildren,
  ]);

  const canContinue = Boolean(coachId && draft.sessionOfferingId);
  const fixedDuration = selectedOffering ? getOfferingDuration(selectedOffering) : undefined;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <BookingWizardHeader
          title="Book a session"
          subtitle="Pick what this coach offers"
          step={1}
          onBack={handleBack}
        />

        <SessionTypeSelector
          selected={draft.sessionOfferingId}
          onSelect={handleSelectOffering}
          options={offeringOptions}
          loading={status === 'loading'}
        />

        {status === 'error' ? (
          <ErrorState
            message={error?.message ?? 'Could not load coach offerings.'}
            onRetry={retry}
          />
        ) : null}

        {fixedDuration ? (
          <View style={{ gap: Spacing.sm }}>
            <ThemedText type="defaultSemiBold">Duration</ThemedText>
            <View
              style={[
                styles.fixedDurationCard,
                {
                  borderColor: withAlpha(palette.tint, 0.25),
                  backgroundColor: withAlpha(palette.tint, 0.07),
                },
              ]}
            >
              <Row align="center" gap="xs">
                <Ionicons name="time-outline" size={16} color={palette.tint} />
                <ThemedText style={{ color: palette.tint }}>
                  {fixedDuration} mins (set by offering)
                </ThemedText>
              </Row>
            </View>
          </View>
        ) : null}

        {selectedOffering ? (
          <View style={{ gap: Spacing.sm }}>
            <ThemedText type="defaultSemiBold">Preset location</ThemedText>
            <View
              style={[
                styles.fixedDurationCard,
                {
                  borderColor: withAlpha(palette.tint, 0.25),
                  backgroundColor: withAlpha(palette.tint, 0.07),
                },
              ]}
            >
              <Row align="center" gap="xs">
                <Ionicons name="location-outline" size={16} color={palette.tint} />
                <ThemedText style={{ color: palette.tint }}>
                  {formatOfferingLocation(selectedOffering)}
                </ThemedText>
              </Row>
            </View>
          </View>
        ) : null}

        {selectedOffering && selectedOffering.sessionType === 'group' ? (
          <View style={{ gap: Spacing.sm }}>
            <ThemedText type="defaultSemiBold">
              Participants (max {selectedOffering.maxParticipants})
            </ThemedText>
            <TextInput
              placeholder={String(selectedOffering.maxParticipants)}
              keyboardType="number-pad"
              placeholderTextColor={palette.muted}
              style={[styles.input, { borderColor: palette.border, color: palette.text }]}
              value={draft.participants?.toString() || ''}
              onChangeText={(text) => {
                const parsed = Number(text);
                if (!Number.isFinite(parsed) || parsed <= 0) {
                  updateDraft({ participants: undefined });
                  return;
                }
                const clamped = Math.min(parsed, selectedOffering.maxParticipants);
                updateDraft({ participants: clamped });
              }}
            />
          </View>
        ) : null}
      </ScrollView>
      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        <Clickable
          onPress={handleMessageCoach}
          style={[
            styles.secondaryCta,
            {
              backgroundColor: withAlpha(palette.tint, 0.06),
              borderColor: withAlpha(palette.tint, 0.35),
            },
          ]}
          accessibilityLabel="Message coach"
        >
          <Row justify="center" align="center" gap="sm">
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={palette.tint} />
            <ThemedText style={{ color: palette.tint, fontWeight: '700' }}>
              Message coach
            </ThemedText>
          </Row>
        </Clickable>
        <Clickable
          onPress={handleContinue}
          style={[
            styles.cta,
            { backgroundColor: canContinue ? palette.tint : withAlpha(palette.tint, 0.4) },
          ]}
          disabled={!canContinue}
        >
          <Row justify="center" align="center" gap="sm">
            <Ionicons name="arrow-forward" size={18} color={palette.onPrimary} />
            <ThemedText style={{ color: palette.onPrimary, fontWeight: '700' }}>
              Continue
            </ThemedText>
          </Row>
        </Clickable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  fixedDurationCard: {
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  input: { borderWidth: 1.5, borderRadius: Radii.md, padding: Spacing.md },
  footer: { padding: Spacing.lg, borderTopWidth: 1, gap: Spacing.sm },
  secondaryCta: {
    padding: Spacing.md,
    borderRadius: Radii.button,
    borderWidth: 1.5,
  },
  cta: { padding: Spacing.md, borderRadius: Radii.button },
});
