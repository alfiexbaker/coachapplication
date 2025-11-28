import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { badgeService } from '@/services/badge-service';
import { BadgeAward, BadgeDefinition } from '@/constants/types';
import { Clickable } from '@/components/primitives/clickable';
import { createLogger } from '@/utils/logger';

const REASONS = ['Leadership', 'Consistency', 'Technique', 'Mindset'];

interface BadgeAwardModalProps {
  visible: boolean;
  athleteId: string;
  athleteName: string;
  coachId: string;
  coachName?: string;
  sessionId?: string;
  onClose: () => void;
  onAwarded?: (award: BadgeAward) => void;
}

const logger = createLogger('BadgeAwardModal');

export function BadgeAwardModal({
  visible,
  onClose,
  athleteId,
  athleteName,
  coachId,
  coachName,
  sessionId,
  onAwarded,
}: BadgeAwardModalProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [definitions, setDefinitions] = useState<BadgeDefinition[]>([]);
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>(REASONS[0]);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!visible) return;

    badgeService.listDefinitions().then((defs) => {
      setDefinitions(defs);
      setSelectedBadgeId(defs[0]?.id ?? null);
    });
    setSelectedReason(REASONS[0]);
    setNote('');
    logger.info('badge_award_opened', { athleteId, sessionId, coachId });
  }, [athleteId, coachId, sessionId, visible]);

  const handleSubmit = async () => {
    if (!selectedBadgeId) return;

    const award = await badgeService.awardBadge({
      badgeId: selectedBadgeId,
      athleteId,
      athleteName,
      coachId,
      coachName,
      sessionId,
      reason: selectedReason,
      note,
      visibility: 'supporters',
    });
    onAwarded?.(award);
    logger.info('badge_award_submitted', {
      athleteId,
      sessionId,
      badgeId: selectedBadgeId,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: `${palette.overlay}99` }]}>        
        <SurfaceCard style={styles.modalCard}>
          <View style={styles.headerRow}>
            <View style={styles.titleRow}>
              <Ionicons name="ribbon" size={20} color={palette.tint} />
              <ThemedText type="subtitle">Award badge</ThemedText>
            </View>
            <Clickable onPress={onClose}>
              <Ionicons name="close" size={22} color={palette.icon} />
            </Clickable>
          </View>

          <ScrollView contentContainerStyle={{ gap: Spacing.md }}>
            <View style={{ gap: Spacing.xs }}>
              <ThemedText type="defaultSemiBold">Select badge</ThemedText>
              <View style={styles.optionRow}>
                {definitions.map((badge) => (
                  <Clickable key={badge.id} onPress={() => setSelectedBadgeId(badge.id)}>
                    <View
                      style={[
                        styles.badgeOption,
                        {
                          borderColor: palette.border,
                          backgroundColor:
                            selectedBadgeId === badge.id ? `${palette.tint}12` : palette.surface,
                        },
                      ]}
                    >
                      <ThemedText style={{ fontWeight: '600' }}>{badge.label}</ThemedText>
                    </View>
                  </Clickable>
                ))}
              </View>
            </View>

            <View style={{ gap: Spacing.xs }}>
              <ThemedText type="defaultSemiBold">Reason</ThemedText>
              <View style={styles.optionRow}>
                {REASONS.map((reason) => (
                  <Clickable key={reason} onPress={() => setSelectedReason(reason)}>
                    <View
                      style={[
                        styles.reasonChip,
                        {
                          backgroundColor:
                            selectedReason === reason ? `${palette.tint}15` : palette.surface,
                          borderColor: selectedReason === reason ? palette.tint : palette.border,
                        },
                      ]}
                    >
                      <ThemedText style={{ color: palette.text }}>{reason}</ThemedText>
                    </View>
                  </Clickable>
                ))}
              </View>
            </View>

            <View style={{ gap: Spacing.xs }}>
              <ThemedText type="defaultSemiBold">Optional note</ThemedText>
              <SurfaceCard style={[styles.noteInput, { borderColor: palette.border }]} tactile={false}>
                <TextInput
                  placeholder="Add context for parents and supporters"
                  placeholderTextColor={palette.muted}
                  value={note}
                  onChangeText={setNote}
                  multiline
                  style={{ color: palette.text }}
                />
              </SurfaceCard>
            </View>

            <View style={styles.footerRow}>
              <Clickable onPress={onClose}>
                <View style={[styles.secondaryButton, { borderColor: palette.border }]}>
                  <ThemedText style={{ color: palette.text }}>Cancel</ThemedText>
                </View>
              </Clickable>
              <Clickable onPress={handleSubmit}>
                <View style={[styles.primaryButton, { backgroundColor: palette.tint }]}>
                  <ThemedText style={{ color: palette.background, fontWeight: '700' }}>
                    Award badge
                  </ThemedText>
                </View>
              </Clickable>
            </View>
          </ScrollView>
        </SurfaceCard>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxHeight: '80%',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  badgeOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.card,
    borderWidth: 1,
  },
  reasonChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.rounded,
    borderWidth: 1,
  },
  noteInput: {
    padding: Spacing.sm,
    borderWidth: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  secondaryButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.card,
    borderWidth: 1,
  },
  primaryButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.card,
  },
});
