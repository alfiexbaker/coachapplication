import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Shadows, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { registerActionSheetPresenter } from '@/services/ui-feedback';

export interface AppActionOption {
  id: string;
  label: string;
  destructive?: boolean;
}

interface ChooseOptions {
  title?: string;
  message?: string;
  options: AppActionOption[];
  cancelText?: string;
}

interface QueuedActionSheet extends ChooseOptions {
  id: number;
  resolve: (value: string | null) => void;
}

type AppActionSheetContextValue = {
  choose: (options: ChooseOptions) => Promise<string | null>;
};

const AppActionSheetContext = createContext<AppActionSheetContextValue | undefined>(undefined);

export function AppActionSheetProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<QueuedActionSheet[]>([]);
  const idCounter = useRef(0);

  const choose = useCallback((options: ChooseOptions) => {
    return new Promise<string | null>((resolve) => {
      idCounter.current += 1;
      setQueue((previous) => [...previous, { ...options, id: idCounter.current, resolve }]);
    });
  }, []);

  const dismissCurrent = useCallback((selection: string | null) => {
    setQueue((previous) => {
      if (previous.length === 0) return previous;
      const [current, ...rest] = previous;
      current.resolve(selection);
      return rest;
    });
  }, []);

  useEffect(() => {
    return registerActionSheetPresenter({
      choose: (options) =>
        choose({
          title: options.title,
          message: options.message,
          options: options.options,
          cancelText: options.cancelText,
        }),
    });
  }, [choose]);

  const value = useMemo<AppActionSheetContextValue>(
    () => ({
      choose,
    }),
    [choose],
  );

  const current = queue[0] ?? null;

  return (
    <AppActionSheetContext.Provider value={value}>
      {children}
      {current ? (
        <ActionSheetModal
          key={current.id}
          title={current.title}
          message={current.message}
          options={current.options}
          cancelText={current.cancelText ?? 'Cancel'}
          onSelect={(id) => dismissCurrent(id)}
          onCancel={() => dismissCurrent(null)}
        />
      ) : null}
    </AppActionSheetContext.Provider>
  );
}

export function useAppActionSheet() {
  const context = useContext(AppActionSheetContext);
  if (!context) {
    throw new Error('useAppActionSheet must be used within an AppActionSheetProvider');
  }
  return context;
}

function ActionSheetModal({
  title,
  message,
  options,
  cancelText,
  onSelect,
  onCancel,
}: {
  title?: string;
  message?: string;
  options: AppActionOption[];
  cancelText: string;
  onSelect: (id: string) => void;
  onCancel: () => void;
}) {
  const { colors: palette, scheme } = useTheme();

  return (
    <Modal animationType="fade" transparent visible onRequestClose={onCancel} statusBarTranslucent>
      <View style={[styles.backdrop, { backgroundColor: withAlpha(palette.text, 0.52) }]}>
        <Clickable
          onPress={onCancel}
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel="Dismiss action sheet"
        />
        <SurfaceCard
          style={[
            styles.card,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              ...Shadows[scheme].cardHover,
            },
          ]}
        >
          {title ? <ThemedText type="subtitle">{title}</ThemedText> : null}
          {message ? (
            <ThemedText style={[styles.message, { color: palette.muted }]}>{message}</ThemedText>
          ) : null}

          <View style={styles.options}>
            {options.map((option) => (
              <Clickable
                key={option.id}
                onPress={() => onSelect(option.id)}
                style={({ pressed }) => [
                  styles.optionButton,
                  {
                    borderColor: option.destructive ? palette.error : palette.border,
                    backgroundColor: withAlpha(
                      option.destructive ? palette.error : palette.tint,
                      pressed ? 0.2 : 0.08,
                    ),
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={option.label}
              >
                <ThemedText
                  type="defaultSemiBold"
                  style={{ color: option.destructive ? palette.error : palette.text }}
                >
                  {option.label}
                </ThemedText>
              </Clickable>
            ))}
          </View>

          <Clickable
            onPress={onCancel}
            style={({ pressed }) => [
              styles.cancelButton,
              {
                borderColor: palette.border,
                backgroundColor: withAlpha(palette.muted, pressed ? 0.2 : 0.08),
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={cancelText}
          >
            <ThemedText type="defaultSemiBold">{cancelText}</ThemedText>
          </Clickable>
        </SurfaceCard>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: Spacing.md,
  },
  card: {
    width: '100%',
    alignSelf: 'center',
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  message: {
    ...Typography.body,
  },
  options: {
    gap: Spacing.xs,
  },
  optionButton: {
    minHeight: 44,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  cancelButton: {
    marginTop: Spacing.xs,
    minHeight: 44,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
});

