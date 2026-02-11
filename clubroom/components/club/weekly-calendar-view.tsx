import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { DAYS } from '@/hooks/use-training-schedule';
import type { GroupSession } from '@/constants/types';
import { Row } from '@/components/primitives';

interface WeeklyCalendarViewProps {
  sessions: GroupSession[];
}

export const WeeklyCalendarView = memo(function WeeklyCalendarView({
  sessions,
}: WeeklyCalendarViewProps) {
  const { colors } = useTheme();

  const sessionsByDay = DAYS.map((_, dayIndex) =>
    sessions.filter((s) => s.recurringPattern?.dayOfWeek === dayIndex),
  );

  return (
    <Row style={styles.container}>
      {DAYS.map((day, dayIndex) => {
        const daySessions = sessionsByDay[dayIndex];
        return (
          <View key={day} style={[styles.day, { borderColor: colors.border }]}>
            <View style={[styles.dayHeader, { backgroundColor: colors.surface }]}>
              <ThemedText type="defaultSemiBold" style={Typography.small}>
                {day}
              </ThemedText>
            </View>
            <View style={styles.dayContent}>
              {daySessions.length > 0 ? (
                daySessions.map((session) => (
                  <Clickable
                    key={session.id}
                    style={[styles.session, { backgroundColor: withAlpha(colors.tint, 0.06) }]}
                    onPress={() => router.push(Routes.groupSession(session.id))}
                  >
                    <ThemedText
                      style={[Typography.caption, { color: colors.tint }]}
                      numberOfLines={1}
                    >
                      {session.title}
                    </ThemedText>
                    <ThemedText style={[Typography.micro, { color: colors.muted }]}>
                      {session.recurringPattern?.startTime}
                    </ThemedText>
                  </Clickable>
                ))
              ) : (
                <ThemedText
                  style={[Typography.micro, { color: colors.muted, textAlign: 'center' }]}
                >
                  -
                </ThemedText>
              )}
            </View>
          </View>
        );
      })}
    </Row>
  );
});

const styles = StyleSheet.create({
  container: { gap: Spacing.xxs },
  day: { flex: 1, borderRadius: Radii.sm, borderWidth: 1, overflow: 'hidden' },
  dayHeader: { paddingVertical: Spacing.xs, alignItems: 'center' },
  dayContent: { padding: Spacing.xxs, gap: Spacing.xxs, minHeight: 80 },
  session: { padding: Spacing.xxs, borderRadius: Radii.xs, gap: Spacing.micro },
});
