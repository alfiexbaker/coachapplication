/**
 * User capability helpers
 * Use these to check user capabilities instead of checking role directly
 */

type UserWithCapabilities = {
  role?: string;
  type?: 'USER' | 'COACH';
  children?: Array<{ childId: string; childName: string }>;
  skillLevel?: string;
  isOrganization?: boolean;
  isLive?: boolean;
  isSystemAdmin?: boolean;
};

/**
 * Check if user has children (can book on behalf of kids)
 */
export const hasChildren = (user: UserWithCapabilities | null | undefined): boolean => {
  return Boolean(user?.children && user.children.length > 0);
};

/**
 * Check if user is an athlete (has skillLevel set)
 */
export const isAthlete = (user: UserWithCapabilities | null | undefined): boolean => {
  return Boolean(user?.skillLevel);
};

/**
 * Check if user is a coach
 */
export const isCoach = (user: UserWithCapabilities | null | undefined): boolean => {
  return user?.type === 'COACH' || user?.role === 'COACH';
};

/**
 * Check if user is an organization coach (academy/club)
 */
export const isOrganization = (user: UserWithCapabilities | null | undefined): boolean => {
  return isCoach(user) && Boolean(user?.isOrganization);
};

/**
 * Check if user is a system admin
 */
export const isAdmin = (user: UserWithCapabilities | null | undefined): boolean => {
  return Boolean(user?.isSystemAdmin) || user?.role === 'ADMIN';
};

/**
 * Check if coach is currently accepting bookings
 */
export const isAcceptingBookings = (user: UserWithCapabilities | null | undefined): boolean => {
  return isCoach(user) && user?.isLive !== false;
};
