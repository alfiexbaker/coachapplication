import { memo } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, Components, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ClubMenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color: string;
}

interface ClubHeaderMenuProps {
  visible: boolean;
  clubName: string;
  inviteCode?: string;
  canShareInvite: boolean;
  menuItems: ClubMenuItem[];
  onClose: () => void;
  onShareInvite: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const ClubHeaderMenu = memo(function ClubHeaderMenu({
  visible,
  clubName,
  inviteCode,
  canShareInvite,
  menuItems,
  onClose,
  onShareInvite,
}: ClubHeaderMenuProps) {
  const { colors: palette } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Clickable
          style={[styles.modalOverlay, { backgroundColor: withAlpha(palette.text, 0.5) }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close club menu"
        />
        <View
          onStartShouldSetResponder={() => true}
          style={[styles.menuContainer, { backgroundColor: palette.surface }]}
        >
          <Row style={styles.menuHeader}>
            <ThemedText type="defaultSemiBold">{clubName}</ThemedText>
            <Clickable accessibilityLabel="Close" onPress={onClose}>
              <Ionicons name="close" size={24} color={palette.muted} />
            </Clickable>
          </Row>

          {/* Invite Code Display */}
          {canShareInvite && inviteCode && (
            <Row
              style={[
                styles.inviteCodeSection,
                {
                  backgroundColor: withAlpha(palette.tint, 0.06),
                  borderColor: withAlpha(palette.tint, 0.19),
                },
              ]}
            >
              <View>
                <ThemedText style={{ ...Typography.caption, color: palette.muted }}>
                  Invite Code
                </ThemedText>
                <ThemedText
                  type="defaultSemiBold"
                  style={{ ...Typography.heading, color: palette.tint, letterSpacing: 2 }}
                >
                  {inviteCode}
                </ThemedText>
              </View>
              <Clickable
                style={[styles.copyButton, { backgroundColor: palette.tint }]}
                onPress={onShareInvite}
              >
                <Ionicons name="share-outline" size={16} color={palette.onPrimary} />
                <ThemedText style={{ ...Typography.smallSemiBold, color: palette.onPrimary }}>
                  Share
                </ThemedText>
              </Clickable>
            </Row>
          )}

          {/* Menu Items */}
          <View style={styles.menuItems}>
            {menuItems.map((item, index) => (
              <Clickable key={index} style={styles.menuItem} onPress={item.onPress}>
                <Ionicons name={item.icon} size={20} color={item.color} />
                <ThemedText style={{ color: item.color, flex: 1 }}>{item.label}</ThemedText>
                <Ionicons name="chevron-forward" size={16} color={palette.muted} />
              </Clickable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalOverlay: { ...StyleSheet.absoluteFillObject },
  menuContainer: {
    borderTopLeftRadius: Components.modal.borderRadius,
    borderTopRightRadius: Components.modal.borderRadius,
    padding: Components.modal.padding,
    paddingBottom: Spacing.xl + 20,
  },
  menuHeader: { justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  inviteCodeSection: {
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Components.modal.padding,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  copyButton: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  menuItems: { gap: Spacing.xs },
  menuItem: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
});
