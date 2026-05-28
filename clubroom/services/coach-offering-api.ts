import type { SessionOffering } from '@/constants/session-types';
import { apiFetch } from '@/services/api-client';
import { err, ok, type Result, type ServiceError } from '@/types/result';

export interface ApiCoachOffering {
  id: string;
  coachUserId: string;
  title: string;
  description?: string;
  serviceType?: string;
  capacity?: number;
  defaultLocation?: string;
  durationMinutes?: number;
  priceMinor?: number;
  active?: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface ApiCoachOfferingsResponse {
  offerings: ApiCoachOffering[];
}

export function mapApiCoachOfferingToSessionOffering(
  offering: ApiCoachOffering,
  coachId: string,
  scheduledAt: string,
): SessionOffering {
  return {
    id: offering.id,
    source: 'direct',
    sourceEntityId: offering.id,
    coachId,
    title: offering.title,
    description: offering.description,
    sessionType: offering.serviceType === 'group' ? 'group' : '1on1',
    maxParticipants: Math.max(1, offering.capacity ?? 1),
    location: offering.defaultLocation || 'Location confirmed after booking',
    scheduledAt,
    isRecurring: false,
    recurrenceType: 'none',
    status: offering.active === false ? 'cancelled' : 'active',
    registrations: [],
    createdAt: offering.createdAt,
    updatedAt: offering.updatedAt,
    duration: offering.durationMinutes ?? 60,
    price: typeof offering.priceMinor === 'number' ? offering.priceMinor / 100 : undefined,
  };
}

async function listCoachOfferingsFromApi(
  path: string,
  coachId: string,
  scheduledAt: string,
): Promise<Result<SessionOffering[], ServiceError>> {
  const result = await apiFetch<ApiCoachOfferingsResponse>(path, { method: 'GET' });
  if (!result.success) {
    return err(result.error);
  }

  return ok(
    result.data.offerings
      .filter((offering) => offering.active !== false)
      .map((offering) => mapApiCoachOfferingToSessionOffering(offering, coachId, scheduledAt)),
  );
}

export async function listSelfCoachOfferingsFromApi(
  coachId: string,
  scheduledAt: string,
): Promise<Result<SessionOffering[], ServiceError>> {
  return listCoachOfferingsFromApi('/v1/coaches/me/offerings', coachId, scheduledAt);
}

export async function listPublicCoachOfferingsFromApi(
  coachId: string,
  scheduledAt: string,
): Promise<Result<SessionOffering[], ServiceError>> {
  return listCoachOfferingsFromApi(
    `/v1/coaches/${encodeURIComponent(coachId)}/offerings`,
    coachId,
    scheduledAt,
  );
}

export async function listPublicCoachOfferingIndexFromApi(
  scheduledAt: string,
): Promise<Result<SessionOffering[], ServiceError>> {
  const result = await apiFetch<ApiCoachOfferingsResponse>('/v1/coaches/offerings', {
    method: 'GET',
  });
  if (!result.success) {
    return err(result.error);
  }

  return ok(
    result.data.offerings
      .filter((offering) => offering.active !== false)
      .map((offering) =>
        mapApiCoachOfferingToSessionOffering(offering, offering.coachUserId, scheduledAt),
      ),
  );
}
