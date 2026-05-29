import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { BookingWizardHeader } from '@/components/ui/booking/booking-wizard';
import {
  SessionTypeSelector,
  type SessionTypeFilterOption,
} from '@/components/ui/booking/session-type-selector';
import { EmptyState, ErrorState } from '@/components/ui/screen-states';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { SessionOffering } from '@/constants/session-types';
import { useBookingFlow } from '@/context/booking-flow-context';
import { useAuth } from '@/hooks/use-auth';
import { useChildContext } from '@/hooks/use-child-context';
import { useScreen } from '@/hooks/use-screen';
import { Routes } from '@/navigation/routes';
import { apiClient } from '@/services/api-client';
import { bookingStepAnalyticsService } from '@/services/booking/booking-step-analytics-service';
import { listPublicCoachOfferingsFromApi } from '@/services/coach-offering-api';
import {
  buildBookingDraftPatchFromOffering,
  type BookingPrefillChild,
} from '@/utils/booking-draft-prefill';
import {
  buildSessionOfferingCategories,
  filterSessionOfferingsByCategory,
  getSessionOfferingCategoryId,
  sortSessionOfferingsForBooking,
} from '@/utils/session-offering-booking';
import { getSessionOfferingHeadcount } from '@/utils/session-offering-capacity';
import { accountIdsMatch } from '@/utils/account-id';
import { hasAccountChildren } from '@/utils/booking-self-capability';
import { err, ok, serviceError } from '@/types/result';

function formatCapacityLabel(offering: SessionOffering): string {
  return offering.sessionType === '1on1' ? '1 athlete' : `up to ${offering.maxParticipants}`;
}

function formatCurrencyValue(value: number): string {
  return Number.isInteger(value) ? `£${value}` : `£${value.toFixed(2)}`;
}

function formatOfferingPrice(offering: SessionOffering): string {
  if (typeof offering.price === 'number' && offering.price > 0) {
    return formatCurrencyValue(offering.price);
  }
  return 'Free';
}

function formatOfferingSchedule(offering: SessionOffering): string {
  if (offering.isRecurring && offering.dayOfWeek !== undefined && offering.timeOfDay) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return `Every ${days[offering.dayOfWeek]} at ${offering.timeOfDay}`;
  }

  const date = new Date(offering.scheduledAt);
  if (!Number.isFinite(date.getTime())) {
    return 'Schedule confirmed after selection';
  }

  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function buildOfferingResetPatch({ coachId, source }: { coachId: string; source?: string }) {
  return {
    coachId,
    entrySource: source,
    sessionOfferingId: undefined,
    sessionSource: undefined,
    sessionSourceEntityId: undefined,
    sessionTemplateId: undefined,
    participants: undefined,
    duration: undefined,
    date: undefined,
    slot: undefined,
    locationOption: undefined,
    locationText: undefined,
    price: undefined,
    totalPrice: undefined,
    sessionType: undefined,
    sessionTypeLabel: undefined,
    clubId: undefined,
    actingAs: undefined,
    commercialMode: undefined,
    ownerCoachId: undefined,
    assigneeCoachId: undefined,
    createdByUserId: undefined,
    createdByRole: undefined,
  } as const;
}

