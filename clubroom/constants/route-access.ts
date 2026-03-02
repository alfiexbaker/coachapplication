import type { UserRole } from '@/constants/user-types';

export type TabRouteSegment = string;

type RoleWithDefault = UserRole | 'DEFAULT';

/**
 * Access policy is separate from tab visibility.
 * Hidden routes can still be accessible via deep links/shortcuts.
 */
const RESTRICTED_TAB_ROUTES_BY_ROLE: Record<RoleWithDefault, readonly TabRouteSegment[]> = {
  COACH: ['children', 'admin/invite-codes'],
  USER: ['schedule', 'athletes', 'admin/invite-codes'],
  PARENT: ['schedule', 'athletes', 'admin/invite-codes'],
  ADMIN: ['club-hub', 'schedule', 'athletes', 'children'],
  DEFAULT: ['club-hub', 'schedule', 'athletes', 'admin/invite-codes'],
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
