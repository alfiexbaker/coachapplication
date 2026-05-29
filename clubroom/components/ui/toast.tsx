import React, { createContext, useEffect, useRef, useState, use } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radii, Spacing, Typography, withAlpha, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { registerToastPresenter } from '@/services/ui-feedback';

// Tab bar height constant for proper positioning
const TAB_BAR_HEIGHT = 60;
const DEFAULT_TOAST_DURATION = 2800;
const UNDO_DURATION = 4000;

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

interface ToastQueueController {
  queueRef: React.MutableRefObject<QueuedToast[]>;
  currentRef: React.MutableRefObject<QueuedToast | null>;
  timeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  setCurrent: React.Dispatch<React.SetStateAction<QueuedToast | null>>;
}

function displayNextQueuedToast(controller: ToastQueueController) {
  const { queueRef, currentRef, timeoutRef, setCurrent } = controller;
  if (currentRef.current || queueRef.current.length === 0) {
    return;
  }
  const next = queueRef.current.shift();
  if (!next) {
    return;
  }
  currentRef.current = next;
  setCurrent(next);
  timeoutRef.current = setTimeout(() => {
    timeoutRef.current = null;
    currentRef.current = null;
    setCurrent(null);
    displayNextQueuedToast(controller);
  }, next.duration);
}

function hideQueuedToast(controller: ToastQueueController) {
  const { currentRef, timeoutRef, setCurrent } = controller;
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }
  currentRef.current = null;
  setCurrent(null);
  displayNextQueuedToast(controller);
}

function enqueueQueuedToast(
  message: string,
  options: ToastOptions | 'default' | 'success' | 'error' | 'warning' | undefined,
  idCounter: React.MutableRefObject<number>,
  controller: ToastQueueController,
) {
  const resolvedOptions: ToastOptions =
    typeof options === 'string' ? { tone: options } : options || {};

  const { tone = 'default', action, duration } = resolvedOptions;
  const effectiveDuration = duration ?? DEFAULT_TOAST_DURATION;

  idCounter.current += 1;
  const newToast: QueuedToast = {
    id: idCounter.current,
    message,
    tone,
    action,
    duration: effectiveDuration,
  };

  controller.queueRef.current.push(newToast);
  displayNextQueuedToast(controller);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<QueuedToast | null>(null);
  const queueRef = useRef<QueuedToast[]>([]);
  const currentRef = useRef<QueuedToast | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idCounter = useRef(0);
  const queueController: ToastQueueController = {
    queueRef,
    currentRef,
    timeoutRef,
    setCurrent,
  };

  const hideToast = () => {
    hideQueuedToast(queueController);
  };

  const showToast = (
    message: string,
    options?: ToastOptions | 'default' | 'success' | 'error' | 'warning',
  ) => {
    enqueueQueuedToast(message, options, idCounter, queueController);
  };

  const showUndoToast = (message: string, onUndo: () => void) => {
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
  };

  const value = {
    showToast,
    showUndoToast,
    hideToast,
  };

  useEffect(() => {
    const presenterQueueController: ToastQueueController = {
      queueRef,
      currentRef,
      timeoutRef,
      setCurrent,
    };

    return registerToastPresenter({
      showToast: (message, tone = 'default') => {
        enqueueQueuedToast(message, tone, idCounter, presenterQueueController);
      },
    });
  }, []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast
        message={current?.message}
        tone={current?.tone}
        action={current?.action}
        onDismiss={hideToast}
        onActionPress={() => {
          current?.action?.onPress();
          hideToast();
        }}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = use(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

function Toast({
  message,
  tone = 'default',
  action,
  onDismiss,
  onActionPress,
}: {
  message?: string;
  tone?: 'default' | 'success' | 'error' | 'warning';
  action?: { label: string; onPress: () => void };
  onDismiss?: () => void;
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
      pointerEvents="box-none"
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
        <Clickable
          onPress={onDismiss}
          style={({ pressed }) => [
            styles.dismissButton,
            { backgroundColor: withAlpha(palette.muted, pressed ? 0.18 : 0.08) },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
        >
          <Ionicons name="close" size={16} color={palette.muted} />
        </Clickable>
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
  dismissButton: {
    width: 28,
    height: 28,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
