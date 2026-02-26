import type React from 'react';
import { useEffect } from 'react';
import { AccessibilityInfo, findNodeHandle, type View } from 'react-native';

export function useFocusTrap(ref: React.RefObject<View | null>, announceMessage?: string) {
  useEffect(() => {
    const focusTimer = setTimeout(() => {
      const handle = findNodeHandle(ref.current);
      if (handle) {
        AccessibilityInfo.setAccessibilityFocus(handle);
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
