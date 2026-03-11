import type { OrganizationCommercialMode } from '@/constants/types';

export type CoachBusinessContext = 'org' | 'independent';
export type CoachBusinessFilter = 'all' | CoachBusinessContext;
export type CoachMoneyContext = 'independent_direct' | 'org_credit' | 'org_direct';

export interface CoachBusinessSource {
  actingAs?: 'self' | 'club';
  clubId?: string | null;
  commercialMode?: OrganizationCommercialMode | null;
}

export interface CoachWorkContextDisplay {
  context: CoachBusinessContext;
  label: string;
  detail: string;
}

export interface CoachMoneyContextDisplay {
  context: CoachMoneyContext;
  label: string;
  detail: string;
}

function normalizeCommercialMode(
  commercialMode?: OrganizationCommercialMode | null,
): OrganizationCommercialMode {
  return commercialMode ?? 'COACH_OWNED';
}

export function getCoachBusinessContext(source: CoachBusinessSource): CoachBusinessContext {
  return source.actingAs === 'club' || Boolean(source.clubId) ? 'org' : 'independent';
}

export function getCoachBusinessFilterLabel(filter: CoachBusinessFilter): string {
  if (filter === 'all') return 'All';
  return filter === 'org' ? 'Org' : 'Independent';
}

export function matchesCoachBusinessFilter(
  source: CoachBusinessSource,
  filter: CoachBusinessFilter,
): boolean {
  if (filter === 'all') return true;
  return getCoachBusinessContext(source) === filter;
}

export function getCoachWorkContextDisplay(
  source: CoachBusinessSource,
): CoachWorkContextDisplay {
  const context = getCoachBusinessContext(source);
  const commercialMode = normalizeCommercialMode(source.commercialMode);

  if (context === 'independent') {
    return {
      context,
      label: 'Independent session',
      detail: 'Direct client relationship',
    };
  }

  return {
    context,
    label: 'Org assignment',
    detail:
      commercialMode === 'ORG_OWNED'
        ? 'Delivered for the organization'
        : 'Booked through the organization',
  };
}

export function getCoachMoneyContext(source: CoachBusinessSource): CoachMoneyContext {
  const businessContext = getCoachBusinessContext(source);
  if (businessContext === 'independent') {
    return 'independent_direct';
  }
  return normalizeCommercialMode(source.commercialMode) === 'ORG_OWNED'
    ? 'org_credit'
    : 'org_direct';
}

export function getCoachMoneyContextDisplay(
  source: CoachBusinessSource,
): CoachMoneyContextDisplay {
  const context = getCoachMoneyContext(source);

  if (context === 'independent_direct') {
    return {
      context,
      label: 'Independent revenue',
      detail: 'Paid directly to you',
    };
  }

  if (context === 'org_credit') {
    return {
      context,
      label: 'Org credit',
      detail: 'Reconciler / payout later',
    };
  }

  return {
    context,
    label: 'Org assignment',
    detail: 'Coach-collected via org booking',
  };
}
