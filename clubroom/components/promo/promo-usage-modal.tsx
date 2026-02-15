/**
 * Promo Code Usage Modal
 *
 * Shows usage history and summary for a selected promo code.
 */

import { memo } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';

import { ThemedText } from '@/components/themed-text';
import { CodeUsageList, CodeUsageSummary } from '@/components/promo';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { PromoCode, PromoCodeUsage } from '@/constants/types';

interface PromoUsageModalProps {
  visible: boolean;
  selectedCode: PromoCode | null;
  usageData: PromoCodeUsage[];
  usageLoading: boolean;
  onClose: () => void;
}

export const PromoUsageModal = memo(function PromoUsageModal({
  visible,
  selectedCode,
  usageData,
  usageLoading,
  onClose,
}: PromoUsageModalProps) {
  const { colors: palette } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <Row align="flex-start" justify="space-between" style={styles.header}>
          <View>
            <ThemedText type="title" style={styles.title}>
              Usage History
            </ThemedText>
            {selectedCode && (
              <ThemedText style={[styles.subtitle, { color: palette.tint }]}>
                {selectedCode.code}
              </ThemedText>
            )}
          </View>
          <Clickable
            accessibilityLabel="Close"
            style={[styles.closeButton, { backgroundColor: palette.surfaceSecondary }]}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color={palette.text} />
          </Clickable>
        </Row>

        <View style={styles.content}>
          {selectedCode && (
            <CodeUsageSummary
              totalRedemptions={selectedCode.currentUses}
              totalCreditsAwarded={selectedCode.currentUses * selectedCode.creditAmount}
              loading={usageLoading}
            />
          )}
          <View style={styles.listContainer}>
            <ThemedText type="defaultSemiBold" style={styles.listTitle}>
              Recent Redemptions
            </ThemedText>
            <CodeUsageList
              usage={usageData}
              loading={usageLoading}
              emptyMessage="No redemptions yet for this code"
              showUser={true}
            />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: Spacing.md, paddingTop: Spacing.lg },
  title: { ...Typography.title },
  subtitle: { ...Typography.bodySmallSemiBold, marginTop: Spacing.micro },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, padding: Spacing.md, gap: Spacing.lg },
  listContainer: { flex: 1, gap: Spacing.md },
  listTitle: { ...Typography.subheading },
});
