import { useEffect, useMemo, useRef } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingState } from '@/components/ui/screen-states';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { SessionOffering } from '@/constants/session-types';
import { useBookingFlow } from '@/context/booking-flow-context';
import { useAuth } from '@/hooks/use-auth';
import { useChildContext } from '@/hooks/use-child-context';
import { Routes } from '@/navigation/routes';
import { apiClient } from '@/services/api-client';
import { bookingStepAnalyticsService } from '@/services/booking/booking-step-analytics-service';
import { createLogger } from '@/utils/logger';
import { accountIdsMatch } from '@/utils/account-id';
import {
  buildBookingDraftPatchFromOffering,
  getFixedScheduleFromOffering,
  type BookingPrefillChild,
} from '@/utils/booking-draft-prefill';
import { getSessionOfferingHeadcount } from '@/utils/session-offering-capacity';

const logger = createLogger('BookCoachEntryScreen');
const FAST_TRACK_SOURCES = ['discover', 'session_detail_modal'];

function getAvailableCoachOfferings(
  allOfferings: SessionOffering[],
  coachId: string,
): SessionOffering[] {
  const now = Date.now();
  return allOfferings
    .filter((offering) => {
      if (!accountIdsMatch(offering.coachId, coachId)) return false;
      if (offering.status !== 'active') return false;
      const startsAt = new Date(offering.scheduledAt).getTime();
      const isUpcoming = offering.isRecurring || (Number.isFinite(startsAt) && startsAt >= now);
      if (!isUpcoming) return false;
      const headcount = getSessionOfferingHeadcount(offering);
      return headcount < offering.maxParticipants;
    })
    .sort((a, b) => {
      const aDate = getFixedScheduleFromOffering(a)?.date ?? a.scheduledAt;
      const bDate = getFixedScheduleFromOffering(b)?.date ?? b.scheduledAt;
      return new Date(aDate).getTime() - new Date(bDate).getTime();
    });
}

