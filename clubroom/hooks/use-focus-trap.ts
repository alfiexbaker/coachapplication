import type React from 'react';
import { useEffect } from 'react';
import { AccessibilityInfo, Platform, findNodeHandle, type View } from 'react-native';

export function useFocusTrap(ref: React.RefObject<View | null>, announceMessage?: string) {
  useEffect(() => {
    const focusTimer = setTimeout(() => {
      if (Platform.OS !== 'web') {
        const handle = findNodeHandle(ref.current);
        if (handle) {
          AccessibilityInfo.setAccessibilityFocus(handle);
        }
      }
      if (announceMessage) {
        AccessibilityInfo.announceForAccessibility(announceMessage);
      }
    }, 50);

    return () => {
      clearTimeout(focusTimer);
    };
  }, [announceMessage, ref]);
}
