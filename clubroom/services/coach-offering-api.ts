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
  publicLocations?: Array<{
    id?: string;
    label: string;
    lat: number;
    lng: number;
    isDefault: boolean;
  }>;
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
  skillsFocus?: string[];
  active?: boolean;
  coachProfile?: ApiPublicCoachProfile;
  createdAt: string;
  updatedAt?: string;
}
interface ApiCoachOfferingsResponse {
  offerings: ApiCoachOffering[];
}
export interface ApiPublicCoachSearchParams {
  query?: string;
  priceMin?: number;
  priceMax?: number;
  rating?: number;
  sports?: string[];
  focuses?: string[];
  formats?: string[];
  languages?: string[];
  lat?: number;
  lng?: number;
  radiusKm?: number;
  sortBy?: "relevance" | "distance" | "rating" | "price_low" | "price_high" | "reviews";
  page?: number;
  pageSize?: number;
}
export interface ApiPublicCoachSearchFilterOption {
  value: string;
  label: string;
  count: number;
  selected?: boolean;
}
export interface ApiPublicCoachSearchResponse {
  results: Array<{
    coachId: string;
    coachProfile: ApiPublicCoachProfile;
    offerings: ApiCoachOffering[];
    relevanceScore: number;
    matchedTerms: string[];
    minPriceMinor: number;
    maxPriceMinor: number;
    ratingAverage: number;
    reviewCount: number;
    sessionFormats: string[];
    focuses: string[];
    languages: string[];
    bookableCount: number;
    publicLocation?: {
      id?: string;
      label: string;
      lat: number;
      lng: number;
      isDefault: boolean;
    };
    distanceKm?: number;
    distanceMiles?: number;
  }>;
  offerings: ApiCoachOffering[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  filterOptions: {
    sports: ApiPublicCoachSearchFilterOption[];
    focuses: ApiPublicCoachSearchFilterOption[];
    languages: ApiPublicCoachSearchFilterOption[];
    formats: ApiPublicCoachSearchFilterOption[];
    priceRange: {
      minMinor: number;
      maxMinor: number;
    };
    ratingDistribution: Array<{ rating: number; count: number }>;
    totalCount: number;
  };
  seedVersion?: string | null;
  requestId: string;
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

function appendArrayParam(params: URLSearchParams, key: string, values?: string[]): void {
  for (const value of values ?? []) {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      params.append(key, trimmed);
    }
  }
}

function publicCoachSearchPath(input: ApiPublicCoachSearchParams): string {
  const params = new URLSearchParams();
  if (input.query?.trim()) params.set("query", input.query.trim());
  if (typeof input.priceMin === "number") params.set("priceMin", String(input.priceMin));
  if (typeof input.priceMax === "number") params.set("priceMax", String(input.priceMax));
  if (typeof input.rating === "number") params.set("rating", String(input.rating));
  appendArrayParam(params, "sports", input.sports);
  appendArrayParam(params, "focuses", input.focuses);
  appendArrayParam(params, "formats", input.formats);
  appendArrayParam(params, "languages", input.languages);
  if (typeof input.lat === "number") params.set("lat", String(input.lat));
  if (typeof input.lng === "number") params.set("lng", String(input.lng));
  if (typeof input.radiusKm === "number") params.set("radiusKm", String(input.radiusKm));
  if (input.sortBy) params.set("sortBy", input.sortBy);
  if (typeof input.page === "number") params.set("page", String(input.page));
  if (typeof input.pageSize === "number") params.set("pageSize", String(input.pageSize));
  const query = params.toString();
  return query ? `/v1/coaches/search?${query}` : "/v1/coaches/search";
}

export async function searchPublicCoachesFromApi(
  input: ApiPublicCoachSearchParams,
): Promise<Result<ApiPublicCoachSearchResponse, ServiceError>> {
  const result = await apiFetch<ApiPublicCoachSearchResponse>(
    publicCoachSearchPath(input),
    {
      method: "GET",
    },
  );
  if (!result.success) {
    return err(result.error);
  }
  return ok(result.data);
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
