import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { KeyboardTypeOptions, Modal, StyleSheet, TextInput, View } from 'react-native';

import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Shadows, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { registerPromptPresenter } from '@/services/ui-feedback';

interface PromptTextOptions {
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  keyboardType?: KeyboardTypeOptions;
}

interface QueuedPrompt extends PromptTextOptions {
  id: number;
  resolve: (value: string | null) => void;
}

type AppPromptContextValue = {
  promptText: (options: PromptTextOptions) => Promise<string | null>;
};

const AppPromptContext = createContext<AppPromptContextValue | undefined>(undefined);

export function AppPromptProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<QueuedPrompt[]>([]);
  const idCounter = useRef(0);

  const promptText = useCallback((options: PromptTextOptions) => {
    return new Promise<string | null>((resolve) => {
      idCounter.current += 1;
      setQueue((previous) => [...previous, { ...options, id: idCounter.current, resolve }]);
    });
  }, []);

  const resolveCurrent = useCallback((value: string | null) => {
    setQueue((previous) => {
      if (previous.length === 0) return previous;
      const [current, ...rest] = previous;
      current.resolve(value);
      return rest;
    });
  }, []);

  useEffect(() => {
    return registerPromptPresenter({
      promptText: (options) =>
        promptText({
          title: options.title,
          message: options.message,
          placeholder: options.placeholder,
          defaultValue: options.defaultValue,
          confirmText: options.confirmText,
          cancelText: options.cancelText,
          keyboardType: options.keyboardType,
        }),
    });
  }, [promptText]);

  const value = useMemo<AppPromptContextValue>(
    () => ({
      promptText,
    }),
    [promptText],
  );

  const current = queue[0] ?? null;

  return (
    <AppPromptContext.Provider value={value}>
      {children}
      {current ? (
        <PromptModal
          key={current.id}
          options={current}
          onCancel={() => resolveCurrent(null)}
          onSubmit={(text) => resolveCurrent(text)}
        />
      ) : null}
    </AppPromptContext.Provider>
  );
}

export function useAppPrompt() {
  const context = useContext(AppPromptContext);
  if (!context) {
    throw new Error('useAppPrompt must be used within an AppPromptProvider');
  }
  return context;
}

function PromptModal({
  options,
  onCancel,
  onSubmit,
}: {
  options: PromptTextOptions;
  onCancel: () => void;
  onSubmit: (value: string) => void;
}) {
  const { colors: palette, scheme } = useTheme();
  const [value, setValue] = useState(options.defaultValue ?? '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(options.defaultValue ?? '');
    setError(null);
  }, [options.defaultValue, options.title]);

  return (
    <Modal animationType="fade" transparent visible onRequestClose={onCancel} statusBarTranslucent>
      <View style={[styles.backdrop, { backgroundColor: withAlpha(palette.text, 0.52) }]}>
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
          <ThemedText type="subtitle">{options.title}</ThemedText>
          {options.message ? (
            <ThemedText style={[styles.message, { color: palette.muted }]}>{options.message}</ThemedText>
          ) : null}

          <TextInput
            value={value}
            onChangeText={(nextValue) => {
              setValue(nextValue);
              if (error) {
                setError(null);
              }
            }}
            placeholder={options.placeholder ?? 'Enter value'}
            placeholderTextColor={palette.muted}
            keyboardType={options.keyboardType}
            style={[
              styles.input,
              {
                borderColor: error ? palette.error : palette.border,
                color: palette.text,
                backgroundColor: withAlpha(palette.background, scheme === 'dark' ? 0.3 : 0.9),
              },
            ]}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => {
              if (value.trim().length === 0) {
                setError('Value is required.');
                return;
              }
              onSubmit(value.trim());
            }}
            accessibilityLabel={options.title}
          />
          {error ? <ThemedText style={[styles.error, { color: palette.error }]}>{error}</ThemedText> : null}

          <View style={styles.actions}>
            <Clickable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.button,
                {
                  borderColor: palette.border,
                  backgroundColor: withAlpha(palette.muted, pressed ? 0.2 : 0.08),
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={options.cancelText ?? 'Cancel'}
            >
              <ThemedText type="defaultSemiBold">{options.cancelText ?? 'Cancel'}</ThemedText>
            </Clickable>

            <Clickable
              onPress={() => {
                if (value.trim().length === 0) {
                  setError('Value is required.');
                  return;
                }
                onSubmit(value.trim());
              }}
              style={({ pressed }) => [
                styles.button,
                {
                  borderColor: palette.tint,
                  backgroundColor: withAlpha(palette.tint, pressed ? 0.9 : 0.82),
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={options.confirmText ?? 'Confirm'}
            >
              <ThemedText type="defaultSemiBold" style={{ color: palette.onPrimary }}>
                {options.confirmText ?? 'Confirm'}
              </ThemedText>
            </Clickable>
          </View>
        </SurfaceCard>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  message: {
    ...Typography.body,
  },
  input: {
    minHeight: 44,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    ...Typography.body,
  },
  error: {
    ...Typography.caption,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  button: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
});

