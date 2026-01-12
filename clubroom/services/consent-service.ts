/**
 * Consent Service
 *
 * Handles consent management for coaches to view athlete consent status.
 * Provides methods for fetching and filtering consent data across the roster.
 *
 * API Integration Notes:
 * - GET /api/coaches/:id/consents - Get all athlete consents
 * - GET /api/coaches/:id/consents/:athleteId - Get single athlete consent
 * - GET /api/coaches/:id/consents/filter?type=PHOTO - Filter by consent type
 */

import type {
  AthleteConsent,
  Consent,
  ConsentSummary,
  ConsentType,
  RosterEntry,
} from '@/constants/types';
import { safetyService } from './safety-service';
import { rosterService } from './roster-service';

const CONSENT_TYPES: ConsentType[] = ['PHOTO', 'VIDEO', 'SOCIAL_MEDIA', 'EMERGENCY_TREATMENT'];

/**
 * Labels for consent types
 */
export const CONSENT_TYPE_LABELS: Record<ConsentType, string> = {
  PHOTO: 'Photo',
  VIDEO: 'Video',
  SOCIAL_MEDIA: 'Social Media',
  EMERGENCY_TREATMENT: 'Emergency Treatment',
};

/**
 * Icons for consent types (Ionicons names)
 */
export const CONSENT_TYPE_ICONS: Record<ConsentType, string> = {
  PHOTO: 'camera-outline',
  VIDEO: 'videocam-outline',
  SOCIAL_MEDIA: 'share-social-outline',
  EMERGENCY_TREATMENT: 'medkit-outline',
};

/**
 * Descriptions for consent types
 */
export const CONSENT_TYPE_DESCRIPTIONS: Record<ConsentType, string> = {
  PHOTO: 'Permission to take and use photos',
  VIDEO: 'Permission to record and use video',
  SOCIAL_MEDIA: 'Permission to share on social media',
  EMERGENCY_TREATMENT: 'Permission for emergency medical treatment',
};

export interface ConsentFilters {
  type?: ConsentType;
  status?: 'granted' | 'denied' | 'all';
  search?: string;
}

