/**
 * Connection Status Hook
 *
 * Detects when the user goes offline/online.
 */

import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export function useConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = state.isConnected ?? true;

      if (!connected && isConnected) {
        // Just went offline
        setWasOffline(true);
      }

      if (connected && !isConnected && wasOffline) {
        // Just came back online
        setShowReconnected(true);
        setTimeout(() => setShowReconnected(false), 2000);
      }

      setIsConnected(connected);
    });

    return unsubscribe;
  }, [isConnected, wasOffline]);

  return { isConnected, wasOffline, showReconnected };
}
