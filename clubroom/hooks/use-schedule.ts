/**
 * useSchedule — Data hook for the Schedule screen.
 *
 * Manages all state for both Sessions and Availability segments:
 * - Week data computation (bookings + offerings per day)
 * - Availability templates, overrides, blocked dates
 * - Session templates, venues, scheduling rules
 * - Day editor and time-off sheet state
 * - Segment switching (sessions | availability)
 */

import { useCallback, useState, useMemo, useEffect } from 'react';
import { Platform } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Routes } from '@/navigation/routes';
import { apiClient } from '@/services/api-client';
import { availabilityService } from '@/services/availability-service';
import { schedulingRulesService } from '@/services/scheduling-rules-service';
import { sessionTemplateService } from '@/services/session-template-service';
import { coachVenueService } from '@/services/coach-venue-service';
import { ServiceEvents } from '@/services/event-bus';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { createLogger } from '@/utils/logger';
import { toDateStr } from '@/utils/format';
import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import type {
  AvailabilityTemplate,
  AvailabilityOverride,
  SessionOffering,
  CoachSchedulingRules,
  BlockedDateRange,
  Booking,
  CoachVenue,
} from '@/constants/types';
import type { SessionTemplate } from '@/constants/session-types';
import type {
  Segment,
  DayData,
  SessionData,
  DayEditorConfig,
  TimeOffConfig,
} from '@/components/schedule/schedule-types';
import { err, ok, serviceError } from '@/types/result';

const logger = createLogger('Schedule');

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface ScheduleLoadData {
  templates: AvailabilityTemplate[];
  offerings: SessionOffering[];
  bookings: Booking[];
  rules: CoachSchedulingRules | null;
  blockedDates: Set<string>;
  overrides: AvailabilityOverride[];
  sessionTemplates: SessionTemplate[];
  venues: CoachVenue[];
}

