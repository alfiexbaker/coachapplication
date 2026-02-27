import React, { useEffect } from 'react';
import { Redirect, type Href } from 'expo-router';

interface RouteAccessGateProps {
  allowed: boolean;
  redirectHref: Href;
  onBlocked?: () => void;
  children: React.ReactNode;
}

/**
 * RouteAccessGate blocks rendering of protected route content and redirects
 * immediately. This avoids "flash of unauthorized content" before effect-based
 * guards can run.
 */
export function RouteAccessGate({
  allowed,
  redirectHref,
  onBlocked,
  children,
}: RouteAccessGateProps) {
  useEffect(() => {
    if (!allowed) {
      onBlocked?.();
    }
  }, [allowed, onBlocked]);

  if (!allowed) {
    return <Redirect href={redirectHref} />;
  }

  return <>{children}</>;
}

