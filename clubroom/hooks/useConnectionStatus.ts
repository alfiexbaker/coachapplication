/**
 * Connection Status Hook
 *
 * Detects when the user goes offline/online.
 * Uses refs to avoid stale closures in the NetInfo callback.
 * Emits CONNECTION_CHANGED event on state transitions.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import { createLogger } from '@/utils/logger';

const logger = createLogger('ConnectionStatus');

function getIsExpensive(state: NetInfoState): boolean {
  if (!state.details || typeof state.details !== 'object') return false;
  if (!('isConnectionExpensive' in state.details)) return false;
  return Boolean(state.details.isConnectionExpensive);
}

function subscribeToNativeConnection(listener: (state: NetInfoState) => void): () => void {
  const unsubscribe = NetInfo.addEventListener(listener);
  return () => unsubscribe();
}

export function useConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const [connectionType, setConnectionType] = useState<NetInfoState['type']>(
    NetInfoStateType.unknown,
  );
  const [isExpensive, setIsExpensive] = useState(false);

  // Refs to avoid stale closures in the NetInfo listener
  const isConnectedRef = useRef(true);
  const wasOfflineRef = useRef(false);
  const connectionTypeRef = useRef<NetInfoState['type']>(NetInfoStateType.unknown);

  const applyConnectionState = useCallback(
    (connected: boolean, type: NetInfoState['type'], expensive: boolean) => {
      const prevConnected = isConnectedRef.current;
      const prevWasOffline = wasOfflineRef.current;
      const prevType = connectionTypeRef.current;

      if (!connected && prevConnected) {
        wasOfflineRef.current = true;
        setWasOffline(true);
        logger.warn('Connection lost');

        emitTyped(ServiceEvents.CONNECTION_CHANGED, {
          isConnected: false,
          wasOffline: false,
        });
      }

      if (connected && !prevConnected && prevWasOffline) {
        setShowReconnected(true);
        logger.info('Connection restored', { type });

        emitTyped(ServiceEvents.CONNECTION_CHANGED, {
          isConnected: true,
          wasOffline: true,
        });
      }

      if (connected && prevConnected && prevType !== type) {
        logger.info('Connection type changed', { from: prevType, to: type });
      }

      isConnectedRef.current = connected;
      connectionTypeRef.current = type;
      setIsConnected(connected);
      setConnectionType(type);
      setIsExpensive(expensive);
    },
    [],
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }
    const updateBrowserConnection = () => {
      applyConnectionState(
        typeof navigator === 'undefined' ? true : navigator.onLine,
        NetInfoStateType.other,
        false,
      );
    };

    updateBrowserConnection();
    window.addEventListener('online', updateBrowserConnection);
    window.addEventListener('offline', updateBrowserConnection);
    return () => {
      window.removeEventListener('online', updateBrowserConnection);
      window.removeEventListener('offline', updateBrowserConnection);
    };
  }, [applyConnectionState]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }
    return subscribeToNativeConnection((state) => {
      applyConnectionState(state.isConnected ?? true, state.type, getIsExpensive(state));
    });
  }, [applyConnectionState]);

  useEffect(() => {
    if (!showReconnected) {
      return;
    }
    const timeout = setTimeout(() => setShowReconnected(false), 2000);
    return () => clearTimeout(timeout);
  }, [showReconnected]);

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
