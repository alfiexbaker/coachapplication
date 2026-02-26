import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radii, Spacing, Typography, withAlpha, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// Tab bar height constant for proper positioning
const TAB_BAR_HEIGHT = 60;
const UNDO_DURATION = 5000; // 5 seconds for undo

interface ToastOptions {
  tone?: 'default' | 'success' | 'error' | 'warning';
  action?: {
    label: string;
    onPress: () => void;
  };
  duration?: number;
}

type ToastContextValue = {
  showToast: (
    message: string,
    options?: ToastOptions | 'default' | 'success' | 'error' | 'warning',
  ) => void;
  showUndoToast: (message: string, onUndo: () => void) => void;
  hideToast: () => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

interface QueuedToast {
  id: number;
  message: string;
  tone: 'default' | 'success' | 'error' | 'warning';
  action?: { label: string; onPress: () => void };
  duration: number;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<QueuedToast[]>([]);
  const [current, setCurrent] = useState<QueuedToast | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idCounter = useRef(0);

  const hideToast = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setCurrent(null);
  }, []);

  // Process queue — show next toast when current dismisses
  React.useEffect(() => {
    if (current || queue.length === 0) return;

    const [next, ...rest] = queue;
    setCurrent(next);
    setQueue(rest);

    timeoutRef.current = setTimeout(() => {
      setCurrent(null);
    }, next.duration);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [current, queue]);

  const showToast = useCallback(
    (message: string, options?: ToastOptions | 'default' | 'success' | 'error' | 'warning') => {
      const resolvedOptions: ToastOptions =
        typeof options === 'string' ? { tone: options } : options || {};

      const { tone = 'default', action, duration } = resolvedOptions;
      const effectiveDuration = duration ?? (tone === 'error' ? 5000 : 2500);

      idCounter.current += 1;
      const newToast: QueuedToast = {
        id: idCounter.current,
        message,
        tone,
        action,
        duration: effectiveDuration,
      };

      setQueue(prev => [...prev, newToast]);
    },
    [],
  );

  const showUndoToast = useCallback(
    (message: string, onUndo: () => void) => {
      showToast(message, {
        tone: 'success',
        action: {
          label: 'Undo',
          onPress: () => {
            onUndo();
            hideToast();
          },
        },
        duration: UNDO_DURATION,
      });
    },
    [showToast, hideToast],
  );

  const value = useMemo(
    () => ({ showToast, showUndoToast, hideToast }),
    [showToast, showUndoToast, hideToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast
        message={current?.message}
        tone={current?.tone}
        action={current?.action}
        onActionPress={() => {
          current?.action?.onPress();
          hideToast();
        }}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

function Toast({
  message,
  tone = 'default',
  action,
  onActionPress,
}: {
  message?: string;
  tone?: 'default' | 'success' | 'error' | 'warning';
  action?: { label: string; onPress: () => void };
  onActionPress?: () => void;
}) {
  const { colors: palette, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const toneColor =
    tone === 'success'
      ? palette.success
      : tone === 'error'
        ? palette.error
        : tone === 'warning'
          ? palette.warning
          : palette.text;

  // Calculate bottom position accounting for tab bar and safe area
  const bottomPosition = TAB_BAR_HEIGHT + Math.max(insets.bottom, Spacing.sm);

  if (!message) return null;

  return (
    <Animated.View
      entering={FadeInDown.springify()}
      exiting={FadeOutUp}
      style={[styles.container, { bottom: bottomPosition }]}
      pointerEvents={action ? 'box-none' : 'none'}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Row
        align="center"
        gap="md"
        style={[
          styles.toast,
          {
            backgroundColor: scheme === 'dark' ? palette.surface : palette.onPrimary,
            borderColor: withAlpha(toneColor, 0.33),
            ...Shadows[scheme].card,
          },
        ]}
      >
        <Text style={[styles.message, { color: toneColor }]}>{message}</Text>
        {action && (
          <Clickable
            onPress={onActionPress}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: withAlpha(palette.tint, pressed ? 0.19 : 0.08) },
            ]}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <Text style={[styles.actionText, { color: palette.tint }]}>{action.label}</Text>
          </Clickable>
        )}
      </Row>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    // bottom is set dynamically to account for tab bar and safe area insets
    left: Spacing.lg,
    right: Spacing.lg,
    alignItems: 'center',
    zIndex: 30,
  },
  toast: {
    borderWidth: 1,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  message: { ...Typography.bodySemiBold, flex: 1 },
  actionButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
  },
  actionText: { ...Typography.bodySmallSemiBold },
});
