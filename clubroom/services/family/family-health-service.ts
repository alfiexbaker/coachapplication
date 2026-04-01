import { apiFetch } from '@/services/api-client';
import {
  buildApiAuthHeaders,
  deriveApiActingRole,
  resolveSignedInApiUser,
  toApiAthleteId,
} from '@/services/api-auth-context';
import { createLogger } from '@/utils/logger';
import { type Result, err, ok, serviceError, type ServiceError } from '@/types/result';
import type {
  Consent,
  ConsentType,
  EmergencyContact,
  EmergencyInfo,
  MedicalInfo,
} from '@/constants/types';

const logger = createLogger('FamilyHealthService');

type ActingRole = 'coach' | 'parent' | 'athlete' | 'club_admin';

interface ApiMedicalRecord {
  athleteId: string;
  conditions: string[];
  allergies: string[];
  medications: string[];
  restrictions: string[];
  doctorName: string | null;
  doctorPhone: string | null;
  insuranceProvider: string | null;
  insuranceNumber: string | null;
  emergencyNotes: string | null;
  senNotes: string | null;
  updatedAt: string;
  updatedByUserId: string;
}

interface ApiEmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  isPrimary: boolean;
  canPickup: boolean;
}

interface ApiEmergencyContactsResponse {
  athleteId: string;
  contacts: ApiEmergencyContact[];
  updatedAt: string;
  updatedByUserId: string;
}

interface ApiConsentRecord {
  type: ConsentType;
  granted: boolean;
  grantedAt?: string;
  grantedBy: string;
  expiryAt?: string;
}

interface ApiConsentsResponse {
  athleteId: string;
  consents: ApiConsentRecord[];
  updatedAt: string;
  updatedByUserId: string;
}

const CONSENT_TYPES: ConsentType[] = ['PHOTO', 'VIDEO', 'SOCIAL_MEDIA', 'EMERGENCY_TREATMENT'];

function fromApiAthleteId(athleteId: string): string {
  return athleteId.replace(/^ath_/, '');
}

