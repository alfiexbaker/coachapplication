import React, { memo } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

interface ConfirmBookingPaymentProps {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  isProcessing: boolean;
  onCardChange: (v: string) => void;
  onExpiryChange: (v: string) => void;
  onCvvChange: (v: string) => void;
}

export const ConfirmBookingPayment = memo(function ConfirmBookingPayment({
  cardNumber,
  expiryDate,
  cvv,
  isProcessing,
  onCardChange,
  onExpiryChange,
  onCvvChange,
}: ConfirmBookingPaymentProps) {
  const { colors: palette } = useTheme();
  const containerStyle = [
    styles.inputContainer,
    { backgroundColor: palette.background, borderColor: palette.border },
  ];

  return (
    <View style={styles.section}>
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
        Payment Details
      </ThemedText>
      <SurfaceCard style={styles.card}>
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Card Number</ThemedText>
          <View style={containerStyle}>
            <Ionicons name="card-outline" size={20} color={palette.icon} />
            <TextInput
              value={cardNumber}
              onChangeText={onCardChange}
              placeholder="1234 5678 9012 3456"
              placeholderTextColor={palette.muted}
              keyboardType="number-pad"
              editable={!isProcessing}
              style={[styles.input, { color: palette.text }]}
            />
          </View>
        </View>
        <Row style={styles.inputRow}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <ThemedText style={styles.label}>Expiry Date</ThemedText>
            <View style={containerStyle}>
              <TextInput
                value={expiryDate}
                onChangeText={onExpiryChange}
                placeholder="MM/YY"
                placeholderTextColor={palette.muted}
                keyboardType="number-pad"
                editable={!isProcessing}
                style={[styles.input, { color: palette.text }]}
              />
            </View>
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <ThemedText style={styles.label}>CVV</ThemedText>
            <View style={containerStyle}>
              <TextInput
                value={cvv}
                onChangeText={onCvvChange}
                placeholder="123"
                placeholderTextColor={palette.muted}
                keyboardType="number-pad"
                secureTextEntry
                editable={!isProcessing}
                style={[styles.input, { color: palette.text }]}
              />
            </View>
          </View>
        </Row>
        <Row style={[styles.securityNote, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
          <Ionicons name="lock-closed" size={16} color={palette.tint} />
          <ThemedText style={[styles.securityText, { color: palette.tint }]}>
            Your payment information is secure and encrypted
          </ThemedText>
        </Row>
      </SurfaceCard>
      <Row style={styles.testNotice}>
        <Ionicons name="information-circle-outline" size={20} color={palette.muted} />
        <ThemedText style={[styles.testNoticeText, { color: palette.muted }]}>
          This is a demo. No actual payment will be processed.
        </ThemedText>
      </Row>
    </View>
  );
});

const styles = StyleSheet.create({
  section: { paddingHorizontal: Spacing.lg },
  sectionTitle: { ...Typography.subheading, marginBottom: Spacing.md },
  card: { padding: Spacing.lg, gap: Spacing.md },
  inputGroup: { gap: Spacing.xs },
  label: { ...Typography.bodySmallSemiBold },
  inputContainer: {
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 2,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  input: { flex: 1, ...Typography.subheading, paddingVertical: 0 },
  inputRow: { gap: Spacing.md },
  securityNote: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.sm,
    marginTop: Spacing.xs,
  },
  securityText: { ...Typography.caption, flex: 1 },
  testNotice: {
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    padding: Spacing.md,
  },
  testNoticeText: { ...Typography.small, flex: 1, lineHeight: 18 },
});
