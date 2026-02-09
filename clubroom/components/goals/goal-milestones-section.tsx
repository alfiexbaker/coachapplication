import { useCallback } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { scaleFont } from '@/utils/scale';

interface GoalMilestonesSectionProps {
  milestones: string[];
  newMilestone: string;
  onMilestonesChange: (milestones: string[]) => void;
  onNewMilestoneChange: (value: string) => void;
}

export function GoalMilestonesSection({
  milestones,
  newMilestone,
  onMilestonesChange,
  onNewMilestoneChange,
}: GoalMilestonesSectionProps) {
  const { colors: palette } = useTheme();

  const handleAdd = useCallback(() => {
    if (!newMilestone.trim()) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onMilestonesChange([...milestones, newMilestone.trim()]);
    onNewMilestoneChange('');
  }, [newMilestone, milestones, onMilestonesChange, onNewMilestoneChange]);

  const handleRemove = useCallback((index: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onMilestonesChange(milestones.filter((_, i) => i !== index));
  }, [milestones, onMilestonesChange]);

  return (
    <View style={styles.section}>
      <ThemedText style={styles.label}>
        Milestones (Optional)
      </ThemedText>
      <ThemedText style={[styles.hint, { color: palette.muted, marginBottom: Spacing.sm }]}>
        Break your goal into smaller steps
      </ThemedText>

      {milestones.map((ms, index) => (
        <SurfaceCard key={index} style={styles.milestoneItem}>
          <View style={styles.milestoneContent}>
            <Ionicons name="flag-outline" size={16} color={palette.muted} />
            <ThemedText style={styles.milestoneText} numberOfLines={1}>
              {ms}
            </ThemedText>
          </View>
          <Clickable accessibilityLabel="Remove milestone" onPress={() => handleRemove(index)} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={palette.error} />
          </Clickable>
        </SurfaceCard>
      ))}

      <View style={styles.addRow}>
        <TextInput
          style={[
            styles.milestoneInput,
            {
              backgroundColor: palette.surface,
              color: palette.text,
              borderColor: palette.border,
            },
          ]}
          placeholder="Add a milestone..."
          placeholderTextColor={palette.muted}
          value={newMilestone}
          onChangeText={onNewMilestoneChange}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <Clickable
          accessibilityLabel="Add milestone"
          onPress={handleAdd}
          disabled={!newMilestone.trim()}
          style={[
            styles.addButton,
            {
              backgroundColor: newMilestone.trim()
                ? palette.tint
                : palette.border,
            },
          ]}
        >
          <Ionicons name="add" size={20} color={palette.onPrimary} />
        </Clickable>
      </View>

      {milestones.length === 0 && (
        <View style={[styles.tip, { backgroundColor: palette.surfaceSecondary }]}>
          <Ionicons name="bulb-outline" size={18} color={palette.warning} />
          <ThemedText style={[styles.tipText, { color: palette.muted }]}>
            Tip: Goals with milestones are 3x more likely to be achieved!
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    marginBottom: Spacing.xxs,
  },
  hint: {
    fontSize: scaleFont(13),
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  milestoneContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  milestoneText: {
    fontSize: scaleFont(14),
    flex: 1,
  },
  addRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  milestoneInput: {
    flex: 1,
    height: 44,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    fontSize: scaleFont(14),
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  tipText: {
    fontSize: scaleFont(13),
    flex: 1,
  },
});
