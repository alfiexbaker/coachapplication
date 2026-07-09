import { randomUUID } from "node:crypto";
import { getApiDataBackend } from "../../lib/data-backend.js";
import { getDbFixtureStore } from "../../lib/db-fixture-store.js";
import { notFound } from "../../lib/http-errors.js";
import { getMarketplaceSeedStore } from "../../lib/marketplace-seed-store.js";
import {
  getPrismaClientOrThrow,
  shouldUseDbFixtureFallback,
} from "../../lib/prisma-runtime.js";
import { normalizeForJson } from "./normalize.js";
type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;
type StoreShape = {
  version: string;
  tables: SeedTables;
};
const asRows = (value: unknown): SeedRow[] =>
  Array.isArray(value) ? (value as SeedRow[]) : [];
const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;
const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined;
const asSeedRow = (value: unknown): SeedRow | undefined =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as SeedRow)
    : undefined;
const isoNow = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${randomUUID()}`;
function normalizeTime(value: string | undefined): string {
  return value?.slice(0, 5) ?? "00:00";
}
function toIsoDate(date: string): string {
  return `${date}T00:00:00.000Z`;
}
function isActiveStoreRow(row: SeedRow): boolean {
  return row.active !== false && !asString(row.deletedAt);
}
function getActiveRows(rows: SeedRow[]): SeedRow[] {
  return rows.filter(isActiveStoreRow);
}
function ensureTable(tables: SeedTables, key: string): SeedRow[] {
  if (!Array.isArray(tables[key])) {
    tables[key] = [];
  }
  return tables[key];
}
function toSeedRow<T>(value: T): SeedRow {
  return normalizeForJson(value) as unknown as SeedRow;
}
function toSeedRows<T>(values: T[]): SeedRow[] {
  return values.map((value) => toSeedRow(value));
}
function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}
type PublicCoachLocation = {
  id?: string;
  label: string;
  lat: number;
  lng: number;
  isDefault: boolean;
};
function latLngFromValue(value: unknown): { lat: number; lng: number } | undefined {
  const row = asSeedRow(value);
  const lat = asNumber(row?.lat);
  const lng = asNumber(row?.lng);
  return lat != null && lng != null ? { lat, lng } : undefined;
}
function publicLocationsFromRows(value: unknown): PublicCoachLocation[] {
  return asRows(value)
    .flatMap((row): PublicCoachLocation[] => {
      if (asString(row.deletedAt)) return [];
      const latLng = latLngFromValue(row.latLngJson) ?? latLngFromValue(row);
      if (!latLng) return [];
      return [
        {
          ...(asString(row.id) ? { id: asString(row.id) } : {}),
          label: asString(row.label) ?? "Training location",
          lat: latLng.lat,
          lng: latLng.lng,
          isDefault: asBoolean(row.isDefault) ?? false,
        },
      ];
    })
    .sort((left, right) => {
      if (left.isDefault !== right.isDefault) return left.isDefault ? -1 : 1;
      return left.label.localeCompare(right.label);
    });
}
function profileWithPublicLocations(profile: SeedRow, locations: SeedRow[]): SeedRow {
  return {
    ...profile,
    locations,
  };
}
function mapPublicCoachProfile(profile: SeedRow, user?: SeedRow): SeedRow {
  const nestedUser =
    profile.user && typeof profile.user === "object" && !Array.isArray(profile.user)
      ? (profile.user as SeedRow)
      : undefined;
  const displayName =
    asString(user?.name) ?? asString(nestedUser?.name) ?? asString(profile.displayName);
  const publicLocations = publicLocationsFromRows(profile.locations);
  return {
    userId: asString(profile.userId),
    ...(displayName ? { displayName } : {}),
    bio: asString(profile.bio) ?? null,
    sessionRateMinor: asNumber(profile.sessionRateMinor) ?? null,
    priceMaxMinor: asNumber(profile.priceMaxMinor) ?? null,
    currency: asString(profile.currency) ?? "GBP",
    website: asString(profile.website) ?? null,
    socialLinks:
      profile.socialLinksJson &&
      typeof profile.socialLinksJson === "object" &&
      !Array.isArray(profile.socialLinksJson)
        ? profile.socialLinksJson
        : {},
    experiences: Array.isArray(profile.experiencesJson)
      ? profile.experiencesJson
      : [],
    languages: Array.isArray(profile.languagesJson) ? profile.languagesJson : [],
    specialties: asStringArray(profile.specialties),
    qualifications: asStringArray(profile.qualifications),
    travelRadiusMiles: asNumber(profile.travelRadiusMiles) ?? 10,
    acceptsTravelSessions: asBoolean(profile.acceptsTravelSessions) ?? true,
    acceptsRemoteSessions: asBoolean(profile.acceptsRemoteSessions) ?? false,
    ...(publicLocations.length > 0 ? { publicLocations } : {}),
  };
}
function withPublicCoachProfile(
  offering: SeedRow,
  profile: SeedRow,
  user?: SeedRow,
): SeedRow {
  return {
    ...offering,
    coachProfile: mapPublicCoachProfile(profile, user),
  };
}
const PUBLIC_COACH_SEARCH_SORTS = [
  "relevance",
  "distance",
  "rating",
  "price_low",
  "price_high",
  "reviews",
] as const;
export type PublicCoachSearchSort = (typeof PUBLIC_COACH_SEARCH_SORTS)[number];
export interface PublicCoachSearchParams {
  query?: string;
  priceMinMinor?: number;
  priceMaxMinor?: number;
  rating?: number;
  sports?: string[];
  focuses?: string[];
  formats?: string[];
  languages?: string[];
  location?: {
    lat: number;
    lng: number;
    radiusKm?: number;
  };
  sortBy?: PublicCoachSearchSort;
  page: number;
  pageSize: number;
}
export interface PublicCoachSearchFilterOption {
  value: string;
  label: string;
  count: number;
  selected?: boolean;
}
export interface PublicCoachSearchFilterOptions {
  sports: PublicCoachSearchFilterOption[];
  focuses: PublicCoachSearchFilterOption[];
  languages: PublicCoachSearchFilterOption[];
  formats: PublicCoachSearchFilterOption[];
  priceRange: {
    minMinor: number;
    maxMinor: number;
  };
  ratingDistribution: Array<{ rating: number; count: number }>;
  totalCount: number;
}
export interface PublicCoachSearchItem {
  coachId: string;
  coachProfile: SeedRow;
  offerings: SeedRow[];
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
  publicLocation?: PublicCoachLocation;
  distanceKm?: number;
  distanceMiles?: number;
}
export interface PublicCoachSearchResult {
  results: PublicCoachSearchItem[];
  offerings: SeedRow[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  filterOptions: PublicCoachSearchFilterOptions;
  dataVersion: string | null;
}
interface PublicCoachSearchCandidate extends PublicCoachSearchItem {
  searchableText: string;
}
type PublicCoachReviewAggregate = {
  ratingAverage: number;
  reviewCount: number;
};
const normalizeToken = (value: string): string => value.trim().toLowerCase();
const uniqueStrings = (values: Array<string | undefined>): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) continue;
    const key = normalizeToken(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
};
function languageNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry === "string") return [entry];
    const row = asSeedRow(entry);
    return asString(row?.name) ? [asString(row?.name) as string] : [];
  });
}
function formatForOffering(row: SeedRow): string {
  const serviceType = normalizeToken(asString(row.serviceType) ?? "");
  if (
    serviceType.includes("small") ||
    serviceType === "group" ||
    serviceType === "clinic"
  ) {
    return "Small group";
  }
  if (serviceType.includes("virtual") || serviceType.includes("remote")) {
    return "Virtual";
  }
  return "In-person";
}
function valuesIncludeAny(values: string[], requested: string[] | undefined): boolean {
  if (!requested?.length) return true;
  const valueSet = new Set(values.map(normalizeToken));
  return requested.some((entry) => valueSet.has(normalizeToken(entry)));
}
function queryTerms(query: string | undefined): string[] {
  return (query ?? "")
    .split(/\s+/)
    .map(normalizeToken)
    .filter(Boolean);
}
function countMapOptions(
  values: string[][],
  selected: string[] | undefined,
): PublicCoachSearchFilterOption[] {
  const counts = new Map<string, { label: string; count: number }>();
  for (const row of values) {
    for (const value of row) {
      const key = normalizeToken(value);
      if (!key) continue;
      const current = counts.get(key) ?? { label: value, count: 0 };
      current.count += 1;
      counts.set(key, current);
    }
  }
  const selectedSet = new Set((selected ?? []).map(normalizeToken));
  return Array.from(counts.entries())
    .map(([key, value]) => ({
      value: value.label,
      label: value.label,
      count: value.count,
      ...(selectedSet.has(key) ? { selected: true } : {}),
    }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}
function buildPublicCoachSearchFilterOptions(
  candidates: PublicCoachSearchCandidate[],
  params: PublicCoachSearchParams,
): PublicCoachSearchFilterOptions {
  const prices = candidates.flatMap((candidate) => [
    candidate.minPriceMinor,
    candidate.maxPriceMinor,
  ]);
  const ratingCounts = new Map<number, number>();
  for (const candidate of candidates) {
    const bucket = Math.floor(candidate.ratingAverage);
    ratingCounts.set(bucket, (ratingCounts.get(bucket) ?? 0) + 1);
  }
  return {
    sports: [
      {
        value: "Football",
        label: "Football",
        count: candidates.length,
        ...(params.sports?.some((sport) => normalizeToken(sport) === "football")
          ? { selected: true }
          : {}),
      },
    ],
    focuses: countMapOptions(
      candidates.map((candidate) => candidate.focuses),
      params.focuses,
    ),
    languages: countMapOptions(
      candidates.map((candidate) => candidate.languages),
      params.languages,
    ),
    formats: countMapOptions(
      candidates.map((candidate) => candidate.sessionFormats),
      params.formats,
    ),
    priceRange: {
      minMinor: prices.length > 0 ? Math.min(...prices) : 0,
      maxMinor: prices.length > 0 ? Math.max(...prices) : 0,
    },
    ratingDistribution: Array.from(ratingCounts.entries())
      .map(([rating, count]) => ({ rating, count }))
      .sort((left, right) => right.rating - left.rating),
    totalCount: candidates.length,
  };
}
function buildPublicCoachSearchCandidates(
  offerings: SeedRow[],
  reviewAggregatesByCoachId: Map<string, PublicCoachReviewAggregate> = new Map(),
): PublicCoachSearchCandidate[] {
  const offeringsByCoachId = new Map<string, SeedRow[]>();
  for (const offering of offerings) {
    const coachId = asString(offering.coachUserId);
    if (!coachId) continue;
    const existing = offeringsByCoachId.get(coachId) ?? [];
    existing.push(offering);
    offeringsByCoachId.set(coachId, existing);
  }
  return Array.from(offeringsByCoachId.entries()).flatMap(([coachId, rows]) => {
    const profile = asSeedRow(rows.find((row) => asSeedRow(row.coachProfile))?.coachProfile) ?? {};
    const publicLocations = publicLocationsFromRows(profile.publicLocations);
    const offeringPrices = rows.flatMap((row) => {
      const priceMinor = asNumber(row.priceMinor);
      return priceMinor != null && priceMinor > 0 ? [priceMinor] : [];
    });
    const minPriceMinor =
      asNumber(profile.sessionRateMinor) ??
      (offeringPrices.length > 0 ? Math.min(...offeringPrices) : 0);
    const maxPriceMinor =
      asNumber(profile.priceMaxMinor) ??
      (offeringPrices.length > 0 ? Math.max(...offeringPrices) : minPriceMinor);
    const profileLanguages = languageNames(profile.languages);
    const focuses = uniqueStrings([
      ...asStringArray(profile.specialties),
      ...rows.flatMap((row) => asStringArray(row.skillsFocus)),
    ]);
    const sessionFormats = uniqueStrings([
      ...rows.map(formatForOffering),
      asBoolean(profile.acceptsRemoteSessions) === true ? "Virtual" : undefined,
    ]);
    const languages = profileLanguages.length > 0 ? profileLanguages : ["English"];
    const reviewAggregate = reviewAggregatesByCoachId.get(coachId);
    const searchableText = [
      asString(profile.displayName),
      asString(profile.bio),
      asString(profile.website),
      ...asStringArray(profile.qualifications),
      ...publicLocations.map((location) => location.label),
      ...focuses,
      ...languages,
      ...rows.flatMap((row) => [
        asString(row.title),
        asString(row.description),
        asString(row.defaultLocation),
        asString(row.serviceType),
        ...asStringArray(row.skillsFocus),
      ]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return [
      {
        coachId,
        coachProfile: profile,
        offerings: rows,
        relevanceScore: 0,
        matchedTerms: [],
        minPriceMinor,
        maxPriceMinor,
        ratingAverage: reviewAggregate?.ratingAverage ?? 0,
        reviewCount: reviewAggregate?.reviewCount ?? 0,
        sessionFormats,
        focuses,
        languages,
        bookableCount: rows.length,
        publicLocation: publicLocations[0],
        searchableText,
      },
    ];
  });
}
function distanceKmBetween(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const earthRadiusKm = 6371;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const fromLat = (from.lat * Math.PI) / 180;
  const toLat = (to.lat * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
function withNearestPublicLocation(
  candidate: PublicCoachSearchCandidate,
  origin: { lat: number; lng: number },
): PublicCoachSearchCandidate | null {
  const locations = publicLocationsFromRows(candidate.coachProfile.publicLocations);
  if (locations.length === 0) return null;
  const nearest = locations
    .map((location) => ({
      location,
      distanceKm: distanceKmBetween(origin, location),
    }))
    .sort((left, right) => left.distanceKm - right.distanceKm)[0];
  if (!nearest) return null;
  return {
    ...candidate,
    publicLocation: nearest.location,
    distanceKm: Math.round(nearest.distanceKm * 10) / 10,
    distanceMiles: Math.round((nearest.distanceKm / 1.60934) * 10) / 10,
  };
}
function scorePublicCoachCandidate(
  candidate: PublicCoachSearchCandidate,
  params: PublicCoachSearchParams,
  terms: string[],
): PublicCoachSearchCandidate {
  let score = 50;
  score += Math.min(candidate.bookableCount * 3, 12);
  score += Math.min(candidate.reviewCount / 10, 10);
  score += candidate.ratingAverage * 5;
  const displayName = normalizeToken(asString(candidate.coachProfile.displayName) ?? "");
  const matchedTerms = terms.filter((term) => candidate.searchableText.includes(term));
  score += matchedTerms.length * 8;
  if (params.query && displayName.includes(normalizeToken(params.query))) {
    score += 15;
  }
  if (params.focuses?.length && valuesIncludeAny(candidate.focuses, params.focuses)) {
    score += 8;
  }
  if (candidate.distanceKm != null) {
    score -= Math.min(candidate.distanceKm / 5, 20);
  }
  return {
    ...candidate,
    relevanceScore: Math.max(0, Math.min(100, Math.round(score))),
    matchedTerms,
  };
}
function searchPublicCoachRows(
  index: CoachOfferingsResult,
  params: PublicCoachSearchParams,
  reviewAggregatesByCoachId?: Map<string, PublicCoachReviewAggregate>,
): PublicCoachSearchResult {
  const terms = queryTerms(params.query);
  const requestedSports = params.sports?.map(normalizeToken).filter(Boolean);
  const allCandidates = buildPublicCoachSearchCandidates(
    index.offerings,
    reviewAggregatesByCoachId,
  ).flatMap((candidate) => {
    if (!params.location) return [candidate];
    const withDistance = withNearestPublicLocation(candidate, params.location);
    if (!withDistance) return [];
    if (
      params.location.radiusKm != null &&
      withDistance.distanceKm != null &&
      withDistance.distanceKm > params.location.radiusKm
    ) {
      return [];
    }
    return [withDistance];
  });
  const filtered = allCandidates
    .filter((candidate) => {
      if (
        requestedSports?.length &&
        !requestedSports.some((sport) => sport === "football")
      ) {
        return false;
      }
      if (terms.length > 0 && !terms.every((term) => candidate.searchableText.includes(term))) {
        return false;
      }
      if (
        params.priceMinMinor != null &&
        candidate.maxPriceMinor < params.priceMinMinor
      ) {
        return false;
      }
      if (
        params.priceMaxMinor != null &&
        candidate.minPriceMinor > params.priceMaxMinor
      ) {
        return false;
      }
      if (params.rating != null && candidate.ratingAverage < params.rating) {
        return false;
      }
      if (!valuesIncludeAny(candidate.focuses, params.focuses)) {
        return false;
      }
      if (!valuesIncludeAny(candidate.sessionFormats, params.formats)) {
        return false;
      }
      if (!valuesIncludeAny(candidate.languages, params.languages)) {
        return false;
      }
      return true;
    })
    .map((candidate) => scorePublicCoachCandidate(candidate, params, terms));
  const sorted = [...filtered].sort((left, right) => {
    switch (params.sortBy) {
      case "price_low":
        return left.minPriceMinor - right.minPriceMinor || right.relevanceScore - left.relevanceScore;
      case "price_high":
        return right.maxPriceMinor - left.maxPriceMinor || right.relevanceScore - left.relevanceScore;
      case "rating":
        return right.ratingAverage - left.ratingAverage || right.relevanceScore - left.relevanceScore;
      case "reviews":
        return right.reviewCount - left.reviewCount || right.relevanceScore - left.relevanceScore;
      case "distance":
        return (left.distanceKm ?? Number.MAX_SAFE_INTEGER) - (right.distanceKm ?? Number.MAX_SAFE_INTEGER) ||
          right.relevanceScore - left.relevanceScore;
      case "relevance":
      default:
        return right.relevanceScore - left.relevanceScore || left.minPriceMinor - right.minPriceMinor;
    }
  });
  const page = Math.max(1, params.page);
  const pageSize = Math.max(1, params.pageSize);
  const start = (page - 1) * pageSize;
  const paged = sorted.slice(start, start + pageSize);
  const results = paged.map(({ searchableText: _searchableText, ...candidate }) => candidate);
  return {
    results,
    offerings: results.flatMap((result) => result.offerings),
    total: sorted.length,
    page,
    pageSize,
    hasMore: start + pageSize < sorted.length,
    filterOptions: buildPublicCoachSearchFilterOptions(filtered, params),
    dataVersion: index.dataVersion,
  };
}
function averageRating(values: number[]): number {
  if (values.length === 0) return 0;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round((total / values.length) * 10) / 10;
}
function publicReviewAggregatesFromTables(tables: SeedTables): Map<string, PublicCoachReviewAggregate> {
  const completedBookingCoachById = new Map(
    asRows(tables.bookings).flatMap((booking) => {
      const bookingId = asString(booking.id);
      const coachUserId = asString(booking.coachUserId);
      return bookingId &&
        coachUserId &&
        !asString(booking.deletedAt) &&
        asString(booking.status)?.toUpperCase() === "COMPLETED"
        ? [[bookingId, coachUserId] as const]
        : [];
    }),
  );
  const ratingsByCoachId = new Map<string, number[]>();
  for (const feedback of asRows(tables.sessionFeedback)) {
    const rating = asNumber(feedback.rating);
    const bookingId = asString(feedback.bookingId);
    const coachUserId = bookingId ? completedBookingCoachById.get(bookingId) : undefined;
    if (
      rating == null ||
      !coachUserId ||
      asString(feedback.deletedAt) ||
      asString(feedback.visibility) !== "public"
    ) {
      continue;
    }
    ratingsByCoachId.set(coachUserId, [...(ratingsByCoachId.get(coachUserId) ?? []), rating]);
  }
  return new Map(
    Array.from(ratingsByCoachId.entries()).map(([coachUserId, ratings]) => [
      coachUserId,
      {
        ratingAverage: averageRating(ratings),
        reviewCount: ratings.length,
      },
    ]),
  );
}
export interface CoachProfileBundleResult {
  profile: SeedRow;
  locations: SeedRow[];
  availabilityTemplates: SeedRow[];
  availabilityOverrides: SeedRow[];
  schedulingRules: SeedRow[];
  cancellationPolicyRules: SeedRow[];
  dataVersion: string | null;
}
export interface CoachProfilePatchBody {
  bio?: string | null;
  yearsExperience?: number | null;
  sessionRateMinor?: number | null;
  priceMaxMinor?: number | null;
  currency?: string;
  website?: string | null;
  socialLinks?: Record<string, string | undefined>;
  experiences?: Array<Record<string, unknown>>;
  languages?: Array<Record<string, unknown>>;
  specialties?: string[];
  qualifications?: string[];
}
export interface CoachOfferingsResult {
  offerings: SeedRow[];
  dataVersion: string | null;
}
export interface PublicCoachProfileResult extends CoachOfferingsResult {
  coachProfile: SeedRow;
}
export interface CoachTemplateRowsResult {
  templates: SeedRow[];
  dataVersion: string | null;
}
export interface CoachOverrideRowsResult {
  overrides: SeedRow[];
  dataVersion: string | null;
}
export interface CoachSchedulingRowsResult {
  rulesRow: SeedRow | undefined;
  policyRows: SeedRow[];
  dataVersion: string | null;
}
export interface CoachSelfRepository {
  getProfileBundle(authUserId: string): Promise<CoachProfileBundleResult>;
  patchProfile(
    authUserId: string,
    body: CoachProfilePatchBody,
  ): Promise<CoachProfileBundleResult>;
  listOfferings(authUserId: string): Promise<CoachOfferingsResult>;
  listPublicOfferingIndex(): Promise<CoachOfferingsResult>;
  searchPublicCoaches(params: PublicCoachSearchParams): Promise<PublicCoachSearchResult>;
  getPublicProfile(coachUserId: string): Promise<PublicCoachProfileResult>;
  listPublicOfferings(coachUserId: string): Promise<CoachOfferingsResult>;
  listAvailabilityTemplateRows(
    authUserId: string,
  ): Promise<CoachTemplateRowsResult>;
  createAvailabilityTemplate(
    authUserId: string,
    body: {
      id?: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      maxConcurrent?: number;
      bufferMinutes?: number;
      location?: string;
      sessionTemplateId?: string;
    },
    actorUserId?: string,
  ): Promise<{
    row: SeedRow;
    dataVersion: string | null;
  }>;
  updateAvailabilityTemplate(
    authUserId: string,
    templateId: string,
    body: {
      dayOfWeek?: number;
      startTime?: string;
      endTime?: string;
      maxConcurrent?: number;
      bufferMinutes?: number;
      location?: string;
      sessionTemplateId?: string;
    },
    actorUserId?: string,
  ): Promise<{
    row: SeedRow;
    dataVersion: string | null;
  }>;
  deleteAvailabilityTemplate(
    authUserId: string,
    templateId: string,
    actorUserId?: string,
  ): Promise<{
    dataVersion: string | null;
  }>;
  listAvailabilityOverrideRows(
    authUserId: string,
    range?: {
      start?: string;
      end?: string;
    },
  ): Promise<CoachOverrideRowsResult>;
  createAvailabilityOverride(
    authUserId: string,
    body: {
      id?: string;
      date: string;
      isBlocked: boolean;
      reason?: string;
      customSlots?: Array<{
        startTime: string;
        endTime: string;
        location?: string;
      }>;
      repeatUntil?: string;
      repeatDayOfWeek?: number;
      repeatGroupId?: string;
    },
    actorUserId?: string,
  ): Promise<{
    row: SeedRow;
    dataVersion: string | null;
  }>;
  updateAvailabilityOverride(
    authUserId: string,
    overrideId: string,
    body: {
      date?: string;
      isBlocked?: boolean;
      reason?: string;
      customSlots?: Array<{
        startTime: string;
        endTime: string;
        location?: string;
      }>;
      repeatUntil?: string;
      repeatDayOfWeek?: number;
      repeatGroupId?: string;
    },
    actorUserId?: string,
  ): Promise<{
    row: SeedRow;
    dataVersion: string | null;
  }>;
  deleteAvailabilityOverride(
    authUserId: string,
    overrideId: string,
    actorUserId?: string,
  ): Promise<{
    dataVersion: string | null;
  }>;
  getSchedulingRows(authUserId: string): Promise<CoachSchedulingRowsResult>;
  patchSchedulingRows(
    authUserId: string,
    body: {
      minimumAdvanceBookingHours?: number;
      maxAdvanceBookingDays?: number;
      bufferMinutesDefault?: number;
      maxConcurrentDefault?: number;
      allowSameDayBookings?: boolean;
      cancellationPolicy?: {
        name: string;
        description: string;
        tiers: Array<{
          hoursBeforeSession: number;
          refundPercentage: number;
          description: string;
        }>;
        minimumNoticeHours: number;
        allowCancellations: boolean;
        isDefault: boolean;
      } | null;
    },
  ): Promise<CoachSchedulingRowsResult>;
}
class StoreCoachSelfRepository implements CoachSelfRepository {
  constructor(private readonly storeProvider: () => StoreShape) {}
  async getProfileBundle(
    authUserId: string,
  ): Promise<CoachProfileBundleResult> {
    const store = this.storeProvider();
    const profile = asRows(store.tables.coachProfiles).find(
      (row) => asString(row.userId) === authUserId,
    );
    if (!profile) {
      throw notFound("Coach profile not found", {
        userId: authUserId,
      });
    }
    const schedulingRules = asRows(store.tables.schedulingRules).filter(
      (row) => asString(row.coachUserId) === authUserId,
    );
    const cancellationPolicyId = asString(
      schedulingRules[0]?.cancellationPolicyId,
    );
    return {
      profile,
      locations: asRows(store.tables.coachLocations).filter(
        (row) => asString(row.coachUserId) === authUserId,
      ),
      availabilityTemplates: asRows(store.tables.availabilityTemplates).filter(
        (row) => asString(row.coachUserId) === authUserId,
      ),
      availabilityOverrides: asRows(store.tables.availabilityOverrides).filter(
        (row) => asString(row.coachUserId) === authUserId,
      ),
      schedulingRules,
      cancellationPolicyRules: asRows(
        store.tables.cancellationPolicyRules,
      ).filter(
        (row) =>
          asString(row.coachUserId) === authUserId ||
          (cancellationPolicyId && asString(row.id) === cancellationPolicyId),
      ),
      dataVersion: store.version,
    };
  }
  async patchProfile(
    authUserId: string,
    body: CoachProfilePatchBody,
  ): Promise<CoachProfileBundleResult> {
    const store = this.storeProvider();
    const profile = asRows(store.tables.coachProfiles).find(
      (row) => asString(row.userId) === authUserId && !asString(row.deletedAt),
    );
    if (!profile) {
      throw notFound("Coach profile not found", {
        userId: authUserId,
      });
    }
    if (body.bio !== undefined) profile.bio = body.bio;
    if (body.yearsExperience !== undefined) {
      profile.yearsExperience = body.yearsExperience;
    }
    if (body.sessionRateMinor !== undefined) {
      profile.sessionRateMinor = body.sessionRateMinor;
    }
    if (body.priceMaxMinor !== undefined) {
      profile.priceMaxMinor = body.priceMaxMinor;
    }
    if (body.currency !== undefined) profile.currency = body.currency;
    if (body.website !== undefined) profile.website = body.website;
    if (body.socialLinks !== undefined) profile.socialLinksJson = body.socialLinks;
    if (body.experiences !== undefined) {
      profile.experiencesJson = body.experiences;
    }
    if (body.languages !== undefined) profile.languagesJson = body.languages;
    if (body.specialties !== undefined) profile.specialties = body.specialties;
    if (body.qualifications !== undefined) {
      profile.qualifications = body.qualifications;
    }
    profile.updatedAt = isoNow();
    return this.getProfileBundle(authUserId);
  }
  async listOfferings(authUserId: string): Promise<CoachOfferingsResult> {
    const store = this.storeProvider();
    return {
      offerings: asRows(store.tables.coachingOfferings).filter(
        (row) => asString(row.coachUserId) === authUserId,
      ),
      dataVersion: store.version,
    };
  }
  async listPublicOfferingIndex(): Promise<CoachOfferingsResult> {
    const store = this.storeProvider();
    const profilesByUserId = new Map(
      getActiveRows(asRows(store.tables.coachProfiles)).flatMap((row) => {
        const userId = asString(row.userId);
        return userId ? [[userId, row] as const] : [];
      }),
    );
    const usersById = new Map(
      getActiveRows(asRows(store.tables.users)).flatMap((row) => {
        const userId = asString(row.id);
        return userId ? [[userId, row] as const] : [];
      }),
    );
    const locationsByCoachId = new Map<string, SeedRow[]>();
    for (const location of getActiveRows(asRows(store.tables.coachLocations))) {
      const coachUserId = asString(location.coachUserId);
      if (!coachUserId) continue;
      locationsByCoachId.set(coachUserId, [
        ...(locationsByCoachId.get(coachUserId) ?? []),
        location,
      ]);
    }
    return {
      offerings: getActiveRows(asRows(store.tables.coachingOfferings)).flatMap(
        (row) => {
          const coachUserId = asString(row.coachUserId);
          const profile = coachUserId ? profilesByUserId.get(coachUserId) : undefined;
          return profile && coachUserId
            ? [
                withPublicCoachProfile(
                  row,
                  profileWithPublicLocations(
                    profile,
                    locationsByCoachId.get(coachUserId) ?? [],
                  ),
                  usersById.get(coachUserId),
                ),
              ]
            : [];
        },
      ),
      dataVersion: store.version,
    };
  }
  async searchPublicCoaches(
    params: PublicCoachSearchParams,
  ): Promise<PublicCoachSearchResult> {
    const store = this.storeProvider();
    return searchPublicCoachRows(
      await this.listPublicOfferingIndex(),
      params,
      publicReviewAggregatesFromTables(store.tables),
    );
  }
  async listPublicOfferings(
    coachUserId: string,
  ): Promise<CoachOfferingsResult> {
    const store = this.storeProvider();
    const profile = asRows(store.tables.coachProfiles).find(
      (row) => asString(row.userId) === coachUserId && !asString(row.deletedAt),
    );
    if (!profile) {
      throw notFound("Coach profile not found", {
        coachUserId,
      });
    }
    const user = asRows(store.tables.users).find(
      (row) => asString(row.id) === coachUserId && !asString(row.deletedAt),
    );
    const locations = getActiveRows(asRows(store.tables.coachLocations)).filter(
      (row) => asString(row.coachUserId) === coachUserId,
    );
    const profileRow = profileWithPublicLocations(profile, locations);
    return {
      offerings: getActiveRows(asRows(store.tables.coachingOfferings)).flatMap(
        (row) =>
          asString(row.coachUserId) === coachUserId
            ? [withPublicCoachProfile(row, profileRow, user)]
            : [],
      ),
      dataVersion: store.version,
    };
  }
  async getPublicProfile(
    coachUserId: string,
  ): Promise<PublicCoachProfileResult> {
    const store = this.storeProvider();
    const profile = asRows(store.tables.coachProfiles).find(
      (row) => asString(row.userId) === coachUserId && !asString(row.deletedAt),
    );
    if (!profile) {
      throw notFound("Coach profile not found", {
        coachUserId,
      });
    }
    const user = asRows(store.tables.users).find(
      (row) => asString(row.id) === coachUserId && !asString(row.deletedAt),
    );
    const offerings = getActiveRows(asRows(store.tables.coachingOfferings)).flatMap(
      (row) =>
        asString(row.coachUserId) === coachUserId
          ? [
              withPublicCoachProfile(
                row,
                profileWithPublicLocations(
                  profile,
                  getActiveRows(asRows(store.tables.coachLocations)).filter(
                    (location) => asString(location.coachUserId) === coachUserId,
                  ),
                ),
                user,
              ),
            ]
          : [],
    );
    const profileRow = profileWithPublicLocations(
      profile,
      getActiveRows(asRows(store.tables.coachLocations)).filter(
        (location) => asString(location.coachUserId) === coachUserId,
      ),
    );
    return {
      coachProfile: mapPublicCoachProfile(profileRow, user),
      offerings,
      dataVersion: store.version,
    };
  }
  async listAvailabilityTemplateRows(
    authUserId: string,
  ): Promise<CoachTemplateRowsResult> {
    const store = this.storeProvider();
    return {
      templates: getActiveRows(
        asRows(store.tables.availabilityTemplates),
      ).filter((row) => asString(row.coachUserId) === authUserId),
      dataVersion: store.version,
    };
  }
  async createAvailabilityTemplate(
    authUserId: string,
    body: {
      id?: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      maxConcurrent?: number;
      bufferMinutes?: number;
      location?: string;
      sessionTemplateId?: string;
    },
    actorUserId = authUserId,
  ): Promise<{
    row: SeedRow;
    dataVersion: string | null;
  }> {
    const store = this.storeProvider();
    const now = isoNow();
    const templates = ensureTable(store.tables, "availabilityTemplates");
    const row: SeedRow = {
      id: body.id ?? `avt_${randomUUID()}`,
      coachUserId: authUserId,
      dayOfWeek: body.dayOfWeek,
      startTimeLocal: normalizeTime(body.startTime),
      endTimeLocal: normalizeTime(body.endTime),
      maxConcurrent: Number(body.maxConcurrent ?? 1),
      bufferMinutes: Number(body.bufferMinutes ?? 15),
      location: body.location ?? null,
      sessionTemplateId: body.sessionTemplateId ?? null,
      active: true,
      createdAt: now,
      updatedAt: now,
      createdByUserId: actorUserId,
      updatedByUserId: actorUserId,
      version: 1,
      deletedAt: null,
      deletedByUserId: null,
    };
    templates.push(row);
    return {
      row,
      dataVersion: store.version,
    };
  }
  async updateAvailabilityTemplate(
    authUserId: string,
    templateId: string,
    body: {
      dayOfWeek?: number;
      startTime?: string;
      endTime?: string;
      maxConcurrent?: number;
      bufferMinutes?: number;
      location?: string;
      sessionTemplateId?: string;
    },
    actorUserId = authUserId,
  ): Promise<{
    row: SeedRow;
    dataVersion: string | null;
  }> {
    const store = this.storeProvider();
    const templates = asRows(store.tables.availabilityTemplates);
    const row = getActiveRows(templates).find(
      (candidate) =>
        asString(candidate.id) === templateId &&
        asString(candidate.coachUserId) === authUserId,
    );
    if (!row) {
      throw notFound("Availability template not found", {
        templateId,
      });
    }
    if (body.dayOfWeek !== undefined) row.dayOfWeek = body.dayOfWeek;
    if (body.startTime !== undefined)
      row.startTimeLocal = normalizeTime(body.startTime);
    if (body.endTime !== undefined)
      row.endTimeLocal = normalizeTime(body.endTime);
    if (body.maxConcurrent !== undefined)
      row.maxConcurrent = Number(body.maxConcurrent);
    if (body.bufferMinutes !== undefined)
      row.bufferMinutes = Number(body.bufferMinutes);
    if (body.location !== undefined) row.location = body.location || null;
    if (body.sessionTemplateId !== undefined)
      row.sessionTemplateId = body.sessionTemplateId || null;
    row.updatedAt = isoNow();
    row.updatedByUserId = actorUserId;
    row.version = Number(row.version ?? 1) + 1;
    return {
      row,
      dataVersion: store.version,
    };
  }
  async deleteAvailabilityTemplate(
    authUserId: string,
    templateId: string,
    actorUserId = authUserId,
  ): Promise<{
    dataVersion: string | null;
  }> {
    const store = this.storeProvider();
    const templates = asRows(store.tables.availabilityTemplates);
    const row = getActiveRows(templates).find(
      (candidate) =>
        asString(candidate.id) === templateId &&
        asString(candidate.coachUserId) === authUserId,
    );
    if (!row) {
      throw notFound("Availability template not found", {
        templateId,
      });
    }
    row.active = false;
    row.deletedAt = isoNow();
    row.deletedByUserId = actorUserId;
    row.updatedAt = row.deletedAt;
    row.updatedByUserId = actorUserId;
    return {
      dataVersion: store.version,
    };
  }
  async listAvailabilityOverrideRows(
    authUserId: string,
    range?: {
      start?: string;
      end?: string;
    },
  ): Promise<CoachOverrideRowsResult> {
    const store = this.storeProvider();
    const overrides = getActiveRows(
      asRows(store.tables.availabilityOverrides),
    ).filter(
      (row) =>
        asString(row.coachUserId) === authUserId &&
        (() => {
          const date = asString(row.overrideDate)?.slice(0, 10);
          if (!date) {
            return false;
          }
          return (
            (!range?.start || date >= range.start) &&
            (!range?.end || date <= range.end)
          );
        })(),
    );
    return {
      overrides,
      dataVersion: store.version,
    };
  }
  async createAvailabilityOverride(
    authUserId: string,
    body: {
      id?: string;
      date: string;
      isBlocked: boolean;
      reason?: string;
      customSlots?: Array<{
        startTime: string;
        endTime: string;
        location?: string;
      }>;
      repeatUntil?: string;
      repeatDayOfWeek?: number;
      repeatGroupId?: string;
    },
    actorUserId = authUserId,
  ): Promise<{
    row: SeedRow;
    dataVersion: string | null;
  }> {
    const store = this.storeProvider();
    const overrides = ensureTable(store.tables, "availabilityOverrides");
    const customSlot = body.customSlots?.[0];
    const now = isoNow();
    const row: SeedRow = {
      id: body.id ?? `avo_${randomUUID()}`,
      coachUserId: authUserId,
      overrideDate: toIsoDate(body.date),
      isBlocked: body.isBlocked,
      reason: body.reason ?? null,
      startTimeLocal: customSlot ? normalizeTime(customSlot.startTime) : null,
      endTimeLocal: customSlot ? normalizeTime(customSlot.endTime) : null,
      location: customSlot?.location ?? null,
      repeatUntil: body.repeatUntil ? toIsoDate(body.repeatUntil) : null,
      repeatDayOfWeek: body.repeatDayOfWeek ?? null,
      repeatGroupId: body.repeatGroupId ?? null,
      active: true,
      createdAt: now,
      updatedAt: now,
      createdByUserId: actorUserId,
      updatedByUserId: actorUserId,
      version: 1,
      deletedAt: null,
      deletedByUserId: null,
    };
    overrides.push(row);
    return {
      row,
      dataVersion: store.version,
    };
  }
  async updateAvailabilityOverride(
    authUserId: string,
    overrideId: string,
    body: {
      date?: string;
      isBlocked?: boolean;
      reason?: string;
      customSlots?: Array<{
        startTime: string;
        endTime: string;
        location?: string;
      }>;
      repeatUntil?: string;
      repeatDayOfWeek?: number;
      repeatGroupId?: string;
    },
    actorUserId = authUserId,
  ): Promise<{
    row: SeedRow;
    dataVersion: string | null;
  }> {
    const store = this.storeProvider();
    const overrides = asRows(store.tables.availabilityOverrides);
    const row = getActiveRows(overrides).find(
      (candidate) =>
        asString(candidate.id) === overrideId &&
        asString(candidate.coachUserId) === authUserId,
    );
    if (!row) {
      throw notFound("Availability override not found", {
        overrideId,
      });
    }
    const customSlot = body.customSlots?.[0];
    if (body.date !== undefined) row.overrideDate = toIsoDate(body.date);
    if (body.isBlocked !== undefined) row.isBlocked = body.isBlocked;
    if (body.reason !== undefined) row.reason = body.reason || null;
    if (body.customSlots !== undefined) {
      row.startTimeLocal = customSlot
        ? normalizeTime(customSlot.startTime)
        : null;
      row.endTimeLocal = customSlot ? normalizeTime(customSlot.endTime) : null;
      row.location = customSlot?.location ?? null;
    }
    if (body.repeatUntil !== undefined)
      row.repeatUntil = body.repeatUntil ? toIsoDate(body.repeatUntil) : null;
    if (body.repeatDayOfWeek !== undefined)
      row.repeatDayOfWeek = body.repeatDayOfWeek;
    if (body.repeatGroupId !== undefined)
      row.repeatGroupId = body.repeatGroupId || null;
    row.updatedAt = isoNow();
    row.updatedByUserId = actorUserId;
    row.version = Number(row.version ?? 1) + 1;
    return {
      row,
      dataVersion: store.version,
    };
  }
  async deleteAvailabilityOverride(
    authUserId: string,
    overrideId: string,
    actorUserId = authUserId,
  ): Promise<{
    dataVersion: string | null;
  }> {
    const store = this.storeProvider();
    const overrides = asRows(store.tables.availabilityOverrides);
    const row = getActiveRows(overrides).find(
      (candidate) =>
        asString(candidate.id) === overrideId &&
        asString(candidate.coachUserId) === authUserId,
    );
    if (!row) {
      throw notFound("Availability override not found", {
        overrideId,
      });
    }
    row.active = false;
    row.deletedAt = isoNow();
    row.deletedByUserId = actorUserId;
    row.updatedAt = row.deletedAt;
    row.updatedByUserId = actorUserId;
    return {
      dataVersion: store.version,
    };
  }
  async getSchedulingRows(
    authUserId: string,
  ): Promise<CoachSchedulingRowsResult> {
    const store = this.storeProvider();
    return {
      rulesRow: asRows(store.tables.schedulingRules).find(
        (row) => asString(row.coachUserId) === authUserId,
      ),
      policyRows: getActiveRows(
        asRows(store.tables.cancellationPolicyRules),
      ).filter((row) => asString(row.coachUserId) === authUserId),
      dataVersion: store.version,
    };
  }
  async patchSchedulingRows(
    authUserId: string,
    body: {
      minimumAdvanceBookingHours?: number;
      maxAdvanceBookingDays?: number;
      bufferMinutesDefault?: number;
      maxConcurrentDefault?: number;
      allowSameDayBookings?: boolean;
      cancellationPolicy?: {
        name: string;
        description: string;
        tiers: Array<{
          hoursBeforeSession: number;
          refundPercentage: number;
          description: string;
        }>;
        minimumNoticeHours: number;
        allowCancellations: boolean;
        isDefault: boolean;
      } | null;
    },
  ): Promise<CoachSchedulingRowsResult> {
    const store = this.storeProvider();
    const rulesRows = ensureTable(store.tables, "schedulingRules");
    const policyRows = ensureTable(store.tables, "cancellationPolicyRules");
    const now = isoNow();
    let rulesRow = rulesRows.find(
      (row) => asString(row.coachUserId) === authUserId,
    );
    if (!rulesRow) {
      rulesRow = {
        coachUserId: authUserId,
        createdAt: now,
        updatedAt: now,
        minimumAdvanceBookingHours: 24,
        maxAdvanceBookingDays: 30,
        bufferMinutesDefault: 15,
        maxConcurrentDefault: 1,
        allowSameDayBookings: false,
        confirmationMode: "manual",
        cancellationPolicyId: null,
      };
      rulesRows.push(rulesRow);
    }
    if (body.minimumAdvanceBookingHours !== undefined) {
      rulesRow.minimumAdvanceBookingHours = Number(
        body.minimumAdvanceBookingHours,
      );
    }
    if (body.maxAdvanceBookingDays !== undefined) {
      rulesRow.maxAdvanceBookingDays = Number(body.maxAdvanceBookingDays);
    }
    if (body.bufferMinutesDefault !== undefined) {
      rulesRow.bufferMinutesDefault = Number(body.bufferMinutesDefault);
    }
    if (body.maxConcurrentDefault !== undefined) {
      rulesRow.maxConcurrentDefault = Number(body.maxConcurrentDefault);
    }
    if (body.allowSameDayBookings !== undefined) {
      rulesRow.allowSameDayBookings = body.allowSameDayBookings;
    }
    if (body.cancellationPolicy !== undefined) {
      rulesRow.cancellationPolicyId = null;
      for (const row of policyRows) {
        if (
          asString(row.coachUserId) === authUserId &&
          !asString(row.deletedAt)
        ) {
          row.active = false;
          row.deletedAt = now;
          row.deletedByUserId = authUserId;
          row.updatedAt = now;
          row.updatedByUserId = authUserId;
        }
      }
      if (body.cancellationPolicy) {
        const nextPolicyId = `cpr_${randomUUID()}`;
        body.cancellationPolicy.tiers.forEach((tier, index) => {
          policyRows.push({
            id: index === 0 ? nextPolicyId : `cpr_${randomUUID()}`,
            coachUserId: authUserId,
            name: body.cancellationPolicy?.name ?? "Cancellation policy",
            description: body.cancellationPolicy?.description ?? null,
            noticeHoursMin: Number(tier.hoursBeforeSession),
            refundPercent: Number(tier.refundPercentage),
            active: true,
            appliesToNoShow: Number(tier.hoursBeforeSession) === 0,
            feeMinor: null,
            currency: "GBP",
            sortOrder: index + 1,
            isDefault: body.cancellationPolicy?.isDefault ?? false,
            createdAt: now,
            updatedAt: now,
            createdByUserId: authUserId,
            updatedByUserId: authUserId,
            version: 1,
            deletedAt: null,
            deletedByUserId: null,
          });
        });
        rulesRow.cancellationPolicyId = nextPolicyId;
      }
    }
    rulesRow.updatedAt = now;
    return this.getSchedulingRows(authUserId);
  }
}
class PrismaCoachSelfRepository implements CoachSelfRepository {
  private readonly fallback = new StoreCoachSelfRepository(() =>
    getDbFixtureStore(),
  );
  async getProfileBundle(
    authUserId: string,
  ): Promise<CoachProfileBundleResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.getProfileBundle(authUserId);
    }
    const prisma = getPrismaClientOrThrow();
    const [
      profile,
      locations,
      availabilityTemplates,
      availabilityOverrides,
      rulesRow,
      policyRows,
    ] = await Promise.all([
      prisma.coachProfile.findFirst({
        where: {
          userId: authUserId,
          deletedAt: null,
        },
      }),
      prisma.coachLocation.findMany({
        where: {
          coachUserId: authUserId,
        },
        orderBy: {
          createdAt: "asc",
        },
      }),
      prisma.availabilityTemplate.findMany({
        where: {
          coachUserId: authUserId,
        },
        orderBy: [
          {
            dayOfWeek: "asc",
          },
          {
            startTimeLocal: "asc",
          },
        ],
      }),
      prisma.availabilityOverride.findMany({
        where: {
          coachUserId: authUserId,
        },
        orderBy: [
          {
            overrideDate: "asc",
          },
          {
            startTimeLocal: "asc",
          },
        ],
      }),
      prisma.schedulingRule.findUnique({
        where: {
          coachUserId: authUserId,
        },
      }),
      prisma.cancellationPolicyRule.findMany({
        where: {
          coachUserId: authUserId,
        },
        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
      }),
    ]);
    if (!profile) {
      throw notFound("Coach profile not found", {
        userId: authUserId,
      });
    }
    return {
      profile: toSeedRow(profile),
      locations: toSeedRows(locations),
      availabilityTemplates: toSeedRows(availabilityTemplates),
      availabilityOverrides: toSeedRows(availabilityOverrides),
      schedulingRules: rulesRow ? [toSeedRow(rulesRow)] : [],
      cancellationPolicyRules: toSeedRows(policyRows),
      dataVersion: null,
    };
  }
  async patchProfile(
    authUserId: string,
    body: CoachProfilePatchBody,
  ): Promise<CoachProfileBundleResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.patchProfile(authUserId, body);
    }
    const prisma = getPrismaClientOrThrow();
    const profile = await prisma.coachProfile.findFirst({
      where: {
        userId: authUserId,
        deletedAt: null,
      },
      select: {
        userId: true,
      },
    });
    if (!profile) {
      throw notFound("Coach profile not found", {
        userId: authUserId,
      });
    }
    const data: Record<string, unknown> = {};
    if (body.bio !== undefined) data.bio = body.bio;
    if (body.yearsExperience !== undefined) {
      data.yearsExperience = body.yearsExperience;
    }
    if (body.sessionRateMinor !== undefined) {
      data.sessionRateMinor = body.sessionRateMinor;
    }
    if (body.priceMaxMinor !== undefined) {
      data.priceMaxMinor = body.priceMaxMinor;
    }
    if (body.currency !== undefined) data.currency = body.currency;
    if (body.website !== undefined) data.website = body.website;
    if (body.socialLinks !== undefined) data.socialLinksJson = body.socialLinks;
    if (body.experiences !== undefined) {
      data.experiencesJson = body.experiences;
    }
    if (body.languages !== undefined) data.languagesJson = body.languages;
    if (body.specialties !== undefined) data.specialties = body.specialties;
    if (body.qualifications !== undefined) {
      data.qualifications = body.qualifications;
    }
    await prisma.coachProfile.update({
      where: {
        userId: authUserId,
      },
      data,
    });
    return this.getProfileBundle(authUserId);
  }
  async listOfferings(authUserId: string): Promise<CoachOfferingsResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.listOfferings(authUserId);
    }
    const prisma = getPrismaClientOrThrow();
    const offerings = await prisma.coachingOffering.findMany({
      where: {
        coachUserId: authUserId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
    return {
      offerings: toSeedRows(offerings),
      dataVersion: null,
    };
  }
  async listPublicOfferingIndex(): Promise<CoachOfferingsResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.listPublicOfferingIndex();
    }
    const prisma = getPrismaClientOrThrow();
    const offerings = await prisma.coachingOffering.findMany({
      where: {
        active: true,
        deletedAt: null,
        coach: {
          deletedAt: null,
        },
      },
      orderBy: [
        {
          coachUserId: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
      include: {
        coach: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
            locations: {
              where: {
                deletedAt: null,
              },
              orderBy: [
                {
                  isDefault: "desc",
                },
                {
                  label: "asc",
                },
              ],
              select: {
                id: true,
                label: true,
                latLngJson: true,
                isDefault: true,
              },
            },
          },
        },
      },
    });
    return {
      offerings: offerings.map((offering) => {
        const row = toSeedRow(offering);
        const profile = row.coach as SeedRow | undefined;
        delete row.coach;
        return withPublicCoachProfile(row, profile ?? {});
      }),
      dataVersion: null,
    };
  }
  async searchPublicCoaches(
    params: PublicCoachSearchParams,
  ): Promise<PublicCoachSearchResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.searchPublicCoaches(params);
    }
    const index = await this.listPublicOfferingIndex();
    const coachIds = Array.from(
      new Set(index.offerings.map((offering) => asString(offering.coachUserId)).filter(Boolean)),
    ) as string[];
    if (coachIds.length === 0) {
      return searchPublicCoachRows(index, params);
    }
    const prisma = getPrismaClientOrThrow();
    const feedbackRows = await prisma.sessionFeedback.findMany({
      where: {
        deletedAt: null,
        visibility: "public",
        rating: {
          not: null,
        },
        booking: {
          coachUserId: {
            in: coachIds,
          },
          status: "COMPLETED",
          deletedAt: null,
        },
      },
      select: {
        rating: true,
        booking: {
          select: {
            coachUserId: true,
          },
        },
      },
    });
    const ratingsByCoachId = new Map<string, number[]>();
    for (const feedback of feedbackRows) {
      const coachUserId = feedback.booking?.coachUserId;
      const rating = feedback.rating;
      if (!coachUserId || rating == null) continue;
      ratingsByCoachId.set(coachUserId, [...(ratingsByCoachId.get(coachUserId) ?? []), rating]);
    }
    const reviewAggregates = new Map(
      Array.from(ratingsByCoachId.entries()).map(([coachUserId, ratings]) => [
        coachUserId,
        {
          ratingAverage: averageRating(ratings),
          reviewCount: ratings.length,
        },
      ]),
    );
    return searchPublicCoachRows(index, params, reviewAggregates);
  }
  async listPublicOfferings(
    coachUserId: string,
  ): Promise<CoachOfferingsResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.listPublicOfferings(coachUserId);
    }
    const prisma = getPrismaClientOrThrow();
    const profile = await prisma.coachProfile.findFirst({
      where: {
        userId: coachUserId,
        deletedAt: null,
      },
      select: {
        userId: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });
    if (!profile) {
      throw notFound("Coach profile not found", {
        coachUserId,
      });
    }
    const offerings = await prisma.coachingOffering.findMany({
      where: {
        coachUserId,
        active: true,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        coach: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
            locations: {
              where: {
                deletedAt: null,
              },
              orderBy: [
                {
                  isDefault: "desc",
                },
                {
                  label: "asc",
                },
              ],
              select: {
                id: true,
                label: true,
                latLngJson: true,
                isDefault: true,
              },
            },
          },
        },
      },
    });
    return {
      offerings: offerings.map((offering) => {
        const row = toSeedRow(offering);
        const includedProfile = row.coach as SeedRow | undefined;
        delete row.coach;
        return withPublicCoachProfile(row, includedProfile ?? toSeedRow(profile));
      }),
      dataVersion: null,
    };
  }
  async getPublicProfile(
    coachUserId: string,
  ): Promise<PublicCoachProfileResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.getPublicProfile(coachUserId);
    }
    const prisma = getPrismaClientOrThrow();
    const profile = await prisma.coachProfile.findFirst({
      where: {
        userId: coachUserId,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
        locations: {
          where: {
            deletedAt: null,
          },
          orderBy: [
            {
              isDefault: "desc",
            },
            {
              label: "asc",
            },
          ],
          select: {
            id: true,
            label: true,
            latLngJson: true,
            isDefault: true,
          },
        },
      },
    });
    if (!profile) {
      throw notFound("Coach profile not found", {
        coachUserId,
      });
    }
    const offerings = await prisma.coachingOffering.findMany({
      where: {
        coachUserId,
        active: true,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        coach: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
            locations: {
              where: {
                deletedAt: null,
              },
              orderBy: [
                {
                  isDefault: "desc",
                },
                {
                  label: "asc",
                },
              ],
              select: {
                id: true,
                label: true,
                latLngJson: true,
                isDefault: true,
              },
            },
          },
        },
      },
    });
    const profileRow = toSeedRow(profile);
    return {
      coachProfile: mapPublicCoachProfile(profileRow),
      offerings: offerings.map((offering) => {
        const row = toSeedRow(offering);
        const includedProfile = row.coach as SeedRow | undefined;
        delete row.coach;
        return withPublicCoachProfile(row, includedProfile ?? profileRow);
      }),
      dataVersion: null,
    };
  }
  async listAvailabilityTemplateRows(
    authUserId: string,
  ): Promise<CoachTemplateRowsResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.listAvailabilityTemplateRows(authUserId);
    }
    const prisma = getPrismaClientOrThrow();
    const templates = await prisma.availabilityTemplate.findMany({
      where: {
        coachUserId: authUserId,
        active: true,
        deletedAt: null,
      },
      orderBy: [
        {
          dayOfWeek: "asc",
        },
        {
          startTimeLocal: "asc",
        },
      ],
    });
    return {
      templates: toSeedRows(templates),
      dataVersion: null,
    };
  }
  async createAvailabilityTemplate(
    authUserId: string,
    body: {
      id?: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      maxConcurrent?: number;
      bufferMinutes?: number;
      location?: string;
      sessionTemplateId?: string;
    },
    actorUserId = authUserId,
  ): Promise<{
    row: SeedRow;
    dataVersion: string | null;
  }> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.createAvailabilityTemplate(authUserId, body, actorUserId);
    }
    const prisma = getPrismaClientOrThrow();
    const row = await prisma.availabilityTemplate.create({
      data: {
        id: body.id ?? `avt_${randomUUID()}`,
        coachUserId: authUserId,
        dayOfWeek: body.dayOfWeek,
        startTimeLocal: normalizeTime(body.startTime),
        endTimeLocal: normalizeTime(body.endTime),
        maxConcurrent: Number(body.maxConcurrent ?? 1),
        bufferMinutes: Number(body.bufferMinutes ?? 15),
        location: body.location ?? null,
        sessionTemplateId: body.sessionTemplateId ?? null,
        active: true,
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
        version: 1n,
      },
    });
    return {
      row: toSeedRow(row),
      dataVersion: null,
    };
  }
  async updateAvailabilityTemplate(
    authUserId: string,
    templateId: string,
    body: {
      dayOfWeek?: number;
      startTime?: string;
      endTime?: string;
      maxConcurrent?: number;
      bufferMinutes?: number;
      location?: string;
      sessionTemplateId?: string;
    },
    actorUserId = authUserId,
  ): Promise<{
    row: SeedRow;
    dataVersion: string | null;
  }> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.updateAvailabilityTemplate(
        authUserId,
        templateId,
        body,
        actorUserId,
      );
    }
    const prisma = getPrismaClientOrThrow();
    const existing = await prisma.availabilityTemplate.findFirst({
      where: {
        id: templateId,
        coachUserId: authUserId,
        active: true,
        deletedAt: null,
      },
    });
    if (!existing) {
      throw notFound("Availability template not found", {
        templateId,
      });
    }
    const row = await prisma.availabilityTemplate.update({
      where: {
        id: templateId,
      },
      data: {
        ...(body.dayOfWeek !== undefined
          ? {
              dayOfWeek: body.dayOfWeek,
            }
          : {}),
        ...(body.startTime !== undefined
          ? {
              startTimeLocal: normalizeTime(body.startTime),
            }
          : {}),
        ...(body.endTime !== undefined
          ? {
              endTimeLocal: normalizeTime(body.endTime),
            }
          : {}),
        ...(body.maxConcurrent !== undefined
          ? {
              maxConcurrent: Number(body.maxConcurrent),
            }
          : {}),
        ...(body.bufferMinutes !== undefined
          ? {
              bufferMinutes: Number(body.bufferMinutes),
            }
          : {}),
        ...(body.location !== undefined
          ? {
              location: body.location || null,
            }
          : {}),
        ...(body.sessionTemplateId !== undefined
          ? {
              sessionTemplateId: body.sessionTemplateId || null,
            }
          : {}),
        updatedByUserId: actorUserId,
        version: (existing.version ?? 1n) + 1n,
      },
    });
    return {
      row: toSeedRow(row),
      dataVersion: null,
    };
  }
  async deleteAvailabilityTemplate(
    authUserId: string,
    templateId: string,
    actorUserId = authUserId,
  ): Promise<{
    dataVersion: string | null;
  }> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.deleteAvailabilityTemplate(authUserId, templateId, actorUserId);
    }
    const prisma = getPrismaClientOrThrow();
    const existing = await prisma.availabilityTemplate.findFirst({
      where: {
        id: templateId,
        coachUserId: authUserId,
        active: true,
        deletedAt: null,
      },
    });
    if (!existing) {
      throw notFound("Availability template not found", {
        templateId,
      });
    }
    await prisma.availabilityTemplate.update({
      where: {
        id: templateId,
      },
      data: {
        active: false,
        deletedAt: new Date(),
        deletedByUserId: actorUserId,
        updatedByUserId: actorUserId,
      },
    });
    return {
      dataVersion: null,
    };
  }
  async listAvailabilityOverrideRows(
    authUserId: string,
    range?: {
      start?: string;
      end?: string;
    },
  ): Promise<CoachOverrideRowsResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.listAvailabilityOverrideRows(authUserId, range);
    }
    const prisma = getPrismaClientOrThrow();
    const rows = await prisma.availabilityOverride.findMany({
      where: {
        coachUserId: authUserId,
        active: true,
        deletedAt: null,
        ...(range?.start || range?.end
          ? {
              overrideDate: {
                ...(range?.start
                  ? {
                      gte: new Date(toIsoDate(range.start)),
                    }
                  : {}),
                ...(range?.end
                  ? {
                      lte: new Date(toIsoDate(range.end)),
                    }
                  : {}),
              },
            }
          : {}),
      },
      orderBy: [
        {
          overrideDate: "asc",
        },
        {
          startTimeLocal: "asc",
        },
      ],
    });
    return {
      overrides: toSeedRows(rows),
      dataVersion: null,
    };
  }
  async createAvailabilityOverride(
    authUserId: string,
    body: {
      id?: string;
      date: string;
      isBlocked: boolean;
      reason?: string;
      customSlots?: Array<{
        startTime: string;
        endTime: string;
        location?: string;
      }>;
      repeatUntil?: string;
      repeatDayOfWeek?: number;
      repeatGroupId?: string;
    },
    actorUserId = authUserId,
  ): Promise<{
    row: SeedRow;
    dataVersion: string | null;
  }> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.createAvailabilityOverride(authUserId, body, actorUserId);
    }
    const prisma = getPrismaClientOrThrow();
    const customSlot = body.customSlots?.[0];
    const row = await prisma.availabilityOverride.create({
      data: {
        id: body.id ?? `avo_${randomUUID()}`,
        coachUserId: authUserId,
        overrideDate: new Date(toIsoDate(body.date)),
        isBlocked: body.isBlocked,
        reason: body.reason ?? null,
        startTimeLocal: customSlot ? normalizeTime(customSlot.startTime) : null,
        endTimeLocal: customSlot ? normalizeTime(customSlot.endTime) : null,
        location: customSlot?.location ?? null,
        repeatUntil: body.repeatUntil
          ? new Date(toIsoDate(body.repeatUntil))
          : null,
        repeatDayOfWeek: body.repeatDayOfWeek ?? null,
        repeatGroupId: body.repeatGroupId ?? null,
        active: true,
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
        version: 1n,
      },
    });
    return {
      row: toSeedRow(row),
      dataVersion: null,
    };
  }
  async updateAvailabilityOverride(
    authUserId: string,
    overrideId: string,
    body: {
      date?: string;
      isBlocked?: boolean;
      reason?: string;
      customSlots?: Array<{
        startTime: string;
        endTime: string;
        location?: string;
      }>;
      repeatUntil?: string;
      repeatDayOfWeek?: number;
      repeatGroupId?: string;
    },
    actorUserId = authUserId,
  ): Promise<{
    row: SeedRow;
    dataVersion: string | null;
  }> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.updateAvailabilityOverride(
        authUserId,
        overrideId,
        body,
        actorUserId,
      );
    }
    const prisma = getPrismaClientOrThrow();
    const existing = await prisma.availabilityOverride.findFirst({
      where: {
        id: overrideId,
        coachUserId: authUserId,
        active: true,
        deletedAt: null,
      },
    });
    if (!existing) {
      throw notFound("Availability override not found", {
        overrideId,
      });
    }
    const customSlot = body.customSlots?.[0];
    const row = await prisma.availabilityOverride.update({
      where: {
        id: overrideId,
      },
      data: {
        ...(body.date !== undefined
          ? {
              overrideDate: new Date(toIsoDate(body.date)),
            }
          : {}),
        ...(body.isBlocked !== undefined
          ? {
              isBlocked: body.isBlocked,
            }
          : {}),
        ...(body.reason !== undefined
          ? {
              reason: body.reason || null,
            }
          : {}),
        ...(body.customSlots !== undefined
          ? {
              startTimeLocal: customSlot
                ? normalizeTime(customSlot.startTime)
                : null,
              endTimeLocal: customSlot
                ? normalizeTime(customSlot.endTime)
                : null,
              location: customSlot?.location ?? null,
            }
          : {}),
        ...(body.repeatUntil !== undefined
          ? {
              repeatUntil: body.repeatUntil
                ? new Date(toIsoDate(body.repeatUntil))
                : null,
            }
          : {}),
        ...(body.repeatDayOfWeek !== undefined
          ? {
              repeatDayOfWeek: body.repeatDayOfWeek,
            }
          : {}),
        ...(body.repeatGroupId !== undefined
          ? {
              repeatGroupId: body.repeatGroupId || null,
            }
          : {}),
        updatedByUserId: actorUserId,
        version: (existing.version ?? 1n) + 1n,
      },
    });
    return {
      row: toSeedRow(row),
      dataVersion: null,
    };
  }
  async deleteAvailabilityOverride(
    authUserId: string,
    overrideId: string,
    actorUserId = authUserId,
  ): Promise<{
    dataVersion: string | null;
  }> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.deleteAvailabilityOverride(authUserId, overrideId, actorUserId);
    }
    const prisma = getPrismaClientOrThrow();
    const existing = await prisma.availabilityOverride.findFirst({
      where: {
        id: overrideId,
        coachUserId: authUserId,
        active: true,
        deletedAt: null,
      },
    });
    if (!existing) {
      throw notFound("Availability override not found", {
        overrideId,
      });
    }
    await prisma.availabilityOverride.update({
      where: {
        id: overrideId,
      },
      data: {
        active: false,
        deletedAt: new Date(),
        deletedByUserId: actorUserId,
        updatedByUserId: actorUserId,
      },
    });
    return {
      dataVersion: null,
    };
  }
  async getSchedulingRows(
    authUserId: string,
  ): Promise<CoachSchedulingRowsResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.getSchedulingRows(authUserId);
    }
    const prisma = getPrismaClientOrThrow();
    const [rulesRow, policyRows] = await Promise.all([
      prisma.schedulingRule.findUnique({
        where: {
          coachUserId: authUserId,
        },
      }),
      prisma.cancellationPolicyRule.findMany({
        where: {
          coachUserId: authUserId,
          active: true,
          deletedAt: null,
        },
        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
      }),
    ]);
    return {
      rulesRow: rulesRow ? toSeedRow(rulesRow) : undefined,
      policyRows: toSeedRows(policyRows),
      dataVersion: null,
    };
  }
  async patchSchedulingRows(
    authUserId: string,
    body: {
      minimumAdvanceBookingHours?: number;
      maxAdvanceBookingDays?: number;
      bufferMinutesDefault?: number;
      maxConcurrentDefault?: number;
      allowSameDayBookings?: boolean;
      cancellationPolicy?: {
        name: string;
        description: string;
        tiers: Array<{
          hoursBeforeSession: number;
          refundPercentage: number;
          description: string;
        }>;
        minimumNoticeHours: number;
        allowCancellations: boolean;
        isDefault: boolean;
      } | null;
    },
  ): Promise<CoachSchedulingRowsResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.patchSchedulingRows(authUserId, body);
    }
    const prisma = getPrismaClientOrThrow();
    await prisma.$transaction(async (tx) => {
      const existing = await tx.schedulingRule.findUnique({
        where: {
          coachUserId: authUserId,
        },
      });
      const now = new Date();
      let nextCancellationPolicyId =
        body.cancellationPolicy !== undefined
          ? null
          : (existing?.cancellationPolicyId ?? null);
      if (body.cancellationPolicy !== undefined) {
        await tx.cancellationPolicyRule.updateMany({
          where: {
            coachUserId: authUserId,
            active: true,
            deletedAt: null,
          },
          data: {
            active: false,
            deletedAt: now,
            deletedByUserId: authUserId,
            updatedAt: now,
            updatedByUserId: authUserId,
          },
        });
        if (body.cancellationPolicy) {
          const primaryId = newId("cpr");
          await Promise.all(
            body.cancellationPolicy.tiers.map((tier, index) =>
              tx.cancellationPolicyRule.create({
                data: {
                  id: index === 0 ? primaryId : newId("cpr"),
                  coachUserId: authUserId,
                  name: body.cancellationPolicy?.name ?? "Cancellation policy",
                  description: body.cancellationPolicy?.description ?? null,
                  noticeHoursMin: Number(tier.hoursBeforeSession),
                  refundPercent: Number(tier.refundPercentage),
                  feeMinor: null,
                  currency: "GBP",
                  appliesToNoShow: Number(tier.hoursBeforeSession) === 0,
                  sortOrder: index + 1,
                  isDefault: body.cancellationPolicy?.isDefault ?? false,
                  active: true,
                  createdByUserId: authUserId,
                  updatedByUserId: authUserId,
                  version: 1n,
                },
              }),
            ),
          );
          nextCancellationPolicyId = primaryId;
        }
      }
      const nextData = {
        minimumAdvanceBookingHours:
          body.minimumAdvanceBookingHours ??
          existing?.minimumAdvanceBookingHours ??
          24,
        maxAdvanceBookingDays:
          body.maxAdvanceBookingDays ?? existing?.maxAdvanceBookingDays ?? 30,
        bufferMinutesDefault:
          body.bufferMinutesDefault ?? existing?.bufferMinutesDefault ?? 15,
        maxConcurrentDefault:
          body.maxConcurrentDefault ?? existing?.maxConcurrentDefault ?? 1,
        allowSameDayBookings:
          body.allowSameDayBookings ?? existing?.allowSameDayBookings ?? false,
        confirmationMode: existing?.confirmationMode ?? "manual",
        cancellationPolicyId: nextCancellationPolicyId,
      };
      if (existing) {
        await tx.schedulingRule.update({
          where: {
            coachUserId: authUserId,
          },
          data: nextData,
        });
      } else {
        await tx.schedulingRule.create({
          data: {
            coachUserId: authUserId,
            ...nextData,
          },
        });
      }
    });
    return this.getSchedulingRows(authUserId);
  }
}
const seedRepository = new StoreCoachSelfRepository(() =>
  getMarketplaceSeedStore(),
);
const dbRepository = new PrismaCoachSelfRepository();
export function resolveCoachSelfRepository(): CoachSelfRepository {
  return getApiDataBackend() === "db" ? dbRepository : seedRepository;
}
