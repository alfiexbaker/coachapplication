import React, { memo } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { ClubSquad } from '@/constants/types';

interface SquadInfoCardProps {
  squad: ClubSquad;
  members: { length: number };
  isEditing: boolean;
  editName: string;
  colors: ThemeColors;
  onEditNameChange: (text: string) => void;
  onSaveName: () => void;
  onCancelEdit: () => void;
  onStartEdit: () => void;
}

export const SquadInfoCard = memo(function SquadInfoCard({
  squad, members, isEditing, editName, colors,
  onEditNameChange, onSaveName, onCancelEdit, onStartEdit,
}: SquadInfoCardProps) {
  return (
    <SurfaceCard style={styles.card}>
      <View style={[styles.banner, { backgroundColor: withAlpha(colors.tint, 0.03) }]}>
        <View style={[styles.icon, { backgroundColor: withAlpha(colors.tint, 0.09) }]}>
          <Ionicons name="people" size={28} color={colors.tint} />
        </View>
        {isEditing ? (
          <View style={styles.editContainer}>
            <TextInput
              style={[styles.nameInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              value={editName}
              onChangeText={onEditNameChange}
              autoFocus
              selectTextOnFocus
            />
            <Row gap="xs">
              <Clickable style={[styles.editBtn, { backgroundColor: colors.tint }]} onPress={onSaveName}>
                <Ionicons name="checkmark" size={18} color={colors.surface} />
              </Clickable>
              <Clickable accessibilityLabel="Close" style={[styles.editBtn, { backgroundColor: colors.border }]} onPress={onCancelEdit}>
                <Ionicons name="close" size={18} color={colors.muted} />
              </Clickable>
            </Row>
          </View>
        ) : (
          <Row gap="sm" align="center" style={{ flex: 1 }}>
            <View style={{ flex: 1 }}>
              <ThemedText type="title" style={Typography.title}>{squad.name}</ThemedText>
              <ThemedText style={[Typography.small, { color: colors.muted }]}>{squad.level} -- {squad.primaryCoach}</ThemedText>
            </View>
            <Clickable onPress={onStartEdit} hitSlop={8}>
              <Ionicons name="pencil-outline" size={18} color={colors.muted} />
            </Clickable>
          </Row>
        )}
      </View>

      <Row style={styles.statsRow}>
        <View style={styles.statItem}>
          <ThemedText type="title" style={Typography.title}>{members.length}</ThemedText>
          <ThemedText style={[Typography.caption, { color: colors.muted }]}>Members</ThemedText>
        </View>
        {squad.meetLocation && (
          <View style={[styles.statItem, { borderLeftWidth: 1, borderLeftColor: colors.border }]}>
            <Ionicons name="location-outline" size={20} color={colors.tint} />
            <ThemedText style={[Typography.caption, { color: colors.muted }]}>{squad.meetLocation}</ThemedText>
          </View>
        )}
      </Row>

      {squad.tags && squad.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {squad.tags.map((tag, idx) => (
            <View key={idx} style={[styles.tag, { backgroundColor: withAlpha(colors.tint, 0.06) }]}>
              <ThemedText style={[Typography.caption, { color: colors.tint }]}>{tag}</ThemedText>
            </View>
          ))}
        </View>
      )}
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  banner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: Radii.md },
  icon: { width: 56, height: 56, borderRadius: Radii['2xl'], alignItems: 'center', justifyContent: 'center' },
  editContainer: { flex: 1, gap: Spacing.xs },
  nameInput: { borderWidth: 1, borderRadius: Radii.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, ...Typography.subheading },
  editBtn: { width: 32, height: 32, borderRadius: Radii.lg, alignItems: 'center', justifyContent: 'center' },
  statsRow: { paddingVertical: Spacing.sm },
  statItem: { flex: 1, alignItems: 'center', gap: Spacing.xxs },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  tag: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.pill },
});
