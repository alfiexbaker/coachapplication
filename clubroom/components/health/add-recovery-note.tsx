import React, { memo } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button } from '@/components/primitives/button';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { scaleFont } from '@/utils/scale';

interface AddRecoveryNoteProps {
  colors: ThemeColors;
  showAddNote: boolean;
  noteText: string;
  noteProgress: number;
  saving: boolean;
  statusColor: string;
  onOpenAddNote: () => void;
  onCancelAddNote: () => void;
  onSaveNote: () => void;
  onChangeText: (text: string) => void;
  onChangeProgress: (value: number) => void;
  delay?: number;
}

export const AddRecoveryNote = memo(function AddRecoveryNote({
  colors, showAddNote, noteText, noteProgress, saving, statusColor,
  onOpenAddNote, onCancelAddNote, onSaveNote, onChangeText, onChangeProgress,
  delay = 200,
}: AddRecoveryNoteProps) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={styles.section}>
      {!showAddNote ? (
        <Button variant="secondary" onPress={onOpenAddNote}>
          <Row gap="xs" align="center">
            <Ionicons name="add-circle-outline" size={20} color={colors.tint} />
            <ThemedText style={{ color: colors.tint }}>Add Recovery Note</ThemedText>
          </Row>
        </Button>
      ) : (
        <SurfaceCard style={styles.card}>
          <ThemedText type="subtitle" style={styles.title}>Add Recovery Note</ThemedText>

          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            value={noteText}
            onChangeText={onChangeText}
            placeholder="How are you feeling? Any improvements?"
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <View style={styles.progressSection}>
            <Row justify="space-between" align="center" style={styles.progressHeader}>
              <ThemedText style={[styles.progressLabel, { color: colors.muted }]}>Recovery Progress</ThemedText>
              <ThemedText style={[styles.progressValue, { color: statusColor }]}>{noteProgress}%</ThemedText>
            </Row>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={100}
              step={5}
              value={noteProgress}
              onValueChange={onChangeProgress}
              minimumTrackTintColor={statusColor}
              maximumTrackTintColor={colors.border}
              thumbTintColor={statusColor}
            />
          </View>

          <Row gap="sm">
            <Button variant="secondary" onPress={onCancelAddNote} style={styles.button}>Cancel</Button>
            <Button onPress={onSaveNote} disabled={!noteText.trim() || saving} style={styles.button}>
              {saving ? 'Saving...' : 'Save Note'}
            </Button>
          </Row>
        </SurfaceCard>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  section: { marginTop: Spacing.lg },
  card: { padding: Spacing.md },
  title: { marginBottom: Spacing.md },
  input: {
    borderWidth: 1, borderRadius: Radii.md, padding: Spacing.md,
    ...Typography.body, fontSize: scaleFont(Typography.body.fontSize),
    minHeight: 80, marginBottom: Spacing.md,
  },
  progressSection: { marginBottom: Spacing.md },
  progressHeader: { marginBottom: Spacing.xs },
  progressLabel: { ...Typography.small, fontSize: scaleFont(Typography.small.fontSize) },
  progressValue: { ...Typography.subheading, fontSize: scaleFont(Typography.subheading.fontSize) },
  slider: { width: '100%', height: 40 },
  button: { flex: 1 },
});
