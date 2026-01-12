import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Badge } from '@/components/primitives/badge';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { EmergencyContact } from '@/constants/types';

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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

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
          <Ionicons name="call" size={16} color="#fff" />
        </Clickable>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: palette.surfaceSecondary }]}>
      <View style={styles.mainContent}>
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: `${palette.tint}15` }]}>
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
              <ThemedText style={{ color: palette.muted, fontSize: 13 }} numberOfLines={1}>
                {contact.email}
              </ThemedText>
            </View>
          )}

          {/* Permissions */}
          <View style={styles.permissionsRow}>
            {contact.canPickup && (
              <View style={[styles.permissionBadge, { backgroundColor: `${palette.success}10` }]}>
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
          <Ionicons name="call" size={22} color="#fff" />
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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <Clickable onPress={onCall} style={styles.inlineContainer}>
      <View style={[styles.inlineIcon, { backgroundColor: `${palette.success}10` }]}>
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
    padding: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  relationship: {
    fontSize: 12,
    marginTop: 2,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  permissionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  permissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  permissionText: {
    fontSize: 10,
    fontWeight: '600',
  },
  callButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  compactPhone: {
    fontSize: 12,
    marginTop: 2,
  },
  compactCallButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineName: {
    fontSize: 13,
    fontWeight: '500',
  },
  inlinePhone: {
    fontSize: 12,
  },
});
