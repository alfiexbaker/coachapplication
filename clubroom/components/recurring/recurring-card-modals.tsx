/**
 * RecurringCard — Generic confirmation modal for pause/cancel actions.
 */
import { memo } from 'react';
import { View, StyleSheet, Modal, TextInput } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/primitives/button';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, Components, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface RecurringConfirmModalProps {
  visible: boolean;
  title: string;
  description: string;
  reason: string;
  onReasonChange: (text: string) => void;
  placeholder: string;
  confirmLabel: string;
  loadingLabel: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

export const RecurringConfirmModal = memo(function RecurringConfirmModal({
  visible,
  title,
  description,
  reason,
  onReasonChange,
  placeholder,
  confirmLabel,
  loadingLabel,
  loading,
  onConfirm,
  onCancel,
  destructive,
}: RecurringConfirmModalProps) {
  const { colors: palette } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.overlay, { backgroundColor: withAlpha(palette.text, 0.5) }]}>
        <ThemedView style={styles.content}>
          <ThemedText type="subtitle" style={styles.title}>
            {title}
          </ThemedText>
          <ThemedText style={[styles.description, { color: palette.muted }]}>
            {description}
          </ThemedText>
          <TextInput
            style={[
              styles.reasonInput,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                color: palette.foreground,
              },
            ]}
            placeholder={placeholder}
            placeholderTextColor={palette.muted}
            value={reason}
            onChangeText={onReasonChange}
            multiline

            maxLength={500}
          />
          <Row gap="sm" justify="center">
            <Button variant="outline" onPress={onCancel}>
              {destructive ? 'Go Back' : 'Cancel'}
            </Button>
            <Button
              onPress={onConfirm}
              disabled={loading}
              style={destructive ? { backgroundColor: palette.error } : undefined}
            >
              {loading ? loadingLabel : confirmLabel}
            </Button>
          </Row>
        </ThemedView>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  content: {
    width: '100%',
    maxWidth: Components.modal.maxWidth,
    borderRadius: Components.modal.borderRadius,
    padding: Components.modal.padding,
    gap: Spacing.md,
  },
  title: { textAlign: 'center' },
  description: { textAlign: 'center', ...Typography.body },
  reasonInput: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    minHeight: 80,
    textAlignVertical: 'top',
    ...Typography.body,
  },
});
