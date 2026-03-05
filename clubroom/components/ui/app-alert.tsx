import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, StyleSheet, View } from 'react-native';

import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Shadows, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { registerAlertPresenter } from '@/services/ui-feedback';

export type AppAlertButtonStyle = 'default' | 'cancel' | 'destructive';

export interface AppAlertButton {
  text?: string;
  onPress?: () => void;
  style?: AppAlertButtonStyle;
}

interface AppAlertConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

interface QueuedAlert {
  id: number;
  title: string;
  message?: string;
  buttons: AppAlertButton[];
}

type AppAlertContextValue = {
  /**
   * @deprecated Prefer toast for informational feedback and confirm() for blocking decisions.
   */
  showAlert: (title: string, message?: string, buttons?: AppAlertButton[]) => void;
  confirm: (options: AppAlertConfirmOptions) => Promise<boolean>;
};

const AppAlertContext = createContext<AppAlertContextValue | undefined>(undefined);

function normalizeButtons(buttons?: AppAlertButton[]): AppAlertButton[] {
  if (!buttons || buttons.length === 0) {
    return [{ text: 'OK', style: 'default' }];
  }

  return buttons.map((button, index) => ({
    text: button.text || (index === buttons.length - 1 ? 'OK' : `Option ${index + 1}`),
    style: button.style || 'default',
    onPress: button.onPress,
  }));
}

export function AppAlertProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<QueuedAlert[]>([]);
  const idCounter = useRef(0);

  const showAlert = useCallback((title: string, message?: string, buttons?: AppAlertButton[]) => {
    idCounter.current += 1;
    setQueue((previous) => [
      ...previous,
      {
        id: idCounter.current,
        title,
        message,
        buttons: normalizeButtons(buttons),
      },
    ]);
  }, []);

  const dismissCurrent = useCallback(() => {
    setQueue((previous) => previous.slice(1));
  }, []);

  const confirm = useCallback(
    ({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', destructive = false }: AppAlertConfirmOptions) => {
      return new Promise<boolean>((resolve) => {
        showAlert(title, message, [
          {
            text: cancelText,
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: confirmText,
            style: destructive ? 'destructive' : 'default',
            onPress: () => resolve(true),
          },
        ]);
      });
    },
    [showAlert],
  );

  const handleButtonPress = useCallback(
    (button?: AppAlertButton) => {
      dismissCurrent();
      if (button?.onPress) {
        setTimeout(() => {
          button.onPress?.();
        }, 0);
      }
    },
    [dismissCurrent],
  );

  const current = queue[0] ?? null;

  const handleRequestClose = useCallback(() => {
    if (!current) return;
    const fallbackAction = current.buttons.find((button) => button.style === 'cancel') || current.buttons[0];
    handleButtonPress(fallbackAction);
  }, [current, handleButtonPress]);

  const value = useMemo<AppAlertContextValue>(
    () => ({
      showAlert,
      confirm,
    }),
    [confirm, showAlert],
  );

  useEffect(() => {
    return registerAlertPresenter({
      show: (title, message, buttons) => showAlert(title, message, buttons),
      confirm: (options) => confirm(options),
    });
  }, [confirm, showAlert]);

  return (
    <AppAlertContext.Provider value={value}>
      {children}
      {current ? (
        <InAppAlertModal
          key={current.id}
          title={current.title}
          message={current.message}
          buttons={current.buttons}
          onActionPress={handleButtonPress}
          onRequestClose={handleRequestClose}
        />
      ) : null}
    </AppAlertContext.Provider>
  );
}

export function useAppAlert() {
  const context = useContext(AppAlertContext);
  if (!context) {
    throw new Error('useAppAlert must be used within an AppAlertProvider');
  }
  return context;
}

function InAppAlertModal({
  title,
  message,
  buttons,
  onActionPress,
  onRequestClose,
}: {
  title: string;
  message?: string;
  buttons: AppAlertButton[];
  onActionPress: (button?: AppAlertButton) => void;
  onRequestClose: () => void;
}) {
  const { colors: palette, scheme } = useTheme();
  const isDestructive = buttons.some((button) => button.style === 'destructive');

  return (
    <Modal
      animationType="fade"
      transparent
      visible
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
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
          <View style={styles.headerRow}>
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: isDestructive
                    ? withAlpha(palette.error, 0.12)
                    : withAlpha(palette.tint, 0.12),
                },
              ]}
            >
              <Ionicons
                name={isDestructive ? 'warning-outline' : 'information-circle-outline'}
                size={20}
                color={isDestructive ? palette.error : palette.tint}
              />
            </View>
            <ThemedText type="subtitle" style={styles.title}>
              {title}
            </ThemedText>
          </View>

          {message ? (
            <ThemedText style={[styles.message, { color: palette.muted }]}>{message}</ThemedText>
          ) : null}

          <View style={styles.actions}>
            {buttons.map((button, index) => {
              const isCancel = button.style === 'cancel';
              const isButtonDestructive = button.style === 'destructive';
              return (
                <Clickable
                  key={`${button.text}-${index}`}
                  onPress={() => onActionPress(button)}
                  style={({ pressed }) => [
                    styles.actionButton,
                    isCancel
                      ? {
                          backgroundColor: withAlpha(palette.muted, pressed ? 0.22 : 0.1),
                          borderColor: palette.border,
                        }
                      : {
                          backgroundColor: isButtonDestructive
                            ? withAlpha(palette.error, pressed ? 0.9 : 0.82)
                            : withAlpha(palette.tint, pressed ? 0.9 : 0.82),
                          borderColor: isButtonDestructive ? palette.error : palette.tint,
                        },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={button.text}
                >
                  <ThemedText
                    type="defaultSemiBold"
                    style={{
                      color: isCancel
                        ? palette.text
                        : isButtonDestructive
                          ? palette.onDestructive
                          : palette.onPrimary,
                    }}
                  >
                    {button.text}
                  </ThemedText>
                </Clickable>
              );
            })}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
  },
  message: {
    ...Typography.body,
  },
  actions: {
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  actionButton: {
    minHeight: 44,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
});
