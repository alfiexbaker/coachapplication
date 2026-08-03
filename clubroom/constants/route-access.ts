import type { UserRole } from '@/constants/user-types';

export type TabRouteSegment = string;

type RoleWithDefault = UserRole | 'DEFAULT';

/**
 * Access policy is separate from tab visibility.
 * Hidden routes can still be accessible via deep links/shortcuts.
 */
const RESTRICTED_TAB_ROUTES_BY_ROLE: Record<RoleWithDefault, readonly TabRouteSegment[]> = {
  COACH: ['children'],
  USER: ['schedule', 'athletes', 'coach-profile'],
  PARENT: ['schedule', 'athletes', 'coach-profile'],
  ADMIN: ['schedule', 'athletes', 'children', 'coach-profile'],
  DEFAULT: ['club-hub', 'schedule', 'athletes', 'coach-profile'],
};

export function getRestrictedTabRoutes(
  role: RoleWithDefault,
  options?: {
    isParentLike?: boolean;
  },
): Set<TabRouteSegment> {
  const restricted = new Set(RESTRICTED_TAB_ROUTES_BY_ROLE[role] ?? RESTRICTED_TAB_ROUTES_BY_ROLE.DEFAULT);
  if (options?.isParentLike) {
    restricted.delete('children');
  }
  return restricted;
}
