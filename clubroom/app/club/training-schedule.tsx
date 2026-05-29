/**
 * Training Schedule Screen
 *
 * Shows club training sessions in list or weekly calendar view.
 * Supports squad filtering and parent attendance tracking.
 */

import { View, StyleSheet, ScrollView, FlatList, type ListRenderItemInfo } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/screen-states';
import { TrainingCard } from '@/components/club/training-card';
import { WeeklyCalendarView } from '@/components/club/weekly-calendar-view';
import { TrainingAttendanceCard } from '@/components/club/training-attendance-card';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/hooks/useTheme';
import { useTrainingSchedule, type ViewMode } from '@/hooks/use-training-schedule';
import type { ClubSquad, GroupSession } from '@/constants/types';

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
  const squadFilterItems = getSquadFilterItems(squads, selectedSquadId, colors, setSelectedSquadId);
  const trainingItems = getTrainingSessionItems(filteredSessions, userHasChildren);
  const attendanceFooter =
    userHasChildren && filteredSessions.length > 0 ? <TrainingAttendanceCard /> : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <Row align="center" gap="md" style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Clickable>
        <Column flex>
          <ThemedText type="title">Training Schedule</ThemedText>
          <ThemedText style={[Typography.small, { color: colors.muted, marginTop: Spacing.micro }]}>
            {clubName}
          </ThemedText>
        </Column>
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
        <FlatList
          contentInsetAdjustmentBehavior="automatic"
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContainer}
          data={squadFilterItems}
          keyExtractor={keySquadFilterItem}
          renderItem={renderSquadFilterItem}
        />
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.content}>
          <LoadingState variant="schedule" />
        </View>
      ) : filteredSessions.length === 0 ? (
        <View style={styles.content}>
          <EmptyState
            icon="football-outline"
            title="No training sessions"
            message={
              selectedSquadId
                ? 'No training sessions for this squad yet'
                : 'No training sessions scheduled'
            }
          />
        </View>
      ) : viewMode === 'list' ? (
        <FlatList
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          data={trainingItems}
          keyExtractor={keyTrainingSessionItem}
          renderItem={renderTrainingSessionItem}
          ListFooterComponent={attendanceFooter}
        />
      ) : (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <WeeklyCalendarView sessions={filteredSessions} />
          {attendanceFooter}
        </ScrollView>
      )}
    </View>
  );
}

interface SquadFilterItem {
  key: string;
  label: string;
  isSelected: boolean;
  colors: ThemeColors;
  onPress: () => void;
}

function getSquadFilterItems(
  squads: ClubSquad[],
  selectedSquadId: string | null,
  colors: ThemeColors,
  onSelectSquadId: (squadId: string | null) => void,
): SquadFilterItem[] {
  return [
    {
      key: 'all',
      label: 'All Squads',
      isSelected: !selectedSquadId,
      colors,
      onPress: () => onSelectSquadId(null),
    },
    ...squads.map((squad) => ({
      key: squad.id,
      label: squad.name,
      isSelected: selectedSquadId === squad.id,
      colors,
      onPress: () => onSelectSquadId(squad.id),
    })),
  ];
}

function keySquadFilterItem(item: SquadFilterItem): string {
  return item.key;
}

function renderSquadFilterItem({ item }: ListRenderItemInfo<SquadFilterItem>) {
  return (
    <Clickable
      style={[
        styles.filterChip,
        {
          backgroundColor: item.isSelected ? item.colors.tint : item.colors.surface,
          borderColor: item.isSelected ? item.colors.tint : item.colors.border,
        },
      ]}
      onPress={item.onPress}
    >
      <ThemedText
        style={[
          Typography.small,
          { color: item.isSelected ? item.colors.onPrimary : item.colors.text },
        ]}
      >
        {item.label}
      </ThemedText>
    </Clickable>
  );
}

interface TrainingSessionItem {
  key: string;
  session: GroupSession;
  index: number;
  userHasChildrenView: boolean;
}

function getTrainingSessionItems(
  sessions: GroupSession[],
  userHasChildrenView: boolean,
): TrainingSessionItem[] {
  return sessions.map((session, index) => ({
    key: session.id,
    session,
    index,
    userHasChildrenView,
  }));
}

function keyTrainingSessionItem(item: TrainingSessionItem): string {
  return item.key;
}

function renderTrainingSessionItem({ item }: ListRenderItemInfo<TrainingSessionItem>) {
  return (
    <TrainingCard
      session={item.session}
      index={item.index}
      userHasChildrenView={item.userHasChildrenView}
    />
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
  content: { padding: Spacing.lg, paddingBottom: Spacing.xl * 2, gap: Spacing.md },
});