export default function SessionTypeScreen() {
  const { coachId, offeringId, childId, source, weeks } = useLocalSearchParams<{
    coachId: string;
    offeringId?: string;
    childId?: string;
    weeks?: string;
    source?: string;
  }>();
  const { currentUser } = useAuth();
  const { children, activeChildId, loading: childContextLoading } = useChildContext();
  const { draft, updateDraft } = useBookingFlow();
  const [activeFilter, setActiveFilter] = useState('all');

  const accountHasChildren = hasAccountChildren({
    contextChildCount: children.length,
    accountChildRefCount: currentUser?.children?.length ?? 0,
  });

  const preselectedChild = (() => {
    if (childId) {
      if (currentUser?.id && childId === currentUser.id) {
        return {
          id: currentUser.id,
          name: currentUser.name || currentUser.fullName || 'Athlete',
        };
      }

      if (childContextLoading) {
        return null;
      }

      const matchedChild = children.find((child) => child.id === childId);
      if (matchedChild) {
        return {
          id: matchedChild.id,
          name: matchedChild.name,
        };
      }
      return null;
    }

    if (childContextLoading) {
      return null;
    }

    if (activeChildId) {
      const activeChild = children.find((child) => child.id === activeChildId);
      if (activeChild) {
        return {
          id: activeChild.id,
          name: activeChild.name,
        };
      }
    }

    if (children.length === 1) {
      return {
        id: children[0].id,
        name: children[0].name,
      };
    }

    if (children.length === 0 && currentUser?.id) {
      return {
        id: currentUser.id,
        name: currentUser.name || currentUser.fullName || 'Athlete',
      };
    }

    return null;
  })();

  const loadOfferings = async () => {
    if (!coachId) {
      return err(serviceError('VALIDATION', 'Coach information is missing for booking.'));
    }

    try {
      if (!apiClient.isMockMode) {
        const result = await listPublicCoachOfferingsFromApi(coachId, new Date().toISOString());
        if (!result.success) {
          return err(result.error);
        }
        return ok(sortSessionOfferingsForBooking(result.data));
      }

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

      return ok(sortSessionOfferingsForBooking(coachOfferings));
    } catch (loadError) {
      return err(serviceError('UNKNOWN', 'Failed to load coach offerings.', loadError));
    }
  };

  const {
    data: offerings,
    status,
    error,
    retry,
    refreshing,
    onRefresh,
    colors: palette,
  } = useScreen<SessionOffering[]>({
    load: loadOfferings,
    deps: [coachId],
    isEmpty: (value) => value.length === 0,
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
  });

  const resolvedOfferings = offerings ?? [];
  const selectedOffering =
    resolvedOfferings.find((offering) => offering.id === draft.sessionOfferingId) ?? null;

  const filters = [
    { id: 'all', label: 'All Sessions', count: resolvedOfferings.length },
    ...buildSessionOfferingCategories(resolvedOfferings).map((category) => ({
      id: category.id,
      label: category.label,
      count: category.count,
    })),
  ];

  const effectiveFilter = filters.some((filter) => filter.id === activeFilter)
    ? activeFilter
    : 'all';
  const filteredOfferings = filterSessionOfferingsByCategory(resolvedOfferings, effectiveFilter);

  const selectedFilter = filters.find((filter) => filter.id === effectiveFilter) ?? filters[0];

  const categoryCount = Math.max(filters.length - 1, 0);
  const startingPrice = (() => {
    const prices = resolvedOfferings
      .map((offering) => offering.price)
      .filter((price): price is number => typeof price === 'number' && price > 0);
    if (prices.length === 0) {
      return null;
    }
    return Math.min(...prices);
  })();

  const requestedWeeks = (() => {
    const parsed = Number.parseInt(weeks ?? '', 10);
    return Number.isFinite(parsed) && parsed > 1 ? parsed : 1;
  })();

  const hasOfferingDraftState = Boolean(
    draft.sessionOfferingId ||
    draft.sessionSource ||
    draft.sessionSourceEntityId ||
    draft.sessionTemplateId ||
    draft.participants ||
    draft.duration ||
    draft.date ||
    draft.slot ||
    draft.locationOption ||
    draft.locationText ||
    draft.price ||
    draft.totalPrice ||
    draft.sessionType ||
    draft.sessionTypeLabel ||
    draft.clubId ||
    draft.actingAs ||
    draft.commercialMode ||
    draft.ownerCoachId ||
    draft.assigneeCoachId ||
    draft.createdByUserId ||
    draft.createdByRole ||
    draft.coachId !== coachId ||
    draft.entrySource !== source,
  );

  useEffect(() => {
    if (!preselectedChild) {
      return;
    }

    if (
      draft.childId === preselectedChild.id &&
      draft.athleteName === preselectedChild.name &&
      draft.targetLocked
    ) {
      return;
    }

    updateDraft({
      childId: preselectedChild.id,
      athleteName: preselectedChild.name,
      targetLocked: true,
    });
  }, [draft.athleteName, draft.childId, draft.targetLocked, preselectedChild, updateDraft]);

  useEffect(() => {
    if (!coachId) {
      return;
    }

    if (status === 'empty') {
      if (hasOfferingDraftState) {
        updateDraft(buildOfferingResetPatch({ coachId, source }));
      }
      return;
    }

    if (status !== 'success') {
      return;
    }

    const currentResolvedOfferings = offerings ?? [];
    const currentSelection = currentResolvedOfferings.find(
      (offering) => offering.id === draft.sessionOfferingId,
    );
    if (currentSelection) {
      return;
    }

    const preferredOffering =
      (offeringId
        ? currentResolvedOfferings.find((offering) => offering.id === offeringId)
        : undefined) ??
      (currentResolvedOfferings.length === 1 ? currentResolvedOfferings[0] : undefined);

    if (preferredOffering) {
      updateDraft(
        buildBookingDraftPatchFromOffering({
          coachId,
          offering: preferredOffering,
          child: preselectedChild,
          entrySource: source,
        }),
      );
      return;
    }

    if (hasOfferingDraftState) {
      updateDraft(buildOfferingResetPatch({ coachId, source }));
    }
  }, [
    coachId,
    draft.sessionOfferingId,
    hasOfferingDraftState,
    offeringId,
    offerings,
    preselectedChild,
    source,
    status,
    updateDraft,
  ]);

  useEffect(() => {
    if (!selectedOffering || effectiveFilter === 'all') {
      return;
    }

    if (getSessionOfferingCategoryId(selectedOffering) === effectiveFilter) {
      return;
    }

    if (hasOfferingDraftState) {
      updateDraft(buildOfferingResetPatch({ coachId, source }));
    }
  }, [coachId, effectiveFilter, hasOfferingDraftState, selectedOffering, source, updateDraft]);

  const handleSelectOffering = (selectedOfferingId: string) => {
    const offering = resolvedOfferings.find((item) => item.id === selectedOfferingId);
    if (!offering || !coachId) {
      return;
    }

    updateDraft(
      buildBookingDraftPatchFromOffering({
        coachId,
        offering,
        child: preselectedChild,
        entrySource: source,
      }),
    );
  };

  const handleFilterChange = (nextFilter: string) => {
    if (nextFilter === effectiveFilter) {
      return;
    }

    setActiveFilter(nextFilter);
  };

  const handleMessageCoach = () => {
    if (!coachId) {
      return;
    }
    router.push(Routes.messagesWith({ coachId }));
  };

  const handleBack = () => {
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
  };

  const handleContinue = () => {
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

    if (!draft.sessionOfferingId || !selectedOffering) {
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

    if (selectedOffering.isRecurring && requestedWeeks > 1) {
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
  };

  const canContinue = Boolean(coachId && selectedOffering);
  const visibleSessionCount =
    effectiveFilter === 'all' ? resolvedOfferings.length : filteredOfferings.length;
  const catalogTitle = effectiveFilter === 'all' ? 'All sessions' : selectedFilter.label;
  const listSummary =
    status === 'success'
      ? effectiveFilter === 'all'
        ? `${resolvedOfferings.length} live`
        : `${filteredOfferings.length} ${selectedFilter.label.toLowerCase()} live`
      : 'Loading';
  const footerPrompt =
    status === 'loading'
      ? {
          title: 'Loading sessions',
          message: 'Checking live offerings.',
        }
      : status === 'error'
        ? {
            title: 'Sessions unavailable',
            message: 'Retry or message the coach.',
          }
        : visibleSessionCount === 0
          ? {
              title: `No ${selectedFilter.label.toLowerCase()} live`,
              message: 'Try another format.',
            }
          : visibleSessionCount === 1
            ? {
                title: 'Select a session',
                message: '1 session available.',
              }
            : {
                title: 'Select a session',
                message: `${visibleSessionCount} sessions available.`,
              };

  return (
    <View style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.tint} />
        }
      >
        <BookingWizardHeader
          title="Choose a session"
          subtitle="Select one live session."
          step={1}
          onBack={handleBack}
        />

        <View style={styles.catalogHeader}>
          <View style={styles.catalogHeaderCopy}>
            <ThemedText style={[styles.eyebrow, { color: palette.muted }]}>
              Coach offerings
            </ThemedText>
            <ThemedText type="title">{catalogTitle}</ThemedText>
            <ThemedText style={[styles.catalogHint, { color: palette.muted }]}>
              {listSummary}
            </ThemedText>
          </View>
          {status === 'success' && resolvedOfferings.length > 0 ? (
            <Row wrap gap="xs" style={styles.catalogMetrics}>
              <View style={[styles.metricChip, { backgroundColor: withAlpha(palette.tint, 0.08) }]}>
                <ThemedText style={[styles.metricText, { color: palette.tint }]}>
                  {resolvedOfferings.length} live
                </ThemedText>
              </View>
              {categoryCount > 0 ? (
                <View
                  style={[styles.metricChip, { backgroundColor: withAlpha(palette.success, 0.12) }]}
                >
                  <ThemedText style={[styles.metricText, { color: palette.success }]}>
                    {categoryCount} format{categoryCount === 1 ? '' : 's'}
                  </ThemedText>
                </View>
              ) : null}
              {startingPrice !== null ? (
                <View
                  style={[styles.metricChip, { backgroundColor: withAlpha(palette.warning, 0.14) }]}
                >
                  <ThemedText style={[styles.metricText, { color: palette.warning }]}>
                    From {formatCurrencyValue(startingPrice)}
                  </ThemedText>
                </View>
              ) : null}
            </Row>
          ) : null}
        </View>

        {status === 'error' ? (
          <ErrorState
            message={error?.message ?? 'Could not load coach offerings.'}
            onRetry={retry}
          />
        ) : status === 'empty' ? (
          <View
            style={[
              styles.emptyStateWrap,
              {
                borderColor: palette.border,
                backgroundColor: withAlpha(palette.tint, 0.05),
              },
            ]}
          >
            <EmptyState
              context="sessions"
              title="No live sessions right now"
              message="This coach has not published a bookable session yet. Message them for availability or browse other coaches."
            />
          </View>
        ) : (
          <SessionTypeSelector
            activeFilter={effectiveFilter}
            filters={filters}
            loading={status === 'loading'}
            offerings={filteredOfferings}
            onChangeFilter={handleFilterChange}
            onResetFilter={() => setActiveFilter('all')}
            onSelect={handleSelectOffering}
            selected={draft.sessionOfferingId}
          />
        )}

        {selectedOffering?.sessionType === 'group' ? (
          <SurfaceCard style={styles.groupCard} tactile={false}>
            <ThemedText type="defaultSemiBold">How many athletes?</ThemedText>
            <ThemedText style={[styles.groupHint, { color: palette.muted }]}>
              This session allows {formatCapacityLabel(selectedOffering)}. Adjust the booking size
              if needed.
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
          </SurfaceCard>
        ) : null}
      </ScrollView>
      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        {status === 'empty' ? (
          <>
            <Clickable
              onPress={() => router.push(Routes.DISCOVER_MAP)}
              style={[
                styles.cta,
                {
                  backgroundColor: palette.tint,
                },
              ]}
              accessibilityLabel="Browse other coaches"
            >
              <Row justify="center" align="center" gap="sm">
                <Ionicons name="search-outline" size={18} color={palette.onPrimary} />
                <ThemedText style={{ color: palette.onPrimary, fontWeight: '700' }}>
                  Browse coaches
                </ThemedText>
              </Row>
            </Clickable>
            <Clickable
              onPress={handleMessageCoach}
              style={[
                styles.inlineAction,
                {
                  borderColor: withAlpha(palette.tint, 0.18),
                },
              ]}
              accessibilityLabel="Message coach"
            >
              <Row justify="center" align="center" gap="xs">
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={palette.tint} />
                <ThemedText style={[styles.inlineActionText, { color: palette.tint }]}>
                  Message coach instead
                </ThemedText>
              </Row>
            </Clickable>
          </>
        ) : canContinue && selectedOffering ? (
          <>
            <View
              style={[
                styles.selectionTray,
                {
                  borderColor: withAlpha(palette.tint, 0.2),
                  backgroundColor: withAlpha(palette.tint, 0.05),
                },
              ]}
            >
              <View style={styles.selectionTrayCopy}>
                <ThemedText style={[styles.eyebrow, { color: palette.tint }]}>Selected</ThemedText>
                <ThemedText type="defaultSemiBold" numberOfLines={1}>
                  {selectedOffering.title}
                </ThemedText>
                <ThemedText
                  style={[styles.selectionTrayMeta, { color: palette.muted }]}
                  numberOfLines={1}
                >
                  {formatOfferingSchedule(selectedOffering)} ·{' '}
                  {formatCapacityLabel(selectedOffering)}
                </ThemedText>
              </View>
              <ThemedText style={styles.selectionTrayPrice}>
                {formatOfferingPrice(selectedOffering)}
              </ThemedText>
            </View>
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
            <Clickable
              onPress={handleMessageCoach}
              style={[
                styles.inlineAction,
                {
                  borderColor: withAlpha(palette.tint, 0.18),
                },
              ]}
              accessibilityLabel="Message coach"
            >
              <Row justify="center" align="center" gap="xs">
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={palette.tint} />
                <ThemedText style={[styles.inlineActionText, { color: palette.tint }]}>
                  Need a different time? Message coach
                </ThemedText>
              </Row>
            </Clickable>
          </>
        ) : (
          <>
            <View
              style={[
                styles.selectionPrompt,
                {
                  borderColor: palette.border,
                  backgroundColor: withAlpha(palette.muted, 0.05),
                },
              ]}
            >
              <View style={[styles.promptIcon, { backgroundColor: withAlpha(palette.tint, 0.08) }]}>
                <Ionicons name="albums-outline" size={16} color={palette.tint} />
              </View>
              <View style={styles.selectionPromptCopy}>
                <ThemedText type="defaultSemiBold">{footerPrompt.title}</ThemedText>
                <ThemedText style={[styles.selectionPromptText, { color: palette.muted }]}>
                  {footerPrompt.message}
                </ThemedText>
              </View>
            </View>
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
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  eyebrow: {
    ...Typography.caption,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  catalogHeader: {
    gap: Spacing.sm,
  },
  catalogHeaderCopy: {
    gap: Spacing.xxs,
  },
  catalogHint: {
    ...Typography.bodySmall,
  },
  catalogMetrics: {
    rowGap: Spacing.xs,
  },
  metricChip: {
    minHeight: 30,
    borderRadius: Radii.pill,
    paddingHorizontal: 12,
    paddingVertical: Spacing.xxs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  metricText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  emptyStateWrap: {
    borderWidth: 1,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md,
  },
  groupCard: {
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  groupHint: {
    ...Typography.bodySmall,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.md,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  selectionTray: {
    borderWidth: 1,
    borderRadius: Radii.card,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  selectionTrayCopy: {
    flex: 1,
    gap: Spacing.micro,
  },
  selectionTrayMeta: {
    ...Typography.bodySmall,
  },
  selectionTrayPrice: {
    ...Typography.heading,
    fontWeight: '700',
  },
  selectionPrompt: {
    borderWidth: 1,
    borderRadius: Radii.card,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  promptIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionPromptCopy: {
    flex: 1,
    gap: Spacing.micro,
  },
  selectionPromptText: {
    ...Typography.bodySmall,
  },
  secondaryCta: {
    padding: Spacing.md,
    borderRadius: Radii.button,
    borderWidth: 1.5,
  },
  cta: {
    padding: Spacing.md,
    borderRadius: Radii.button,
  },
  inlineAction: {
    paddingVertical: Spacing.sm,
    borderRadius: Radii.button,
    borderWidth: 1,
  },
  inlineActionText: {
    ...Typography.bodySmallSemiBold,
  },
});