class ConsentService {
  /**
   * Get consent status for a single athlete
   */
  async getAthleteConsents(athleteId: string): Promise<AthleteConsent | null> {
    try {
      const emergencyInfo = await safetyService.getEmergencyInfo(athleteId);
      // We need to get the athlete name from roster
      // For now, return with athleteId as name placeholder
      return {
        athleteId,
        athleteName: 'Unknown',
        parentName: 'Unknown',
        consents: emergencyInfo.consents,
        lastUpdated: emergencyInfo.updatedAt,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get all athletes' consent status for a coach's roster
   */
  async getRosterConsents(coachId: string, filters?: ConsentFilters): Promise<AthleteConsent[]> {
    // Get all athletes from roster
    const roster = await rosterService.getRoster(coachId);

    // Get consent data for each athlete
    const consentsPromises = roster.map(async (entry: RosterEntry): Promise<AthleteConsent> => {
      try {
        const emergencyInfo = await safetyService.getEmergencyInfo(entry.athleteId);
        return {
          athleteId: entry.athleteId,
          athleteName: entry.athleteName,
          athletePhotoUrl: entry.athletePhotoUrl,
          parentName: entry.parentName,
          consents: emergencyInfo.consents,
          lastUpdated: emergencyInfo.updatedAt,
        };
      } catch {
        // Return default consents if no emergency info exists
        return {
          athleteId: entry.athleteId,
          athleteName: entry.athleteName,
          athletePhotoUrl: entry.athletePhotoUrl,
          parentName: entry.parentName,
          consents: CONSENT_TYPES.map((type) => ({
            type,
            granted: false,
            grantedBy: '',
          })),
          lastUpdated: new Date().toISOString(),
        };
      }
    });

    let athleteConsents = await Promise.all(consentsPromises);

    // Apply filters
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      athleteConsents = athleteConsents.filter(
        (ac) =>
          ac.athleteName.toLowerCase().includes(search) ||
          ac.parentName.toLowerCase().includes(search)
      );
    }

    if (filters?.type && filters?.status && filters.status !== 'all') {
      const isGranted = filters.status === 'granted';
      athleteConsents = athleteConsents.filter((ac) => {
        const consent = ac.consents.find((c) => c.type === filters.type);
        return consent?.granted === isGranted;
      });
    }

    return athleteConsents;
  }

  /**
   * Check if an athlete has a specific consent
   */
  async checkConsent(athleteId: string, type: ConsentType): Promise<boolean> {
    const consent = await safetyService.getConsent(athleteId, type);
    return consent?.granted ?? false;
  }

  /**
   * Get all athletes who have granted a specific consent type
   */
  async getConsentedAthletes(coachId: string, type: ConsentType): Promise<AthleteConsent[]> {
    const allConsents = await this.getRosterConsents(coachId);
    return allConsents.filter((ac) => {
      const consent = ac.consents.find((c) => c.type === type);
      return consent?.granted === true;
    });
  }

  /**
   * Get all athletes who have NOT granted a specific consent type
   */
  async getNonConsentedAthletes(coachId: string, type: ConsentType): Promise<AthleteConsent[]> {
    const allConsents = await this.getRosterConsents(coachId);
    return allConsents.filter((ac) => {
      const consent = ac.consents.find((c) => c.type === type);
      return consent?.granted === false;
    });
  }

  /**
   * Get consent summary/statistics for a coach's roster
   */
  async getConsentSummary(coachId: string): Promise<ConsentSummary> {
    const allConsents = await this.getRosterConsents(coachId);
    const totalAthletes = allConsents.length;

    const byType: Record<ConsentType, { granted: number; denied: number }> = {
      PHOTO: { granted: 0, denied: 0 },
      VIDEO: { granted: 0, denied: 0 },
      SOCIAL_MEDIA: { granted: 0, denied: 0 },
      EMERGENCY_TREATMENT: { granted: 0, denied: 0 },
    };

    for (const ac of allConsents) {
      for (const consent of ac.consents) {
        if (consent.granted) {
          byType[consent.type].granted++;
        } else {
          byType[consent.type].denied++;
        }
      }
    }

    return {
      totalAthletes,
      byType,
    };
  }

  /**
   * Get the consent status for an athlete for a specific type
   */
  getConsentStatus(
    athleteConsent: AthleteConsent,
    type: ConsentType
  ): Consent | undefined {
    return athleteConsent.consents.find((c) => c.type === type);
  }

  /**
   * Check if all required consents are granted for content posting
   * (Photo OR Video) AND Social Media
   */
  hasContentPostingConsent(athleteConsent: AthleteConsent): boolean {
    const photoConsent = this.getConsentStatus(athleteConsent, 'PHOTO');
    const videoConsent = this.getConsentStatus(athleteConsent, 'VIDEO');
    const socialConsent = this.getConsentStatus(athleteConsent, 'SOCIAL_MEDIA');

    const hasMediaConsent = photoConsent?.granted || videoConsent?.granted;
    const hasSocialConsent = socialConsent?.granted;

    return Boolean(hasMediaConsent && hasSocialConsent);
  }

  /**
   * Get all consent types
   */
  getConsentTypes(): ConsentType[] {
    return [...CONSENT_TYPES];
  }

  /**
   * Get label for a consent type
   */
  getConsentLabel(type: ConsentType): string {
    return CONSENT_TYPE_LABELS[type];
  }

  /**
   * Get icon name for a consent type
   */
  getConsentIcon(type: ConsentType): string {
    return CONSENT_TYPE_ICONS[type];
  }

  /**
   * Get description for a consent type
   */
  getConsentDescription(type: ConsentType): string {
    return CONSENT_TYPE_DESCRIPTIONS[type];
  }

  /**
   * Format consent granted date for display
   */
  formatConsentDate(consent: Consent): string {
    if (!consent.grantedAt) {
      return 'Not granted';
    }
    return new Date(consent.grantedAt).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  /**
   * Get consent count for an athlete (granted / total)
   */
  getConsentCount(athleteConsent: AthleteConsent): { granted: number; total: number } {
    const total = athleteConsent.consents.length;
    const granted = athleteConsent.consents.filter((c) => c.granted).length;
    return { granted, total };
  }

  /**
   * Get consent percentage for an athlete
   */
  getConsentPercentage(athleteConsent: AthleteConsent): number {
    const { granted, total } = this.getConsentCount(athleteConsent);
    if (total === 0) return 0;
    return Math.round((granted / total) * 100);
  }
}

export const consentService = new ConsentService();
