import type { BookingDraft } from '@/services/booking-service';
import { resolveNonGenericPersonName, resolveUserProfileName } from '@/utils/person-name';

export interface BookingTargetUser {
  id: string;
  fullName?: string | null;
  name?: string | null;
}

export interface BookingTargetChild {
  id: string;
  referenceId?: string | null;
  name?: string | null;
}

export interface ResolvedBookingTargets {
  athleteIds: string[];
  athleteNames: string[];
}

function uniqueIds(ids: Array<string | null | undefined>): string[] {
  return ids
    .map((id) => id?.trim())
    .filter((id): id is string => Boolean(id))
    .filter((id, index, source) => source.indexOf(id) === index);
}

export function resolveBookingTargetName({
  targetId,
  currentUser,
  children,
  draftAthleteName,
}: {
  targetId: string;
  currentUser?: BookingTargetUser | null;
  children: readonly BookingTargetChild[];
  draftAthleteName?: string | null;
}): string | undefined {
  if (currentUser?.id === targetId) {
    return resolveUserProfileName(currentUser);
  }

  const child = children.find(
    (candidate) => candidate.id === targetId || candidate.referenceId === targetId,
  );
  return resolveNonGenericPersonName(child?.name) ?? resolveNonGenericPersonName(draftAthleteName);
}

export function buildBookingTargetDraftPatch({
  targetId,
  currentUser,
  children,
  draftAthleteName,
}: {
  targetId: string;
  currentUser?: BookingTargetUser | null;
  children: readonly BookingTargetChild[];
  draftAthleteName?: string | null;
}): Pick<BookingDraft, 'childId' | 'athleteName'> {
  return {
    childId: targetId,
    athleteName: resolveBookingTargetName({
      targetId,
      currentUser,
      children,
      draftAthleteName,
    }),
  };
}

export function resolveBookingTarget({
  targetId,
  currentUser,
  children,
  draftAthleteName,
}: {
  targetId: string;
  currentUser?: BookingTargetUser | null;
  children: readonly BookingTargetChild[];
  draftAthleteName?: string | null;
}): { id: string; name?: string } {
  return {
    id: targetId,
    name: resolveBookingTargetName({
      targetId,
      currentUser,
      children,
      draftAthleteName,
    }),
  };
}

export function resolveDefaultBookingTarget({
  preferredChildId,
  currentUser,
  children,
}: {
  preferredChildId?: string | null;
  currentUser?: BookingTargetUser | null;
  children: readonly BookingTargetChild[];
}): { id: string; name?: string } | null {
  if (preferredChildId) {
    if (currentUser?.id === preferredChildId) {
      return resolveBookingTarget({ targetId: currentUser.id, currentUser, children });
    }

    const preferredChild = children.find((child) => child.id === preferredChildId);
    if (preferredChild) {
      return resolveBookingTarget({ targetId: preferredChild.id, currentUser, children });
    }
  }

  if (children.length === 1) {
    return resolveBookingTarget({ targetId: children[0].id, currentUser, children });
  }

  if (children.length === 0 && currentUser?.id) {
    return resolveBookingTarget({ targetId: currentUser.id, currentUser, children });
  }

  return null;
}

export function resolveBookingDraftTargets({
  draft,
  currentUser,
  children,
}: {
  draft: Pick<BookingDraft, 'childIds' | 'childId' | 'athleteId' | 'athleteName'>;
  currentUser?: BookingTargetUser | null;
  children: readonly BookingTargetChild[];
}): ResolvedBookingTargets {
  const athleteIds = uniqueIds(
    draft.childIds?.length ? draft.childIds : [draft.childId ?? draft.athleteId],
  );
  return {
    athleteIds,
    athleteNames: athleteIds.map(
      (targetId) =>
        resolveBookingTargetName({
          targetId,
          currentUser,
          children,
          draftAthleteName: draft.athleteName,
        }) ?? '',
    ),
  };
}

export function hasResolvedBookingTargets(targets: ResolvedBookingTargets): boolean {
  return (
    targets.athleteIds.length > 0 &&
    targets.athleteNames.length === targets.athleteIds.length &&
    targets.athleteNames.every((name) => Boolean(resolveNonGenericPersonName(name)))
  );
}

export function resolveSingleBookingDraftTarget({
  draft,
  currentUser,
  children,
}: {
  draft: Pick<BookingDraft, 'childIds' | 'childId' | 'athleteId' | 'athleteName'>;
  currentUser?: BookingTargetUser | null;
  children: readonly BookingTargetChild[];
}): { id: string; name?: string } | null {
  const targets = resolveBookingDraftTargets({ draft, currentUser, children });
  const id = targets.athleteIds[0];
  if (!id) {
    return null;
  }
  return {
    id,
    name: resolveNonGenericPersonName(targets.athleteNames[0]),
  };
}
