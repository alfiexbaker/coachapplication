import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, withAlpha } from '@/constants/theme';
import type { GroupType } from '@/constants/types';
import { scaleFont } from '@/utils/scale';
import type { ThemeColors } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GroupTypeOption {
  value: GroupType;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const GROUP_TYPE_OPTIONS: GroupTypeOption[] = [
  { value: 'GENERAL', label: 'General', description: 'A general discussion group for parents', icon: 'chatbubbles-outline' },
  { value: 'CLUB', label: 'Club', description: 'For parents of a specific club or team', icon: 'football-outline' },
  { value: 'SESSION', label: 'Session', description: 'For parents attending the same sessions', icon: 'calendar-outline' },
  { value: 'CARPOOL', label: 'Carpool', description: 'Coordinate rides to training and matches', icon: 'car-outline' },
];

// ─── GroupTypeSelector ──────────────────────────────────────────────────────

type GroupTypeSelectorProps = {
  selected: GroupType;
  onSelect: (type: GroupType) => void;
  disabled?: boolean;
  palette: ThemeColors;
};

export const GroupTypeSelector = memo(function GroupTypeSelector({
  selected,
  onSelect,
  disabled,
  palette,
}: GroupTypeSelectorProps) {
  return (
    <Row style={styles.typeOptions}>
      {GROUP_TYPE_OPTIONS.map((option) => (
        <SurfaceCard
          key={option.value}
          style={[styles.typeOption, selected === option.value ? { borderColor: palette.tint, borderWidth: 2 } : undefined]}
          onPress={() => onSelect(option.value)}
          tactile={!disabled}
        >
          <View style={[styles.typeIconContainer, { backgroundColor: selected === option.value ? withAlpha(palette.tint, 0.09) : palette.surfaceSecondary }]}>
            <Ionicons name={option.icon} size={24} color={selected === option.value ? palette.tint : palette.icon} />
          </View>
          <ThemedText type="defaultSemiBold" style={[styles.typeLabel, selected === option.value ? { color: palette.tint } : undefined]}>
            {option.label}
          </ThemedText>
          <ThemedText style={[styles.typeDescription, { color: palette.muted }]} numberOfLines={2}>
            {option.description}
          </ThemedText>
        </SurfaceCard>
      ))}
    </Row>
  );
});

// ─── PrivacySelector ────────────────────────────────────────────────────────

type PrivacySelectorProps = {
  isPublic: boolean;
  onToggle: (isPublic: boolean) => void;
  disabled?: boolean;
  palette: ThemeColors;
};

export const PrivacySelector = memo(function PrivacySelector({
  isPublic,
  onToggle,
  disabled,
  palette,
}: PrivacySelectorProps) {
  return (
    <View style={styles.privacyOptions}>
      <Clickable
        style={[styles.privacyOption, { backgroundColor: isPublic ? withAlpha(palette.tint, 0.09) : palette.surface, borderColor: isPublic ? palette.tint : palette.border }]}
        onPress={() => onToggle(true)}
        disabled={disabled}
      >
        <Ionicons name="globe-outline" size={22} color={isPublic ? palette.tint : palette.icon} />
        <View style={styles.privacyTextContainer}>
          <ThemedText type="defaultSemiBold" style={[styles.privacyLabel, isPublic ? { color: palette.tint } : undefined]}>Public</ThemedText>
          <ThemedText style={[styles.privacyDescription, { color: palette.muted }]}>Anyone can join</ThemedText>
        </View>
        {isPublic && <Ionicons name="checkmark-circle" size={22} color={palette.tint} />}
      </Clickable>

      <Clickable
        style={[styles.privacyOption, { backgroundColor: !isPublic ? withAlpha(palette.tint, 0.09) : palette.surface, borderColor: !isPublic ? palette.tint : palette.border }]}
        onPress={() => onToggle(false)}
        disabled={disabled}
      >
        <Ionicons name="lock-closed-outline" size={22} color={!isPublic ? palette.tint : palette.icon} />
        <View style={styles.privacyTextContainer}>
          <ThemedText type="defaultSemiBold" style={[styles.privacyLabel, !isPublic ? { color: palette.tint } : undefined]}>Private</ThemedText>
          <ThemedText style={[styles.privacyDescription, { color: palette.muted }]}>Invite only</ThemedText>
        </View>
        {!isPublic && <Ionicons name="checkmark-circle" size={22} color={palette.tint} />}
      </Clickable>
    </View>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  typeOptions: { flexWrap: 'wrap', gap: Spacing.sm },
  typeOption: { width: '47%', padding: Spacing.sm, gap: 8, alignItems: 'center' },
  typeIconContainer: { width: 48, height: 48, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  typeLabel: { fontSize: scaleFont(14), textAlign: 'center' },
  typeDescription: { fontSize: scaleFont(11), textAlign: 'center', lineHeight: scaleFont(15) },
  privacyOptions: { gap: Spacing.sm },
  privacyOption: { alignItems: 'center', padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1, gap: Spacing.sm },
  privacyTextContainer: { flex: 1, gap: Spacing.micro },
  privacyLabel: { fontSize: scaleFont(15) },
  privacyDescription: { fontSize: scaleFont(12) },
});
