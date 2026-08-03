import type { Href } from 'expo-router';

import { Routes } from '@/navigation/routes';

type AuditRole = 'coach' | 'parent' | 'athlete' | 'admin';

export type RevylAuthBypassRuntime = {
  isDevelopmentEnvironment: boolean;
  isTestRuntime: boolean;
  isNativeAuditTestMode: boolean;
  useMock: boolean;
  enabled: boolean;
  token?: string;
};

export type RevylAuthBypassDecision =
  | { kind: 'ignored' }
  | { kind: 'rejected'; message: string }
  | { kind: 'accepted'; role: AuditRole; entryId: string; route: Href };

const auditRoles: Record<AuditRole, { entryId: string; routes: Record<string, Href> }> = {
  coach: {
    entryId: 'coach_delivery',
    routes: { default: Routes.BOOKINGS, home: Routes.HOME, club: Routes.clubDashboard('club_lions') },
  },
  parent: {
    entryId: 'family_parent',
    routes: { default: Routes.HOME, bookings: Routes.BOOKINGS },
  },
  athlete: {
    entryId: 'athlete_progress',
    routes: { default: Routes.DEVELOPMENT_MY_PROGRESS, home: Routes.HOME },
  },
  admin: {
    entryId: 'admin_ops',
    routes: { default: Routes.HOME },
  },
};

export function evaluateRevylAuthBypassUrl(
  rawUrl: string,
  runtime: RevylAuthBypassRuntime,
): RevylAuthBypassDecision {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { kind: 'ignored' };
  }

  if (url.protocol !== 'clubroom:' || url.hostname !== 'revyl-auth') {
    return { kind: 'ignored' };
  }
  if (
    !runtime.isDevelopmentEnvironment ||
    !(runtime.isTestRuntime || runtime.isNativeAuditTestMode) ||
    !runtime.useMock ||
    !runtime.enabled
  ) {
    return { kind: 'rejected', message: 'Native audit sign-in is disabled.' };
  }
  if (!runtime.token || url.searchParams.get('token') !== runtime.token) {
    return { kind: 'rejected', message: 'Native audit sign-in token was rejected.' };
  }

  const role = (url.searchParams.get('role') ?? '').toLowerCase() as AuditRole;
  const roleConfig = auditRoles[role];
  if (!roleConfig) {
    return { kind: 'rejected', message: 'Native audit role is not allowlisted.' };
  }

  const redirect = url.searchParams.get('redirect') ?? 'default';
  const route = roleConfig.routes[redirect];
  if (!route) {
    return { kind: 'rejected', message: 'Native audit redirect is not allowlisted.' };
  }

  return { kind: 'accepted', role, entryId: roleConfig.entryId, route };
}
