import { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/primitives/badge';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { EmergencyContact } from '@/constants/types';
import { uiFeedback } from '@/services/ui-feedback';

interface EmergencyContactCardProps {
  contact: EmergencyContact;
  onEdit: () => void;
  onDelete: () => void;
  onSetPrimary: () => void;
}

export const EmergencyContactCard = memo(function EmergencyContactCard({
  contact,
  onEdit,
  onDelete,
  onSetPrimary,
}: EmergencyContactCardProps) {
  const { colors } = useTheme();

  const handleDelete = useCallback(() => {
    uiFeedback.alert(
      'Delete Emergency Contact',
      `Remove ${contact.name} (${contact.relationship}) as emergency contact?\n\nThis is critical safety information and should only be deleted if no longer accurate.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: onDelete,
        },
      ],
    );
  }, [contact.name, contact.relationship, onDelete]);

  return (
    <SurfaceCard style={styles.card}>
      <Row gap="sm" align="center">
        <View style={[styles.avatar, { backgroundColor: withAlpha(colors.tint, 0.09) }]}>
          <Ionicons name="person" size={20} color={colors.tint} />
        </View>
        <Column flex>
          <Row gap="xs" align="center">
            <ThemedText type="defaultSemiBold">{contact.name}</ThemedText>
            {contact.isPrimary && <Badge label="Primary" tone="success" />}
          </Row>
          <ThemedText style={{ color: colors.muted, ...Typography.small }}>
            {contact.relationship}
          </ThemedText>
        </Column>
      </Row>

      <View style={styles.details}>
        <Row gap="sm" align="center">
          <Ionicons name="call" size={16} color={colors.muted} />
          <ThemedText style={{ color: colors.text }}>{contact.phone}</ThemedText>
        </Row>
        {contact.email && (
          <Row gap="sm" align="center">
            <Ionicons name="mail" size={16} color={colors.muted} />
            <ThemedText style={{ color: colors.text }}>{contact.email}</ThemedText>
          </Row>
        )}
      </View>

      {contact.canPickup && (
        <Row style={styles.flags}>
          <Row style={[styles.flagBadge, { backgroundColor: withAlpha(colors.success, 0.06) }]}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <ThemedText style={{ ...Typography.caption, color: colors.success }}>
              Can pick up
            </ThemedText>
          </Row>
        </Row>
      )}

      <Row style={[styles.actions, { borderTopColor: colors.border }]}>
        {!contact.isPrimary && (
          <Clickable onPress={onSetPrimary} style={styles.actionButton}>
            <Ionicons name="star-outline" size={18} color={colors.tint} />
            <ThemedText style={{ color: colors.tint, ...Typography.small }}>Set Primary</ThemedText>
          </Clickable>
        )}
        <Clickable onPress={onEdit} style={styles.actionButton}>
          <Ionicons name="create-outline" size={18} color={colors.tint} />
          <ThemedText style={{ color: colors.tint, ...Typography.small }}>Edit</ThemedText>
        </Clickable>
        <Clickable onPress={handleDelete} style={styles.actionButton}>
          <Ionicons name="trash-outline" size={18} color={colors.error} />
          <ThemedText style={{ color: colors.error, ...Typography.small }}>Remove</ThemedText>
        </Clickable>
      </Row>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  details: { gap: Spacing.xs, marginLeft: 56 },
  flags: { gap: Spacing.xs, marginLeft: 56 },
  flagBadge: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.pill,
  },
  actions: { borderTopWidth: 1, marginTop: Spacing.xs, paddingTop: Spacing.sm },
  actionButton: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.xxs },
});
