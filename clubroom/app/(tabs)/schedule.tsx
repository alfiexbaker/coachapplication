/**
 * Coach Schedule - The Command Center
 *
 * Design Philosophy (Steve Jobs style):
 * - TODAY is the hero - what's happening right now matters most
 * - One screen does everything - no menu of links to elsewhere
 * - Progressive disclosure - simple surface, power underneath
 * - Every element is actionable - no dead ends
 */

import { useCallback, useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Modal, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ScreenHeader } from '@/components/primitives/screen-header';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { availabilityService } from '@/services/availability-service';
import { schedulingRulesService } from '@/services/scheduling-rules-service';
import type { AvailabilityTemplate, SessionOffering, CoachSchedulingRules } from '@/constants/types';
import { RecurringTemplateModal } from '@/components/coach/recurring-template-modal';
import { createLogger } from '@/utils/logger';

const logger = createLogger('Schedule');

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
}

export default function ScheduleScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [templates, setTemplates] = useState<AvailabilityTemplate[]>([]);
  const [offerings, setOfferings] = useState<SessionOffering[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [rules, setRules] = useState<CoachSchedulingRules | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [showAddSlotModal, setShowAddSlotModal] = useState(false);
  const [preselectedDay, setPreselectedDay] = useState<number | undefined>();

  const coachId = currentUser?.id || 'coach_1';

  // Load all data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load in parallel
      const [templatesData, rulesData] = await Promise.all([
        availabilityService.getTemplates(coachId),
        schedulingRulesService.getCoachRules(coachId),
      ]);
      setTemplates(templatesData);
      setRules(rulesData);

      // Load offerings
      const storedOfferings = await AsyncStorage.getItem('session_offerings');
      if (storedOfferings) {
        const all: SessionOffering[] = JSON.parse(storedOfferings);
        setOfferings(all.filter(o => o.coachId === coachId));
      }

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

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();

      // Get sessions for this day
      const daySessions: SessionData[] = [];

      // From bookings
      bookings.forEach((b: any) => {
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
            athleteCount: o.registrations?.filter((r: any) => r.status === 'confirmed').length || 0,
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
        isBlocked: false, // TODO: Check overrides
      };
    });
  }, [templates, bookings, offerings]);

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

  // Weekly summary
  const weekSummary = useMemo(() => {
    const totalSessions = weekData.reduce((sum, d) => sum + d.sessions.length, 0);
    const daysWithSessions = weekData.filter(d => d.sessions.length > 0).length;
    const totalHours = templates.reduce((sum, t) => {
      const [sh, sm] = t.startTime.split(':').map(Number);
      const [eh, em] = t.endTime.split(':').map(Number);
      return sum + ((eh * 60 + em) - (sh * 60 + sm)) / 60;
    }, 0);
    return { totalSessions, daysWithSessions, totalHours };
  }, [weekData, templates]);

  // Selected day
  const selectedDay = selectedDayIndex !== null ? weekData[selectedDayIndex] : null;

  // Handlers
  const handleDayPress = (index: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDayIndex(index);
  };

  const handleSessionPress = (session: SessionData) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/booking/${session.id}` as any);
  };

  const handleAddSlot = (dayIndex?: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPreselectedDay(dayIndex);
    setShowAddSlotModal(true);
  };

  const handleBlockDay = async (dateStr: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Block This Day?',
      'This will prevent any new bookings for this day.',
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
  };

  const handleSaveTemplate = async (templateData: Omit<AvailabilityTemplate, 'id' | 'coachId'>) => {
    await availabilityService.saveTemplate({ ...templateData, coachId });
    await loadData();
    setShowAddSlotModal(false);
  };

  const handleOpenSettings = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/availability/scheduling-rules' as any);
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
          subtitle="Your upcoming sessions"
        />
        <Clickable onPress={handleOpenSettings} style={[styles.settingsButton, { backgroundColor: palette.surface }]}>
          <Ionicons name="settings-outline" size={22} color={palette.muted} />
        </Clickable>
      </View>

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
                            ? `${palette.tint}15`
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
                  {selectedDay.availabilitySlots === 0 && (
                    <Clickable
                      onPress={() => handleAddSlot(selectedDay.date.getDay())}
                      style={[styles.addSlotBtn, { backgroundColor: palette.tint }]}
                    >
                      <Ionicons name="add" size={16} color={palette.surface} />
                      <ThemedText style={[styles.addSlotBtnText, { color: palette.surface }]}>Add Availability</ThemedText>
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
                        <ThemedText type="defaultSemiBold" numberOfLines={1}>
                          {session.athleteName || session.title}
                        </ThemedText>
                        {session.location && (
                          <View style={styles.sessionMeta}>
                            <Ionicons name="location-outline" size={12} color={palette.muted} />
                            <ThemedText style={[styles.sessionMetaText, { color: palette.muted }]}>
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
              onPress={() => router.push('/(tabs)/availability' as any)}
              style={[styles.quickAction, { backgroundColor: palette.surface }]}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: `${palette.success}15` }]}>
                <Ionicons name="time-outline" size={22} color={palette.success} />
              </View>
              <ThemedText type="defaultSemiBold" style={styles.quickActionLabel}>
                Availability
              </ThemedText>
            </Clickable>

            <Clickable
              onPress={() => router.push('/(tabs)/bookings' as any)}
              style={[styles.quickAction, { backgroundColor: palette.surface }]}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: `${palette.accent}15` }]}>
                <Ionicons name="calendar-outline" size={22} color={palette.accent} />
              </View>
              <ThemedText type="defaultSemiBold" style={styles.quickActionLabel}>
                Bookings
              </ThemedText>
            </Clickable>

            <Clickable
              onPress={() => router.push('/sessions/create' as any)}
              style={[styles.quickAction, { backgroundColor: palette.surface }]}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: `${palette.tint}15` }]}>
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

      {/* Add Slot Modal */}
      <RecurringTemplateModal
        visible={showAddSlotModal}
        onClose={() => setShowAddSlotModal(false)}
        onSave={handleSaveTemplate}
        preselectedDay={preselectedDay}
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
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: Typography.xl.fontSize,
    fontWeight: '700',
    marginTop: 2,
  },
  todayStats: {
    alignItems: 'flex-end',
  },
  todayStatValue: {
    fontSize: 28,
    fontWeight: '700',
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
    marginTop: 2,
  },
  nextSessionCountdown: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.light.tint,
    borderRadius: Radii.md,
  },
  countdownText: {
    ...Typography.small,
    fontWeight: '700',
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
    fontSize: 11,
    fontWeight: '600',
  },
  dayPillNum: {
    fontSize: 20,
    fontWeight: '700',
  },
  dayDot: {
    position: 'absolute',
    bottom: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
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
    marginTop: 2,
  },
  dayActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  dayActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    borderRadius: 22,
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
    fontWeight: '400',
    marginTop: Spacing.xs / 2,
  },
});
