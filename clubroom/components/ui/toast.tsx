import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ToastContextValue = {
  showToast: (message: string, tone?: 'default' | 'success' | 'error') => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; tone: 'default' | 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, tone: 'default' | 'success' | 'error' = 'default') => {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast message={toast?.message} tone={toast?.tone} />
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

function Toast({ message, tone = 'default' }: { message?: string; tone?: 'default' | 'success' | 'error' }) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const toneColor = tone === 'success' ? palette.success : tone === 'error' ? palette.error : palette.text;

  if (!message) return null;

  return (
    <Animated.View entering={FadeInDown.springify()} exiting={FadeOutUp} style={styles.container} pointerEvents="none">
      <View
        style={[
          styles.toast,
          { backgroundColor: scheme === 'dark' ? palette.surface : '#FFFFFF', borderColor: `${toneColor}55` },
        ]}
      >
        <Text style={[styles.message, { color: toneColor }]}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Spacing['2xl'],
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
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  message: {
    fontSize: 15,
    fontWeight: '700',
  },
});

