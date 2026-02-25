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
import { createLogger } from '@/utils/logger';

const logger = createLogger('ConnectionStatus');

function getIsExpensive(state: NetInfoState): boolean {
  if (!state.details || typeof state.details !== 'object') return false;
  if (!('isConnectionExpensive' in state.details)) return false;
  return Boolean(state.details.isConnectionExpensive);
}

export function useConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const [connectionType, setConnectionType] = useState<NetInfoState['type']>('unknown');
  const [isExpensive, setIsExpensive] = useState(false);

  // Refs to avoid stale closures in the NetInfo listener
  const isConnectedRef = useRef(true);
  const wasOfflineRef = useRef(false);
  const connectionTypeRef = useRef<NetInfoState['type']>('unknown');
  const reconnectedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep refs in sync with state
  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  useEffect(() => {
    wasOfflineRef.current = wasOffline;
  }, [wasOffline]);

  useEffect(() => {
    connectionTypeRef.current = connectionType;
  }, [connectionType]);

  // Subscribe once on mount, read from refs inside callback
  useEffect(() => {
    void NetInfo.fetch().then((state) => {
      const connected = state.isConnected ?? true;
      const type = state.type;
      const expensive = getIsExpensive(state);

      isConnectedRef.current = connected;
      connectionTypeRef.current = type;
      setIsConnected(connected);
      setConnectionType(type);
      setIsExpensive(expensive);
    });

    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = state.isConnected ?? true;
      const prevConnected = isConnectedRef.current;
      const prevWasOffline = wasOfflineRef.current;
      const prevType = connectionTypeRef.current;
      const type = state.type;
      const expensive = getIsExpensive(state);

      if (!connected && prevConnected) {
        // Just went offline
        setWasOffline(true);
        logger.warn('Connection lost');

        emitTyped(ServiceEvents.CONNECTION_CHANGED, {
          isConnected: false,
          wasOffline: false,
        });
      }

      if (connected && !prevConnected && prevWasOffline) {
        // Just came back online after being offline
        setShowReconnected(true);
        if (reconnectedTimeoutRef.current) {
          clearTimeout(reconnectedTimeoutRef.current);
        }
        reconnectedTimeoutRef.current = setTimeout(() => setShowReconnected(false), 2000);
        logger.info('Connection restored', { type });

        emitTyped(ServiceEvents.CONNECTION_CHANGED, {
          isConnected: true,
          wasOffline: true,
        });
      }

      if (connected && prevConnected && prevType !== type) {
        logger.info('Connection type changed', { from: prevType, to: type });
      }

      connectionTypeRef.current = type;
      setIsConnected(connected);
      setConnectionType(type);
      setIsExpensive(expensive);
    });

    return () => {
      unsubscribe();
      if (reconnectedTimeoutRef.current) {
        clearTimeout(reconnectedTimeoutRef.current);
      }
    };
  }, []);

  return {
    isConnected,
    wasOffline,
    showReconnected,
    connectionType,
    isExpensive,
    isWifi: connectionType === 'wifi',
    isCellular: connectionType === 'cellular',
  };
}