export default function BookCoachEntryScreen() {
  const { coachId, offeringId, source, childId, weeks } = useLocalSearchParams<{
    coachId: string;
    offeringId?: string;
    source?: string;
    childId?: string;
    weeks?: string;
  }>();
  const { children, loading: childrenLoading } = useChildContext();
  const { currentUser, isLoading: authLoading } = useAuth();
  const { draft, updateDraft } = useBookingFlow();
  const bootKeyRef = useRef<string>('');
  const trackStep = (
    step: 'type' | 'schedule' | 'details',
    status: 'success' | 'validation_fail' | 'conflict_fail' | 'abandoned',
    failureCode?: string,
  ) => {
    void bookingStepAnalyticsService.track({
      step,
      status,
      failure_code: failureCode,
      source,
      role: currentUser?.role,
      currentUserId: currentUser?.id,
      hasChildren: currentUser?.hasChildren,
      actingAs: draft.actingAs,
      draft: {
        entrySource: draft.entrySource,
        sessionSource: draft.sessionSource,
        actingAs: draft.actingAs,
        childId: draft.childId,
        coachId: draft.coachId || coachId,
        ownerCoachId: draft.ownerCoachId,
        assigneeCoachId: draft.assigneeCoachId,
        clubId: draft.clubId,
      },
    });
  };

  const preselectedChild = useMemo<BookingPrefillChild | null>(() => {
    if (childId) {
      if (currentUser?.id && childId === currentUser.id) {
        return {
          id: currentUser.id,
          name: currentUser.name || currentUser.fullName || 'Athlete',
        };
      }
      const matchedChild = children.find((child) => child.id === childId);
      if (matchedChild) {
        return { id: matchedChild.id, name: matchedChild.name };
      }
      return null;
    }

    if (children.length === 1) {
      return { id: children[0].id, name: children[0].name };
    }
    if (children.length === 0 && currentUser?.id) {
      return {
        id: currentUser.id,
        name: currentUser.name || currentUser.fullName || 'Athlete',
      };
    }
    return null;
  }, [childId, children, currentUser?.fullName, currentUser?.id, currentUser?.name]);

  useEffect(() => {
    const requiresResolvedTarget = !childId;
    if (requiresResolvedTarget && (authLoading || childrenLoading)) {
      return;
    }

    const bootKey = [
      coachId,
      offeringId,
      source,
      childId,
      weeks,
      preselectedChild?.id ?? '',
    ].join('|');
    if (bootKeyRef.current === bootKey) {
      return;
    }
    bootKeyRef.current = bootKey;

    if (!coachId) {
      trackStep('type', 'validation_fail', 'missing_coach_id');
      router.replace(Routes.BOOK_COACH);
      return;
    }

    let cancelled = false;

    const fallbackToSessionType = (failureCode?: string) => {
      if (failureCode) {
        trackStep('type', 'validation_fail', failureCode);
      }
      const fallbackChildId = preselectedChild?.id;
      router.replace(
        Routes.bookSessionType(coachId, {
          offeringId,
          source,
          childId: fallbackChildId,
          weeks,
        }),
      );
    };

    const bootstrap = async () => {
      const normalizedSource = source?.toLowerCase();
      const shouldFastTrack =
        Boolean(offeringId) ||
        (Boolean(normalizedSource) &&
          FAST_TRACK_SOURCES.some((prefix) => normalizedSource.startsWith(prefix)));
      if (!shouldFastTrack) {
        fallbackToSessionType();
        return;
      }

      try {
        const offerings = await apiClient.get<SessionOffering[]>(STORAGE_KEYS.SESSION_OFFERINGS, []);
        const coachOfferings = getAvailableCoachOfferings(offerings, coachId);
        const matchedOffering =
          (offeringId ? coachOfferings.find((offering) => offering.id === offeringId) : undefined) ??
          (draft.sessionOfferingId
            ? coachOfferings.find((offering) => offering.id === draft.sessionOfferingId)
            : undefined) ??
          coachOfferings[0];

        if (!matchedOffering) {
          const hasHydratedDraftOffering =
            Boolean(offeringId) &&
            draft.sessionOfferingId === offeringId &&
            Boolean(draft.coachId) &&
            accountIdsMatch(draft.coachId as string, coachId);
          if (hasHydratedDraftOffering) {
            if (preselectedChild && !draft.childId) {
              updateDraft({ childId: preselectedChild.id, athleteName: preselectedChild.name });
            }
            const parsedWeeks = Number.parseInt(weeks ?? '1', 10);
            const useMultiWeekFlow =
              Boolean(draft.sessionSource === 'group' || draft.sessionSource === 'event') &&
              Number.isFinite(parsedWeeks) &&
              parsedWeeks > 1;

            if (useMultiWeekFlow) {
              trackStep('type', 'success');
              router.replace(Routes.bookMultiWeek(coachId));
              return;
            }

            if (!draft.date || !draft.slot) {
              trackStep('type', 'success');
              trackStep('schedule', 'validation_fail', !draft.date ? 'missing_date' : 'missing_slot');
              router.replace(Routes.bookSchedule(coachId));
              return;
            }

            trackStep('type', 'success');
            trackStep('schedule', 'success');

            const hydratedChildId = preselectedChild?.id ?? draft.childId;
            if (!hydratedChildId) {
              trackStep('details', 'validation_fail', 'missing_child_id');
              router.replace(Routes.bookDetails(coachId));
              return;
            }

            trackStep('details', 'success');
            router.replace(Routes.bookReview(coachId));
            return;
          }
          fallbackToSessionType('offering_not_found');
          return;
        }

        const previousOfferingId = draft.sessionOfferingId;
        const patch = buildBookingDraftPatchFromOffering({
          coachId,
          offering: matchedOffering,
          child: preselectedChild,
          entrySource: source,
        });
        const isSameOffering = previousOfferingId === matchedOffering.id;
        const nextPatch = !isSameOffering && !patch.childId
          ? { ...patch, childId: undefined, athleteName: undefined }
          : patch;
        updateDraft(nextPatch);

        if (cancelled) {
          return;
        }

        const nextDate = nextPatch.date ?? (isSameOffering ? draft.date : undefined);
        const nextSlot = nextPatch.slot ?? (isSameOffering ? draft.slot : undefined);
        const nextChildId = nextPatch.childId ?? (isSameOffering ? draft.childId : undefined);
        const parsedWeeks = Number.parseInt(weeks ?? '1', 10);
        const useMultiWeekFlow =
          matchedOffering.isRecurring &&
          Number.isFinite(parsedWeeks) &&
          parsedWeeks > 1;

        if (useMultiWeekFlow) {
          trackStep('type', 'success');
          router.replace(Routes.bookMultiWeek(coachId));
          return;
        }
        if (!nextDate || !nextSlot) {
          trackStep('type', 'success');
          trackStep('schedule', 'validation_fail', !nextDate ? 'missing_date' : 'missing_slot');
          router.replace(Routes.bookSchedule(coachId));
          return;
        }
        trackStep('type', 'success');
        trackStep('schedule', 'success');
        if (!nextChildId) {
          trackStep('details', 'validation_fail', 'missing_child_id');
          router.replace(Routes.bookDetails(coachId));
          return;
        }
        trackStep('details', 'success');
        router.replace(Routes.bookReview(coachId));
      } catch (error) {
        logger.warn('Failed to bootstrap fast-track booking entry', {
          coachId,
          offeringId,
          source,
          error,
        });
        if (!cancelled) {
          fallbackToSessionType('bootstrap_prefill_error');
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    childrenLoading,
    childId,
    coachId,
    draft.childId,
    draft.date,
    draft.sessionOfferingId,
    draft.slot,
    offeringId,
    preselectedChild,
    source,
    updateDraft,
    weeks,
  ]);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <LoadingState variant="detail" />
    </SafeAreaView>
  );
}
