import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Badge } from '@/components/primitives/badge';
import { Radii, Spacing, Typography, Components, withAlpha } from '@/constants/theme';
import type { EmergencyContact } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

interface EmergencyContactCardProps {
  contact: EmergencyContact;
  onCall: () => void;
  onEmail?: () => void;
  compact?: boolean;
}

/**
 * EmergencyContactCard - Contact card with one-tap call functionality
 * Shows contact details with prominent call button for quick access
 */
export function EmergencyContactCard({
  contact,
  onCall,
  onEmail,
  compact = false,
}: EmergencyContactCardProps) {
  const { colors: palette } = useTheme();

  if (compact) {
    return (
      <View style={styles.compactCard}>
        <View style={styles.compactInfo}>
          <View style={styles.compactNameRow}>
            <ThemedText type="defaultSemiBold" numberOfLines={1} style={{ flex: 1 }}>
              {contact.name}
            </ThemedText>
            {contact.isPrimary && (
              <Badge label="Primary" tone="success" />
            )}
          </View>
          <ThemedText style={[styles.compactPhone, { color: palette.muted }]}>
            {contact.phone}
          </ThemedText>
        </View>
        <Clickable
          onPress={onCall}
          style={[styles.compactCallButton, { backgroundColor: palette.success }]}
        >
          <Ionicons name="call" size={16} color={palette.onSuccess} />
        </Clickable>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: palette.surfaceSecondary }]}>
      <View style={styles.mainContent}>
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
          <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
            {contact.name.slice(0, 2).toUpperCase()}
          </ThemedText>
        </View>

        {/* Contact Info */}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <ThemedText type="defaultSemiBold" numberOfLines={1} style={{ flex: 1 }}>
              {contact.name}
            </ThemedText>
            {contact.isPrimary && (
              <Badge label="Primary" tone="success" />
            )}
          </View>

          <ThemedText style={[styles.relationship, { color: palette.muted }]}>
            {contact.relationship}
          </ThemedText>

          <View style={styles.phoneRow}>
            <Ionicons name="call" size={14} color={palette.tint} />
            <ThemedText style={{ color: palette.tint, fontWeight: '500' }}>
              {contact.phone}
            </ThemedText>
          </View>

          {contact.email && (
            <View style={styles.emailRow}>
              <Ionicons name="mail" size={14} color={palette.muted} />
              <ThemedText style={{ ...Typography.small, color: palette.muted }} numberOfLines={1}>
                {contact.email}
              </ThemedText>
            </View>
          )}

          {/* Permissions */}
          <View style={styles.permissionsRow}>
            {contact.canPickup && (
              <View style={[styles.permissionBadge, { backgroundColor: withAlpha(palette.success, 0.06) }]}>
                <Ionicons name="checkmark-circle" size={12} color={palette.success} />
                <ThemedText style={[styles.permissionText, { color: palette.success }]}>
                  Can pickup
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        {/* Call Button */}
        <Clickable
          onPress={onCall}
          style={[styles.callButton, { backgroundColor: palette.success }]}
        >
          <Ionicons name="call" size={22} color={palette.onSuccess} />
        </Clickable>
      </View>
    </View>
  );
}

/**
 * Compact inline contact for lists
 */
export function EmergencyContactInline({
  contact,
  onCall,
}: {
  contact: EmergencyContact;
  onCall: () => void;
}) {
  const { colors: palette } = useTheme();

  return (
    <Clickable onPress={onCall} style={styles.inlineContainer}>
      <View style={[styles.inlineIcon, { backgroundColor: withAlpha(palette.success, 0.06) }]}>
        <Ionicons name="call" size={14} color={palette.success} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText style={styles.inlineName} numberOfLines={1}>
          {contact.name}
        </ThemedText>
        <ThemedText style={[styles.inlinePhone, { color: palette.tint }]}>
          {contact.phone}
        </ThemedText>
      </View>
      <Ionicons name="chevron-forward" size={16} color={palette.muted} />
    </Clickable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.md,
    overflow: 'hidden',
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Components.card.padding,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { ...Typography.subheading },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  relationship: { ...Typography.caption, marginTop: Spacing.micro },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    marginTop: Spacing.xxs,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    marginTop: Spacing.micro,
  },
  permissionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xxs,
    marginTop: Spacing.xxs,
  },
  permissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.micro,
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  permissionText: { ...Typography.micro },
  callButton: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Compact styles
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  compactInfo: {
    flex: 1,
  },
  compactNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  compactPhone: { ...Typography.caption, marginTop: Spacing.micro },
  compactCallButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Inline styles
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  inlineIcon: {
    width: 28,
    height: 28,
    borderRadius: Radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineName: { ...Typography.smallSemiBold },
  inlinePhone: { ...Typography.caption },
});
