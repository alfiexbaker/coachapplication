/**
 * Coach Schedule - The Command Center
 *
 * Two segments: Sessions (default) and Availability.
 * All state and logic lives in useSchedule() hook.
 * All UI sections are imported sub-components.
 */

import React from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/primitives/screen-header';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { EmptyState, LoadingState, ErrorState } from '@/components/ui/screen-states';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useSchedule } from '@/hooks/use-schedule';

import { ScheduleSegmentControl } from '@/components/schedule/schedule-segment-control';
import { ScheduleTodayCard } from '@/components/schedule/schedule-today-card';
import { ScheduleWeekStrip } from '@/components/schedule/schedule-week-strip';
import { ScheduleDayDetail } from '@/components/schedule/schedule-day-detail';
import { ScheduleQuickActions } from '@/components/schedule/schedule-quick-actions';
import { ScheduleRulesSummary } from '@/components/schedule/schedule-rules-summary';
import { ScheduleAvailabilitySegment } from '@/components/schedule/schedule-availability-segment';

import { DayEditorSheet } from '@/components/coach/day-editor-sheet';
import { TimeOffSheet } from '@/components/coach/time-off-sheet';
import { SchedulingRulesModal } from '@/components/coach/scheduling-rules-modal';
import { SessionTypeModal } from '@/components/coach/session-type-modal';
import { Routes } from '@/navigation/routes';