function compactOptionalString(value: string | undefined | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toEmergencyInfo(
  medical: ApiMedicalRecord,
  emergency: ApiEmergencyContactsResponse,
  consents: ApiConsentsResponse,
): EmergencyInfo {
  const updatedAtCandidates = [medical.updatedAt, emergency.updatedAt, consents.updatedAt]
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter((value) => !Number.isNaN(value));

  const latestUpdatedAt =
    updatedAtCandidates.length > 0
      ? new Date(Math.max(...updatedAtCandidates)).toISOString()
      : new Date().toISOString();

  return {
    athleteId: fromApiAthleteId(medical.athleteId),
    contacts: emergency.contacts.map((contact) => ({
      id: contact.id,
      name: contact.name,
      relationship: contact.relationship,
      phone: contact.phone,
      email: contact.email,
      isPrimary: contact.isPrimary,
      canPickup: contact.canPickup,
    })),
    medical: {
      conditions: medical.conditions,
      allergies: medical.allergies,
      medications: medical.medications,
      restrictions: medical.restrictions,
      doctorName: medical.doctorName ?? undefined,
      doctorPhone: medical.doctorPhone ?? undefined,
      insuranceProvider: medical.insuranceProvider ?? undefined,
      insuranceNumber: medical.insuranceNumber ?? undefined,
      notes: medical.emergencyNotes ?? undefined,
    },
    consents: normalizeConsents(consents.consents),
    updatedAt: latestUpdatedAt,
  };
}

function normalizeConsents(records: ApiConsentRecord[]): Consent[] {
  const byType = new Map(records.map((record) => [record.type, record]));

  return CONSENT_TYPES.map((type) => {
    const existing = byType.get(type);
    return {
      type,
      granted: existing?.granted ?? false,
      grantedAt: existing?.grantedAt,
      grantedBy: existing?.grantedBy ?? '',
      expiryAt: existing?.expiryAt,
    };
  });
}

async function resolveApiAccessContext(targetAthleteId: string): Promise<
  Result<{ apiAthleteId: string; headers: Record<string, string> }, ServiceError>
> {
  const currentUserResult = await resolveSignedInApiUser('Sign in to access athlete medical data.');
  if (!currentUserResult.success) {
    return currentUserResult;
  }

  const currentUser = currentUserResult.data;
  const apiAthleteId = toApiAthleteId(targetAthleteId);
  const actingRole = deriveApiActingRole(currentUser) as ActingRole;
  const headers = buildApiAuthHeaders({
    actingRole,
    coachAthleteIds: actingRole === 'coach' ? [apiAthleteId] : undefined,
    guardianAthleteIds: actingRole === 'parent' ? [apiAthleteId] : undefined,
    coachVerified: actingRole === 'coach' && currentUser.isVerified,
  });

  return ok({ apiAthleteId, headers });
}

class FamilyHealthService {
  async getEmergencyInfo(athleteId: string): Promise<Result<EmergencyInfo, ServiceError>> {
    const access = await resolveApiAccessContext(athleteId);
    if (!access.success) {
      return access;
    }

    const { apiAthleteId, headers } = access.data;
    const [medicalResult, emergencyResult, consentsResult] = await Promise.all([
      apiFetch<ApiMedicalRecord>(`/v1/athletes/${apiAthleteId}/medical`, {
        method: 'GET',
        headers,
      }),
      apiFetch<ApiEmergencyContactsResponse>(`/v1/athletes/${apiAthleteId}/emergency-contacts`, {
        method: 'GET',
        headers,
      }),
      apiFetch<ApiConsentsResponse>(`/v1/athletes/${apiAthleteId}/consents`, {
        method: 'GET',
        headers,
      }),
    ]);

    if (!medicalResult.success) {
      logger.error('Failed to load medical record', { athleteId, error: medicalResult.error });
      return err(medicalResult.error);
    }
    if (!emergencyResult.success) {
      logger.error('Failed to load emergency contacts', { athleteId, error: emergencyResult.error });
      return err(emergencyResult.error);
    }
    if (!consentsResult.success) {
      logger.error('Failed to load athlete consents', { athleteId, error: consentsResult.error });
      return err(consentsResult.error);
    }

    return ok(toEmergencyInfo(medicalResult.data, emergencyResult.data, consentsResult.data));
  }

  async updateMedicalInfo(
    athleteId: string,
    medical: Partial<MedicalInfo>,
  ): Promise<Result<EmergencyInfo, ServiceError>> {
    const access = await resolveApiAccessContext(athleteId);
    if (!access.success) {
      return access;
    }

    const body: Record<string, unknown> = {};

    if ('conditions' in medical) body.conditions = medical.conditions;
    if ('allergies' in medical) body.allergies = medical.allergies;
    if ('medications' in medical) body.medications = medical.medications;
    if ('restrictions' in medical) body.restrictions = medical.restrictions;
    if ('doctorName' in medical) body.doctorName = compactOptionalString(medical.doctorName);
    if ('doctorPhone' in medical) body.doctorPhone = compactOptionalString(medical.doctorPhone);
    if ('insuranceProvider' in medical) {
      body.insuranceProvider = compactOptionalString(medical.insuranceProvider);
    }
    if ('insuranceNumber' in medical) {
      body.insuranceNumber = compactOptionalString(medical.insuranceNumber);
    }
    if ('notes' in medical) body.emergencyNotes = compactOptionalString(medical.notes);

    const result = await apiFetch<ApiMedicalRecord>(
      `/v1/athletes/${access.data.apiAthleteId}/medical`,
      {
        method: 'PATCH',
        headers: access.data.headers,
        body: JSON.stringify(body),
      },
    );

    if (!result.success) {
      logger.error('Failed to update medical record', { athleteId, error: result.error });
      return err(result.error);
    }

    return this.getEmergencyInfo(athleteId);
  }

  async updateEmergencyContacts(
    athleteId: string,
    contacts: EmergencyContact[],
  ): Promise<Result<EmergencyInfo, ServiceError>> {
    const access = await resolveApiAccessContext(athleteId);
    if (!access.success) {
      return access;
    }

    const result = await apiFetch<ApiEmergencyContactsResponse>(
      `/v1/athletes/${access.data.apiAthleteId}/emergency-contacts`,
      {
        method: 'PATCH',
        headers: access.data.headers,
        body: JSON.stringify({
          contacts: contacts.map((contact) => ({
            ...(contact.id.startsWith('emc_') ? { id: contact.id } : {}),
            name: contact.name,
            relationship: contact.relationship,
            phone: contact.phone,
            ...(contact.email ? { email: contact.email } : {}),
            isPrimary: contact.isPrimary,
            canPickup: contact.canPickup,
          })),
        }),
      },
    );

    if (!result.success) {
      logger.error('Failed to update emergency contacts', { athleteId, error: result.error });
      return err(result.error);
    }

    return this.getEmergencyInfo(athleteId);
  }

  async updateConsents(
    athleteId: string,
    consents: Consent[],
  ): Promise<Result<EmergencyInfo, ServiceError>> {
    const access = await resolveApiAccessContext(athleteId);
    if (!access.success) {
      return access;
    }

    const result = await apiFetch<ApiConsentsResponse>(
      `/v1/athletes/${access.data.apiAthleteId}/consents`,
      {
        method: 'PUT',
        headers: access.data.headers,
        body: JSON.stringify({
          consents: consents.map((consent) => ({
            type: consent.type,
            granted: consent.granted,
            ...(consent.grantedAt ? { grantedAt: consent.grantedAt } : {}),
            grantedBy: consent.grantedBy,
            ...(consent.expiryAt ? { expiryAt: consent.expiryAt } : {}),
          })),
        }),
      },
    );

    if (!result.success) {
      logger.error('Failed to update athlete consents', { athleteId, error: result.error });
      return err(result.error);
    }

    return this.getEmergencyInfo(athleteId);
  }
}

export const familyHealthService = new FamilyHealthService();
