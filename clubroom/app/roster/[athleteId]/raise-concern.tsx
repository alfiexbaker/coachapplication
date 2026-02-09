/**
 * Raise Concern Screen
 *
 * Allows coaches to flag incidents, behavioral issues, or safeguarding
 * concerns about an athlete. Structured form with category, severity,
 * description, action taken, and follow-up date.
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TextInput, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { LoadingState, ErrorState } from '@/components/ui/screen-states';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { rosterService } from '@/services/roster-service';
import {
  concernService,
  CONCERN_TYPE_LABELS,
  CONCERN_TYPE_ICONS,
  CONCERN_SEVERITY_LABELS,
  type ConcernType,
  type ConcernSeverity,
} from '@/services/concern-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('RaiseConcern');

// ============================================================================
// CONCERN TYPE PICKER
// ============================================================================

const ConcernTypePicker = React.memo(function ConcernTypePicker({
  selected,
  onSelect,
}: {
  selected: ConcernType | null;
  onSelect: (type: ConcernType) => void;
}) {
  const { colors } = useTheme();

  const types: ConcernType[] = [
    'BEHAVIORAL',
    'SAFEGUARDING',
    'MEDICAL',
    'ATTENDANCE',
    'PARENT_COMMUNICATION',
  ];

  return (
    <Column gap="xs">
      <ThemedText type="defaultSemiBold">Category</ThemedText>
      <Column gap="xs">
        {types.map((type) => {
          const isSelected = selected === type;
          return (
            <Clickable
              key={type}
              onPress={() => onSelect(type)}
              style={[
                styles.typeOption,
                {
                  backgroundColor: isSelected
                    ? withAlpha(colors.tint, 0.09)
                    : colors.surfaceSecondary,
                  borderColor: isSelected ? colors.tint : 'transparent',
                },
              ]}
              accessibilityLabel={CONCERN_TYPE_LABELS[type]}
            >
              <View
                style={[
                  styles.typeIcon,
                  {
                    backgroundColor: isSelected
                      ? withAlpha(colors.tint, 0.15)
                      : withAlpha(colors.muted, 0.09),
                  },
                ]}
              >
                <Ionicons
                  name={CONCERN_TYPE_ICONS[type] as 'alert-circle'}
                  size={20}
                  color={isSelected ? colors.tint : colors.muted}
                />
              </View>
              <ThemedText
                style={[
                  styles.typeLabel,
                  { color: isSelected ? colors.tint : colors.text },
                ]}
              >
                {CONCERN_TYPE_LABELS[type]}
              </ThemedText>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={20} color={colors.tint} />
              )}
            </Clickable>
          );
        })}
      </Column>
    </Column>
  );
});

// ============================================================================
// SEVERITY PICKER
// ============================================================================

const SeverityPicker = React.memo(function SeverityPicker({
  selected,
  onSelect,
}: {
  selected: ConcernSeverity;
  onSelect: (severity: ConcernSeverity) => void;
}) {
  const { colors } = useTheme();

  const severities: ConcernSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

  return (
    <Column gap="xs">
      <ThemedText type="defaultSemiBold">Severity</ThemedText>
      <Row gap="xs">
        {severities.map((s) => {
          const isSelected = selected === s;
          const color = concernService.getSeverityColor(s);
          return (
            <Clickable
              key={s}
              onPress={() => onSelect(s)}
              style={[
                styles.severityChip,
                {
                  backgroundColor: isSelected
                    ? withAlpha(color, 0.12)
                    : colors.surfaceSecondary,
                  borderColor: isSelected ? color : 'transparent',
                },
              ]}
              accessibilityLabel={`Severity: ${CONCERN_SEVERITY_LABELS[s]}`}
            >
              <View style={[styles.severityDot, { backgroundColor: color }]} />
              <ThemedText
                style={[
                  styles.severityText,
                  { color: isSelected ? color : colors.muted },
                ]}
              >
                {CONCERN_SEVERITY_LABELS[s]}
              </ThemedText>
            </Clickable>
          );
        })}
      </Row>
    </Column>
  );
});

// ============================================================================
// MAIN SCREEN
// ============================================================================

export default function RaiseConcernScreen() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();
  const { colors } = useTheme();
  const { currentUser } = useAuth();

  const [type, setType] = useState<ConcernType | null>(null);
  const [severity, setSeverity] = useState<ConcernSeverity>('MEDIUM');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const coachId = currentUser?.id || 'coach_1';

  // Load athlete name for display
  const [athleteName, setAthleteName] = useState('');
  React.useEffect(() => {
    async function load() {
      const entry = await rosterService.getRosterEntry(coachId, athleteId);
      if (entry) setAthleteName(entry.athleteName);
    }
    void load();
  }, [coachId, athleteId]);

  const canSubmit = type !== null && title.trim().length > 0 && description.trim().length > 0;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !type) return;

    setSubmitting(true);
    try {
      const result = await concernService.raiseConcern({
        coachId,
        athleteId,
        athleteName,
        type,
        severity,
        title: title.trim(),
        description: description.trim(),
        actionTaken: actionTaken.trim() || undefined,
      });

      if (result.success) {
        if (Platform.OS !== 'web') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert(
          'Concern Recorded',
          `Your concern about ${athleteName} has been recorded.`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Error', result.error.message);
      }
    } catch (error) {
      logger.error('Failed to submit concern', error);
      Alert.alert('Error', 'Failed to submit concern. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, type, coachId, athleteId, athleteName, severity, title, description, actionTaken]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <Row gap="md" align="center" style={[styles.headerRow, { borderBottomColor: colors.border }]}>
        <Clickable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Clickable>
        <Column gap="micro" style={styles.flex1}>
          <ThemedText type="title">Raise Concern</ThemedText>
          {athleteName ? (
            <ThemedText style={[styles.headerSubtitle, { color: colors.muted }]}>
              {athleteName}
            </ThemedText>
          ) : null}
        </Column>
      </Row>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Type Picker */}
        <Animated.View entering={FadeInDown.springify()}>
          <ConcernTypePicker selected={type} onSelect={setType} />
        </Animated.View>

        {/* Severity */}
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <SeverityPicker selected={severity} onSelect={setSeverity} />
        </Animated.View>

        {/* Title */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Column gap="xs">
            <ThemedText type="defaultSemiBold">Title</ThemedText>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surfaceSecondary, color: colors.text }]}
              placeholder="Brief summary of the concern..."
              placeholderTextColor={colors.muted}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
              accessibilityLabel="Concern title"
            />
          </Column>
        </Animated.View>

        {/* Description */}
        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <Column gap="xs">
            <ThemedText type="defaultSemiBold">Description</ThemedText>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surfaceSecondary, color: colors.text }]}
              placeholder="Describe the concern in detail. What happened? When? Who was involved?"
              placeholderTextColor={colors.muted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              accessibilityLabel="Concern description"
            />
          </Column>
        </Animated.View>

        {/* Action Taken */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Column gap="xs">
            <ThemedText type="defaultSemiBold">Action Taken (Optional)</ThemedText>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surfaceSecondary, color: colors.text, minHeight: 60 }]}
              placeholder="What steps have you already taken?"
              placeholderTextColor={colors.muted}
              value={actionTaken}
              onChangeText={setActionTaken}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
              accessibilityLabel="Action taken"
            />
          </Column>
        </Animated.View>

        {/* Submit */}
        <Animated.View entering={FadeInDown.delay(250).springify()}>
          <Button
            onPress={handleSubmit}
            disabled={!canSubmit || submitting}
            variant="primary"
          >
            {submitting ? 'Submitting...' : 'Record Concern'}
          </Button>
        </Animated.View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex1: { flex: 1 },
  headerRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  headerSubtitle: {
    ...Typography.caption,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    minHeight: 52,
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: {
    ...Typography.bodySemiBold,
    flex: 1,
  },
  severityChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    minHeight: 44,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
  },
  severityText: {
    ...Typography.smallSemiBold,
  },
  textInput: {
    ...Typography.body,
    height: 48,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
  },
  textArea: {
    ...Typography.body,
    minHeight: 100,
    borderRadius: Radii.md,
    padding: Spacing.md,
  },
  bottomSpacer: {
    height: 40,
  },
});
