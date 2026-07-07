import { api as apiConfig } from '@/constants/config';
import type { CoachExperience, CoachLanguage, SocialLinks } from '@/constants/types';
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

export interface CoachProfilePatchResponse {
  profile: Record<string, unknown>;
  locations: Record<string, unknown>[];
  availabilityTemplates: Record<string, unknown>[];
  availabilityOverrides: Record<string, unknown>[];
  schedulingRules: Record<string, unknown>[];
  cancellationPolicyRules: Record<string, unknown>[];
  seedVersion?: string | null;
  requestId?: string;
}

function hasPatchFields(input: CoachProfilePatchInput): boolean {
  return Object.keys(input).some((key) => input[key as keyof CoachProfilePatchInput] !== undefined);
}

export const coachProfileService = {
  async updateSelfProfile(
    input: CoachProfilePatchInput,
  ): Promise<Result<CoachProfilePatchResponse, ServiceError>> {
    if (!hasPatchFields(input)) {
      return err(serviceError('VALIDATION', 'Add at least one profile field before saving.'));
    }

    if (USE_MOCK) {
      return ok({
        profile: { ...input },
        locations: [],
        availabilityTemplates: [],
        availabilityOverrides: [],
        schedulingRules: [],
        cancellationPolicyRules: [],
        seedVersion: null,
      });
    }

    return apiFetch<CoachProfilePatchResponse>('/v1/coaches/me/profile', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },
};
