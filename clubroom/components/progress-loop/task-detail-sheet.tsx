import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import BottomSheet, { BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { DateTimeField } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { PracticeTask } from '@/services/progress/progress-practice-task-service';
import { deriveTaskTiming, relativeDueLabel, timingBadgeLabel } from '@/utils/progress-task-time';

function toDateValue(value: string | undefined): string {
  if (!value) {
    return '';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toTimeValue(value: string | undefined): string {
  if (!value) {
    return '';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function parseLocalDateTime(dateValue: string, timeValue: string): string | null {
  if (!dateValue || !timeValue) {
    return null;
  }

  const [year, month, day] = dateValue.split('-').map(Number);
  const [hours, minutes] = timeValue.split(':').map(Number);

  if (!year || !month || !day) {
    return null;
  }
  if (hours == null || minutes == null || Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  const parsed = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

interface TaskDetailSheetProps {
  task: PracticeTask | null;
  nowTs: number;
  isBusy: boolean;
  isSyncing?: boolean;
  onClose: () => void;
  onToggleTask: (task: PracticeTask, completionNote?: string) => Promise<void>;
  onSnoozeTask: (task: PracticeTask, hours: number) => Promise<void>;
  onRescheduleTask: (task: PracticeTask, dueAtIso: string) => Promise<void>;
  onMessageTask: (task: PracticeTask) => void;
  onOpenHistory: (task: PracticeTask) => void;
}

export const TaskDetailSheet = memo(function TaskDetailSheet({
  task,
  nowTs,
  isBusy,
  isSyncing = false,
  onClose,
  onToggleTask,
  onSnoozeTask,
  onRescheduleTask,
  onMessageTask,
  onOpenHistory,
}: TaskDetailSheetProps) {
  const { colors, scheme } = useTheme();
  const { showToast } = useToast();
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['50%', '86%'], []);
  const [completionNote, setCompletionNote] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');

  useEffect(() => {
    if (!task) {
      sheetRef.current?.close();
      return;
    }

    setCompletionNote(task.completionNote ?? '');
    setRescheduleDate(toDateValue(task.dueAt));
    setRescheduleTime(toTimeValue(task.dueAt));
    sheetRef.current?.snapToIndex(0);
  }, [task]);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index < 0) {
        onClose();
      }
    },
    [onClose],
  );

  const timing = task ? deriveTaskTiming(task, nowTs) : 'upcoming';
  const badgeColor =
    timing === 'overdue'
      ? colors.error
      : timing === 'due_soon'
        ? colors.warning
        : timing === 'completed'
          ? colors.success
          : colors.tint;

  const handleReschedule = useCallback(async () => {
    if (!task || isBusy) {
      return;
    }

    const dueAtIso = parseLocalDateTime(rescheduleDate, rescheduleTime);
    if (!dueAtIso) {
      showToast('Select a valid date and time', 'error');
      return;
    }

    await onRescheduleTask(task, dueAtIso);
  }, [isBusy, onRescheduleTask, rescheduleDate, rescheduleTime, task]);

  const handleToggleCompletion = useCallback(async () => {
    if (!task || isBusy) {
      return;
    }

    await onToggleTask(task, completionNote.trim() || undefined);
  }, [completionNote, isBusy, onToggleTask, task]);

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onChange={handleSheetChange}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      backgroundStyle={[
        styles.sheetBackground,
        {
          backgroundColor: colors.surface,
        },
      ]}
      handleIndicatorStyle={[
        styles.handle,
        {
          backgroundColor: withAlpha(colors.muted, 0.34),
        },
      ]}
    >
      {!task ? (
        <BottomSheetView style={styles.sheetContent} />
      ) : (
        <BottomSheetView style={styles.sheetContent}>
          <Column gap="sm">
            <Row align="center" justify="between" gap="xs">
              <ThemedText style={styles.title} numberOfLines={1}>
                {task.sessionTitle?.trim() || 'Practice task'}
              </ThemedText>
              <View
                style={[
                  styles.badge,
                  {
                    borderColor: withAlpha(badgeColor, 0.42),
                    backgroundColor: withAlpha(badgeColor, 0.12),
                  },
                ]}
              >
                <ThemedText style={[styles.badgeText, { color: badgeColor }]}> 
                  {timingBadgeLabel(timing)}
                </ThemedText>
              </View>
            </Row>

            <ThemedText style={[styles.meta, { color: colors.muted }]}> 
              {relativeDueLabel(task, nowTs)}
            </ThemedText>
            <ThemedText style={styles.description}>{task.description}</ThemedText>

            {isSyncing ? (
              <Row
                align="center"
                gap="xxs"
                style={[
                  styles.syncBanner,
                  {
                    borderColor: withAlpha(colors.warning, 0.4),
                    backgroundColor: withAlpha(colors.warning, 0.1),
                  },
                ]}
                accessibilityLiveRegion="polite"
              >
                <Ionicons name="sync-outline" size={14} color={colors.warning} />
                <ThemedText style={[styles.syncBannerText, { color: colors.warning }]}>
                  Syncing updates. Actions unlock after confirmation.
                </ThemedText>
              </Row>
            ) : null}

            <Column gap="xs">
              <ThemedText style={styles.sectionTitle}>Completion note</ThemedText>
              <BottomSheetTextInput
                value={completionNote}
                onChangeText={setCompletionNote}
                placeholder="Optional: add what was completed"
                placeholderTextColor={colors.muted}
                style={[
                  styles.noteInput,
                  {
                    borderColor: colors.border,
                    color: colors.text,
                    backgroundColor: scheme === 'dark' ? withAlpha(colors.background, 0.3) : colors.background,
                  },
                ]}
                editable={!isBusy}
                multiline
              />
            </Column>

            <Row gap="xs">
              <Clickable
                style={[styles.secondaryAction, { borderColor: colors.border }]}
                onPress={() => onSnoozeTask(task, 24)}
                disabled={isBusy}
                accessibilityLabel="Snooze task by 24 hours"
              >
                <ThemedText style={[styles.secondaryActionText, { color: colors.text }]}>Snooze 24h</ThemedText>
              </Clickable>
              <Clickable
                style={[styles.secondaryAction, { borderColor: colors.border }]}
                onPress={() => onSnoozeTask(task, 48)}
                disabled={isBusy}
                accessibilityLabel="Snooze task by 48 hours"
              >
                <ThemedText style={[styles.secondaryActionText, { color: colors.text }]}>Snooze 48h</ThemedText>
              </Clickable>
            </Row>

            <Row gap="xs">
              <DateTimeField
                mode="date"
                value={rescheduleDate}
                onChange={setRescheduleDate}
                label="Reschedule date"
                style={styles.dateField}
              />
              <DateTimeField
                mode="time"
                value={rescheduleTime}
                onChange={setRescheduleTime}
                label="Time"
                style={styles.timeField}
              />
            </Row>

            <Clickable
              style={[styles.secondaryAction, styles.fullWidth, { borderColor: colors.border }]}
              onPress={handleReschedule}
              disabled={isBusy}
              accessibilityLabel="Apply task reschedule"
            >
              <ThemedText style={[styles.secondaryActionText, { color: colors.text }]}>Apply reschedule</ThemedText>
            </Clickable>

            <Row gap="xs">
              <Clickable
                style={[styles.secondaryAction, { borderColor: colors.border }]}
                onPress={() => onMessageTask(task)}
                disabled={isBusy}
                accessibilityLabel={`Message coach ${task.coachName}`}
              >
                <ThemedText style={[styles.secondaryActionText, { color: colors.text }]}>Message</ThemedText>
              </Clickable>
              <Clickable
                style={[styles.secondaryAction, { borderColor: colors.border }]}
                onPress={() => onOpenHistory(task)}
                disabled={isBusy}
                accessibilityLabel="Open session history"
              >
                <ThemedText style={[styles.secondaryActionText, { color: colors.text }]}>History</ThemedText>
              </Clickable>
            </Row>

            <Clickable
              style={[styles.primaryAction, { backgroundColor: colors.tint }]}
              onPress={handleToggleCompletion}
              disabled={isBusy}
              accessibilityLabel={task.status === 'completed' ? 'Mark task as not done' : 'Mark task as done'}
            >
              <ThemedText style={[styles.primaryActionText, { color: colors.onPrimary }]}> 
                {isSyncing
                  ? 'Syncing…'
                  : task.status === 'completed'
                    ? 'Mark as not done'
                    : 'Mark as done'}
              </ThemedText>
            </Clickable>
          </Column>
        </BottomSheetView>
      )}
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: Radii['2xl'],
    borderTopRightRadius: Radii['2xl'],
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: Radii.pill,
  },
  sheetContent: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing['2xl'],
  },
  title: {
    ...Typography.bodySemiBold,
    flex: 1,
  },
  meta: {
    ...Typography.caption,
  },
  description: {
    ...Typography.bodySmall,
  },
  badge: {
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
  },
  badgeText: {
    ...Typography.caption,
  },
  sectionTitle: {
    ...Typography.caption,
  },
  syncBanner: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
  },
  syncBannerText: {
    ...Typography.micro,
    flex: 1,
  },
  noteInput: {
    minHeight: 78,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    ...Typography.bodySmall,
    textAlignVertical: 'top',
  },
  secondaryAction: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  secondaryActionText: {
    ...Typography.bodySmallSemiBold,
  },
  fullWidth: {
    flex: 0,
    width: '100%',
  },
  primaryAction: {
    minHeight: 44,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  primaryActionText: {
    ...Typography.bodySmallSemiBold,
  },
  dateField: {
    flex: 1,
  },
  timeField: {
    width: 138,
  },
});
