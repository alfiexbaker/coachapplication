import type { SessionOffering } from "@/constants/session-types";
import type { CoachExperience, CoachLanguage, SocialLinks } from "@/constants/types";
import { apiFetch } from "@/services/api-client";
import { err, ok, type Result, type ServiceError } from "@/types/result";
export interface ApiPublicCoachProfile {
  userId?: string;
  displayName?: string | null;
  bio?: string | null;
  sessionRateMinor?: number | null;
  priceMaxMinor?: number | null;
  currency?: string | null;
  website?: string | null;
  socialLinks?: SocialLinks;
  experiences?: CoachExperience[];
  languages?: CoachLanguage[];
  specialties?: string[];
  qualifications?: string[];
  travelRadiusMiles?: number;
  acceptsTravelSessions?: boolean;
  acceptsRemoteSessions?: boolean;
}
export type SessionOfferingWithCoachProfile = SessionOffering & {
  coachProfile?: ApiPublicCoachProfile;
};
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
  coachProfile?: ApiPublicCoachProfile;
  createdAt: string;
  updatedAt?: string;
}
interface ApiCoachOfferingsResponse {
  offerings: ApiCoachOffering[];
}
export interface CoachOfferingMutationInput {
  title: string;
  serviceType: "1-to-1" | "small-group" | "clinic" | "assessment";
  durationMinutes: number;
  capacity: number;
  priceMinor: number;
  description?: string;
  defaultLocation?: string;
  skillsFocus?: string[];
}
interface ApiCoachOfferingMutationResponse {
  offering: ApiCoachOffering;
  requestId: string;
}
export function mapApiCoachOfferingToSessionOffering(
  offering: ApiCoachOffering,
  coachId: string,
  scheduledAt: string,
): SessionOfferingWithCoachProfile {
  const mapped: SessionOfferingWithCoachProfile = {
    id: offering.id,
    source: "direct",
    sourceEntityId: offering.id,
    coachId,
    title: offering.title,
    description: offering.description,
    sessionType: offering.serviceType === "group" ? "group" : "1on1",
    maxParticipants: Math.max(1, offering.capacity ?? 1),
    location: offering.defaultLocation || "Location confirmed after booking",
    scheduledAt,
    isRecurring: false,
    recurrenceType: "none",
    status: offering.active === false ? "cancelled" : "active",
    registrations: [],
    createdAt: offering.createdAt,
    updatedAt: offering.updatedAt,
    duration: offering.durationMinutes ?? 60,
    price:
      typeof offering.priceMinor === "number"
        ? offering.priceMinor / 100
        : undefined,
  };
  if (offering.coachProfile) {
    mapped.coachProfile = offering.coachProfile;
  }
  return mapped;
}
async function listCoachOfferingsFromApi(
  path: string,
  coachId: string,
  scheduledAt: string,
): Promise<Result<SessionOffering[], ServiceError>> {
  const result = await apiFetch<ApiCoachOfferingsResponse>(path, {
    method: "GET",
  });
  if (!result.success) {
    return err(result.error);
  }
  return ok(
    result.data.offerings.flatMap((offering) =>
      offering.active !== false
        ? [mapApiCoachOfferingToSessionOffering(offering, coachId, scheduledAt)]
        : [],
    ),
  );
}
export async function listSelfCoachOfferingsFromApi(
  coachId: string,
  scheduledAt: string,
): Promise<Result<SessionOffering[], ServiceError>> {
  return listCoachOfferingsFromApi(
    "/v1/coaches/me/offerings",
    coachId,
    scheduledAt,
  );
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
  const result = await apiFetch<ApiCoachOfferingsResponse>(
    "/v1/coaches/offerings",
    {
      method: "GET",
    },
  );
  if (!result.success) {
    return err(result.error);
  }
  return ok(
    result.data.offerings.flatMap((offering) =>
      offering.active !== false
        ? [
            mapApiCoachOfferingToSessionOffering(
              offering,
              offering.coachUserId,
              scheduledAt,
            ),
          ]
        : [],
    ),
  );
}

export async function createSelfCoachOfferingFromApi(
  input: CoachOfferingMutationInput,
): Promise<Result<ApiCoachOffering, ServiceError>> {
  const result = await apiFetch<ApiCoachOfferingMutationResponse>(
    "/v1/coaches/me/offerings",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  if (!result.success) {
    return err(result.error);
  }
  return ok(result.data.offering);
}

export async function updateSelfCoachOfferingFromApi(
  offeringId: string,
  input: Partial<CoachOfferingMutationInput>,
): Promise<Result<ApiCoachOffering, ServiceError>> {
  const result = await apiFetch<ApiCoachOfferingMutationResponse>(
    `/v1/coaches/me/offerings/${encodeURIComponent(offeringId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  if (!result.success) {
    return err(result.error);
  }
  return ok(result.data.offering);
}