export default function ScheduleScreen() {
  const { colors } = useTheme();
  const schedule = useSchedule();

  // Loading state
  if (schedule.loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <LoadingState variant="calendar" />
      </SafeAreaView>
    );
  }

  // Error state
  if (schedule.error) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <ScreenHeader title="Schedule" subtitle="Your upcoming sessions" />
        <ErrorState message={schedule.error} onRetry={schedule.retry} />
      </SafeAreaView>
    );
  }

  const isSessionEmpty =
    schedule.segment === 'sessions' &&
    schedule.weekOffset === 0 &&
    schedule.weekData.every((day) => day.sessions.length === 0);

  if (isSessionEmpty) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <ScreenHeader
          title="Schedule"
          subtitle="Your upcoming sessions"
          rightElement={
            <Clickable
              onPress={schedule.handleOpenSettings}
              accessibilityLabel="Booking rules"
              style={[styles.settingsBtn, { backgroundColor: colors.surface }]}
            >
              <Ionicons name="settings-outline" size={22} color={colors.muted} />
            </Clickable>
          }
        />

        <ScheduleSegmentControl
          segment={schedule.segment}
          onSegmentChange={schedule.handleSegmentChange}
        />

        <EmptyState
          icon="calendar-outline"
          title="No sessions scheduled"
          message="Your upcoming sessions will appear here. Set availability or create sessions to get started."
          actionLabel="Create session"
          onPressAction={() =>
            router.push(Routes.sessionsCreateIntent({ intent: 'new', source: 'schedule' }))
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      {/* Header */}
      <ScreenHeader
        title={schedule.segment === 'sessions' ? 'Schedule' : 'Availability'}
        subtitle={
          schedule.segment === 'sessions'
            ? schedule.weekOffset === 0
              ? 'Your upcoming sessions'
              : schedule.weekLabel
            : 'Manage your availability'
        }
        rightElement={
          <Clickable
            onPress={schedule.handleOpenSettings}
            accessibilityLabel="Booking rules"
            style={[styles.settingsBtn, { backgroundColor: colors.surface }]}
          >
            <Ionicons name="settings-outline" size={22} color={colors.muted} />
          </Clickable>
        }
      />

      {/* Segment Control + Quick Actions */}
      <ScheduleSegmentControl
        segment={schedule.segment}
        onSegmentChange={schedule.handleSegmentChange}
      />
      {/* Sessions Segment */}
      {schedule.segment === 'sessions' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={schedule.refreshing}
              onRefresh={schedule.onRefresh}
              tintColor={colors.tint}
            />
          }
        >
          <ScheduleQuickActions />

          {schedule.todayData && schedule.weekOffset === 0 && (
            <ScheduleTodayCard
              todayData={schedule.todayData}
              todaySessions={schedule.todaySessions}
              nextSession={schedule.nextSession}
              onSessionPress={schedule.handleSessionPress}
            />
          )}

          <ScheduleWeekStrip
            weekData={schedule.weekData}
            selectedDayIndex={schedule.selectedDayIndex}
            onDayPress={schedule.handleDayPress}
            weekLabel={schedule.weekLabel}
            weekOffset={schedule.weekOffset}
            onPrevWeek={schedule.handlePrevWeek}
            onNextWeek={schedule.handleNextWeek}
            onGoToThisWeek={schedule.handleGoToThisWeek}
          />

          {schedule.selectedDay && (
            <ScheduleDayDetail
              day={schedule.selectedDay}
              onSessionPress={schedule.handleSessionPress}
              onAdjustDay={schedule.handleAdjustDay}
              onCreateSession={schedule.handleInviteFromSchedule}
            />
          )}

          {schedule.rules && (
            <ScheduleRulesSummary rules={schedule.rules} onPress={schedule.handleOpenSettings} />
          )}
        </ScrollView>
      )}

      {/* Availability Segment */}
      {schedule.segment === 'availability' && (
        <ScheduleAvailabilitySegment
          templates={schedule.templates}
          overrides={schedule.overrides}
          blockedDates={schedule.blockedDates}
          coachId={schedule.coachId}
          sessionTemplates={schedule.sessionTemplates}
          onDayPress={schedule.handleAvailabilityDayPress}
          onTimeOffPress={schedule.handleTimeOffPress}
          onSetupComplete={schedule.handleAvailabilitySetupComplete}
          onSessionTypePress={schedule.handleSessionTypePress}
          onSessionTypeAdd={schedule.handleSessionTypeAdd}
          onTakeTimeOff={schedule.handleTakeTimeOff}
          onRulesOpen={schedule.handleRulesOpen}
        />
      )}

      {/* Modals and Sheets */}
      <DayEditorSheet
        visible={schedule.dayEditorOpen}
        onClose={schedule.handleDayEditorClose}
        dayOfWeek={schedule.dayEditorConfig?.dayOfWeek ?? 0}
        dateStr={schedule.dayEditorConfig?.dateStr}
        template={schedule.dayEditorConfig?.template}
        existingOverride={schedule.dayEditorConfig?.override}
        existingTemplatesForDay={schedule.dayEditorConfig?.existingTemplatesForDay}
        venues={schedule.venues}
        defaultScope={schedule.dayEditorConfig?.defaultScope}
        coachId={schedule.coachId}
        onSaveRecurring={schedule.handleSaveRecurring}
        onSaveOverride={schedule.handleSaveOverride}
        onSaveRepeatedOverride={schedule.handleSaveRepeatedOverride}
        onDeleteTemplate={schedule.handleDeleteTemplate}
        onAddVenue={schedule.handleAddVenue}
      />

      <TimeOffSheet
        visible={schedule.timeOffOpen}
        onClose={schedule.handleTimeOffClose}
        coachId={schedule.coachId}
        preselectedDate={schedule.timeOffConfig?.preselectedDate}
        existingOverride={schedule.timeOffConfig?.existingOverride}
        onSaved={schedule.handleTimeOffSaved}
      />

      <SchedulingRulesModal
        visible={schedule.showRulesModal}
        onClose={schedule.handleRulesClose}
        coachId={schedule.coachId}
      />

      <SessionTypeModal
        visible={schedule.showSessionTypeModal}
        onClose={schedule.handleSessionTypeClose}
        existing={schedule.editingSessionType}
        onSave={schedule.handleSessionTypeSave}
        onDelete={schedule.editingSessionType ? schedule.handleSessionTypeDelete : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.lg,
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
