import React, { memo } from 'react';
import { View, StyleSheet, Modal, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { CoachEarnings, PayoutMethod } from '@/constants/types';

interface EarningsWithdrawModalProps {
  visible: boolean;
  earnings: CoachEarnings | null;
  payoutMethods: PayoutMethod[];
  withdrawAmount: string;
  selectedPayoutMethod: string | null;
  withdrawing: boolean;
  withdrawError: string | null;
  feePercent: number;
  fee: number;
  netAmount: number;
  formatCurrency: (amount: number) => string;
  onChangeAmount: (text: string) => void;
  onSelectMethod: (id: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export const EarningsWithdrawModal = memo(function EarningsWithdrawModal({
  visible, earnings, payoutMethods, withdrawAmount, selectedPayoutMethod,
  withdrawing, withdrawError, feePercent, fee, netAmount,
  formatCurrency, onChangeAmount, onSelectMethod, onConfirm, onClose,
}: EarningsWithdrawModalProps) {
  const { colors: palette } = useTheme();
  const insets = useSafeAreaInsets();
  const parsedAmount = parseFloat(withdrawAmount) || 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: withAlpha(palette.text, 0.5) }]}>
        <SurfaceCard style={[styles.card, { paddingBottom: insets.bottom + Spacing.md }]}>
          <View style={styles.header}>
            <ThemedText type="subtitle">Withdraw Funds</ThemedText>
            <Clickable accessibilityLabel="Close" onPress={onClose}><Ionicons name="close" size={24} color={palette.icon} /></Clickable>
          </View>
          <View style={styles.content}>
            <View style={[styles.availableCard, { backgroundColor: withAlpha(palette.success, 0.06) }]}>
              <ThemedText style={{ color: palette.muted, ...Typography.small }}>Available to withdraw</ThemedText>
              <ThemedText type="title" style={{ color: palette.success }}>
                {formatCurrency(earnings?.availableBalance || 0).replace(/^[+-]/, '')}
              </ThemedText>
            </View>
            <View style={styles.inputGroup}>
              <ThemedText type="defaultSemiBold">Amount</ThemedText>
              <View style={[styles.amountContainer, { borderColor: palette.border }]}>
                <ThemedText style={styles.currencySymbol}>
                  {earnings?.currency === 'GBP' ? '£' : earnings?.currency === 'USD' ? '$' : '€'}
                </ThemedText>
                <TextInput
                  style={[styles.amountInput, { color: palette.text }]}
                  placeholder="0.00"
                  placeholderTextColor={palette.muted}
                  keyboardType="decimal-pad"
                  value={withdrawAmount}
                  onChangeText={onChangeAmount}
                />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <ThemedText type="defaultSemiBold">Payout Method</ThemedText>
              {payoutMethods.length === 0 ? (
                <View style={[styles.noMethods, { borderColor: palette.border }]}>
                  <ThemedText style={{ color: palette.muted, textAlign: 'center' }}>Add a payout method to withdraw funds</ThemedText>
                </View>
              ) : (
                <View style={styles.methodOptions}>
                  {payoutMethods.filter((m) => m.isVerified).map((method) => (
                    <Clickable key={method.id} onPress={() => onSelectMethod(method.id)}>
                      <View style={[styles.methodOption, { borderColor: selectedPayoutMethod === method.id ? palette.tint : palette.border, backgroundColor: selectedPayoutMethod === method.id ? withAlpha(palette.tint, 0.06) : 'transparent' }]}>
                        <View style={styles.methodContent}>
                          <Ionicons name={method.type === 'BANK_ACCOUNT' ? 'business' : method.type === 'PAYPAL' ? 'logo-paypal' : 'card'} size={18} color={selectedPayoutMethod === method.id ? palette.tint : palette.icon} />
                          <View>
                            <ThemedText style={{ fontWeight: '500' }}>{method.nickname || method.type}</ThemedText>
                            <ThemedText style={{ color: palette.muted, ...Typography.caption }}>
                              {method.type === 'BANK_ACCOUNT' ? `****${method.accountLastFour}` : method.paypalEmail}
                            </ThemedText>
                          </View>
                        </View>
                        <View style={[styles.radio, { borderColor: selectedPayoutMethod === method.id ? palette.tint : palette.border, backgroundColor: selectedPayoutMethod === method.id ? palette.tint : 'transparent' }]}>
                          {selectedPayoutMethod === method.id && <View style={[styles.radioInner, { backgroundColor: palette.background }]} />}
                        </View>
                      </View>
                    </Clickable>
                  ))}
                </View>
              )}
            </View>
            {parsedAmount > 0 && (
              <View style={[styles.feeCard, { borderColor: palette.border }]}>
                <View style={styles.feeRow}>
                  <ThemedText style={{ color: palette.muted }}>Withdrawal amount</ThemedText>
                  <ThemedText>{formatCurrency(parsedAmount).replace(/^[+-]/, '')}</ThemedText>
                </View>
                <View style={styles.feeRow}>
                  <ThemedText style={{ color: palette.muted }}>Platform fee ({feePercent}%)</ThemedText>
                  <ThemedText style={{ color: palette.error }}>-{formatCurrency(fee).replace(/^[+-]/, '')}</ThemedText>
                </View>
                <View style={[styles.feeDivider, { backgroundColor: palette.border }]} />
                <View style={styles.feeRow}>
                  <ThemedText type="defaultSemiBold">You will receive</ThemedText>
                  <ThemedText type="defaultSemiBold" style={{ color: palette.success }}>{formatCurrency(netAmount).replace(/^[+-]/, '')}</ThemedText>
                </View>
              </View>
            )}
            {withdrawError && (
              <View style={[styles.errorCard, { backgroundColor: withAlpha(palette.error, 0.06) }]}>
                <Ionicons name="alert-circle" size={16} color={palette.error} />
                <ThemedText style={{ color: palette.error, flex: 1 }}>{withdrawError}</ThemedText>
              </View>
            )}
            <Clickable onPress={onConfirm} disabled={withdrawing || !selectedPayoutMethod || !withdrawAmount}>
              <View style={[styles.confirmBtn, { backgroundColor: withdrawing || !selectedPayoutMethod || !withdrawAmount ? palette.border : palette.tint }]}>
                {withdrawing ? <ActivityIndicator size="small" color={palette.background} /> : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color={palette.background} />
                    <ThemedText style={{ color: palette.background, fontWeight: '700' }}>Confirm Withdrawal</ThemedText>
                  </>
                )}
              </View>
            </Clickable>
          </View>
        </SurfaceCard>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  card: { borderTopLeftRadius: Radii.xl, borderTopRightRadius: Radii.xl, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: Spacing.lg, maxHeight: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  content: { gap: Spacing.md },
  availableCard: { padding: Spacing.md, borderRadius: Radii.md, alignItems: 'center', gap: Spacing.xxs },
  inputGroup: { gap: Spacing.xs },
  amountContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: Radii.md, paddingHorizontal: Spacing.md, height: 52 },
  currencySymbol: { ...Typography.title, marginRight: Spacing.xs },
  amountInput: { flex: 1, ...Typography.display, height: '100%' },
  noMethods: { padding: Spacing.lg, borderWidth: 1, borderRadius: Radii.md, borderStyle: 'dashed' },
  methodOptions: { gap: Spacing.sm },
  methodOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderWidth: 1.5, borderRadius: Radii.md },
  methodContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  radio: { width: 20, height: 20, borderRadius: Radii.md, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 8, height: 8, borderRadius: Radii.xs },
  feeCard: { padding: Spacing.md, borderWidth: 1, borderRadius: Radii.md, gap: Spacing.sm },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feeDivider: { height: 1 },
  errorCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, padding: Spacing.md, borderRadius: Radii.md },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.md, borderRadius: Radii.md, marginTop: Spacing.xs },
});
