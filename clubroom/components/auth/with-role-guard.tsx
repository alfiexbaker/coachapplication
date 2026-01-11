import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth, type UserRole } from '@/hooks/use-auth';
import { UnauthorizedScreen } from './unauthorized-screen';
import { createLogger } from '@/utils/logger';

const logger = createLogger('RoleGuard');

/**
 * Higher-Order Component that wraps a screen component with role-based access control.
 *
 * @param WrappedComponent - The component to protect
 * @param allowedRoles - Array of roles that are allowed to access this screen
 * @returns A new component that checks user role before rendering
 *
 * @example
 * // Protect a screen for coaches only
 * export default withRoleGuard(MyCoachScreen, ['COACH']);
 *
 * // Protect for coaches and admins
 * export default withRoleGuard(AdminScreen, ['COACH', 'ADMIN']);
 */
export function withRoleGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  allowedRoles: UserRole[]
) {
  // Create a display name for debugging
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  function GuardedComponent(props: P) {
    const { currentUser, isAuthenticated } = useAuth();

    // If not authenticated, redirect to login
    if (!isAuthenticated || !currentUser) {
      logger.warn('Unauthorized access attempt - not authenticated', {
        route: displayName,
        allowedRoles,
      });
      return <Redirect href="/" />;
    }

    // Check if user's role is allowed
    const userRole = currentUser.role as UserRole;
    const hasAccess = allowedRoles.includes(userRole);

    if (!hasAccess) {
      logger.warn('Unauthorized access attempt - wrong role', {
        route: displayName,
        userRole,
        allowedRoles,
        userId: currentUser.id,
        userName: currentUser.name,
      });
      return (
        <UnauthorizedScreen
          currentRole={userRole}
          requiredRoles={allowedRoles}
          screenName={displayName}
        />
      );
    }

    // User is authorized, render the component
    logger.debug('Access granted', {
      route: displayName,
      userRole,
      userId: currentUser.id,
    });

    return <WrappedComponent {...props} />;
  }

  // Set display name for debugging
  GuardedComponent.displayName = `withRoleGuard(${displayName})`;

  return GuardedComponent;
}

/**
 * Hook to check if the current user has access based on roles.
 * Useful for conditional rendering within components.
 *
 * @param allowedRoles - Array of roles that are allowed
 * @returns Object with access status and current role
 */
export function useRoleAccess(allowedRoles: UserRole[]) {
  const { currentUser, isAuthenticated } = useAuth();

  if (!isAuthenticated || !currentUser) {
    return {
      hasAccess: false,
      isAuthenticated: false,
      currentRole: null,
    };
  }

  const userRole = currentUser.role as UserRole;
  const hasAccess = allowedRoles.includes(userRole);

  return {
    hasAccess,
    isAuthenticated: true,
    currentRole: userRole,
  };
}

/**
 * Inline component for checking role access within JSX.
 * Renders children only if user has the required role.
 */
export function RequireRole({
  roles,
  children,
  fallback = null,
}: {
  roles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { hasAccess } = useRoleAccess(roles);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
