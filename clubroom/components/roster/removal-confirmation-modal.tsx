import { useState } from 'react';
import { Modal, StyleSheet, TextInput, View, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { RemovalReason } from '@/services/roster-service';
import type { MemberRemovalReason } from '@/services/club-service';

type ReasonType = RemovalReason | MemberRemovalReason;

interface RemovalConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: ReasonType, customReason?: string, archive?: boolean) => void;
  type: 'athlete' | 'member';
  name: string;
  isLoading?: boolean;
}

const ATHLETE_REASONS: { value: RemovalReason; label: string; icon: string }[] = [
  { value: 'GRADUATED', label: 'Graduated', icon: 'school-outline' },
  { value: 'MOVED', label: 'Moved away', icon: 'airplane-outline' },
  { value: 'INACTIVE', label: 'Inactive', icon: 'time-outline' },
  { value: 'OTHER', label: 'Other', icon: 'ellipsis-horizontal' },
];

const MEMBER_REASONS: { value: MemberRemovalReason; label: string; icon: string }[] = [
  { value: 'LEFT_CLUB', label: 'Left club', icon: 'exit-outline' },
  { value: 'INACTIVE', label: 'Inactive', icon: 'time-outline' },
  { value: 'CONDUCT', label: 'Conduct issue', icon: 'warning-outline' },
  { value: 'SEASON_END', label: 'Season ended', icon: 'calendar-outline' },
  { value: 'OTHER', label: 'Other', icon: 'ellipsis-horizontal' },
];

export function RemovalConfirmationModal({
  visible,
  onClose,
  onConfirm,
  type,
  name,
  isLoading,
}: RemovalConfirmationModalProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [selectedReason, setSelectedReason] = useState<ReasonType | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [archive, setArchive] = useState(true);

  const reasons = type === 'athlete' ? ATHLETE_REASONS : MEMBER_REASONS;
  const title = type === 'athlete' ? 'Remove from Roster' : 'Remove from Club';
  const description = type === 'athlete'
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
      <View style={styles.overlay}>
        <SurfaceCard style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: `${palette.error}15` }]}>
              <Ionicons name="person-remove-outline" size={24} color={palette.error} />
            </View>
            <View style={styles.headerText}>
              <ThemedText type="subtitle">{title}</ThemedText>
              <ThemedText style={{ color: palette.muted }}>{description}</ThemedText>
            </View>
            <Clickable onPress={handleClose}>
              <Ionicons name="close" size={24} color={palette.icon} />
            </Clickable>
          </View>

          {/* Reason Selection */}
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold">Reason for removal</ThemedText>
            <View style={styles.reasonGrid}>
              {reasons.map((reason) => {
                const isSelected = selectedReason === reason.value;
                return (
                  <Clickable
                    key={reason.value}
                    onPress={() => setSelectedReason(reason.value as ReasonType)}
                  >
                    <View
                      style={[
                        styles.reasonCard,
                        {
                          borderColor: isSelected ? palette.tint : palette.border,
                          backgroundColor: isSelected ? `${palette.tint}10` : palette.surface,
                        },
                      ]}
                    >
                      <Ionicons
                        name={reason.icon as any}
                        size={20}
                        color={isSelected ? palette.tint : palette.icon}
                      />
                      <ThemedText
                        style={[
                          styles.reasonLabel,
                          { color: isSelected ? palette.tint : palette.text },
                        ]}
                      >
                        {reason.label}
                      </ThemedText>
                    </View>
                  </Clickable>
                );
              })}
            </View>
          </View>

          {/* Custom Reason Input */}
          {selectedReason === 'OTHER' && (
            <View style={styles.section}>
              <ThemedText type="defaultSemiBold">Please specify</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: palette.background, color: palette.text, borderColor: palette.border },
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
          {type === 'athlete' && (
            <View style={[styles.archiveRow, { borderColor: palette.border }]}>
              <View style={styles.archiveInfo}>
                <ThemedText type="defaultSemiBold">Keep history</ThemedText>
                <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
                  Archive session history and notes for records
                </ThemedText>
              </View>
              <Switch
                value={archive}
                onValueChange={setArchive}
                trackColor={{ false: palette.border, true: palette.tint }}
                thumbColor={archive ? palette.background : palette.surface}
              />
            </View>
          )}

          {/* Warning */}
          <View style={[styles.warningBox, { backgroundColor: `${palette.warning}10`, borderColor: palette.warning }]}>
            <Ionicons name="information-circle" size={18} color={palette.warning} />
            <ThemedText style={{ color: palette.warning, flex: 1, fontSize: 13 }}>
              {archive
                ? 'This will remove them from active roster but keep their history.'
                : 'This action cannot be undone. All data will be permanently deleted.'}
            </ThemedText>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
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
                <ThemedText style={{ color: '#FFFFFF', fontWeight: '700' }}>
                  {isLoading ? 'Removing...' : 'Remove'}
                </ThemedText>
              </View>
            </Clickable>
          </View>
        </SurfaceCard>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  section: {
    gap: Spacing.sm,
  },
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  reasonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  archiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  archiveInfo: {
    flex: 1,
    gap: 2,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
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
