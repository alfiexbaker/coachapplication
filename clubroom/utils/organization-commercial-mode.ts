import type { ClubRole, OrganizationCommercialMode } from '@/constants/types';
import {
  canEditClubCommercialMode as canEditCommercialModeFromGovernance,
  canViewClubCommercialMode as canViewCommercialModeFromGovernance,
  formatOrganizationCommercialModeLabel,
} from '@/contracts/club-governance';

export interface CommercialModeChoice {
  value: OrganizationCommercialMode;
  title: string;
  summary: string;
  billingSummary: string;
}

export const COMMERCIAL_MODE_CHOICES: CommercialModeChoice[] = [
  {
    value: 'COACH_OWNED',
    title: 'Coach-owned',
    summary: 'Families book the assigned coach, who keeps billing and support responsibility.',
    billingSummary: 'Use this when each coach runs their own billing outside the app.',
  },
  {
    value: 'ORG_OWNED',
    title: 'Organization-owned',
    summary: 'Families book the organization, while coaches deliver on its behalf.',
    billingSummary: 'Use this when the club/company owns billing, support, and payment instructions.',
  },
];

export function canViewClubCommercialMode(role?: ClubRole | null): boolean {
  return canViewCommercialModeFromGovernance(role);
}

export function canEditClubCommercialMode(role?: ClubRole | null): boolean {
  return canEditCommercialModeFromGovernance(role);
}

export function formatCommercialModeLabel(
  commercialMode?: OrganizationCommercialMode | null,
): string {
  return formatOrganizationCommercialModeLabel(commercialMode);
}
