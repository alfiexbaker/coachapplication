/**
 * Connection Status Hook
 *
 * Detects when the user goes offline/online.
 * Uses refs to avoid stale closures in the NetInfo callback.
 * Emits CONNECTION_CHANGED event on state transitions.
 */

import { useState, useEffect, useRef } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { emitTyped, ServiceEvents } from '@/services/event-bus';

export function useConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  // Refs to avoid stale closures in the NetInfo listener
  const isConnectedRef = useRef(true);
  const wasOfflineRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  useEffect(() => {
    wasOfflineRef.current = wasOffline;
  }, [wasOffline]);

  // Subscribe once on mount, read from refs inside callback
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = state.isConnected ?? true;
      const prevConnected = isConnectedRef.current;
      const prevWasOffline = wasOfflineRef.current;

      if (!connected && prevConnected) {
        // Just went offline
        setWasOffline(true);

        emitTyped(ServiceEvents.CONNECTION_CHANGED, {
          isConnected: false,
          wasOffline: false,
        });
      }

      if (connected && !prevConnected && prevWasOffline) {
        // Just came back online after being offline
        setShowReconnected(true);
        setTimeout(() => setShowReconnected(false), 2000);

        emitTyped(ServiceEvents.CONNECTION_CHANGED, {
          isConnected: true,
          wasOffline: true,
        });
      }

      setIsConnected(connected);
    });

    return unsubscribe;
  }, []);

  return { isConnected, wasOffline, showReconnected };
}
