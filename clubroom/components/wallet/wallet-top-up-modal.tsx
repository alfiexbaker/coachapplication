import { memo, useCallback } from 'react';
import { StyleSheet, Modal, TextInput, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography, Radii, Components, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { PRESET_AMOUNTS } from '@/hooks/use-wallet';

interface WalletTopUpModalProps {
  visible: boolean;
  selectedAmount: number | null;
  customAmount: string;
  processing: boolean;
  onClose: () => void;
  onSelectPreset: (amount: number) => void;
  onChangeCustomAmount: (text: string) => void;
  onConfirm: () => void;
}

export const WalletTopUpModal = memo(function WalletTopUpModal({
  visible,
  selectedAmount,
  customAmount,
  processing,
  onClose,
  onSelectPreset,
  onChangeCustomAmount,
  onConfirm,
}: WalletTopUpModalProps) {
  const { colors } = useTheme();

  const isDisabled = (!selectedAmount && !customAmount) || processing;
  const displayAmount = selectedAmount || customAmount || '0';

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleConfirm = useCallback(() => {
    onConfirm();
  }, [onConfirm]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <Row align="center" justify="between" style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Top Up Wallet
          </ThemedText>
          <Clickable
            style={[styles.closeButton, { backgroundColor: colors.surfaceSecondary }]}
            onPress={handleClose}
            accessibilityLabel="Close top up modal"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </Clickable>
        </Row>

        {/* Content */}
        <Column gap="sm" style={styles.content}>
          {/* Preset Amounts */}
          <ThemedText style={[styles.label, { color: colors.muted }]}>
            Select an amount
          </ThemedText>
          <Row wrap gap="sm">
            {PRESET_AMOUNTS.map((amount) => {
              const isSelected = selectedAmount === amount;
              return (
                <Clickable
                  key={amount}
                  style={[
                    styles.presetButton,
                    {
                      backgroundColor: isSelected
                        ? withAlpha(colors.tint, 0.09)
                        : colors.surface,
                      borderColor: isSelected ? colors.tint : colors.border,
                    },
                  ]}
                  onPress={() => onSelectPreset(amount)}
                  accessibilityLabel={`Select ${amount} pounds`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <ThemedText
                    type="defaultSemiBold"
                    style={[
                      styles.presetText,
                      { color: isSelected ? colors.tint : colors.text },
                    ]}
                  >
                    {'\u00A3'}{amount}
                  </ThemedText>
                </Clickable>
              );
            })}
          </Row>

          {/* Custom Amount */}
          <ThemedText style={[styles.label, { color: colors.muted, marginTop: Spacing.md }]}>
            Or enter a custom amount
          </ThemedText>
          <Row
            align="center"
            style={[
              styles.customInput,
              {
                backgroundColor: colors.surface,
                borderColor: customAmount ? colors.tint : colors.border,
              },
            ]}
          >
            <ThemedText style={styles.currency}>{'\u00A3'}</ThemedText>
            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              placeholder="0.00"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              value={customAmount}
              onChangeText={onChangeCustomAmount}
              accessibilityLabel="Enter custom amount"
            />
          </Row>

          {/* Confirm Button */}
          <Clickable
            style={[
              styles.confirmButton,
              {
                backgroundColor: colors.tint,
                opacity: isDisabled ? 0.6 : 1,
              },
            ]}
            onPress={handleConfirm}
            disabled={isDisabled}
            accessibilityLabel={`Add ${displayAmount} pounds to wallet`}
            accessibilityRole="button"
            accessibilityState={{ disabled: isDisabled }}
          >
            {processing ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <>
                <Ionicons name="card-outline" size={20} color={colors.onPrimary} />
                <ThemedText style={[styles.confirmText, { color: colors.onPrimary }]}>
                  Add {'\u00A3'}{displayAmount}
                </ThemedText>
              </>
            )}
          </Clickable>

          {processing && (
            <ThemedText style={[styles.processingText, { color: colors.muted }]}>
              Processing payment...
            </ThemedText>
          )}
        </Column>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: Spacing.md,
    paddingTop: Spacing.lg,
  },
  title: {
    ...Typography.title,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Components.button.height,
    minWidth: Components.button.height,
  },
  content: {
    padding: Spacing.md,
  },
  label: {
    ...Typography.bodySmallSemiBold,
    marginBottom: Spacing.xs,
  },
  presetButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Components.button.height,
  },
  presetText: {
    ...Typography.title,
  },
  customInput: {
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    height: 56,
  },
  currency: {
    ...Typography.display,
    marginRight: Spacing.xs,
  },
  textInput: {
    flex: 1,
    ...Typography.display,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    marginTop: Spacing.lg,
    minHeight: Components.button.height,
  },
  confirmText: {
    ...Typography.subheading,
  },
  processingText: {
    textAlign: 'center',
    ...Typography.bodySmall,
    marginTop: Spacing.sm,
  },
});
