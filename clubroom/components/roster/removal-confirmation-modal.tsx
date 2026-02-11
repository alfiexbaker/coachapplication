import { useState } from 'react';
import { Modal, StyleSheet, TextInput, View } from 'react-native';
import { Row } from '@/components/primitives/row';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { RemovalReason } from '@/services/roster-service';
import type { MemberRemovalReason } from '@/services/club-service';
import { useTheme } from '@/hooks/useTheme';

import {
  ATHLETE_REASONS,
  MEMBER_REASONS,
  ReasonGrid,
  WarningBox,
  ArchiveToggle,
} from './removal-confirmation-sections';

type ReasonType = RemovalReason | MemberRemovalReason;

interface RemovalConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: ReasonType, customReason?: string, archive?: boolean) => void;
  type: 'athlete' | 'member';
  name: string;
  isLoading?: boolean;
}

export function RemovalConfirmationModal({
  visible,
  onClose,
  onConfirm,
  type,
  name,
  isLoading,
}: RemovalConfirmationModalProps) {
  const { colors: palette } = useTheme();

  const [selectedReason, setSelectedReason] = useState<ReasonType | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [archive, setArchive] = useState(true);

  const reasons = type === 'athlete' ? ATHLETE_REASONS : MEMBER_REASONS;
  const title = type === 'athlete' ? 'Remove from Roster' : 'Remove from Club';
  const description =
    type === 'athlete'
      ? `Are you sure you want to remove ${name} from your roster?`
      : `Are you sure you want to remove ${name} from this club?`;

  const handleConfirm = () => {
    if (!selectedReason) return;
    onConfirm(selectedReason, customReason.trim() || undefined, archive);
  };

  const handleClose = () => {
    setSelectedReason(null);
    setCustomReason('');
    setArchive(true);
    onClose();
  };

  const canConfirm = selectedReason !== null && (selectedReason !== 'OTHER' || customReason.trim());

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <View style={[styles.overlay, { backgroundColor: withAlpha(palette.text, 0.5) }]}>
        <SurfaceCard style={styles.modalCard}>
          {/* Header */}
          <Row align="start" gap="md">
            <View
              style={[styles.iconContainer, { backgroundColor: withAlpha(palette.error, 0.09) }]}
            >
              <Ionicons name="person-remove-outline" size={24} color={palette.error} />
            </View>
            <View style={styles.headerText}>
              <ThemedText type="subtitle">{title}</ThemedText>
              <ThemedText style={{ color: palette.muted }}>{description}</ThemedText>
            </View>
            <Clickable accessibilityLabel="Close" onPress={handleClose}>
              <Ionicons name="close" size={24} color={palette.icon} />
            </Clickable>
          </Row>

          {/* Reason Selection */}
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold">Reason for removal</ThemedText>
            <ReasonGrid
              reasons={reasons}
              selectedReason={selectedReason}
              onSelect={(reason) => setSelectedReason(reason)}
            />
          </View>

          {/* Custom Reason Input */}
          {selectedReason === 'OTHER' && (
            <View style={styles.section}>
              <ThemedText type="defaultSemiBold">Please specify</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: palette.background,
                    color: palette.text,
                    borderColor: palette.border,
                  },
                ]}
                placeholder="Enter reason..."
                placeholderTextColor={palette.muted}
                value={customReason}
                onChangeText={setCustomReason}
                multiline
                numberOfLines={2}
              />
            </View>
          )}

          {/* Archive Option */}
          {type === 'athlete' && <ArchiveToggle archive={archive} onToggle={setArchive} />}

          {/* Warning */}
          <WarningBox archive={archive} />

          {/* Actions */}
          <Row gap="sm" style={styles.actions}>
            <Clickable onPress={handleClose} style={styles.actionButton}>
              <View style={[styles.cancelButton, { borderColor: palette.border }]}>
                <ThemedText style={{ fontWeight: '600' }}>Cancel</ThemedText>
              </View>
            </Clickable>
            <Clickable
              onPress={handleConfirm}
              style={styles.actionButton}
              disabled={!canConfirm || isLoading}
            >
              <View
                style={[
                  styles.confirmButton,
                  {
                    backgroundColor: canConfirm && !isLoading ? palette.error : palette.border,
                  },
                ]}
              >
                <ThemedText style={{ color: palette.onPrimary, fontWeight: '700' }}>
                  {isLoading ? 'Removing...' : 'Remove'}
                </ThemedText>
              </View>
            </Clickable>
          </Row>
        </SurfaceCard>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: Spacing.xxs,
  },
  section: {
    gap: Spacing.sm,
  },
  input: {
    ...Typography.body,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  actions: {
    marginTop: Spacing.xs,
  },
  actionButton: {
    flex: 1,
  },
  cancelButton: {
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  confirmButton: {
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    alignItems: 'center',
  },
});
