/**
 * Coach Schedule - The Command Center
 *
 * Design Philosophy (Steve Jobs style):
 * - TODAY is the hero - what's happening right now matters most
 * - One screen does everything - no menu of links to elsewhere
 * - Progressive disclosure - simple surface, power underneath
 * - Every element is actionable - no dead ends
 *
 * Two segments: Sessions (default) and Availability
 */

import { useCallback, useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiClient } from '@/services/api-client';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ScreenHeader } from '@/components/primitives/screen-header';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { availabilityService } from '@/services/availability-service';
import { schedulingRulesService } from '@/services/scheduling-rules-service';
import type { AvailabilityTemplate, AvailabilityOverride, SessionOffering, CoachSchedulingRules, BlockedDateRange, Booking, CoachVenue } from '@/constants/types';

import { SchedulingRulesModal } from '@/components/coach/scheduling-rules-modal';
import { SessionTypeChips } from '@/components/coach/session-type-chips';
import { SessionTypeModal } from '@/components/coach/session-type-modal';
import { WeekPatternGrid } from '@/components/coach/week-pattern-grid';
import { DayEditorSheet } from '@/components/coach/day-editor-sheet';
import { TimeOffSheet } from '@/components/coach/time-off-sheet';
import { sessionTemplateService } from '@/services/session-template-service';
import { coachVenueService } from '@/services/coach-venue-service';
import type { SessionTemplate } from '@/constants/session-types';
import { createLogger } from '@/utils/logger';
import { toDateStr } from '@/utils/format';

const logger = createLogger('Schedule');

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type Segment = 'sessions' | 'availability';

interface DayData {
  date: Date;
  dateStr: string;
  dayName: string;
  dayShort: string;
  dayNum: number;
  isToday: boolean;
  isPast: boolean;
  sessions: SessionData[];
  availabilitySlots: number;
  isBlocked: boolean;
  hasOverride: boolean;
}

interface SessionData {
  id: string;
  title: string;
  time: string;
  endTime: string;
  athleteName?: string;
  athleteCount?: number;
  location?: string;
  status: 'confirmed' | 'pending';
  type: 'booking' | 'offering';
  seriesId?: string;
  seriesIndex?: number;
  seriesTotalWeeks?: number;
}

