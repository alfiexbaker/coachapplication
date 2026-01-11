/**
 * Network Status Hook
 *
 * Provides real-time network connectivity information using @react-native-community/netinfo.
 * Use this hook to detect offline status and adapt UI/behavior accordingly.
 */

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';
import { createLogger } from '@/utils/logger';

const logger = createLogger('NetworkStatus');

export interface NetworkStatus {
  /** Whether the device is connected to the internet (null = unknown) */
  isConnected: boolean | null;
  /** The type of connection (wifi, cellular, etc.) */
  connectionType: NetInfoStateType | null;
  /** Convenience boolean: true when definitely offline */
  isOffline: boolean;
  /** Whether the connection is actually reachable (not just connected) */
  isInternetReachable: boolean | null;
  /** Refresh the network status manually */
  refresh: () => Promise<void>;
}

/**
 * Hook to monitor network connectivity status
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isOffline, connectionType } = useNetworkStatus();
 *
 *   if (isOffline) {
 *     return <Text>You are offline</Text>;
 *   }
 *
 *   return <Text>Connected via {connectionType}</Text>;
 * }
 * ```
 */
export function useNetworkStatus(): NetworkStatus {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [connectionType, setConnectionType] = useState<NetInfoStateType | null>(null);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(null);

  const handleNetworkChange = useCallback((state: NetInfoState) => {
    const wasOffline = isConnected === false;
    const nowOnline = state.isConnected === true;

    setIsConnected(state.isConnected);
    setConnectionType(state.type);
    setIsInternetReachable(state.isInternetReachable);

    // Log significant changes
    if (wasOffline && nowOnline) {
      logger.info('Network connection restored', { type: state.type });
    } else if (state.isConnected === false) {
      logger.warn('Network connection lost');
    }
  }, [isConnected]);

  const refresh = useCallback(async () => {
    try {
      const state = await NetInfo.fetch();
      handleNetworkChange(state);
    } catch (error) {
      logger.error('Failed to fetch network state', { error });
    }
  }, [handleNetworkChange]);

  useEffect(() => {
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener(handleNetworkChange);

    // Fetch initial state
    NetInfo.fetch().then(handleNetworkChange);

    return () => {
      unsubscribe();
    };
  }, [handleNetworkChange]);

  return {
    isConnected,
    connectionType,
    isOffline: isConnected === false,
    isInternetReachable,
    refresh,
  };
}

// ============================================================================
// Network Context (for provider pattern)
// ============================================================================

const NetworkContext = createContext<NetworkStatus | null>(null);

/**
 * Provider component for network status
 * Wrap your app with this to share network status across components
 */
export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const networkStatus = useNetworkStatus();

  return (
    <NetworkContext.Provider value={networkStatus}>
      {children}
    </NetworkContext.Provider>
  );
}

/**
 * Hook to use network status from context
 * Must be used within a NetworkProvider
 */
export function useNetwork(): NetworkStatus {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if the device is currently online
 * Use this for one-off checks (e.g., before making an API call)
 */
export async function checkIsOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected === true && state.isInternetReachable !== false;
  } catch {
    return false;
  }
}

/**
 * Wait for network connection to be restored
 * Returns a promise that resolves when online
 *
 * @param timeoutMs - Maximum time to wait (default: 30 seconds)
 */
export function waitForConnection(timeoutMs: number = 30000): Promise<boolean> {
  return new Promise((resolve) => {
    let unsubscribe: (() => void) | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (unsubscribe) unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };

    unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected === true) {
        cleanup();
        resolve(true);
      }
    });

    timeoutId = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeoutMs);
  });
}
