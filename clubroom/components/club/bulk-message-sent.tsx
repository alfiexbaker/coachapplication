import { memo, useCallback } from 'react';
import { AccessibleListCell } from '@/components/ui/list-accessibility';
import { FlatList, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Components, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Recipient, DeliveryStatus } from './bulk-message';
import { Row } from '@/components/primitives';

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_ICONS: Record<DeliveryStatus, { icon: string; label: string }> = {
  pending: { icon: 'time-outline', label: 'Pending' },
  delivered: { icon: 'checkmark', label: 'Delivered' },
  read: { icon: 'checkmark-done', label: 'Read' },
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface BulkMessageSentProps {
  recipientLabel: string;
  recipients: Recipient[];
  onReset: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const BulkMessageSent = memo(function BulkMessageSent({
  recipientLabel,
  recipients,
  onReset,
}: BulkMessageSentProps) {
  const { colors: palette } = useTheme();

  const renderRecipient = useCallback(
    ({ item }: { item: Recipient }) => {
      const statusInfo = STATUS_ICONS[item.status];
      const statusColor =
        item.status === 'read'
          ? palette.success
          : item.status === 'delivered'
            ? palette.tint
            : palette.muted;

      return (
        <Row style={[styles.recipientRow, { borderBottomColor: palette.border }]}>
          <View style={[styles.recipientAvatar, { backgroundColor: withAlpha(palette.tint, 0.1) }]}>
            <ThemedText style={[styles.recipientInitial, { color: palette.tint }]}>
              {item.name.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
          <View style={styles.recipientInfo}>
            <ThemedText style={[styles.recipientName, { color: palette.text }]}>
              {item.name}
            </ThemedText>
            {item.role ? (
              <ThemedText style={[styles.recipientRole, { color: palette.muted }]}>
                {item.role}
              </ThemedText>
            ) : null}
          </View>
          <Row style={styles.statusContainer}>
            <Ionicons
              name={statusInfo.icon as keyof typeof Ionicons.glyphMap}
              size={Components.icon.md}
              color={statusColor}
            />
            <ThemedText style={[styles.statusLabel, { color: statusColor }]}>
              {statusInfo.label}
            </ThemedText>
          </Row>
        </Row>
      );
    },
    [palette],
  );

  return (
    <View style={styles.sentContainer}>
      {/* Success banner */}
      <View style={[styles.successBanner, { backgroundColor: withAlpha(palette.success, 0.1) }]}>
        <Ionicons name="checkmark-circle" size={Components.icon.xl} color={palette.success} />
        <ThemedText style={[styles.successText, { color: palette.success }]}>
          Message Sent
        </ThemedText>
        <ThemedText style={[styles.successSub, { color: palette.muted }]}>
          Sent to {recipientLabel}
        </ThemedText>
      </View>

      {/* Delivery status list */}
      {recipients.length > 0 ? (
        <>
          <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>
            Delivery Status
          </ThemedText>
          <FlatList
        CellRendererComponent={AccessibleListCell}
        accessibilityRole="list"
            data={recipients}
            renderItem={renderRecipient}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : null}

      {/* New message button */}
      <Clickable
        onPress={onReset}
        accessibilityRole="button"
        accessibilityLabel="Send another message"
        style={{
          height: Components.button.height,
          borderRadius: Radii.button,
          backgroundColor: palette.surface,
          borderWidth: 1,
          borderColor: palette.border,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: Spacing.sm,
        }}
      >
        <ThemedText style={{ ...Typography.bodySemiBold, color: palette.text }}>
          Send Another Message
        </ThemedText>
      </Clickable>
    </View>
  );
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sentContainer: {
    flex: 1,
    gap: Spacing.xs,
  },
  successBanner: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.card,
    gap: Spacing.xs,
  },
  successText: {
    ...Typography.heading,
  },
  successSub: {
    ...Typography.body,
  },
  sectionLabel: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs / 2,
  },
  recipientRow: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  recipientAvatar: {
    width: Components.avatar.sm,
    height: Components.avatar.sm,
    borderRadius: Components.avatar.sm / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipientInitial: {
    ...Typography.caption,
    fontWeight: '700',
  },
  recipientInfo: {
    flex: 1,
  },
  recipientName: {
    ...Typography.bodySemiBold,
  },
  recipientRole: {
    ...Typography.small,
  },
  statusContainer: {
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  statusLabel: {
    ...Typography.caption,
  },
});
