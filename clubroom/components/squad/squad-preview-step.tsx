/**
 * SquadPreviewStep — Step 2: Preview members and exclude individuals.
 */
import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Row } from '@/components/primitives/row';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { SquadInvitePreview } from '@/services/invite';

interface SquadPreviewStepProps {
  preview: SquadInvitePreview[];
  excludedMemberIds: string[];
  totalMembers: number;
  totalParents: number;
  onToggleMemberExclusion: (athleteId: string) => void;
}

function SquadPreviewStepInner({
  preview,
  excludedMemberIds,
  totalMembers,
  totalParents,
  onToggleMemberExclusion,
}: SquadPreviewStepProps) {
  const { colors: palette } = useTheme();

  return (
    <Animated.View entering={FadeInDown.springify()} style={styles.content}>
      <ThemedText type="subtitle">Preview Invites</ThemedText>
      <ThemedText style={[styles.description, { color: palette.muted }]}>
        Review who will be invited. Tap to exclude specific athletes.
      </ThemedText>

      <Row
        align="center"
        justify="center"
        style={[styles.summary, { backgroundColor: withAlpha(palette.tint, 0.06) }]}
      >
        <View style={styles.summaryItem}>
          <ThemedText type="title" style={{ color: palette.tint }}>
            {totalMembers}
          </ThemedText>
          <ThemedText style={{ ...Typography.caption, color: palette.tint }}>Athletes</ThemedText>
        </View>
        <View style={[styles.divider, { backgroundColor: palette.tint }]} />
        <View style={styles.summaryItem}>
          <ThemedText type="title" style={{ color: palette.tint }}>
            {totalParents}
          </ThemedText>
          <ThemedText style={{ ...Typography.caption, color: palette.tint }}>
            Notifications
          </ThemedText>
        </View>
      </Row>

      {preview.map((sp) => (
        <SurfaceCard key={sp.squadId} style={styles.previewCard}>
          <Row align="center" gap="sm">
            <Ionicons name="people" size={18} color={palette.tint} />
            <ThemedText type="defaultSemiBold" style={{ flex: 1 }}>
              {sp.squadName}
            </ThemedText>
            <ThemedText style={{ ...Typography.caption, color: palette.muted }}>
              {sp.memberCount} athletes
            </ThemedText>
          </Row>
          <View style={styles.memberList}>
            {sp.members.map((member) => {
              const isExcluded = excludedMemberIds.includes(member.athleteId);
              return (
                <Clickable
                  key={member.athleteId}
                  onPress={() => onToggleMemberExclusion(member.athleteId)}
                  accessibilityLabel={`${isExcluded ? 'Include' : 'Exclude'} ${member.athleteName}`}
                  style={[
                    styles.memberItem,
                    {
                      backgroundColor: isExcluded ? palette.surface : 'transparent',
                      opacity: isExcluded ? 0.5 : 1,
                    },
                  ]}
                >
                  <Row align="center">
                    <View style={styles.memberInfo}>
                      <Row align="center" gap="xs">
                        <ThemedText
                          style={[
                            { ...Typography.bodySmall },
                            isExcluded ? { textDecorationLine: 'line-through' } : undefined,
                          ]}
                        >
                          {member.athleteName}
                        </ThemedText>
                        {member.athleteAge && (
                          <ThemedText style={{ ...Typography.caption, color: palette.muted }}>
                            Age {member.athleteAge}
                          </ThemedText>
                        )}
                      </Row>
                      <ThemedText style={{ ...Typography.caption, color: palette.muted }}>
                        {member.parentName}
                      </ThemedText>
                    </View>
                    <Ionicons
                      name={isExcluded ? 'close-circle' : 'checkmark-circle'}
                      size={20}
                      color={isExcluded ? palette.error : palette.tint}
                    />
                  </Row>
                </Clickable>
              );
            })}
          </View>
        </SurfaceCard>
      ))}

      {excludedMemberIds.length > 0 && (
        <Row
          align="center"
          gap="sm"
          style={[styles.excludedNote, { backgroundColor: withAlpha(palette.warning, 0.06) }]}
        >
          <Ionicons name="information-circle" size={16} color={palette.warning} />
          <ThemedText style={{ ...Typography.caption, color: palette.warning, flex: 1 }}>
            {excludedMemberIds.length} athlete{excludedMemberIds.length !== 1 ? 's' : ''} excluded
            from invite
          </ThemedText>
        </Row>
      )}
    </Animated.View>
  );
}

export const SquadPreviewStep = memo(SquadPreviewStepInner);

const styles = StyleSheet.create({
  content: { gap: Spacing.md },
  description: { ...Typography.bodySmall, marginBottom: Spacing.sm },
  summary: { padding: Spacing.md, borderRadius: Radii.md },
  summaryItem: { alignItems: 'center', paddingHorizontal: Spacing.lg },
  divider: { width: 1, height: 30, opacity: 0.3 },
  previewCard: { gap: Spacing.sm },
  previewHeader: {},
  memberList: { gap: Spacing.xs },
  memberItem: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.sm,
  },
  memberInfo: { flex: 1, gap: 1 },
  memberNameRow: {},
  excludedNote: { padding: Spacing.sm, borderRadius: Radii.md },
});
