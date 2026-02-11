import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { ClubMember } from '@/services/club-service';

interface SquadDangerZoneProps {
  squadName: string;
  showDeleteConfirm: boolean;
  deleting: boolean;
  colors: ThemeColors;
  onDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

export const SquadDangerZone = memo(function SquadDangerZone({
  squadName,
  showDeleteConfirm,
  deleting,
  colors,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
}: SquadDangerZoneProps) {
  return (
    <SurfaceCard style={[styles.card, { borderColor: withAlpha(colors.error, 0.19) }]}>
      {showDeleteConfirm ? (
        <View style={styles.confirmContent}>
          <Row
            align="center"
            gap="xs"
            style={[styles.warning, { backgroundColor: withAlpha(colors.error, 0.06) }]}
          >
            <Ionicons name="warning-outline" size={18} color={colors.error} />
            <ThemedText style={[Typography.bodySmall, { color: colors.error, flex: 1 }]}>
              Delete {squadName}? This cannot be undone.
            </ThemedText>
          </Row>
          <Clickable
            style={[styles.deleteBtn, { backgroundColor: colors.error, borderColor: colors.error }]}
            onPress={onConfirmDelete}
            disabled={deleting}
          >
            <Row align="center" justify="center" gap="sm">
              <Ionicons name="trash-outline" size={18} color={colors.onPrimary} />
              <ThemedText style={[Typography.bodySemiBold, { color: colors.onPrimary }]}>
                {deleting ? 'Deleting...' : 'Yes, Delete Squad'}
              </ThemedText>
            </Row>
          </Clickable>
          <Clickable style={styles.cancelBtn} onPress={onCancelDelete} disabled={deleting}>
            <ThemedText style={[Typography.bodySmall, { color: colors.muted }]}>Cancel</ThemedText>
          </Clickable>
        </View>
      ) : (
        <Clickable style={[styles.deleteBtn, { borderColor: colors.error }]} onPress={onDelete}>
          <Row align="center" justify="center" gap="sm">
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <ThemedText style={[Typography.bodySemiBold, { color: colors.error }]}>
              Delete Squad
            </ThemedText>
          </Row>
        </Clickable>
      )}
    </SurfaceCard>
  );
});

interface RemoveMemberOverlayProps {
  member: ClubMember | null;
  squadName: string;
  colors: ThemeColors;
  onConfirm: () => void;
  onCancel: () => void;
}

export const RemoveMemberOverlay = memo(function RemoveMemberOverlay({
  member,
  squadName,
  colors,
  onConfirm,
  onCancel,
}: RemoveMemberOverlayProps) {
  if (!member) return null;
  return (
    <View style={[styles.overlay, { backgroundColor: withAlpha(colors.text, 0.4) }]}>
      <SurfaceCard style={styles.overlayCard}>
        <ThemedText type="subtitle">Remove Member</ThemedText>
        <ThemedText style={[Typography.body, { color: colors.muted }]}>
          Remove {member.userName} from {squadName}?
        </ThemedText>
        <Clickable
          style={[styles.deleteBtn, { backgroundColor: colors.error, borderColor: colors.error }]}
          onPress={onConfirm}
        >
          <Row align="center" justify="center" gap="sm">
            <Ionicons name="person-remove-outline" size={18} color={colors.onPrimary} />
            <ThemedText style={[Typography.bodySemiBold, { color: colors.onPrimary }]}>
              Remove
            </ThemedText>
          </Row>
        </Clickable>
        <Clickable style={styles.cancelBtn} onPress={onCancel}>
          <ThemedText style={[Typography.bodySmall, { color: colors.muted }]}>Cancel</ThemedText>
        </Clickable>
      </SurfaceCard>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  confirmContent: { gap: Spacing.sm },
  warning: { padding: Spacing.md, borderRadius: Radii.md },
  deleteBtn: { minHeight: 48, paddingVertical: Spacing.sm, borderRadius: Radii.md, borderWidth: 1 },
  cancelBtn: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  overlayCard: { width: '100%', maxWidth: 340, gap: Spacing.sm, padding: Spacing.lg },
});
