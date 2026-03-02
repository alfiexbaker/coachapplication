import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { SessionOwnershipTimelineEntry } from '@/hooks/use-session-detail-modal';

interface OwnershipAssigneeOption {
  id: string;
  label: string;
  role: string;
}

interface SessionOwnershipSectionProps {
  actingAs?: 'self' | 'club';
  clubLabel?: string;
  ownerCoachName: string;
  canReassign: boolean;
  assigneeOptions: OwnershipAssigneeOption[];
  selectedAssigneeId: string | null;
  onSelectAssignee: (id: string) => void;
  onReassign: () => void;
  reassigning: boolean;
  timeline: SessionOwnershipTimelineEntry[];
}

function SessionOwnershipSectionInner({
  actingAs,
  clubLabel,
  ownerCoachName,
  canReassign,
  assigneeOptions,
  selectedAssigneeId,
  onSelectAssignee,
  onReassign,
  reassigning,
  timeline,
}: SessionOwnershipSectionProps) {
  const { colors: palette } = useTheme();
  const ownershipLabel = actingAs === 'club' ? 'Club-owned' : 'Self-owned';

  return (
    <SurfaceCard style={styles.card}>
      <Row align="center" gap="sm">
        <View style={[styles.iconCircle, { backgroundColor: withAlpha(palette.info, 0.12) }]}>
          <Ionicons name="briefcase-outline" size={18} color={palette.info} />
        </View>
        <ThemedText type="defaultSemiBold">Ownership</ThemedText>
      </Row>

      <Column gap="xxs">
        <ThemedText style={[styles.metaText, { color: palette.muted }]}>Mode</ThemedText>
        <ThemedText style={styles.metaValue}>{ownershipLabel}</ThemedText>
        {clubLabel ? (
          <ThemedText style={[styles.metaSubtext, { color: palette.muted }]}>Club: {clubLabel}</ThemedText>
        ) : null}
      </Column>

      <Column gap="xxs">
        <ThemedText style={[styles.metaText, { color: palette.muted }]}>Current owner</ThemedText>
        <ThemedText style={styles.metaValue}>{ownerCoachName}</ThemedText>
      </Column>

      {canReassign && (
        <Column gap="sm">
          <ThemedText style={[styles.metaText, { color: palette.muted }]}>Reassign owner</ThemedText>
          <Row wrap gap="xs">
            {assigneeOptions.map((option) => {
              const selected = option.id === selectedAssigneeId;
              return (
                <Clickable
                  key={option.id}
                  onPress={() => onSelectAssignee(option.id)}
                  style={[
                    styles.assigneeChip,
                    {
                      borderColor: selected ? palette.tint : palette.border,
                      backgroundColor: selected ? withAlpha(palette.tint, 0.08) : palette.surface,
                    },
                  ]}
                >
                  <ThemedText style={{ color: selected ? palette.tint : palette.text, ...Typography.smallSemiBold }}>
                    {option.label}
                  </ThemedText>
                  <ThemedText style={[styles.metaSubtext, { color: palette.muted }]}>
                    {option.role.replace('_', ' ')}
                  </ThemedText>
                </Clickable>
              );
            })}
          </Row>
          <Clickable
            onPress={onReassign}
            disabled={reassigning || !selectedAssigneeId}
            style={[
              styles.reassignButton,
              {
                backgroundColor: reassigning || !selectedAssigneeId ? palette.border : palette.tint,
                opacity: reassigning || !selectedAssigneeId ? 0.7 : 1,
              },
            ]}
            accessibilityLabel="Reassign session owner"
          >
            <ThemedText style={[styles.reassignButtonText, { color: palette.onPrimary }]}>
              {reassigning ? 'Reassigning...' : 'Reassign session owner'}
            </ThemedText>
          </Clickable>
        </Column>
      )}

      <Column gap="xs">
        <ThemedText type="defaultSemiBold">Audit timeline</ThemedText>
        <View style={[styles.timeline, { borderColor: palette.border }]}> 
          {timeline.map((entry) => (
            <Row key={entry.id} align="flex-start" gap="sm" style={styles.timelineRow}>
              <View style={[styles.timelineDot, { backgroundColor: palette.info }]} />
              <Column gap="xxs" style={styles.timelineContent}>
                <ThemedText style={styles.timelineTitle}>{entry.title}</ThemedText>
                {entry.meta ? (
                  <ThemedText style={[styles.metaSubtext, { color: palette.muted }]}>
                    {entry.meta}
                  </ThemedText>
                ) : null}
                <ThemedText style={[styles.metaSubtext, { color: palette.muted }]}>
                  {entry.timestampLabel}
                </ThemedText>
              </Column>
            </Row>
          ))}
        </View>
      </Column>
    </SurfaceCard>
  );
}

export const SessionOwnershipSection = memo(SessionOwnershipSectionInner);

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaText: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: '600',
  },
  metaValue: {
    ...Typography.bodySemiBold,
  },
  metaSubtext: {
    ...Typography.caption,
  },
  assigneeChip: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    minWidth: 126,
    gap: Spacing.micro,
  },
  reassignButton: {
    minHeight: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  reassignButtonText: {
    ...Typography.bodySmallSemiBold,
  },
  timeline: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  timelineRow: {
    minHeight: 34,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.pill,
    marginTop: 6,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
});