export default function ScheduleScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const params = useLocalSearchParams<{ segment?: string }>();

  const [segment, setSegment] = useState<Segment>('sessions');
  const [templates, setTemplates] = useState<AvailabilityTemplate[]>([]);
  const [offerings, setOfferings] = useState<SessionOffering[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rules, setRules] = useState<CoachSchedulingRules | null>(null);
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

  // Availability segment state
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [sessionTemplates, setSessionTemplates] = useState<SessionTemplate[]>([]);
  const [showSessionTypeModal, setShowSessionTypeModal] = useState(false);
  const [editingSessionType, setEditingSessionType] = useState<SessionTemplate | null>(null);

  // Unified Week Editor state
  const [dayEditorOpen, setDayEditorOpen] = useState(false);
  const [dayEditorConfig, setDayEditorConfig] = useState<{
    dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    dateStr?: string;
    template?: AvailabilityTemplate | null;
    override?: AvailabilityOverride | null;
    existingTemplatesForDay?: AvailabilityTemplate[];
    defaultScope?: 'recurring' | 'just-this-date' | 'next-n-weeks';
  } | null>(null);
  const [venues, setVenues] = useState<CoachVenue[]>([]);

  // Time Off state
  const [timeOffOpen, setTimeOffOpen] = useState(false);
  const [timeOffConfig, setTimeOffConfig] = useState<{
    preselectedDate?: string;
    existingOverride?: AvailabilityOverride | null;
  } | null>(null);

  const coachId = currentUser?.id || 'coach_1';

  // Sync segment from URL params
  useEffect(() => {
    if (params.segment === 'availability') {
      setSegment('availability');
    }
  }, [params.segment]);

  // Load all data — uses Promise.allSettled so individual failures don't block updates
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load in parallel — allSettled ensures each result is independent
      const results = await Promise.allSettled([
        availabilityService.getTemplates(coachId),
        schedulingRulesService.getCoachRules(coachId),
        sessionTemplateService.getTemplates(coachId),
        availabilityService.getOverrides(coachId),
        coachVenueService.ensureDefaultVenues(coachId),
      ]);

      if (results[0].status === 'fulfilled') setTemplates(results[0].value);
      if (results[1].status === 'fulfilled') setRules(results[1].value);
      if (results[2].status === 'fulfilled') setSessionTemplates(results[2].value);
      if (results[3].status === 'fulfilled') setOverrides(results[3].value);
      if (results[4].status === 'fulfilled') setVenues(results[4].value);

      // Load offerings
      const all = await apiClient.get<SessionOffering[]>('session_offerings', []);
      setOfferings(all.filter(o => o.coachId === coachId));

      // Load bookings for this week
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 13); // Two weeks

      const coachBookings = await availabilityService.getCoachBookings(
        coachId,
        toDateStr(weekStart),
        toDateStr(weekEnd)
      );
      setBookings(coachBookings);

      // Load blocked dates
      try {
        const blockedKey = 'clubroom.blocked_dates';
        const allBlocked = await apiClient.get<Record<string, BlockedDateRange[]> | null>(blockedKey, null);
        if (allBlocked) {
          const coachBlocked = allBlocked[coachId] || [];
          const blockedSet = new Set<string>();
          for (const bd of coachBlocked) {
            // Expand date ranges into individual dates
            let cur = bd.startDate;
            while (cur <= bd.endDate) {
              blockedSet.add(cur);
              const d = new Date(cur + 'T12:00:00');
              d.setDate(d.getDate() + 1);
              cur = toDateStr(d);
            }
          }
          setBlockedDates(blockedSet);
        }
      } catch (err) {
        logger.warn('Failed to load blocked dates', err);
      }
    } catch (err) {
      logger.error('Failed to load schedule', err);
    } finally {
      setLoading(false);
    }
  }, [coachId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      // Default to today
      setSelectedDayIndex(new Date().getDay());
    }, [loadData])
  );

  // Build week data
  const weekData = useMemo((): DayData[] => {
    const today = new Date();
    const todayStr = toDateStr(today);
    const currentDay = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - currentDay);

    // Pre-compute series total counts for badge display
    const seriesCounts = new Map<string, number>();
    for (const b of bookings) {
      if (b.seriesId) {
        seriesCounts.set(b.seriesId, (seriesCounts.get(b.seriesId) ?? 0) + 1);
      }
    }

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dateStr = toDateStr(date);
      const dayOfWeek = date.getDay();

      // Get sessions for this day
      const daySessions: SessionData[] = [];

      // From bookings
      bookings.forEach((b) => {
        const bDate = b.scheduledAt?.split('T')[0];
        if (bDate === dateStr && b.status !== 'CANCELLED') {
          const startDate = new Date(b.scheduledAt);
          const endDate = new Date(startDate);
          endDate.setMinutes(endDate.getMinutes() + (b.duration || 60));

          daySessions.push({
            id: b.id,
            title: b.service || 'Session',
            time: startDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            endTime: endDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            athleteName: b.athleteName,
            location: b.location,
            status: b.status === 'CONFIRMED' ? 'confirmed' : 'pending',
            type: 'booking',
            seriesId: b.seriesId,
            seriesIndex: b.seriesIndex,
            seriesTotalWeeks: b.seriesId ? seriesCounts.get(b.seriesId) : undefined,
          });
        }
      });

      // From offerings
      offerings.forEach((o) => {
        const oDate = o.scheduledAt?.split('T')[0];
        if (oDate === dateStr && o.status !== 'cancelled') {
          const startDate = new Date(o.scheduledAt);
          const endDate = new Date(startDate);
          endDate.setMinutes(endDate.getMinutes() + (o.duration || 60));

          daySessions.push({
            id: o.id,
            title: o.title,
            time: startDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            endTime: endDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            athleteCount: o.registrations?.filter((r) => r.status === 'confirmed').length || 0,
            location: o.location,
            status: 'confirmed',
            type: 'offering',
          });
        }
      });

      daySessions.sort((a, b) => a.time.localeCompare(b.time));

      // Count availability slots
      const dayTemplates = templates.filter(t => t.dayOfWeek === dayOfWeek);
      const availabilitySlots = dayTemplates.length;

      // Check if this day has an active (non-blocked) override with custom slots
      const hasOverride = overrides.some(
        o => o.date === dateStr && !o.isBlocked && (o.customSlots?.length ?? 0) > 0
      );

      return {
        date,
        dateStr,
        dayName: DAYS_FULL[dayOfWeek],
        dayShort: DAYS[dayOfWeek],
        dayNum: date.getDate(),
        isToday: dateStr === todayStr,
        isPast: dateStr < todayStr,
        sessions: daySessions,
        availabilitySlots,
        isBlocked: blockedDates.has(dateStr) || overrides.some(o => o.date === dateStr && o.isBlocked),
        hasOverride,
      };
    });
  }, [templates, bookings, offerings, blockedDates, overrides]);

  // Today's data
  const todayData = weekData.find(d => d.isToday);
  const todaySessions = todayData?.sessions || [];
  const nextSession = todaySessions.find(s => {
    const now = new Date();
    const sessionTime = new Date();
    const [h, m] = s.time.split(':').map(Number);
    sessionTime.setHours(h, m, 0, 0);
    return sessionTime > now;
  });

  // Calculate time until next session
  const getTimeUntil = (timeStr: string): string => {
    const now = new Date();
    const sessionTime = new Date();
    const [h, m] = timeStr.split(':').map(Number);
    sessionTime.setHours(h, m, 0, 0);
    const diff = sessionTime.getTime() - now.getTime();
    if (diff < 0) return 'Now';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `in ${hours}h ${mins}m`;
    return `in ${mins}m`;
  };

  // Selected day
  const selectedDay = selectedDayIndex !== null ? weekData[selectedDayIndex] : null;

  // Handlers
  const handleDayPress = (index: number) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDayIndex(index);
  };

  const handleSessionPress = (session: SessionData) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(Routes.bookingCancel(session.id));
  };

  const handleAdjustDay = (dateStr: string) => {
    const dayOfWeek = new Date(dateStr + 'T00:00:00').getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    const allForDay = templates.filter((t) => t.dayOfWeek === dayOfWeek);
    const dayTemplate = allForDay[0] ?? null;
    const dayOverride = overrides.find((o) => o.date === dateStr) ?? null;
    setDayEditorConfig({
      dayOfWeek,
      dateStr,
      template: dayTemplate,
      override: dayOverride,
      existingTemplatesForDay: allForDay,
      defaultScope: 'just-this-date',
    });
    setDayEditorOpen(true);
  };

  const handleInviteFromSchedule = (dateStr: string) => {
    router.push({
      pathname: Routes.SESSION_INVITES_CREATE,
      params: { date: dateStr },
    });
  };

  const handleOpenSettings = () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(Routes.AVAILABILITY_SCHEDULING_RULES);
  };

  const handleTimeOffPress = (dateStr: string, existingOverride?: AvailabilityOverride) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeOffConfig({ preselectedDate: dateStr, existingOverride: existingOverride ?? null });
    setTimeOffOpen(true);
  };

  const handleSegmentChange = (s: Segment) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSegment(s);
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ThemedText style={{ color: palette.muted }}>Loading schedule...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header - OUTSIDE ScrollView for consistent positioning */}
      <View style={styles.headerRow}>
        <ScreenHeader
          title="Schedule"
          subtitle={segment === 'sessions' ? 'Your upcoming sessions' : 'Manage your availability'}
        />
        <Clickable onPress={handleOpenSettings} style={[styles.settingsButton, { backgroundColor: palette.surface }]}>
          <Ionicons name="settings-outline" size={22} color={palette.muted} />
        </Clickable>
      </View>

      {/* Segment Control */}
      <View style={[styles.segmentContainer, { paddingHorizontal: Spacing.lg }]}>
        <View style={[styles.segmentControl, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Clickable
            onPress={() => handleSegmentChange('sessions')}
            style={[
              styles.segmentButton,
              { backgroundColor: segment === 'sessions' ? palette.tint : 'transparent' },
            ]}
          >
            <ThemedText
              style={[
                styles.segmentText,
                { color: segment === 'sessions' ? palette.onPrimary : palette.muted },
              ]}
            >
              Sessions
            </ThemedText>
          </Clickable>
          <Clickable
            onPress={() => handleSegmentChange('availability')}
            style={[
              styles.segmentButton,
              { backgroundColor: segment === 'availability' ? palette.tint : 'transparent' },
            ]}
          >
            <ThemedText
              style={[
                styles.segmentText,
                { color: segment === 'availability' ? palette.onPrimary : palette.muted },
              ]}
            >
              Availability
            </ThemedText>
          </Clickable>
        </View>
      </View>

      {/* ============ SESSIONS SEGMENT ============ */}
      {segment === 'sessions' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* TODAY Hero Card */}
          {todayData && (
            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <SurfaceCard style={[styles.todayCard, { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border }]}>
                <View style={styles.todayHeader}>
                  <View>
                    <ThemedText style={[styles.todayLabel, { color: palette.muted }]}>TODAY</ThemedText>
                    <ThemedText style={[styles.todayDate, { color: palette.text }]}>
                      {todayData.dayName}, {todayData.date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                    </ThemedText>
                  </View>
                  <View style={styles.todayStats}>
                    <ThemedText style={[styles.todayStatValue, { color: palette.text }]}>{todaySessions.length}</ThemedText>
                    <ThemedText style={[styles.todayStatLabel, { color: palette.muted }]}>
                      session{todaySessions.length !== 1 ? 's' : ''}
                    </ThemedText>
                  </View>
                </View>

                {nextSession ? (
                  <View style={[styles.nextSessionBanner, { backgroundColor: palette.background }]}>
                    <View style={styles.nextSessionInfo}>
                      <ThemedText style={[styles.nextSessionTitle, { color: palette.text }]} numberOfLines={1}>
                        {nextSession.athleteName || nextSession.title}
                      </ThemedText>
                      <ThemedText style={[styles.nextSessionMeta, { color: palette.muted }]} numberOfLines={1}>
                        {nextSession.time} · {nextSession.location || 'Location TBD'}
                      </ThemedText>
                    </View>
                    <View style={[styles.nextSessionCountdown, { backgroundColor: palette.tint }]}>
                      <ThemedText style={[styles.countdownText, { color: palette.onPrimary }]}>
                        {getTimeUntil(nextSession.time)}
                      </ThemedText>
                    </View>
                  </View>
                ) : todaySessions.length === 0 ? (
                  <View style={[styles.todayEmpty, { borderTopColor: palette.border }]}>
                    <ThemedText style={[styles.todayEmptyText, { color: palette.muted }]}>
                      No sessions today - enjoy your free time!
                    </ThemedText>
                  </View>
                ) : (
                  <View style={[styles.todayEmpty, { borderTopColor: palette.border }]}>
                    <ThemedText style={[styles.todayEmptyText, { color: palette.muted }]}>
                      All done for today!
                    </ThemedText>
                  </View>
                )}
              </SurfaceCard>
            </Animated.View>
          )}

          {/* Week Strip */}
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <View style={styles.weekSection}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>This Week</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekStrip}>
                <View style={styles.weekDays}>
                  {weekData.map((day, index) => {
                    const isSelected = selectedDayIndex === index;
                    const hasSession = day.sessions.length > 0;
                    const hasAvailability = day.availabilitySlots > 0;

                    return (
                      <Clickable
                        key={day.dateStr}
                        onPress={() => handleDayPress(index)}
                        style={[
                          styles.dayPill,
                          {
                            backgroundColor: isSelected
                              ? palette.tint
                              : day.isToday
                              ? withAlpha(palette.tint, 0.09)
                              : palette.surface,
                            borderColor: day.isToday && !isSelected ? palette.tint : 'transparent',
                            borderWidth: day.isToday && !isSelected ? 1.5 : 0,
                          },
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.dayPillLabel,
                            { color: isSelected ? palette.surface : day.isPast ? palette.muted : palette.text },
                          ]}
                        >
                          {day.dayShort}
                        </ThemedText>
                        <ThemedText
                          style={[
                            styles.dayPillNum,
                            { color: isSelected ? palette.surface : day.isPast ? palette.muted : palette.text },
                          ]}
                        >
                          {day.dayNum}
                        </ThemedText>
                        {hasSession && !isSelected && (
                          <View style={[styles.dayDot, { backgroundColor: palette.success }]} />
                        )}
                        {!hasSession && hasAvailability && !isSelected && (
                          <View style={[styles.dayDot, { backgroundColor: palette.border }]} />
                        )}
                        {day.hasOverride && !isSelected && (
                          <View style={[styles.overrideDot, { borderColor: palette.warning }]} />
                        )}
                      </Clickable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </Animated.View>

          {/* Selected Day Detail */}
          {selectedDay && (
            <Animated.View entering={FadeInDown.delay(300).springify()}>
              <SurfaceCard style={styles.dayDetailCard}>
                <View style={styles.dayDetailHeader}>
                  <View>
                    <ThemedText type="subtitle">
                      {selectedDay.dayName}
                      {selectedDay.isToday && (
                        <ThemedText style={{ color: palette.tint }}> (Today)</ThemedText>
                      )}
                    </ThemedText>
                    <ThemedText style={[styles.dayDetailSub, { color: palette.muted }]}>
                      {selectedDay.sessions.length} session{selectedDay.sessions.length !== 1 ? 's' : ''} · {selectedDay.availabilitySlots} slot{selectedDay.availabilitySlots !== 1 ? 's' : ''} available
                    </ThemedText>
                    {selectedDay.isBlocked && (
                      <View style={[styles.adjustedBadge, { backgroundColor: withAlpha(palette.error, 0.09) }]}>
                        <Ionicons name="airplane-outline" size={12} color={palette.error} />
                        <ThemedText style={[styles.adjustedBadgeText, { color: palette.error }]}>
                          Time Off
                        </ThemedText>
                      </View>
                    )}
                    {selectedDay.hasOverride && !selectedDay.isBlocked && (
                      <View style={[styles.adjustedBadge, { backgroundColor: withAlpha(palette.warning, 0.09) }]}>
                        <Ionicons name="swap-horizontal-outline" size={12} color={palette.warning} />
                        <ThemedText style={[styles.adjustedBadgeText, { color: palette.warning }]}>
                          Adjusted
                        </ThemedText>
                      </View>
                    )}
                  </View>
                  {!selectedDay.isPast && (
                    <Clickable
                      onPress={() => handleAdjustDay(selectedDay.dateStr)}
                      style={[styles.dayActionBtn, { borderColor: palette.border }]}
                    >
                      <Ionicons name="create-outline" size={18} color={palette.muted} />
                    </Clickable>
                  )}
                </View>

                {selectedDay.sessions.length === 0 ? (
                  <View style={[styles.emptyDay, { backgroundColor: palette.background }]}>
                    <Ionicons name="calendar-outline" size={32} color={palette.muted} />
                    <ThemedText style={[styles.emptyDayText, { color: palette.muted }]}>
                      {selectedDay.availabilitySlots > 0
                        ? 'Available but no bookings yet'
                        : 'No availability set for this day'}
                    </ThemedText>
                    {selectedDay.availabilitySlots > 0 && !selectedDay.isPast && (
                      <Clickable
                        onPress={() => handleInviteFromSchedule(selectedDay.dateStr)}
                        style={[styles.addSlotBtn, { backgroundColor: palette.success }]}
                      >
                        <Ionicons name="paper-plane-outline" size={16} color={palette.surface} />
                        <ThemedText style={[styles.addSlotBtnText, { color: palette.surface }]}>Invite to This Slot</ThemedText>
                      </Clickable>
                    )}
                  </View>
                ) : (
                  <View style={styles.sessionsList}>
                    {selectedDay.sessions.map((session) => (
                      <Clickable
                        key={session.id}
                        onPress={() => handleSessionPress(session)}
                        style={[
                          styles.sessionItem,
                          {
                            backgroundColor: palette.background,
                            borderLeftColor: session.status === 'pending' ? palette.warning : palette.success,
                          },
                        ]}
                      >
                        <View style={styles.sessionTime}>
                          <ThemedText type="defaultSemiBold" style={styles.sessionTimeText}>
                            {session.time}
                          </ThemedText>
                          <ThemedText style={[styles.sessionEndTime, { color: palette.muted }]}>
                            {session.endTime}
                          </ThemedText>
                        </View>
                        <View style={styles.sessionInfo}>
                          <View style={styles.sessionTitleRow}>
                            <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.sessionTitleText}>
                              {session.athleteName || session.title}
                            </ThemedText>
                            {session.type === 'offering' && session.athleteCount !== undefined && (
                              <View style={[styles.seriesBadge, { backgroundColor: withAlpha(palette.success, 0.1) }]}>
                                <Ionicons name="people-outline" size={10} color={palette.success} />
                                <ThemedText style={[styles.seriesBadgeText, { color: palette.success }]}>
                                  {session.athleteCount}
                                </ThemedText>
                              </View>
                            )}
                            {session.seriesId && session.seriesTotalWeeks ? (
                              <View style={[styles.seriesBadge, { backgroundColor: withAlpha(palette.tint, 0.1) }]}>
                                <Ionicons name="repeat-outline" size={10} color={palette.tint} />
                                <ThemedText style={[styles.seriesBadgeText, { color: palette.tint }]}>
                                  {(session.seriesIndex ?? 0) + 1}/{session.seriesTotalWeeks}
                                </ThemedText>
                              </View>
                            ) : null}
                          </View>
                          {session.location && (
                            <View style={styles.sessionMeta}>
                              <Ionicons name="location-outline" size={12} color={palette.tint} />
                              <ThemedText style={[styles.sessionMetaText, { color: palette.tint }]}>
                                {session.location}
                              </ThemedText>
                            </View>
                          )}
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={palette.muted} />
                      </Clickable>
                    ))}
                  </View>
                )}
              </SurfaceCard>
            </Animated.View>
          )}

          {/* Quick Actions */}
          <Animated.View entering={FadeInDown.delay(400).springify()}>
            <View style={styles.quickActions}>
              <Clickable
                onPress={() => router.push(Routes.SESSION_INVITES_CREATE)}
                style={[styles.quickAction, { backgroundColor: palette.surface }]}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
                  <Ionicons name="paper-plane-outline" size={22} color={palette.success} />
                </View>
                <ThemedText type="defaultSemiBold" style={styles.quickActionLabel}>
                  Send Invite
                </ThemedText>
              </Clickable>

              <Clickable
                onPress={() => router.push(Routes.BOOKINGS)}
                style={[styles.quickAction, { backgroundColor: palette.surface }]}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: withAlpha(palette.accent, 0.09) }]}>
                  <Ionicons name="calendar-outline" size={22} color={palette.accent} />
                </View>
                <ThemedText type="defaultSemiBold" style={styles.quickActionLabel}>
                  Bookings
                </ThemedText>
              </Clickable>

              <Clickable
                onPress={() => router.push(Routes.SESSIONS_CREATE)}
                style={[styles.quickAction, { backgroundColor: palette.surface }]}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                  <Ionicons name="add-circle-outline" size={22} color={palette.tint} />
                </View>
                <ThemedText type="defaultSemiBold" style={styles.quickActionLabel}>
                  New Session
                </ThemedText>
              </Clickable>
            </View>
          </Animated.View>

          {/* Rules Summary (if set) */}
          {rules && (
            <Animated.View entering={FadeInDown.delay(500).springify()}>
              <Clickable onPress={handleOpenSettings}>
                <SurfaceCard style={styles.rulesCard}>
                  <View style={styles.rulesHeader}>
                    <Ionicons name="shield-checkmark-outline" size={18} color={palette.muted} />
                    <ThemedText style={[styles.rulesTitle, { color: palette.muted }]}>
                      Booking Rules Active
                    </ThemedText>
                  </View>
                  <ThemedText style={[styles.rulesText, { color: palette.muted }]}>
                    {rules.minimumAdvanceBookingHours}h notice · {rules.bufferMinutesDefault}m buffer · {rules.allowSameDayBookings ? 'Same-day OK' : 'No same-day'}
                  </ThemedText>
                </SurfaceCard>
              </Clickable>
            </Animated.View>
          )}
        </ScrollView>
      )}

      {/* ============ AVAILABILITY SEGMENT ============ */}
      {segment === 'availability' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* Week Pattern Grid — replaces old wizard, day pills, and slot cards */}
          <WeekPatternGrid
            templates={templates}
            overrides={overrides}
            blockedDates={blockedDates}
            coachId={coachId}
            isSetupMode={templates.length === 0}
            onDayPress={(dow, templateId, dateStr) => {
              const tmpl = templateId ? templates.find((t) => t.id === templateId) ?? null : null;
              const allForDay = templates.filter((t) => t.dayOfWeek === dow);
              const dayOverride = dateStr ? overrides.find((o) => o.date === dateStr) ?? null : null;
              // New block → default recurring; editing existing → date-aware
              const isNewBlock = !templateId;
              setDayEditorConfig({
                dayOfWeek: dow as 0|1|2|3|4|5|6,
                dateStr,
                template: tmpl,
                override: dayOverride,
                existingTemplatesForDay: allForDay,
                defaultScope: isNewBlock ? 'recurring' : (dateStr ? 'just-this-date' : 'recurring'),
              });
              setDayEditorOpen(true);
            }}
            onTimeOffPress={handleTimeOffPress}
            onSetupComplete={async (newTemplates) => {
              for (const t of newTemplates) {
                await availabilityService.saveTemplate(t);
              }
              loadData();
            }}
          />

          {/* Session Types */}
          {templates.length > 0 && (
            <SessionTypeChips
              templates={sessionTemplates}
              onPress={(t) => {
                setEditingSessionType(t);
                setShowSessionTypeModal(true);
              }}
              onAdd={() => {
                setEditingSessionType(null);
                setShowSessionTypeModal(true);
              }}
            />
          )}

          {/* Take Time Off */}
          {templates.length > 0 && (
            <Clickable
              onPress={() => {
                if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTimeOffConfig({ preselectedDate: undefined, existingOverride: null });
                setTimeOffOpen(true);
              }}
              style={[styles.rulesBtn, { backgroundColor: palette.surface, borderColor: palette.border }]}
            >
              <Ionicons name="airplane-outline" size={18} color={palette.muted} />
              <ThemedText style={[styles.rulesBtnText, { color: palette.text }]}>Take Time Off</ThemedText>
              <Ionicons name="chevron-forward" size={16} color={palette.muted} />
            </Clickable>
          )}

          {/* Booking Rules */}
          {templates.length > 0 && (
            <Clickable
              onPress={() => {
                if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowRulesModal(true);
              }}
              style={[styles.rulesBtn, { backgroundColor: palette.surface, borderColor: palette.border }]}
            >
              <Ionicons name="settings-outline" size={18} color={palette.muted} />
              <ThemedText style={[styles.rulesBtnText, { color: palette.text }]}>Booking Rules</ThemedText>
              <Ionicons name="chevron-forward" size={16} color={palette.muted} />
            </Clickable>
          )}
        </ScrollView>
      )}

      {/* Day Editor Sheet (replaces RecurringTemplateModal + AdjustDayModal) */}
      <DayEditorSheet
        visible={dayEditorOpen}
        onClose={() => { setDayEditorOpen(false); setDayEditorConfig(null); }}
        dayOfWeek={dayEditorConfig?.dayOfWeek ?? 0}
        dateStr={dayEditorConfig?.dateStr}
        template={dayEditorConfig?.template}
        existingOverride={dayEditorConfig?.override}
        existingTemplatesForDay={dayEditorConfig?.existingTemplatesForDay}
        venues={venues}
        defaultScope={dayEditorConfig?.defaultScope}
        coachId={coachId}
        onSaveRecurring={async (data) => {
          const existing = dayEditorConfig?.template;
          const saved = await availabilityService.saveTemplate({
            ...(existing ? { id: existing.id } : {}),
            coachId,
            dayOfWeek: data.dayOfWeek as 0|1|2|3|4|5|6,
            startTime: data.startTime,
            endTime: data.endTime,
            isRecurring: true,
            maxConcurrent: existing?.maxConcurrent ?? 1,
            bufferMinutes: existing?.bufferMinutes ?? 15,
            location: data.location,
          });
          // Optimistically update templates so the new block shows immediately
          setTemplates((prev) => {
            if (existing) {
              return prev.map((t) => (t.id === existing.id ? saved : t));
            }
            return [...prev, saved];
          });
          setDayEditorOpen(false);
          setDayEditorConfig(null);
          loadData();
        }}
        onSaveOverride={async (data) => {
          const saved = await availabilityService.saveOverride({
            coachId,
            date: data.date,
            isBlocked: false,
            customSlots: [{ date: data.date, startTime: data.startTime, endTime: data.endTime, location: data.location }],
          });
          // Optimistically update overrides
          setOverrides((prev) => {
            const filtered = prev.filter((o) => !(o.coachId === coachId && o.date === data.date));
            return [...filtered, saved];
          });
          setDayEditorOpen(false);
          setDayEditorConfig(null);
          loadData();
        }}
        onSaveRepeatedOverride={async (data) => {
          const startDate = new Date(data.date + 'T12:00:00');
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + (data.repeatWeeks - 1) * 7);
          const repeatUntil = toDateStr(endDate);
          await availabilityService.saveRepeatedOverride({
            coachId,
            date: data.date,
            isBlocked: false,
            customSlots: [{ date: data.date, startTime: data.startTime, endTime: data.endTime, location: data.location }],
            repeatUntil,
          });
          setDayEditorOpen(false);
          setDayEditorConfig(null);
          loadData();
        }}
        onDeleteTemplate={async (id) => {
          await availabilityService.deleteTemplate(id);
          // Optimistically remove from state
          setTemplates((prev) => prev.filter((t) => t.id !== id));
          setDayEditorOpen(false);
          setDayEditorConfig(null);
          loadData();
        }}
        onAddVenue={async (label) => {
          await coachVenueService.saveVenue({ coachId, label });
          const updated = await coachVenueService.getVenues(coachId);
          setVenues(updated);
        }}
      />

      {/* Time Off Sheet */}
      <TimeOffSheet
        visible={timeOffOpen}
        onClose={() => { setTimeOffOpen(false); setTimeOffConfig(null); }}
        coachId={coachId}
        preselectedDate={timeOffConfig?.preselectedDate}
        existingOverride={timeOffConfig?.existingOverride}
        onSaved={async () => {
          // Refresh overrides immediately so the grid updates without full reload flash
          const freshOverrides = await availabilityService.getOverrides(coachId);
          setOverrides(freshOverrides);
          // Background-refresh everything else
          loadData();
        }}
      />

      {/* Scheduling Rules Modal */}
      <SchedulingRulesModal
        visible={showRulesModal}
        onClose={() => setShowRulesModal(false)}
        coachId={coachId}
      />

      {/* Session Type Modal */}
      <SessionTypeModal
        visible={showSessionTypeModal}
        onClose={() => {
          setShowSessionTypeModal(false);
          setEditingSessionType(null);
        }}
        existing={editingSessionType}
        onSave={async (data) => {
          if (editingSessionType) {
            await sessionTemplateService.saveTemplate({
              ...data,
              id: editingSessionType.id,
              coachId,
              createdAt: editingSessionType.createdAt,
              skillsFocus: editingSessionType.skillsFocus,
            });
          } else {
            await sessionTemplateService.saveTemplate({
              ...data,
              coachId,
              skillsFocus: [],
            });
          }
          const updated = await sessionTemplateService.getTemplates(coachId);
          setSessionTemplates(updated);
          setShowSessionTypeModal(false);
          setEditingSessionType(null);
        }}
        onDelete={editingSessionType ? async () => {
          await sessionTemplateService.deleteTemplate(editingSessionType.id);
          const updated = await sessionTemplateService.getTemplates(coachId);
          setSessionTemplates(updated);
          setShowSessionTypeModal(false);
          setEditingSessionType(null);
        } : undefined}
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
    paddingBottom: Spacing['2xl'],
    gap: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: Spacing.md,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Segment Control
  segmentContainer: {
    paddingBottom: Spacing.sm,
  },
  segmentControl: {
    flexDirection: 'row',
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: 3,
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.sm,
  },
  segmentText: {
    ...Typography.smallSemiBold,
  },
  // TODAY Card
  todayCard: {
    padding: Spacing.lg,
    borderRadius: Radii.lg,
  },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  todayLabel: {
    ...Typography.micro,
    letterSpacing: 1,
  },
  todayDate: {
    ...Typography.title,
    marginTop: Spacing.micro,
  },
  todayStats: {
    alignItems: 'flex-end',
  },
  todayStatValue: {
    ...Typography.display,
  },
  todayStatLabel: {
    ...Typography.caption,
  },
  nextSessionBanner: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radii.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextSessionInfo: {
    flex: 1,
  },
  nextSessionTitle: {
    ...Typography.subheading,
  },
  nextSessionMeta: {
    ...Typography.small,
    marginTop: Spacing.micro,
  },
  nextSessionCountdown: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
  },
  countdownText: {
    ...Typography.small,
  },
  todayEmpty: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  todayEmptyText: {
    ...Typography.body,
  },
  // Week Strip
  weekSection: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.body.fontSize,
  },
  weekStrip: {
    marginHorizontal: -Spacing.lg,
  },
  weekDays: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
  },
  dayPill: {
    width: 52,
    height: 72,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs / 4,
  },
  dayPillLabel: {
    ...Typography.caption,
  },
  dayPillNum: {
    ...Typography.title,
  },
  dayDot: {
    position: 'absolute',
    bottom: 8,
    width: 6,
    height: 6,
    borderRadius: Radii.xs,
  },
  overrideDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  // Day Detail
  dayDetailCard: {
    padding: Spacing.lg,
  },
  dayDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  dayDetailSub: {
    ...Typography.small,
    marginTop: Spacing.micro,
  },
  adjustedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
    marginTop: Spacing.xs,
    alignSelf: 'flex-start',
  },
  adjustedBadgeText: {
    ...Typography.micro,
    fontWeight: '600',
  },
  dayActionBtn: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDay: {
    alignItems: 'center',
    padding: Spacing.xl,
    borderRadius: Radii.md,
    gap: Spacing.sm,
  },
  emptyDayText: {
    ...Typography.body,
    textAlign: 'center',
  },
  addSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    marginTop: Spacing.sm,
  },
  addSlotBtnText: {
    fontWeight: '600',
    fontSize: Typography.body.fontSize,
  },
  sessionsList: {
    gap: Spacing.sm,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderLeftWidth: 3,
    gap: Spacing.md,
  },
  sessionTime: {
    alignItems: 'center',
    minWidth: 50,
  },
  sessionTimeText: {
    fontSize: Typography.body.fontSize,
  },
  sessionEndTime: {
    fontSize: Typography.micro.fontSize,
  },
  sessionInfo: {
    flex: 1,
    gap: Spacing.xs / 2,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  sessionMetaText: {
    ...Typography.caption,
  },
  sessionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sessionTitleText: {
    flex: 1,
  },
  seriesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  seriesBadgeText: {
    ...Typography.micro,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    gap: Spacing.sm,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    ...Typography.caption,
  },
  // Rules Card
  rulesCard: {
    padding: Spacing.md,
  },
  rulesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  rulesTitle: {
    ...Typography.caption,
  },
  rulesText: {
    ...Typography.caption,
    marginTop: Spacing.xs / 2,
  },

  // ============ AVAILABILITY SEGMENT STYLES ============
  rulesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  rulesBtnText: {
    ...Typography.bodySmall,
    flex: 1,
  },
});
