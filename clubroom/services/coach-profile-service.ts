import { api as apiConfig } from '@/constants/config';
import type { CoachExperience, CoachLanguage, CoachProfile, SocialLinks } from '@/constants/types';
import { apiFetch } from '@/services/api-client';
import type { Result, ServiceError } from '@/types/result';
import { err, ok, serviceError } from '@/types/result';

const USE_MOCK = apiConfig.useMock;

export interface CoachProfilePatchInput {
  bio?: string | null;
  yearsExperience?: number | null;
  sessionRateMinor?: number | null;
  priceMaxMinor?: number | null;
  currency?: string;
  website?: string | null;
  socialLinks?: SocialLinks;
  experiences?: CoachExperience[];
  languages?: CoachLanguage[];
  specialties?: string[];
  qualifications?: string[];
}

export interface CoachSelfProfileRecord {
  userId: string;
  bio?: string | null;
  yearsExperience?: number | null;
  sessionRateMinor?: number | null;
  priceMaxMinor?: number | null;
  currency?: string | null;
  travelRadiusMiles?: number | null;
  acceptsTravelSessions?: boolean | null;
  acceptsRemoteSessions?: boolean | null;
  website?: string | null;
  socialLinksJson?: SocialLinks | null;
  experiencesJson?: CoachExperience[] | null;
  languagesJson?: CoachLanguage[] | null;
  specialties?: string[] | null;
  qualifications?: string[] | null;
  createdAt?: string | null;
}

export interface CoachSelfProfileResponse {
  profile: CoachSelfProfileRecord;
  seedVersion?: string | null;
  requestId?: string;
}

export interface CoachSelfIdentity {
  id: string;
  fullName?: string;
  name?: string;
  username?: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

function hasPatchFields(input: CoachProfilePatchInput): boolean {
  return Object.keys(input).some((key) => input[key as keyof CoachProfilePatchInput] !== undefined);
}

function poundsFromMinor(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value / 100 : undefined;
}

export function mapCoachSelfProfileResponse(
  response: CoachSelfProfileResponse,
  identity: CoachSelfIdentity,
): CoachProfile {
  const profile = response.profile;
  if (!profile.userId || profile.userId !== identity.id) {
    throw new Error('Coach self-profile response did not match the authenticated user.');
  }

  const minPrice = poundsFromMinor(profile.sessionRateMinor);
  const maxPrice = poundsFromMinor(profile.priceMaxMinor) ?? minPrice;
  const qualifications = Array.isArray(profile.qualifications) ? profile.qualifications : [];
  const sessionFormats: CoachProfile['sessionFormats'] = [
    ...(profile.acceptsTravelSessions === true ? (['In-person'] as const) : []),
    ...(profile.acceptsRemoteSessions === true ? (['Virtual'] as const) : []),
  ];

  return {
    id: profile.userId,
    fullName: identity.fullName || identity.name || identity.username || '',
    primarySport: 'Football',
    sports: ['Football'],
    city: '',
    state: '',
    distanceMiles: 0,
    rating: {
      average: 0,
      reviewCount: 0,
    },
    priceRange: {
      min: minPrice ?? 0,
      max: maxPrice ?? 0,
      unitLabel: 'per session',
    },
    ...(minPrice !== undefined ? { sessionRate: minPrice } : {}),
    nextAvailability: '',
    badges: [],
    sessionFormats,
    travelRadius: profile.travelRadiusMiles ?? undefined,
    acceptsTravelSessions: profile.acceptsTravelSessions ?? undefined,
    acceptsRemoteSessions: profile.acceptsRemoteSessions ?? undefined,
    shortBio: profile.bio ?? '',
    profilePhotoUrl: identity.avatar ?? '',
    footballFocuses: (profile.specialties ?? []) as CoachProfile['footballFocuses'],
    location: { lat: 0, lng: 0 },
    bio: profile.bio ?? undefined,
    phone: identity.phone,
    email: identity.email,
    website: profile.website ?? undefined,
    joinedDate: profile.createdAt ?? '',
    totalSessions: 0,
    experiences: profile.experiencesJson ?? [],
    certifications: qualifications.map((name, index) => ({
      id: `qualification_${profile.userId}_${index}`,
      name,
      issuer: '',
      issueDate: '',
    })),
    posts: [],
    photoGallery: [],
    videoGallery: [],
    languages: profile.languagesJson ?? [],
    achievements: [],
    socialLinks: profile.socialLinksJson ?? {},
  };
}

export const coachProfileService = {
  async getSelfProfile(): Promise<Result<CoachSelfProfileResponse, ServiceError>> {
    return apiFetch<CoachSelfProfileResponse>('/v1/coaches/me/profile', {
      method: 'GET',
    });
  },

  async updateSelfProfile(
    input: CoachProfilePatchInput,
  ): Promise<Result<CoachSelfProfileResponse, ServiceError>> {
    if (!hasPatchFields(input)) {
      return err(serviceError('VALIDATION', 'Add at least one profile field before saving.'));
    }

    if (USE_MOCK) {
      return ok({
        profile: {
          userId: 'mock_self',
          bio: input.bio,
          yearsExperience: input.yearsExperience,
          sessionRateMinor: input.sessionRateMinor,
          priceMaxMinor: input.priceMaxMinor,
          currency: input.currency,
          website: input.website,
          socialLinksJson: input.socialLinks,
          experiencesJson: input.experiences,
          languagesJson: input.languages,
          specialties: input.specialties,
          qualifications: input.qualifications,
        },
        seedVersion: null,
      });
    }

    return apiFetch<CoachSelfProfileResponse>('/v1/coaches/me/profile', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },
};
