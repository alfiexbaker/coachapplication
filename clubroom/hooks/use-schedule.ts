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

import { useCallback, useState, useEffect, startTransition } from 'react';
import { Platform } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Routes } from '@/navigation/routes';
import { availabilityService } from '@/services/availability-service';
import { schedulingRulesService } from '@/services/scheduling-rules-service';
import { sessionTemplateService } from '@/services/session-template-service';
import { coachVenueService } from '@/services/coach-venue-service';
import { ServiceEvents } from '@/services/event-bus';
import { createLogger } from '@/utils/logger';
import { toDateStr } from '@/utils/format';
import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { uiFeedback } from '@/services/ui-feedback';
import {
  getCoachWorkContextDisplay,
  type CoachBusinessFilter,
} from '@/utils/coach-business-context';
import type {
  AvailabilityTemplate,
  AvailabilityOverride,
  SessionOffering,
  CoachSchedulingRules,
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
  const [weekOffset, setWeekOffset] = useState(0);
  const [businessFilter, setBusinessFilter] = useState<CoachBusinessFilter>('all');

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

  const coachId = currentUser?.id ?? null;

  // Sync segment from URL params
  useEffect(() => {
    if (params.segment === 'availability') {
      startTransition(() => {
        setSegment('availability');
      });
    }
  }, [params.segment]);

  // Load all schedule data through useScreen so schedule follows the standard
  // loading/error/empty/success + refresh contract.
  const refreshFromServer = async () => {
    if (!coachId) {
      return err(serviceError('UNAUTHORIZED', 'Sign in as a coach to view your schedule.'));
    }

    try {
      const [templatesData, rulesResult, sessionTemplatesData, overridesData, venuesData] =
        await Promise.all([
          availabilityService.getTemplates(coachId),
          schedulingRulesService.getCoachRules(coachId),
          sessionTemplateService.getTemplates(coachId),
          availabilityService.getOverrides(coachId),
          coachVenueService.ensureDefaultVenues(coachId),
        ]);

      const offeringsData: SessionOffering[] = [];

      // Fetch bookings for a wide window: 4 weeks back + 8 weeks forward from today
      const today = new Date();
      const fetchStart = new Date(today);
      fetchStart.setDate(today.getDate() - today.getDay() - 28);
      const fetchEnd = new Date(today);
      fetchEnd.setDate(today.getDate() - today.getDay() + 56);

      const bookingsData = await availabilityService.getCoachBookings(
        coachId,
        toDateStr(fetchStart),
        toDateStr(fetchEnd),
      );

      const blockedDatesData = new Set<string>();

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
  };

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
    dataKey: `schedule:${coachId ?? 'missing'}`,
  });

  useEffect(() => {
    if (!data) return;
    startTransition(() => {
      setTemplates(data.templates);
    });
    startTransition(() => {
      setOfferings(data.offerings);
    });
    startTransition(() => {
      setBookings(data.bookings);
    });
    startTransition(() => {
      setRules(data.rules);
    });
    startTransition(() => {
      setBlockedDates(data.blockedDates);
    });
    startTransition(() => {
      setOverrides(data.overrides);
    });
    startTransition(() => {
      setSessionTemplates(data.sessionTemplates);
    });
    startTransition(() => {
      setVenues(data.venues);
    });
  }, [data]);

  const loadData = async (showSpinner = true) => {
    if (showSpinner) {
      retry();
      return;
    }
    onRefresh();
  };

  const requireCoachId = () => {
    if (coachId) return coachId;
    uiFeedback.showToast('Sign in as a coach to manage your schedule.', 'error');
    return null;
  };

  useFocusEffect(
    useCallback(() => {
      if (weekOffset === 0) {
        setSelectedDayIndex(new Date().getDay());
      }
    }, [weekOffset]),
  );

  // Build week data
  const baseWeekData = ((): DayData[] => {
    const today = new Date();
    const todayStr = toDateStr(today);
    const currentDay = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - currentDay + weekOffset * 7);

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
        const parsedDate = new Date(b.scheduledAt);
        const bDate = Number.isNaN(parsedDate.getTime()) ? undefined : toDateStr(parsedDate);
        if (bDate === dateStr && b.status !== 'CANCELLED') {
          const startDate = parsedDate;
          const endDate = new Date(startDate);
          endDate.setMinutes(endDate.getMinutes() + (b.duration || 60));
          const workContext = getCoachWorkContextDisplay(b);
          const athleteName = b.athleteNames?.filter(Boolean).join(', ') || 'Athlete';

          daySessions.push({
            id: b.id,
            title: b.service || 'Session',
            time: startDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            endTime: endDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            businessContext: workContext.context,
            businessLabel: workContext.label,
            businessDetail: workContext.detail,
            athleteName,
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
        const parsedDate = new Date(o.scheduledAt);
        const oDate = Number.isNaN(parsedDate.getTime()) ? undefined : toDateStr(parsedDate);
        if (oDate === dateStr && o.status !== 'cancelled') {
          const startDate = parsedDate;
          const endDate = new Date(startDate);
          endDate.setMinutes(endDate.getMinutes() + (o.duration || 60));
          const workContext = getCoachWorkContextDisplay(o);

          daySessions.push({
            id: o.id,
            title: o.title,
            time: startDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            endTime: endDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            businessContext: workContext.context,
            businessLabel: workContext.label,
            businessDetail: workContext.detail,
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
  })();

  const businessCounts = (() => {
    const sessions = baseWeekData.flatMap((day) => day.sessions);
    return {
      all: sessions.length,
      org: sessions.filter((session) => session.businessContext === 'org').length,
      independent: sessions.filter((session) => session.businessContext === 'independent').length,
    };
  })();

  const weekData = baseWeekData.map((day) => ({
    ...day,
    sessions:
      businessFilter === 'all'
        ? day.sessions
        : day.sessions.filter((session) => session.businessContext === businessFilter),
  }));

  const overallWeekSessionCount = businessCounts.all;

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
  const haptic = () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDayPress = (index: number) => {
    haptic();
    setSelectedDayIndex(index);
  };

  const handleSessionPress = (session: SessionData) => {
    haptic();
    router.push(Routes.booking(session.id, { returnTo: Routes.SCHEDULE as string }));
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
    router.push(
      Routes.sessionsCreateIntent({ intent: 'existing', source: 'schedule', date: dateStr }),
    );
  };

  const handleOpenSettings = () => {
    haptic();
    setShowRulesModal(true);
  };

  const handleTimeOffPress = (dateStr: string, existingOverride?: AvailabilityOverride) => {
    haptic();
    setTimeOffConfig({ preselectedDate: dateStr, existingOverride: existingOverride ?? null });
    setTimeOffOpen(true);
  };

  const handleSegmentChange = (s: Segment) => {
    haptic();
    setSegment(s);
  };

  const handleBusinessFilterChange = (filter: CoachBusinessFilter) => {
    haptic();
    setBusinessFilter(filter);
  };

  // Day editor callbacks
  const handleDayEditorClose = () => {
    setDayEditorOpen(false);
    setDayEditorConfig(null);
  };

  const handleSaveRecurring = async (data: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    location?: string;
  }) => {
    const signedInCoachId = requireCoachId();
    if (!signedInCoachId) return;
    const existing = dayEditorConfig?.template;
    const saved = await availabilityService.saveTemplate({
      ...(existing ? { id: existing.id } : {}),
      coachId: signedInCoachId,
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
  };

  const handleSaveOverride = async (data: {
    date: string;
    startTime: string;
    endTime: string;
    location?: string;
  }) => {
    const signedInCoachId = requireCoachId();
    if (!signedInCoachId) return;
    const saved = await availabilityService.saveOverride({
      coachId: signedInCoachId,
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
      const filtered = prev.filter((o) => !(o.coachId === signedInCoachId && o.date === data.date));
      return [...filtered, saved];
    });
    setDayEditorOpen(false);
    setDayEditorConfig(null);
    loadData();
  };

  const handleSaveRepeatedOverride = async (data: {
    date: string;
    startTime: string;
    endTime: string;
    location?: string;
    repeatWeeks: number;
  }) => {
    const signedInCoachId = requireCoachId();
    if (!signedInCoachId) return;
    const startDate = new Date(data.date + 'T12:00:00');
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (data.repeatWeeks - 1) * 7);
    const repeatUntil = toDateStr(endDate);
    await availabilityService.saveRepeatedOverride({
      coachId: signedInCoachId,
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
  };

  const handleDeleteTemplate = async (id: string) => {
    const signedInCoachId = requireCoachId();
    if (!signedInCoachId) return;
    await availabilityService.deleteTemplate(id, signedInCoachId);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    setDayEditorOpen(false);
    setDayEditorConfig(null);
    loadData();
  };

  const handleAddVenue = async (label: string) => {
    const signedInCoachId = requireCoachId();
    if (!signedInCoachId) return;
    await coachVenueService.saveVenue({ coachId: signedInCoachId, label });
    const updated = await coachVenueService.getVenues(signedInCoachId);
    setVenues(updated);
  };

  // Time off callbacks
  const handleTimeOffClose = () => {
    setTimeOffOpen(false);
    setTimeOffConfig(null);
  };

  const handleTimeOffSaved = async () => {
    const signedInCoachId = requireCoachId();
    if (!signedInCoachId) return;
    const freshOverrides = await availabilityService.getOverrides(signedInCoachId);
    setOverrides(freshOverrides);
    loadData(false);
  };

  // Week navigation
  const handlePrevWeek = () => {
    haptic();
    setWeekOffset((prev) => prev - 1);
    setSelectedDayIndex(0);
  };

  const handleNextWeek = () => {
    haptic();
    setWeekOffset((prev) => prev + 1);
    setSelectedDayIndex(0);
  };

  const handleGoToThisWeek = () => {
    haptic();
    setWeekOffset(0);
    setSelectedDayIndex(new Date().getDay());
  };

  const weekLabel = (() => {
    if (weekOffset === 0) return 'This Week';
    if (weekOffset === -1) return 'Last Week';
    if (weekOffset === 1) return 'Next Week';
    const start = weekData[0];
    const end = weekData[weekData.length - 1];
    if (!start || !end) return '';
    const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return `${fmt(start.date)} – ${fmt(end.date)}`;
  })();

  // Session type callbacks
  const handleSessionTypePress = (t: SessionTemplate) => {
    setEditingSessionType(t);
    setShowSessionTypeModal(true);
  };

  const handleSessionTypeAdd = () => {
    setEditingSessionType(null);
    setShowSessionTypeModal(true);
  };

  const handleSessionTypeClose = () => {
    setShowSessionTypeModal(false);
    setEditingSessionType(null);
  };

  const handleSessionTypeSave = async (
    data: Omit<SessionTemplate, 'id' | 'coachId' | 'createdAt' | 'skillsFocus'>,
  ) => {
    const signedInCoachId = requireCoachId();
    if (!signedInCoachId) return;
    if (editingSessionType) {
      await sessionTemplateService.saveTemplate({
        ...data,
        id: editingSessionType.id,
        coachId: signedInCoachId,
        createdAt: editingSessionType.createdAt,
        skillsFocus: editingSessionType.skillsFocus,
      });
    } else {
      await sessionTemplateService.saveTemplate({
        ...data,
        coachId: signedInCoachId,
        skillsFocus: [],
      });
    }
    const updated = await sessionTemplateService.getTemplates(signedInCoachId);
    setSessionTemplates(updated);
    setShowSessionTypeModal(false);
    setEditingSessionType(null);
  };

  const handleSessionTypeDelete = async () => {
    if (!editingSessionType) return;
    const signedInCoachId = requireCoachId();
    if (!signedInCoachId) return;
    await sessionTemplateService.deleteTemplate(editingSessionType.id);
    const updated = await sessionTemplateService.getTemplates(signedInCoachId);
    setSessionTemplates(updated);
    setShowSessionTypeModal(false);
    setEditingSessionType(null);
  };

  // Rules modal
  const handleRulesOpen = () => {
    haptic();
    setShowRulesModal(true);
  };

  const handleRulesClose = () => {
    setShowRulesModal(false);
  };

  // Availability day press for WeekPatternGrid
  const handleAvailabilityDayPress = (dow: number, templateId?: string, dateStr?: string) => {
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
  };

  const handleAvailabilitySetupComplete = async (newTemplates: AvailabilityTemplate[]) => {
    const signedInCoachId = requireCoachId();
    if (!signedInCoachId) return;
    await Promise.all(
      newTemplates.map((template) =>
        availabilityService.saveTemplate({ ...template, coachId: signedInCoachId }),
      ),
    );
    loadData();
  };

  const handleTakeTimeOff = () => {
    haptic();
    setTimeOffConfig({ preselectedDate: undefined, existingOverride: null });
    setTimeOffOpen(true);
  };

  return {
    // State
    loading: status === 'loading',
    error: error?.message ?? null,
    refreshing,
    onRefresh,
    retry: () => retry(),
    segment,
    businessFilter,
    businessCounts,
    overallWeekSessionCount,
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
    coachId: coachId ?? '',

    // Week navigation
    weekOffset,
    weekLabel,
    handlePrevWeek,
    handleNextWeek,
    handleGoToThisWeek,

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
    handleBusinessFilterChange,
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
