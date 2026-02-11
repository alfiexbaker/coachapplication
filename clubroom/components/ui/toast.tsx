import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
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
  showToast: (message: string, options?: ToastOptions | 'default' | 'success' | 'error' | 'warning') => void;
  showUndoToast: (message: string, onUndo: () => void) => void;
  hideToast: () => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{
    message: string;
    tone: 'default' | 'success' | 'error' | 'warning';
    action?: { label: string; onPress: () => void };
  } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback((
    message: string,
    options?: ToastOptions | 'default' | 'success' | 'error' | 'warning'
  ) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Handle legacy string-only tone parameter
    const resolvedOptions: ToastOptions = typeof options === 'string'
      ? { tone: options }
      : options || {};

    const { tone = 'default', action, duration = 2500 } = resolvedOptions;

    setToast({ message, tone, action });
    timeoutRef.current = setTimeout(() => setToast(null), duration);
  }, []);

  const showUndoToast = useCallback((message: string, onUndo: () => void) => {
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
  }, [showToast, hideToast]);

  const value = useMemo(() => ({ showToast, showUndoToast, hideToast }), [showToast, showUndoToast, hideToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast
        message={toast?.message}
        tone={toast?.tone}
        action={toast?.action}
        onActionPress={() => {
          toast?.action?.onPress();
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
  const toneColor = tone === 'success' ? palette.success : tone === 'error' ? palette.error : tone === 'warning' ? palette.warning : palette.text;

  // Calculate bottom position accounting for tab bar and safe area
  const bottomPosition = TAB_BAR_HEIGHT + Math.max(insets.bottom, Spacing.sm);

  if (!message) return null;

  return (
    <Animated.View
      entering={FadeInDown.springify()}
      exiting={FadeOutUp}
      style={[styles.container, { bottom: bottomPosition }]}
      pointerEvents={action ? 'box-none' : 'none'}
    >
      <Row
        align="center"
        gap="md"
        style={[
          styles.toast,
          { backgroundColor: scheme === 'dark' ? palette.surface : palette.onPrimary, borderColor: withAlpha(toneColor, 0.33), ...Shadows[scheme].card },
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
