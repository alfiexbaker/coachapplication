import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Row } from '@/components/primitives/row';

import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { RatingStars } from '@/components/review/rating-stars';
import { SessionNoteFields } from '@/services/progress-service';
import { useTheme } from '@/hooks/useTheme';
import { COACHING_FOCUSES } from '@/constants/football-registry';

const FOCUS_OPTIONS = COACHING_FOCUSES;
const ATTENDANCE = ['Present', 'Late', 'No-show'];

export function SessionNotesForm({
  onSubmit,
  initialValues,
  submitting,
  viewerRole = 'coach',
}: {
  onSubmit: (payload: SessionNoteFields) => void;
  initialValues?: Partial<SessionNoteFields>;
  submitting?: boolean;
  /** Only coaches can submit session notes. Parents/athletes see read-only view. */
  viewerRole?: 'coach' | 'parent' | 'athlete';
}) {
  const { colors: palette } = useTheme();
  const [summary, setSummary] = useState(initialValues?.summary ?? '');
  const [focus, setFocus] = useState<string[]>(initialValues?.focus ?? []);
  const [improvements, setImprovements] = useState(initialValues?.improvements ?? '');
  const [homework, setHomework] = useState(initialValues?.homework ?? '');
  const [attendance, setAttendance] = useState(initialValues?.attendance ?? 'Present');
  const [effort, setEffort] = useState<number | null>(initialValues?.effort ?? null);

  useEffect(() => {
    setSummary(initialValues?.summary ?? '');
    setFocus(initialValues?.focus ?? []);
    setImprovements(initialValues?.improvements ?? '');
    setHomework(initialValues?.homework ?? '');
    setAttendance(initialValues?.attendance ?? 'Present');
    setEffort(initialValues?.effort ?? null);
  }, [initialValues]);

  const toggleFocus = (item: string) => {
    setFocus((prev) => {
      if (prev.includes(item)) return prev.filter((f) => f !== item);
      if (prev.length >= 3) return prev;
      return [...prev, item];
    });
  };

  const summaryCount = summary.length;
  const summaryWarn = summaryCount > 450;
  const focusError = focus.length === 0 ? 'Select at least one focus area' : null;
  const effortError = effort === null ? 'Rate athlete effort' : null;
  const canSubmit =
    viewerRole === 'coach' && !submitting && !focusError && !effortError;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={{ gap: Spacing.sm }}>
        <ThemedText type="defaultSemiBold">Session summary</ThemedText>
        <ThemedText style={[Typography.caption, { color: palette.muted }]}>
          Brief notes help parents. Focus on key observations.
        </ThemedText>
        <TextInput
          placeholder="What we covered today"
          placeholderTextColor={palette.muted}
          style={[styles.textArea, { borderColor: palette.border, color: palette.text }]}
          value={summary}
          onChangeText={setSummary}
          multiline
          maxLength={500}
        />
        <Row style={styles.counterRow}>
          <View style={[styles.counterTrack, { backgroundColor: palette.border }]}>
            <View
              style={[
                styles.counterFill,
                {
                  width: `${Math.min(100, (summaryCount / 500) * 100)}%`,
                  backgroundColor: summaryWarn ? palette.error : palette.tint,
                },
              ]}
            />
          </View>
          <ThemedText style={[Typography.caption, { color: summaryWarn ? palette.error : palette.muted }]}>
            {summaryCount}/500
          </ThemedText>
        </Row>
      </View>

      <View style={{ gap: Spacing.sm }}>
        <ThemedText type="defaultSemiBold">Focus areas</ThemedText>
        <ThemedText style={[Typography.caption, { color: palette.muted }]}>
          Select 1-3 focus areas for this session
        </ThemedText>
        <View
          style={[
            styles.focusWrap,
            {
              borderColor: focusError ? palette.error : palette.border,
              backgroundColor: palette.surface,
            },
          ]}
        >
          <Row wrap gap="xs">
          {FOCUS_OPTIONS.map((item) => {
            const active = focus.includes(item);
            const atLimit = !active && focus.length >= 3;
            return (
              <Clickable
                key={item}
                onPress={() => toggleFocus(item)}
                disabled={atLimit}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? withAlpha(palette.tint, 0.09) : palette.surface,
                    borderColor: active ? palette.tint : palette.border,
                    opacity: atLimit ? 0.45 : 1,
                  },
                ]}
              >
                <ThemedText style={{ color: active ? palette.tint : palette.text }}>
                  {item}
                </ThemedText>
              </Clickable>
            );
          })}
          </Row>
        </View>
        <ThemedText style={[Typography.caption, { color: focusError ? palette.error : palette.muted }]}>
          {focusError ?? `${focus.length}/3 selected`}
        </ThemedText>
      </View>

      <View style={{ gap: Spacing.sm }}>
        <ThemedText type="defaultSemiBold">Improvements seen</ThemedText>
        <TextInput
          placeholder="Much better first touch under pressure"
          placeholderTextColor={palette.muted}
          style={[styles.textArea, { borderColor: palette.border, color: palette.text }]}
          value={improvements}
          onChangeText={setImprovements}
          multiline
        />
      </View>

      <View style={{ gap: Spacing.sm }}>
        <ThemedText type="defaultSemiBold">Homework</ThemedText>
        <TextInput
          placeholder="Practice wall passes 20 min daily"
          placeholderTextColor={palette.muted}
          style={[styles.textArea, { borderColor: palette.border, color: palette.text }]}
          value={homework}
          onChangeText={setHomework}
          multiline
        />
      </View>

      <View style={{ gap: Spacing.sm }}>
        <ThemedText type="defaultSemiBold">Effort rating</ThemedText>
        <RatingStars rating={effort} onRate={setEffort} />
        <ThemedText style={[Typography.caption, { color: effortError ? palette.error : palette.muted }]}>
          {effortError ?? 'How hard did the athlete work today?'}
        </ThemedText>
      </View>

      <View style={{ gap: Spacing.sm }}>
        <ThemedText type="defaultSemiBold">Attendance</ThemedText>
        <Row wrap gap="xs">
          {ATTENDANCE.map((item) => {
            const active = attendance === item;
            return (
              <Clickable
                key={item}
                onPress={() => setAttendance(item)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? withAlpha(palette.tint, 0.09) : palette.surface,
                    borderColor: active ? palette.tint : palette.border,
                  },
                ]}
              >
                <ThemedText style={{ color: active ? palette.tint : palette.text }}>
                  {item}
                </ThemedText>
              </Clickable>
            );
          })}
        </Row>
      </View>

      <Clickable
        onPress={() =>
          onSubmit({
            summary: summary.trim(),
            focus,
            improvements: improvements.trim(),
            homework: homework.trim(),
            effort: effort ?? 0,
            attendance,
          })
        }
        style={[styles.submit, { backgroundColor: submitting ? palette.border : palette.tint, opacity: viewerRole !== 'coach' ? 0.5 : 1 }]}
        disabled={!canSubmit}
        accessibilityLabel={viewerRole !== 'coach' ? 'Only coaches can submit session notes' : 'Submit Notes'}
      >
        <Row align="center" justify="center" gap="xs">
          {submitting ? (
            <ActivityIndicator color={palette.text} />
          ) : (
            <Ionicons name="checkmark-circle" size={18} color={palette.onPrimary} />
          )}
          <ThemedText
            style={{ color: submitting ? palette.text : palette.onPrimary, fontWeight: '700' }}
          >
            {submitting ? 'Saving...' : 'Submit Notes'}
          </ThemedText>
        </Row>
      </Clickable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  textArea: {
    minHeight: 80,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    padding: Spacing.sm,
    lineHeight: 20, // Typography.bodySmall.lineHeight
    textAlignVertical: 'top',
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
  },
  focusWrap: {
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: Spacing.sm,
  },
  submit: {
    padding: Spacing.sm,
    borderRadius: Radii.button,
  },
  counterRow: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  counterTrack: {
    flex: 1,
    height: 4,
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  counterFill: {
    height: '100%',
    borderRadius: Radii.pill,
  },
});
