/**
 * Training Schedule Screen
 *
 * Shows club training sessions in list or weekly calendar view.
 * Supports squad filtering and parent attendance tracking.
 */

import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/screen-states';
import { TrainingCard } from '@/components/club/training-card';
import { WeeklyCalendarView } from '@/components/club/weekly-calendar-view';
import { TrainingAttendanceCard } from '@/components/club/training-attendance-card';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useTrainingSchedule, type ViewMode } from '@/hooks/use-training-schedule';

const VIEW_MODES: { key: ViewMode; label: string; icon: 'list' | 'calendar' }[] = [
  { key: 'list', label: 'List', icon: 'list' },
  { key: 'calendar', label: 'Week', icon: 'calendar' },
];

export default function TrainingScheduleScreen() {
  const { colors } = useTheme();
  const {
    loading,
    viewMode,
    setViewMode,
    selectedSquadId,
    setSelectedSquadId,
    clubName,
    squads,
    filteredSessions,
    userHasChildren,
    isCoach,
  } = useTrainingSchedule();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {/* Header */}
      <Row align="center" gap="md" style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Clickable>
        <View style={{ flex: 1 }}>
          <ThemedText type="title">Training Schedule</ThemedText>
          <ThemedText style={[Typography.small, { color: colors.muted, marginTop: Spacing.micro }]}>
            {clubName}
          </ThemedText>
        </View>
        {isCoach && (
          <Clickable
            accessibilityLabel="Create training session"
            onPress={() => router.push(Routes.GROUP_SESSIONS_CREATE)}
            style={[styles.addButton, { backgroundColor: colors.tint }]}
          >
            <Ionicons name="add" size={20} color={colors.onPrimary} />
          </Clickable>
        )}
      </Row>

      {/* View mode toggle */}
      <Row style={[styles.viewToggle, { backgroundColor: colors.surface }]}>
        {VIEW_MODES.map((mode) => (
          <Clickable
            key={mode.key}
            style={[
              styles.toggleOption,
              viewMode === mode.key ? { backgroundColor: colors.tint } : undefined,
            ]}
            onPress={() => setViewMode(mode.key)}
          >
            <Row align="center" justify="center" gap="xs">
              <Ionicons
                name={mode.icon}
                size={18}
                color={viewMode === mode.key ? colors.onPrimary : colors.muted}
              />
              <ThemedText
                style={[
                  Typography.small,
                  { color: viewMode === mode.key ? colors.onPrimary : colors.muted },
                ]}
              >
                {mode.label}
              </ThemedText>
            </Row>
          </Clickable>
        ))}
      </Row>

      {/* Squad filter */}
      {squads.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContainer}
        >
          <Clickable
            style={[
              styles.filterChip,
              {
                backgroundColor: !selectedSquadId ? colors.tint : colors.surface,
                borderColor: !selectedSquadId ? colors.tint : colors.border,
              },
            ]}
            onPress={() => setSelectedSquadId(null)}
          >
            <ThemedText
              style={[
                Typography.small,
                { color: !selectedSquadId ? colors.onPrimary : colors.text },
              ]}
            >
              All Squads
            </ThemedText>
          </Clickable>
          {squads.map((squad) => (
            <Clickable
              key={squad.id}
              style={[
                styles.filterChip,
                {
                  backgroundColor: selectedSquadId === squad.id ? colors.tint : colors.surface,
                  borderColor: selectedSquadId === squad.id ? colors.tint : colors.border,
                },
              ]}
              onPress={() => setSelectedSquadId(squad.id)}
            >
              <ThemedText
                style={[
                  Typography.small,
                  { color: selectedSquadId === squad.id ? colors.onPrimary : colors.text },
                ]}
              >
                {squad.name}
              </ThemedText>
            </Clickable>
          ))}
        </ScrollView>
      )}

      {/* Content */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <LoadingState variant="list" />
        ) : filteredSessions.length === 0 ? (
          <EmptyState
            icon="football-outline"
            title="No training sessions"
            message={
              selectedSquadId
                ? 'No training sessions for this squad yet'
                : 'No training sessions scheduled'
            }
          />
        ) : viewMode === 'list' ? (
          <View style={styles.list}>
            {filteredSessions.map((session, index) => (
              <TrainingCard
                key={session.id}
                session={session}
                index={index}
                userHasChildrenView={userHasChildren}
              />
            ))}
          </View>
        ) : (
          <WeeklyCalendarView sessions={filteredSessions} />
        )}

        {userHasChildren && filteredSessions.length > 0 && <TrainingAttendanceCard />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggle: { marginHorizontal: Spacing.lg, borderRadius: Radii.md, padding: Spacing.xxs },
  toggleOption: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radii.sm },
  filterScroll: { marginTop: Spacing.md, flexGrow: 0 },
  filterContainer: { paddingHorizontal: Spacing.lg, gap: Spacing.xs },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xl * 2 },
  list: { gap: Spacing.md },
});