export function useSchedule() {
  const { currentUser } = useAuth();
  const params = useLocalSearchParams<{ segment?: string }>();

  const [segment, setSegment] = useState<Segment>('sessions');
  const [templates, setTemplates] = useState<AvailabilityTemplate[]>([]);
  const [offerings, setOfferings] = useState<SessionOffering[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rules, setRules] = useState<CoachSchedulingRules | null>(null);
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

  // Availability segment state
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [sessionTemplates, setSessionTemplates] = useState<SessionTemplate[]>([]);
  const [showSessionTypeModal, setShowSessionTypeModal] = useState(false);
  const [editingSessionType, setEditingSessionType] = useState<SessionTemplate | null>(null);

  // Day editor state
  const [dayEditorOpen, setDayEditorOpen] = useState(false);
  const [dayEditorConfig, setDayEditorConfig] = useState<DayEditorConfig | null>(null);
  const [venues, setVenues] = useState<CoachVenue[]>([]);

  // Time off state
  const [timeOffOpen, setTimeOffOpen] = useState(false);
  const [timeOffConfig, setTimeOffConfig] = useState<TimeOffConfig | null>(null);

  const coachId = currentUser?.id || 'coach_1';

  // Sync segment from URL params
  useEffect(() => {
    if (params.segment === 'availability') {
      setSegment('availability');
    }
  }, [params.segment]);

  // Load all schedule data through useScreen so schedule follows the standard
  // loading/error/empty/success + refresh contract.
  const refreshFromServer = useCallback(async () => {
    try {
      const [templatesData, rulesResult, sessionTemplatesData, overridesData, venuesData] =
        await Promise.all([
          availabilityService.getTemplates(coachId),
          schedulingRulesService.getCoachRules(coachId),
          sessionTemplateService.getTemplates(coachId),
          availabilityService.getOverrides(coachId),
          coachVenueService.ensureDefaultVenues(coachId),
        ]);

      const allOfferings = await apiClient.get<SessionOffering[]>('session_offerings', []);
      const offeringsData = allOfferings.filter((offering) => offering.coachId === coachId);

      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 13);

      const bookingsData = await availabilityService.getCoachBookings(
        coachId,
        toDateStr(weekStart),
        toDateStr(weekEnd),
      );

      let blockedDatesData = new Set<string>();
      try {
        const allBlocked = await apiClient.get<Record<string, BlockedDateRange[]> | null>(
          STORAGE_KEYS.BLOCKED_DATES,
          null,
        );
        const coachBlocked = allBlocked?.[coachId] ?? [];
        for (const blockedDate of coachBlocked) {
          let cursor = blockedDate.startDate;
          while (cursor <= blockedDate.endDate) {
            blockedDatesData.add(cursor);
            const day = new Date(cursor + 'T12:00:00');
            day.setDate(day.getDate() + 1);
            cursor = toDateStr(day);
          }
        }
      } catch (blockedError) {
        logger.warn('Failed to load blocked dates', blockedError);
        blockedDatesData = new Set();
      }

      if (!rulesResult.success) {
        logger.error('Failed to load scheduling rules', rulesResult.error);
      }

      return ok({
        templates: templatesData,
        offerings: offeringsData,
        bookings: bookingsData,
        rules: rulesResult.success ? rulesResult.data : null,
        blockedDates: blockedDatesData,
        overrides: overridesData,
        sessionTemplates: sessionTemplatesData,
        venues: venuesData,
      });
    } catch (loadError) {
      logger.error('Failed to load schedule', loadError);
      return err(
        serviceError('UNKNOWN', 'Failed to load schedule. Pull down to retry.', loadError),
      );
    }
  }, [coachId]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<ScheduleLoadData>({
    load: refreshFromServer,
    deps: [coachId],
    events: [
      ServiceEvents.BOOKING_CREATED,
      ServiceEvents.BOOKING_UPDATED,
      ServiceEvents.BOOKING_CANCELLED,
      ServiceEvents.BOOKING_CONFIRMED,
      ServiceEvents.SESSION_UPDATED,
      ServiceEvents.SESSION_CANCELLED,
    ],
    refetchOnFocus: true,
  });

  useEffect(() => {
    if (!data) return;
    setTemplates(data.templates);
    setOfferings(data.offerings);
    setBookings(data.bookings);
    setRules(data.rules);
    setBlockedDates(data.blockedDates);
    setOverrides(data.overrides);
    setSessionTemplates(data.sessionTemplates);
    setVenues(data.venues);
  }, [data]);

  const loadData = useCallback(
    async (showSpinner = true) => {
      if (showSpinner) {
        retry();
        return;
      }
      onRefresh();
    },
    [onRefresh, retry],
  );

  useFocusEffect(
    useCallback(() => {
      setSelectedDayIndex(new Date().getDay());
    }, []),
  );

  // Build week data
  const weekData = useMemo((): DayData[] => {
    const today = new Date();
    const todayStr = toDateStr(today);
    const currentDay = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - currentDay);

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

      const daySessions: SessionData[] = [];

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
            athleteName: b.athleteId || b.athleteIds?.[0] || 'Athlete',
            location: b.location,
            status: b.status === 'CONFIRMED' ? 'confirmed' : 'pending',
            type: 'booking',
            seriesId: b.seriesId,
            seriesIndex: b.seriesIndex,
            seriesTotalWeeks: b.seriesId ? seriesCounts.get(b.seriesId) : undefined,
          });
        }
      });

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

      const dayTemplates = templates.filter((t) => t.dayOfWeek === dayOfWeek);
      const availabilitySlots = dayTemplates.length;
      const hasOverride = overrides.some(
        (o) => o.date === dateStr && !o.isBlocked && (o.customSlots?.length ?? 0) > 0,
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
        isBlocked:
          blockedDates.has(dateStr) || overrides.some((o) => o.date === dateStr && o.isBlocked),
        hasOverride,
      };
    });
  }, [templates, bookings, offerings, blockedDates, overrides]);

  const todayData = weekData.find((d) => d.isToday) ?? null;
  const todaySessions = todayData?.sessions || [];
  const nextSession =
    todaySessions.find((s) => {
      const now = new Date();
      const sessionTime = new Date();
      const [h, m] = s.time.split(':').map(Number);
      sessionTime.setHours(h, m, 0, 0);
      return sessionTime > now;
    }) ?? null;

  const selectedDay = selectedDayIndex !== null ? weekData[selectedDayIndex] : null;

  // Handlers
  const haptic = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleDayPress = useCallback(
    (index: number) => {
      haptic();
      setSelectedDayIndex(index);
    },
    [haptic],
  );

  const handleSessionPress = useCallback(
    (session: SessionData) => {
      haptic();
      router.push(Routes.bookingCancel(session.id));
    },
    [haptic],
  );

  const handleAdjustDay = useCallback(
    (dateStr: string) => {
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
    },
    [templates, overrides],
  );

  const handleInviteFromSchedule = useCallback((dateStr: string) => {
    router.push({
      pathname: Routes.SESSIONS_CREATE,
      params: { intent: 'existing', source: 'schedule', date: dateStr },
    } as Href);
  }, []);

  const handleOpenSettings = useCallback(() => {
    haptic();
    setShowRulesModal(true);
  }, [haptic]);

  const handleTimeOffPress = useCallback(
    (dateStr: string, existingOverride?: AvailabilityOverride) => {
      haptic();
      setTimeOffConfig({ preselectedDate: dateStr, existingOverride: existingOverride ?? null });
      setTimeOffOpen(true);
    },
    [haptic],
  );

  const handleSegmentChange = useCallback(
    (s: Segment) => {
      haptic();
      setSegment(s);
    },
    [haptic],
  );

  // Day editor callbacks
  const handleDayEditorClose = useCallback(() => {
    setDayEditorOpen(false);
    setDayEditorConfig(null);
  }, []);

  const handleSaveRecurring = useCallback(
    async (data: { dayOfWeek: number; startTime: string; endTime: string; location?: string }) => {
      const existing = dayEditorConfig?.template;
      const saved = await availabilityService.saveTemplate({
        ...(existing ? { id: existing.id } : {}),
        coachId,
        dayOfWeek: data.dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
        startTime: data.startTime,
        endTime: data.endTime,
        isRecurring: true,
        maxConcurrent: existing?.maxConcurrent ?? 1,
        bufferMinutes: existing?.bufferMinutes ?? 15,
        location: data.location,
      });
      setTemplates((prev) => {
        if (existing) return prev.map((t) => (t.id === existing.id ? saved : t));
        return [...prev, saved];
      });
      setDayEditorOpen(false);
      setDayEditorConfig(null);
      loadData();
    },
    [coachId, dayEditorConfig, loadData],
  );

  const handleSaveOverride = useCallback(
    async (data: { date: string; startTime: string; endTime: string; location?: string }) => {
      const saved = await availabilityService.saveOverride({
        coachId,
        date: data.date,
        isBlocked: false,
        customSlots: [
          {
            date: data.date,
            startTime: data.startTime,
            endTime: data.endTime,
            location: data.location,
          },
        ],
      });
      setOverrides((prev) => {
        const filtered = prev.filter((o) => !(o.coachId === coachId && o.date === data.date));
        return [...filtered, saved];
      });
      setDayEditorOpen(false);
      setDayEditorConfig(null);
      loadData();
    },
    [coachId, loadData],
  );

  const handleSaveRepeatedOverride = useCallback(
    async (data: {
      date: string;
      startTime: string;
      endTime: string;
      location?: string;
      repeatWeeks: number;
    }) => {
      const startDate = new Date(data.date + 'T12:00:00');
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (data.repeatWeeks - 1) * 7);
      const repeatUntil = toDateStr(endDate);
      await availabilityService.saveRepeatedOverride({
        coachId,
        date: data.date,
        isBlocked: false,
        customSlots: [
          {
            date: data.date,
            startTime: data.startTime,
            endTime: data.endTime,
            location: data.location,
          },
        ],
        repeatUntil,
      });
      setDayEditorOpen(false);
      setDayEditorConfig(null);
      loadData();
    },
    [coachId, loadData],
  );

  const handleDeleteTemplate = useCallback(
    async (id: string) => {
      await availabilityService.deleteTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      setDayEditorOpen(false);
      setDayEditorConfig(null);
      loadData();
    },
    [loadData],
  );

  const handleAddVenue = useCallback(
    async (label: string) => {
      await coachVenueService.saveVenue({ coachId, label });
      const updated = await coachVenueService.getVenues(coachId);
      setVenues(updated);
    },
    [coachId],
  );

  // Time off callbacks
  const handleTimeOffClose = useCallback(() => {
    setTimeOffOpen(false);
    setTimeOffConfig(null);
  }, []);

  const handleTimeOffSaved = useCallback(async () => {
    const freshOverrides = await availabilityService.getOverrides(coachId);
    setOverrides(freshOverrides);
    loadData(false);
  }, [coachId, loadData]);

  // Session type callbacks
  const handleSessionTypePress = useCallback((t: SessionTemplate) => {
    setEditingSessionType(t);
    setShowSessionTypeModal(true);
  }, []);

  const handleSessionTypeAdd = useCallback(() => {
    setEditingSessionType(null);
    setShowSessionTypeModal(true);
  }, []);

  const handleSessionTypeClose = useCallback(() => {
    setShowSessionTypeModal(false);
    setEditingSessionType(null);
  }, []);

  const handleSessionTypeSave = useCallback(
    async (data: Omit<SessionTemplate, 'id' | 'coachId' | 'createdAt' | 'skillsFocus'>) => {
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
    },
    [coachId, editingSessionType],
  );

  const handleSessionTypeDelete = useCallback(async () => {
    if (!editingSessionType) return;
    await sessionTemplateService.deleteTemplate(editingSessionType.id);
    const updated = await sessionTemplateService.getTemplates(coachId);
    setSessionTemplates(updated);
    setShowSessionTypeModal(false);
    setEditingSessionType(null);
  }, [coachId, editingSessionType]);

  // Rules modal
  const handleRulesOpen = useCallback(() => {
    haptic();
    setShowRulesModal(true);
  }, [haptic]);

  const handleRulesClose = useCallback(() => {
    setShowRulesModal(false);
  }, []);

  // Availability day press for WeekPatternGrid
  const handleAvailabilityDayPress = useCallback(
    (dow: number, templateId?: string, dateStr?: string) => {
      const tmpl = templateId ? (templates.find((t) => t.id === templateId) ?? null) : null;
      const allForDay = templates.filter((t) => t.dayOfWeek === dow);
      const dayOverride = dateStr ? (overrides.find((o) => o.date === dateStr) ?? null) : null;
      const isNewBlock = !templateId;
      setDayEditorConfig({
        dayOfWeek: dow as 0 | 1 | 2 | 3 | 4 | 5 | 6,
        dateStr,
        template: tmpl,
        override: dayOverride,
        existingTemplatesForDay: allForDay,
        defaultScope: isNewBlock ? 'recurring' : dateStr ? 'just-this-date' : 'recurring',
      });
      setDayEditorOpen(true);
    },
    [templates, overrides],
  );

  const handleAvailabilitySetupComplete = useCallback(
    async (newTemplates: AvailabilityTemplate[]) => {
      for (const t of newTemplates) {
        await availabilityService.saveTemplate(t);
      }
      loadData();
    },
    [loadData],
  );

  const handleTakeTimeOff = useCallback(() => {
    haptic();
    setTimeOffConfig({ preselectedDate: undefined, existingOverride: null });
    setTimeOffOpen(true);
  }, [haptic]);

  return {
    // State
    loading: status === 'loading',
    error: error?.message ?? null,
    refreshing,
    onRefresh,
    retry: () => retry(),
    segment,
    weekData,
    todayData,
    todaySessions,
    nextSession,
    selectedDayIndex,
    selectedDay,
    rules,
    templates,
    overrides,
    blockedDates,
    sessionTemplates,
    venues,
    coachId,

    // Modal state
    dayEditorOpen,
    dayEditorConfig,
    timeOffOpen,
    timeOffConfig,
    showRulesModal,
    showSessionTypeModal,
    editingSessionType,

    // Handlers — Sessions segment
    handleSegmentChange,
    handleDayPress,
    handleSessionPress,
    handleAdjustDay,
    handleInviteFromSchedule,
    handleOpenSettings,
    handleTimeOffPress,

    // Handlers — Day editor
    handleDayEditorClose,
    handleSaveRecurring,
    handleSaveOverride,
    handleSaveRepeatedOverride,
    handleDeleteTemplate,
    handleAddVenue,

    // Handlers — Time off
    handleTimeOffClose,
    handleTimeOffSaved,

    // Handlers — Session types
    handleSessionTypePress,
    handleSessionTypeAdd,
    handleSessionTypeClose,
    handleSessionTypeSave,
    handleSessionTypeDelete,

    // Handlers — Availability
    handleAvailabilityDayPress,
    handleAvailabilitySetupComplete,
    handleTakeTimeOff,

    // Handlers — Rules modal
    handleRulesOpen,
    handleRulesClose,
  };
}
