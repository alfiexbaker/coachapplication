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
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
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
import type { AvailabilityTemplate, SessionOffering, CoachSchedulingRules, BlockedDateRange, Booking } from '@/constants/types';
import { RecurringTemplateModal } from '@/components/coach/recurring-template-modal';
import { BlockDateModal } from '@/components/coach/block-date-modal';
import { SchedulingRulesModal } from '@/components/coach/scheduling-rules-modal';
import { AvailabilitySetupWizard } from '@/components/coach/availability-setup-wizard';
import { SessionTypeChips } from '@/components/coach/session-type-chips';
import { SessionTypeModal } from '@/components/coach/session-type-modal';
import { AdjustDayModal } from '@/components/coach/adjust-day-modal';
import { sessionTemplateService } from '@/services/session-template-service';
import type { SessionTemplate } from '@/constants/session-types';
import { createLogger } from '@/utils/logger';

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
  const [loading, setLoading] = useState(true);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [showAddSlotModal, setShowAddSlotModal] = useState(false);
  const [preselectedDay, setPreselectedDay] = useState<number | undefined>();

  // Availability segment state
  const [selectedAvailDay, setSelectedAvailDay] = useState(new Date().getDay());
  const [showBlockDateModal, setShowBlockDateModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AvailabilityTemplate | null>(null);
  const [sessionTemplates, setSessionTemplates] = useState<SessionTemplate[]>([]);
  const [showSessionTypeModal, setShowSessionTypeModal] = useState(false);
  const [editingSessionType, setEditingSessionType] = useState<SessionTemplate | null>(null);
  const [showAdjustDayModal, setShowAdjustDayModal] = useState(false);
  const [adjustDayTarget, setAdjustDayTarget] = useState<{ dateStr: string; dayName: string; startTime?: string; endTime?: string } | null>(null);
  const [showBulkEditWizard, setShowBulkEditWizard] = useState(false);

  const coachId = currentUser?.id || 'coach_1';

  // Sync segment from URL params
  useEffect(() => {
    if (params.segment === 'availability') {
      setSegment('availability');
    }
  }, [params.segment]);

  // Load all data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load in parallel
      const [templatesData, rulesData, sessionTemplatesData] = await Promise.all([
        availabilityService.getTemplates(coachId),
        schedulingRulesService.getCoachRules(coachId),
        sessionTemplateService.getTemplates(coachId),
      ]);
      setTemplates(templatesData);
      setRules(rulesData);
      setSessionTemplates(sessionTemplatesData);

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
        weekStart.toISOString().split('T')[0],
        weekEnd.toISOString().split('T')[0]
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
              const d = new Date(cur + 'T00:00:00');
              d.setDate(d.getDate() + 1);
              cur = d.toISOString().split('T')[0];
            }
          }
          setBlockedDates(blockedSet);
        }
      } catch (err) {
        logger.warn('Failed to load blocked dates', err);
      }

      logger.debug('Loaded schedule data', {
        templates: templatesData.length,
        bookings: coachBookings.length,
      });
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
      const dateStr = date.toISOString().split('T')[0];
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

      return {
        date,
        dateStr,
        dayName: DAYS_FULL[dayOfWeek],
        dayShort: DAYS[dayOfWeek],
        dayNum: date.getDate(),
        isToday: dateStr === today.toISOString().split('T')[0],
        isPast: date < new Date(today.toISOString().split('T')[0]),
        sessions: daySessions,
        availabilitySlots,
        isBlocked: blockedDates.has(dateStr),
      };
    });
  }, [templates, bookings, offerings, blockedDates]);

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

  // Availability segment helpers
  const summaryStats = useMemo(() => {
    let totalMinutes = 0;
    const daysWithSlots = new Set<number>();
    templates.forEach(t => {
      const [startH, startM] = t.startTime.split(':').map(Number);
      const [endH, endM] = t.endTime.split(':').map(Number);
      totalMinutes += (endH * 60 + endM) - (startH * 60 + startM);
      daysWithSlots.add(t.dayOfWeek);
    });
    return {
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      daysCount: daysWithSlots.size,
      slotsCount: templates.length,
    };
  }, [templates]);

  const getDayTemplates = (dayOfWeek: number) => {
    return templates
      .filter(t => t.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  // Count bookings that fall within a template's time range for the next occurrence
  const getSlotFillCount = (template: AvailabilityTemplate): number => {
    // Find the next occurrence of this day of week
    const today = new Date();
    const currentDay = today.getDay();
    let daysUntil = template.dayOfWeek - currentDay;
    if (daysUntil < 0) daysUntil += 7;
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + daysUntil);
    const dateStr = nextDate.toISOString().split('T')[0];

    const [tStartH, tStartM] = template.startTime.split(':').map(Number);
    const [tEndH, tEndM] = template.endTime.split(':').map(Number);
    const templateStartMins = tStartH * 60 + tStartM;
    const templateEndMins = tEndH * 60 + tEndM;

    let count = 0;
    for (const b of bookings) {
      if (!b.scheduledAt || b.status === 'CANCELLED') continue;
      const bDate = b.scheduledAt.split('T')[0];
      if (bDate !== dateStr) continue;
      const bTime = new Date(b.scheduledAt);
      const bMins = bTime.getHours() * 60 + bTime.getMinutes();
      if (bMins >= templateStartMins && bMins < templateEndMins) {
        count++;
      }
    }

    // Also check today if it's the same day
    if (daysUntil !== 0) {
      const todayStr = today.toISOString().split('T')[0];
      for (const b of bookings) {
        if (!b.scheduledAt || b.status === 'CANCELLED') continue;
        const bDate = b.scheduledAt.split('T')[0];
        if (bDate !== todayStr) continue;
        if (new Date(todayStr + 'T00:00:00').getDay() !== template.dayOfWeek) continue;
        const bTime = new Date(b.scheduledAt);
        const bMins = bTime.getHours() * 60 + bTime.getMinutes();
        if (bMins >= templateStartMins && bMins < templateEndMins) {
          count++;
        }
      }
    }

    return count;
  };

  const formatTimeRange = (start: string, end: string) => {
    const formatTime = (time: string) => {
      const [h] = time.split(':').map(Number);
      if (h === 12) return '12pm';
      if (h === 0) return '12am';
      return h > 12 ? `${h - 12}pm` : `${h}am`;
    };
    return `${formatTime(start)} - ${formatTime(end)}`;
  };

  const selectedAvailDaySlots = getDayTemplates(selectedAvailDay);
  const todayIndex = new Date().getDay();

  // Selected day
  const selectedDay = selectedDayIndex !== null ? weekData[selectedDayIndex] : null;

  // Handlers
  const handleDayPress = (index: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDayIndex(index);
  };

  const handleSessionPress = (session: SessionData) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(Routes.bookingCancel(session.id));
  };

  const handleAddSlot = (dayIndex?: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingTemplate(null);
    setPreselectedDay(dayIndex);
    setShowAddSlotModal(true);
  };

  const handleBlockDay = async (dateStr: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Check for conflicts before blocking
    const conflicts = await availabilityService.checkConflicts(coachId, [dateStr]);
    const total = conflicts.bookingCount + conflicts.holdCount;

    if (total > 0) {
      const parts: string[] = [];
      if (conflicts.bookingCount > 0) {
        parts.push(`${conflicts.bookingCount} booking${conflicts.bookingCount !== 1 ? 's' : ''}`);
      }
      if (conflicts.holdCount > 0) {
        parts.push(`${conflicts.holdCount} pending invite${conflicts.holdCount !== 1 ? 's' : ''}`);
      }

      Alert.alert(
        'This Day Has Appointments',
        `You have ${parts.join(' and ')} on this day. Blocking won't cancel them, but no new bookings can be made.\n\nExisting sessions will still happen.`,
        [
          { text: 'Keep Available', style: 'cancel' },
          {
            text: 'Block Anyway',
            style: 'destructive',
            onPress: async () => {
              await availabilityService.blockDate(coachId, dateStr, 'Blocked from schedule');
              await loadData();
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Block This Day?',
        'No new bookings will be allowed on this day.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Block Day',
            style: 'destructive',
            onPress: async () => {
              await availabilityService.blockDate(coachId, dateStr, 'Blocked from schedule');
              await loadData();
            },
          },
        ]
      );
    }
  };

  const handleAdjustDay = (dateStr: string, dayName: string) => {
    // Find the template for this day to get default times
    const dayOfWeek = new Date(dateStr + 'T00:00:00').getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    const dayTemplate = templates.find((t) => t.dayOfWeek === dayOfWeek);
    setAdjustDayTarget({
      dateStr,
      dayName,
      startTime: dayTemplate?.startTime,
      endTime: dayTemplate?.endTime,
    });
    setShowAdjustDayModal(true);
  };

  const handleSaveAdjustDay = async (data: { startTime: string; endTime: string }) => {
    if (!adjustDayTarget) return;

    // Check for conflicts on this specific date
    const conflicts = await availabilityService.checkConflicts(coachId, [adjustDayTarget.dateStr]);
    const total = conflicts.bookingCount + conflicts.holdCount;

    const doSave = async () => {
      await availabilityService.saveOverride({
        coachId,
        date: adjustDayTarget.dateStr,
        isBlocked: false,
        customSlots: [{ date: adjustDayTarget.dateStr, startTime: data.startTime, endTime: data.endTime }],
      });
      await loadData();
      setShowAdjustDayModal(false);
      setAdjustDayTarget(null);
    };

    if (total > 0) {
      const parts: string[] = [];
      if (conflicts.bookingCount > 0) parts.push(`${conflicts.bookingCount} booking${conflicts.bookingCount !== 1 ? 's' : ''}`);
      if (conflicts.holdCount > 0) parts.push(`${conflicts.holdCount} pending invite${conflicts.holdCount !== 1 ? 's' : ''}`);

      Alert.alert(
        'Appointments on This Day',
        `You have ${parts.join(' and ')} that may fall outside your new hours. They won't be cancelled, but check they still fit.`,
        [
          { text: 'Go Back', style: 'cancel' },
          { text: 'Save Anyway', onPress: doSave },
        ]
      );
    } else {
      await doSave();
    }
  };

  const handleInviteFromSchedule = (dateStr: string) => {
    router.push({
      pathname: Routes.SESSION_INVITES_CREATE,
      params: { date: dateStr },
    });
  };

  const handleSaveTemplate = async (templateData: Omit<AvailabilityTemplate, 'id' | 'coachId'>) => {
    if (editingTemplate) {
      await availabilityService.saveTemplate({ ...templateData, id: editingTemplate.id, coachId });
    } else {
      await availabilityService.saveTemplate({ ...templateData, coachId });
    }
    await loadData();
    setShowAddSlotModal(false);
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    await availabilityService.deleteTemplate(templateId);
    await loadData();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleEditSlot = (template: AvailabilityTemplate) => {
    setEditingTemplate(template);
    setPreselectedDay(undefined);
    setShowAddSlotModal(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDeleteSlot = async (template: AvailabilityTemplate) => {
    // Check for conflicts on this recurring day before deleting
    const conflicts = await availabilityService.checkRecurringConflicts(coachId, template.dayOfWeek);
    const total = conflicts.bookingCount + conflicts.holdCount;

    if (total > 0) {
      const parts: string[] = [];
      if (conflicts.bookingCount > 0) {
        parts.push(`${conflicts.bookingCount} booking${conflicts.bookingCount !== 1 ? 's' : ''}`);
      }
      if (conflicts.holdCount > 0) {
        parts.push(`${conflicts.holdCount} pending invite${conflicts.holdCount !== 1 ? 's' : ''}`);
      }

      Alert.alert(
        'Appointments Exist',
        `You have ${parts.join(' and ')} on upcoming ${DAYS_FULL[template.dayOfWeek]}s.\n\nRemoving this slot won't cancel existing appointments, but will stop new ones from being booked.`,
        [
          { text: 'Keep Slot', style: 'cancel' },
          {
            text: 'Remove Anyway',
            style: 'destructive',
            onPress: () => handleDeleteTemplate(template.id),
          },
        ]
      );
    } else {
      Alert.alert(
        'Delete Slot',
        `Remove this ${formatTimeRange(template.startTime, template.endTime)} slot from ${DAYS_FULL[template.dayOfWeek]}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => handleDeleteTemplate(template.id),
          },
        ]
      );
    }
  };

  const handleBlockDates = async (dates: string[], reason: string) => {
    // Check for conflicts across all dates being blocked
    const conflicts = await availabilityService.checkConflicts(coachId, dates);
    const total = conflicts.bookingCount + conflicts.holdCount;

    const doBlock = async () => {
      for (const date of dates) {
        await availabilityService.saveOverride({
          coachId,
          date,
          isBlocked: true,
          reason,
        });
      }
    };

    if (total > 0) {
      const parts: string[] = [];
      if (conflicts.bookingCount > 0) parts.push(`${conflicts.bookingCount} booking${conflicts.bookingCount !== 1 ? 's' : ''}`);
      if (conflicts.holdCount > 0) parts.push(`${conflicts.holdCount} pending invite${conflicts.holdCount !== 1 ? 's' : ''}`);

      return new Promise<void>((resolve) => {
        Alert.alert(
          'Appointments Found',
          `${parts.join(' and ')} across ${dates.length} day${dates.length !== 1 ? 's' : ''} being blocked. Existing appointments won't be cancelled.`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve() },
            {
              text: 'Block Anyway',
              style: 'destructive',
              onPress: async () => { await doBlock(); resolve(); },
            },
          ]
        );
      });
    }

    await doBlock();
  };

  const handleOpenSettings = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(Routes.AVAILABILITY_SCHEDULING_RULES);
  };

  const handleSegmentChange = (s: Segment) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                { color: segment === 'sessions' ? Colors.light.onPrimary : palette.muted },
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
                { color: segment === 'availability' ? Colors.light.onPrimary : palette.muted },
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
                  <View style={styles.nextSessionBanner}>
                    <View style={styles.nextSessionInfo}>
                      <ThemedText style={[styles.nextSessionTitle, { color: palette.text }]} numberOfLines={1}>
                        {nextSession.athleteName || nextSession.title}
                      </ThemedText>
                      <ThemedText style={[styles.nextSessionMeta, { color: palette.muted }]} numberOfLines={1}>
                        {nextSession.time} · {nextSession.location || 'Location TBD'}
                      </ThemedText>
                    </View>
                    <View style={styles.nextSessionCountdown}>
                      <ThemedText style={styles.countdownText}>
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
                  </View>
                  <View style={styles.dayActions}>
                    {!selectedDay.isPast && (
                      <Clickable
                        onPress={() => handleAdjustDay(selectedDay.dateStr, selectedDay.dayName)}
                        style={[styles.dayActionBtn, { borderColor: palette.border }]}
                      >
                        <Ionicons name="create-outline" size={18} color={palette.muted} />
                      </Clickable>
                    )}
                    <Clickable
                      onPress={() => handleAddSlot(selectedDay.date.getDay())}
                      style={[styles.dayActionBtn, { borderColor: palette.tint }]}
                    >
                      <Ionicons name="add" size={18} color={palette.tint} />
                    </Clickable>
                    {!selectedDay.isPast && (
                      <Clickable
                        onPress={() => handleBlockDay(selectedDay.dateStr)}
                        style={[styles.dayActionBtn, { borderColor: palette.border }]}
                      >
                        <Ionicons name="close" size={18} color={palette.muted} />
                      </Clickable>
                    )}
                  </View>
                </View>

                {selectedDay.sessions.length === 0 ? (
                  <View style={[styles.emptyDay, { backgroundColor: palette.background }]}>
                    <Ionicons name="calendar-outline" size={32} color={palette.muted} />
                    <ThemedText style={[styles.emptyDayText, { color: palette.muted }]}>
                      {selectedDay.availabilitySlots > 0
                        ? 'Available but no bookings yet'
                        : 'No availability set for this day'}
                    </ThemedText>
                    {selectedDay.availabilitySlots > 0 && !selectedDay.isPast ? (
                      <Clickable
                        onPress={() => handleInviteFromSchedule(selectedDay.dateStr)}
                        style={[styles.addSlotBtn, { backgroundColor: palette.success }]}
                      >
                        <Ionicons name="paper-plane-outline" size={16} color={palette.surface} />
                        <ThemedText style={[styles.addSlotBtnText, { color: palette.surface }]}>Invite to This Slot</ThemedText>
                      </Clickable>
                    ) : selectedDay.availabilitySlots === 0 ? (
                      <Clickable
                        onPress={() => handleAddSlot(selectedDay.date.getDay())}
                        style={[styles.addSlotBtn, { backgroundColor: palette.tint }]}
                      >
                        <Ionicons name="add" size={16} color={palette.surface} />
                        <ThemedText style={[styles.addSlotBtnText, { color: palette.surface }]}>Add Availability</ThemedText>
                      </Clickable>
                    ) : null}
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
          {templates.length === 0 ? (
            <AvailabilitySetupWizard coachId={coachId} onComplete={loadData} sessionTemplates={sessionTemplates} />
          ) : showBulkEditWizard ? (
            <AvailabilitySetupWizard
              coachId={coachId}
              existingTemplates={templates}
              title="Edit Weekly Hours"
              sessionTemplates={sessionTemplates}
              onComplete={() => {
                setShowBulkEditWizard(false);
                loadData();
              }}
            />
          ) : (
            <>
              {/* Summary Stats Row */}
              <SurfaceCard style={styles.availSummaryCard}>
                <View style={styles.availSummaryRow}>
                  <View style={styles.availSummaryItem}>
                    <ThemedText style={[styles.availSummaryValue, { color: palette.tint }]}>
                      {summaryStats.totalHours}
                    </ThemedText>
                    <ThemedText style={[styles.availSummaryLabel, { color: palette.muted }]}>
                      hrs/week
                    </ThemedText>
                  </View>
                  <View style={[styles.availSummaryDivider, { backgroundColor: palette.border }]} />
                  <View style={styles.availSummaryItem}>
                    <ThemedText style={[styles.availSummaryValue, { color: palette.tint }]}>
                      {summaryStats.daysCount}
                    </ThemedText>
                    <ThemedText style={[styles.availSummaryLabel, { color: palette.muted }]}>
                      days
                    </ThemedText>
                  </View>
                  <View style={[styles.availSummaryDivider, { backgroundColor: palette.border }]} />
                  <View style={styles.availSummaryItem}>
                    <ThemedText style={[styles.availSummaryValue, { color: palette.tint }]}>
                      {summaryStats.slotsCount}
                    </ThemedText>
                    <ThemedText style={[styles.availSummaryLabel, { color: palette.muted }]}>
                      slots
                    </ThemedText>
                  </View>
                </View>
              </SurfaceCard>

              {/* Edit Weekly Hours Button */}
              <Clickable
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowBulkEditWizard(true);
                }}
                style={[styles.editWeeklyBtn, { borderColor: palette.tint }]}
              >
                <Ionicons name="create-outline" size={18} color={palette.tint} />
                <ThemedText style={[styles.editWeeklyBtnText, { color: palette.tint }]}>
                  Edit Weekly Hours
                </ThemedText>
              </Clickable>

              {/* Session Types */}
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

              {/* Day Selector Pills */}
              <View style={styles.availDayPills}>
                {DAYS.map((day, index) => {
                  const daySlots = getDayTemplates(index);
                  const hasSlots = daySlots.length > 0;
                  const isSelected = selectedAvailDay === index;
                  const isToday = todayIndex === index;

                  return (
                    <TouchableOpacity
                      key={day}
                      onPress={() => {
                        setSelectedAvailDay(index);
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={[
                        styles.availDayPill,
                        {
                          backgroundColor: isSelected
                            ? palette.tint
                            : hasSlots
                            ? withAlpha(palette.success, 0.09)
                            : palette.background,
                          borderColor: isToday ? palette.tint : palette.border,
                          borderWidth: isToday ? 2 : 1,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.availDayPillText,
                          {
                            color: isSelected
                              ? Colors.light.onPrimary
                              : hasSlots
                              ? palette.success
                              : palette.muted,
                            fontWeight: isSelected || isToday ? '700' : '500',
                          },
                        ]}
                      >
                        {day}
                      </ThemedText>
                      {hasSlots && !isSelected && (
                        <View style={[styles.availDayDot, { backgroundColor: palette.success }]} />
                      )}
                      {isSelected && (
                        <ThemedText style={styles.availSlotCount}>
                          {daySlots.length}
                        </ThemedText>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Selected Day Slot Cards */}
              <SurfaceCard style={styles.availDayDetailCard}>
                <View style={styles.availDayDetailHeader}>
                  <View>
                    <ThemedText type="subtitle">{DAYS_FULL[selectedAvailDay]}</ThemedText>
                    <ThemedText style={[styles.availDayDetailSubtitle, { color: palette.muted }]}>
                      {selectedAvailDaySlots.length === 0
                        ? 'No availability set'
                        : `${selectedAvailDaySlots.length} slot${selectedAvailDaySlots.length !== 1 ? 's' : ''}`}
                    </ThemedText>
                  </View>
                  {selectedAvailDaySlots.length > 0 && (
                    <TouchableOpacity
                      style={[styles.availMiniAddButton, { borderColor: palette.tint }]}
                      onPress={() => handleAddSlot(selectedAvailDay)}
                    >
                      <Ionicons name="add" size={16} color={palette.tint} />
                    </TouchableOpacity>
                  )}
                </View>

                {selectedAvailDaySlots.length === 0 ? (
                  <View style={[styles.availEmptyState, { backgroundColor: palette.background }]}>
                    <Ionicons name="calendar-outline" size={40} color={palette.muted} />
                    <ThemedText style={[styles.availEmptyTitle, { color: palette.text }]}>
                      Not available
                    </ThemedText>
                    <ThemedText style={[styles.availEmptyText, { color: palette.muted }]}>
                      Add availability so athletes can book on {DAYS_FULL[selectedAvailDay]}
                    </ThemedText>
                    <TouchableOpacity
                      style={[styles.availEmptyAddButton, { backgroundColor: palette.tint }]}
                      onPress={() => handleAddSlot(selectedAvailDay)}
                    >
                      <Ionicons name="add" size={18} color={Colors.light.onPrimary} />
                      <ThemedText style={styles.availEmptyAddButtonText}>Add Slot</ThemedText>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.availSlotsList}>
                    {selectedAvailDaySlots.map((template) => {
                      const [startH, startM] = template.startTime.split(':').map(Number);
                      const [endH, endM] = template.endTime.split(':').map(Number);
                      const durationMins = (endH * 60 + endM) - (startH * 60 + startM);
                      const durationHrs = Math.floor(durationMins / 60);
                      const durationRemainder = durationMins % 60;
                      const durationLabel = durationRemainder === 0
                        ? `${durationHrs} hour${durationHrs !== 1 ? 's' : ''}`
                        : `${durationHrs}h ${durationRemainder}m`;

                      // Look up linked session template
                      const linkedTemplate = template.sessionTemplateId
                        ? sessionTemplates.find(st => st.id === template.sessionTemplateId)
                        : undefined;

                      // Fill rate for group slots
                      const fillCount = template.maxConcurrent > 1 ? getSlotFillCount(template) : 0;
                      const fillRatio = template.maxConcurrent > 1 ? fillCount / template.maxConcurrent : 0;

                      return (
                        <View
                          key={template.id}
                          style={[styles.availSlotCard, { backgroundColor: palette.background, borderColor: palette.border }]}
                        >
                          <View style={[styles.availSlotTime, { backgroundColor: withAlpha(palette.success, 0.07) }]}>
                            <Ionicons name="time-outline" size={16} color={palette.success} />
                            <ThemedText style={[styles.availSlotTimeText, { color: palette.success }]}>
                              {formatTimeRange(template.startTime, template.endTime)}
                            </ThemedText>
                          </View>

                          <View style={styles.availSlotInfo}>
                            <View style={styles.availSlotInfoRow}>
                              <ThemedText style={styles.availSlotDuration}>
                                {durationLabel}
                              </ThemedText>
                              {linkedTemplate ? (
                                <View style={[styles.availSessionTypeBadge, { backgroundColor: withAlpha(palette.accent, 0.09) }]}>
                                  <Ionicons
                                    name={linkedTemplate.capacity === 1 ? 'person-outline' : 'people-outline'}
                                    size={10}
                                    color={palette.accent}
                                  />
                                  <ThemedText style={[styles.availSessionTypeBadgeText, { color: palette.accent }]}>
                                    {linkedTemplate.name}
                                  </ThemedText>
                                </View>
                              ) : template.maxConcurrent > 1 ? (
                                <View style={[styles.availSessionTypeBadge, { backgroundColor: withAlpha(palette.info, 0.07) }]}>
                                  <Ionicons name="people-outline" size={10} color={palette.info} />
                                  <ThemedText style={[styles.availSessionTypeBadgeText, { color: palette.info }]}>
                                    Group
                                  </ThemedText>
                                </View>
                              ) : (
                                <View style={[styles.availSessionTypeBadge, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
                                  <Ionicons name="person-outline" size={10} color={palette.tint} />
                                  <ThemedText style={[styles.availSessionTypeBadgeText, { color: palette.tint }]}>
                                    1v1
                                  </ThemedText>
                                </View>
                              )}
                            </View>
                            {template.location && (
                              <View style={styles.availSlotMeta}>
                                <Ionicons name="location-outline" size={12} color={palette.muted} />
                                <ThemedText style={[styles.availSlotMetaText, { color: palette.muted }]}>
                                  {template.location}
                                </ThemedText>
                              </View>
                            )}
                            {template.maxConcurrent > 1 && (
                              <View style={styles.availFillRow}>
                                <View style={[styles.availFillBar, { backgroundColor: palette.border }]}>
                                  <View
                                    style={[
                                      styles.availFillBarFill,
                                      {
                                        width: `${Math.min(fillRatio * 100, 100)}%`,
                                        backgroundColor: fillRatio >= 1 ? palette.warning : palette.success,
                                      },
                                    ]}
                                  />
                                </View>
                                <ThemedText style={[styles.availFillText, {
                                  color: fillRatio >= 1 ? palette.warning : fillCount > 0 ? palette.success : palette.muted,
                                }]}>
                                  {fillCount}/{template.maxConcurrent} booked
                                </ThemedText>
                              </View>
                            )}
                          </View>

                          <View style={styles.availSlotActions}>
                            <TouchableOpacity
                              style={[styles.availSlotActionBtn, { borderColor: palette.border }]}
                              onPress={() => handleEditSlot(template)}
                            >
                              <Ionicons name="pencil-outline" size={16} color={palette.tint} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.availSlotActionBtn, { borderColor: palette.border }]}
                              onPress={() => handleDeleteSlot(template)}
                            >
                              <Ionicons name="trash-outline" size={16} color={palette.error} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </SurfaceCard>

              {/* Action Buttons */}
              <View style={styles.availActionRow}>
                <Clickable
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowBlockDateModal(true);
                  }}
                  style={[styles.availActionBtn, { backgroundColor: palette.surface, borderColor: palette.border }]}
                >
                  <View style={[styles.availActionBtnIcon, { backgroundColor: withAlpha(palette.error, 0.09) }]}>
                    <Ionicons name="calendar-outline" size={20} color={palette.error} />
                  </View>
                  <ThemedText type="defaultSemiBold" style={styles.availActionBtnLabel}>Block Time Off</ThemedText>
                </Clickable>

                <Clickable
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowRulesModal(true);
                  }}
                  style={[styles.availActionBtn, { backgroundColor: palette.surface, borderColor: palette.border }]}
                >
                  <View style={[styles.availActionBtnIcon, { backgroundColor: withAlpha(palette.warning, 0.09) }]}>
                    <Ionicons name="settings-outline" size={20} color={palette.warning} />
                  </View>
                  <ThemedText type="defaultSemiBold" style={styles.availActionBtnLabel}>Booking Rules</ThemedText>
                </Clickable>
              </View>

              {/* Add Slot Button */}
              <Clickable
                onPress={() => handleAddSlot(selectedAvailDay)}
                style={[styles.availAddSlotBtn, { backgroundColor: palette.tint }]}
              >
                <Ionicons name="add" size={20} color={Colors.light.onPrimary} />
                <ThemedText style={[styles.availAddSlotBtnText, { color: Colors.light.onPrimary }]}>
                  Add Slot
                </ThemedText>
              </Clickable>
            </>
          )}
        </ScrollView>
      )}

      {/* Add/Edit Slot Modal */}
      <RecurringTemplateModal
        visible={showAddSlotModal}
        onClose={() => {
          setShowAddSlotModal(false);
          setEditingTemplate(null);
          setPreselectedDay(undefined);
        }}
        onSave={handleSaveTemplate}
        onDelete={handleDeleteTemplate}
        editingTemplate={editingTemplate}
        preselectedDay={preselectedDay}
        sessionTemplates={sessionTemplates}
      />

      {/* Block Date Modal */}
      <BlockDateModal
        visible={showBlockDateModal}
        onClose={() => setShowBlockDateModal(false)}
        onBlock={handleBlockDates}
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
      <AdjustDayModal
        visible={showAdjustDayModal}
        onClose={() => {
          setShowAdjustDayModal(false);
          setAdjustDayTarget(null);
        }}
        onSave={handleSaveAdjustDay}
        date={adjustDayTarget?.dateStr || ''}
        dayName={adjustDayTarget?.dayName || ''}
        templateStartTime={adjustDayTarget?.startTime}
        templateEndTime={adjustDayTarget?.endTime}
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
    backgroundColor: Colors.light.background,
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
    backgroundColor: Colors.light.tint,
    borderRadius: Radii.md,
  },
  countdownText: {
    ...Typography.small,
    color: Colors.light.surface,
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
  dayActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  dayActionBtn: {
    width: 36,
    height: 36,
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
  availSummaryCard: {
    padding: Spacing.md,
  },
  availSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  availSummaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  availSummaryValue: {
    ...Typography.title,
  },
  availSummaryLabel: {
    ...Typography.caption,
    marginTop: Spacing.micro,
  },
  availSummaryDivider: {
    width: 1,
    height: 30,
  },
  availDayPills: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.xxs,
  },
  availDayPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    gap: Spacing.xxs,
  },
  availDayPillText: {
    ...Typography.caption,
  },
  availDayDot: {
    width: 4,
    height: 4,
    borderRadius: Radii.xs,
  },
  availSlotCount: {
    ...Typography.micro,
    color: Colors.light.onPrimary,
    fontWeight: '700',
  },
  availDayDetailCard: {
    padding: Spacing.md,
  },
  availDayDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  availDayDetailSubtitle: {
    ...Typography.small,
    marginTop: Spacing.micro,
  },
  availMiniAddButton: {
    width: 32,
    height: 32,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  availEmptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    borderRadius: Radii.md,
    gap: Spacing.xs,
  },
  availEmptyTitle: {
    ...Typography.subheading,
    marginTop: Spacing.sm,
  },
  availEmptyText: {
    ...Typography.bodySmall,
    textAlign: 'center',
    maxWidth: 240,
  },
  availEmptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    marginTop: Spacing.md,
  },
  availEmptyAddButtonText: {
    color: Colors.light.onPrimary,
    fontWeight: '600',
  },
  availSlotsList: {
    gap: Spacing.sm,
  },
  availSlotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  availSlotTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  availSlotTimeText: {
    ...Typography.smallSemiBold,
  },
  availSlotInfo: {
    flex: 1,
    gap: Spacing.xxs,
  },
  availSlotInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  availSlotDuration: {
    fontWeight: '500',
  },
  availSessionTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.micro,
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  availSessionTypeBadgeText: {
    ...Typography.micro,
  },
  availSlotMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  availSlotMetaText: {
    ...Typography.caption,
  },
  availSlotActions: {
    flexDirection: 'row',
    gap: Spacing.xxs,
  },
  availSlotActionBtn: {
    width: 32,
    height: 32,
    borderRadius: Radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  availActionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  availActionBtn: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  availActionBtnIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  availActionBtnLabel: {
    ...Typography.caption,
  },
  availAddSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
  },
  availAddSlotBtnText: {
    fontWeight: '600',
    fontSize: Typography.body.fontSize,
  },
  editWeeklyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  editWeeklyBtnText: {
    ...Typography.smallSemiBold,
  },
  availFillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.micro,
  },
  availFillBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  availFillBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  availFillText: {
    ...Typography.micro,
    fontWeight: '600',
    minWidth: 55,
  },
});
