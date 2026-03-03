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
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { SessionOffering } from '@/constants/session-types';
import { getSessionOfferingHeadcount } from '@/utils/session-offering-capacity';

function formatOfferingType(type: SessionOffering['sessionType']): string {
  return type === 'group' ? 'Group session' : '1-to-1 session';
}

function mapOfferingToDraftType(type: SessionOffering['sessionType']) {
  return type === 'group' ? 'small-group' : '1-to-1';
}

function getDuration(offering: SessionOffering): number {
  return offering.duration ?? 60;
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

function dedupeOfferings(offerings: SessionOffering[]): SessionOffering[] {
  const bySignature = new Map<string, SessionOffering>();
  for (const offering of offerings) {
    const signature = [
      offering.title.trim().toLowerCase(),
      offering.sessionType,
      getDuration(offering),
      offering.price ?? 0,
      offering.maxParticipants,
    ].join('|');
    const existing = bySignature.get(signature);
    if (!existing) {
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
  const { coachId } = useLocalSearchParams<{ coachId: string }>();
  const { draft, updateDraft } = useBookingFlow();
  const loadOfferings = useCallback(async () => {
    if (!coachId) {
      return err(serviceError('VALIDATION', 'Coach information is missing for booking.'));
    }

    try {
      const now = Date.now();
      const offerings = await apiClient.get<SessionOffering[]>(STORAGE_KEYS.SESSION_OFFERINGS, []);
      const coachOfferings = offerings.filter((offering) => {
        if (offering.coachId !== coachId) return false;
        if (offering.status !== 'active') return false;

        const startsAt = new Date(offering.scheduledAt).getTime();
        const isUpcoming = offering.isRecurring || (Number.isFinite(startsAt) && startsAt >= now);
        if (!isUpcoming) return false;

        const headcount = getSessionOfferingHeadcount(offering);
        return headcount < offering.maxParticipants;
      });

      return ok(dedupeOfferings(coachOfferings));
    } catch (error) {
      return err(serviceError('UNKNOWN', 'Failed to load coach offerings.', error));
    }
  }, [coachId]);

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

    const fallback = resolvedOfferings[0];
    const duration = getDuration(fallback);
    updateDraft({
      coachId,
      sessionOfferingId: fallback.id,
      sessionTemplateId: undefined,
      sessionType: mapOfferingToDraftType(fallback.sessionType),
      sessionTypeLabel: fallback.title,
      duration,
      price: fallback.price ?? 0,
      participants: fallback.sessionType === 'group' ? fallback.maxParticipants : undefined,
      locationText: fallback.location,
    });
  }, [coachId, draft.sessionOfferingId, resolvedOfferings, updateDraft]);

  const offeringOptions = useMemo(
    () =>
      resolvedOfferings.map((offering) => ({
        id: offering.id,
        title: offering.title,
        priceText: offering.price && offering.price > 0 ? `£${offering.price}` : 'Free',
        description: formatOfferingType(offering.sessionType),
        detailText: `${getDuration(offering)} mins · up to ${offering.maxParticipants}`,
      })),
    [resolvedOfferings],
  );

  const handleSelectOffering = useCallback(
    (offeringId: string) => {
      const offering = resolvedOfferings.find((item) => item.id === offeringId);
      if (!offering || !coachId) return;
      const duration = getDuration(offering);

      updateDraft({
        coachId,
        sessionOfferingId: offering.id,
        sessionTemplateId: undefined,
        sessionType: mapOfferingToDraftType(offering.sessionType),
        sessionTypeLabel: offering.title,
        duration,
        price: offering.price ?? 0,
        participants: offering.sessionType === 'group' ? offering.maxParticipants : undefined,
        locationText: offering.location,
      });
    },
    [coachId, resolvedOfferings, updateDraft],
  );

  const handleMessageCoach = useCallback(() => {
    if (!coachId) return;
    router.push(Routes.messagesWith({ coachId }));
  }, [coachId]);

  const handleContinue = useCallback(() => {
    if (!coachId || !draft.sessionOfferingId) return;
    router.push(Routes.bookSchedule(coachId));
  }, [coachId, draft.sessionOfferingId]);

  const canContinue = Boolean(coachId && draft.sessionOfferingId);
  const fixedDuration = selectedOffering ? getDuration(selectedOffering) : undefined;

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
