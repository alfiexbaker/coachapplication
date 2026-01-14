import { useState, useEffect, useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, View, Alert, Modal, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { SectionHeader } from '@/components/primitives/section-header';
import { ScreenHeader } from '@/components/primitives/screen-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { Clickable } from '@/components/primitives/clickable';
import { RecurringTemplateModal } from '@/components/coach/recurring-template-modal';
import { BlockDateModal } from '@/components/coach/block-date-modal';
import { SchedulingRulesModal } from '@/components/coach/scheduling-rules-modal';
import { availabilityService } from '@/services/availability-service';
import type { AvailabilityTemplate } from '@/constants/types';

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Quick presets for common schedules
const QUICK_PRESETS = [
  {
    id: 'weekday-mornings',
    name: 'Weekday Mornings',
    icon: 'sunny-outline' as const,
    slots: [{ days: [1, 2, 3, 4, 5], start: '08:00', end: '12:00' }],
  },
  {
    id: 'weekday-afternoons',
    name: 'Weekday Afternoons',
    icon: 'partly-sunny-outline' as const,
    slots: [{ days: [1, 2, 3, 4, 5], start: '13:00', end: '17:00' }],
  },
  {
    id: 'evenings',
    name: 'Evenings Only',
    icon: 'moon-outline' as const,
    slots: [{ days: [1, 2, 3, 4, 5], start: '17:00', end: '20:00' }],
  },
  {
    id: 'weekends',
    name: 'Weekend Sessions',
    icon: 'calendar-outline' as const,
    slots: [{ days: [0, 6], start: '09:00', end: '16:00' }],
  },
];

export default function AvailabilityScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [templates, setTemplates] = useState<AvailabilityTemplate[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AvailabilityTemplate | null>(null);
  const [preselectedDay, setPreselectedDay] = useState<number | undefined>();
  const [preselectedHour, setPreselectedHour] = useState<number | undefined>();
  const [showQuickSetup, setShowQuickSetup] = useState(false);
  const [showBlockDateModal, setShowBlockDateModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

  const coachId = currentUser?.id || 'coach_1';

  // Get today's day index for highlighting
  const todayIndex = new Date().getDay();

  // Summary stats
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

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await availabilityService.getTemplates(coachId);
      setTemplates(data);
      // Show quick setup if no templates exist
      if (data.length === 0) {
        setShowQuickSetup(true);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  }, [coachId]);

  const loadUpcomingBookings = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const twoWeeksLater = new Date();
      twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
      const endDate = twoWeeksLater.toISOString().split('T')[0];

      const bookings = await availabilityService.getCoachBookings(coachId, today, endDate);
      const sorted = bookings.sort((a, b) => {
        const dateA = new Date(a.scheduledAt || '');
        const dateB = new Date(b.scheduledAt || '');
        return dateA.getTime() - dateB.getTime();
      });
      setUpcomingBookings(sorted);
    } catch (error) {
      console.error('Failed to load upcoming bookings:', error);
    }
  }, [coachId]);

  useEffect(() => {
    loadTemplates();
    loadUpcomingBookings();
  }, [loadTemplates, loadUpcomingBookings]);

  useFocusEffect(
    useCallback(() => {
      loadUpcomingBookings();
    }, [loadUpcomingBookings])
  );

  const getDayTemplates = (dayOfWeek: number) => {
    return templates
      .filter(t => t.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
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

  const handleSaveTemplate = async (templateData: Omit<AvailabilityTemplate, 'id' | 'coachId'>) => {
    try {
      if (editingTemplate) {
        await availabilityService.saveTemplate({
          ...templateData,
          id: editingTemplate.id,
          coachId,
        });
      } else {
        await availabilityService.saveTemplate({
          ...templateData,
          coachId,
        });
      }
      await loadTemplates();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      throw error;
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await availabilityService.deleteTemplate(templateId);
      await loadTemplates();
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleApplyPreset = async (presetId: string) => {
    const preset = QUICK_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    try {
      for (const slotDef of preset.slots) {
        for (const day of slotDef.days) {
          await availabilityService.saveTemplate({
            coachId,
            dayOfWeek: day as 0 | 1 | 2 | 3 | 4 | 5 | 6,
            startTime: slotDef.start,
            endTime: slotDef.end,
            isRecurring: true,
            maxConcurrent: 1,
            bufferMinutes: 15,
          });
        }
      }
      await loadTemplates();
      setShowQuickSetup(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to apply preset:', error);
      Alert.alert('Error', 'Failed to apply preset. Please try again.');
    }
  };

  const handleAddSlot = (day?: number) => {
    setEditingTemplate(null);
    setPreselectedDay(day ?? selectedDay);
    setPreselectedHour(9); // Default to 9am
    setShowTemplateModal(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleEditSlot = (template: AvailabilityTemplate) => {
    setEditingTemplate(template);
    setPreselectedDay(undefined);
    setPreselectedHour(undefined);
    setShowTemplateModal(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleBlockDates = async (dates: string[], reason: string) => {
    try {
      for (const date of dates) {
        await availabilityService.saveOverride({
          coachId,
          date,
          isBlocked: true,
          reason,
        });
      }
    } catch (error) {
      console.error('Failed to block dates:', error);
      throw error;
    }
  };

  const handleDeleteSlot = (template: AvailabilityTemplate) => {
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
  };

  const selectedDaySlots = getDayTemplates(selectedDay);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Availability"
          subtitle="Set when athletes can book sessions with you"
        />

        {/* Week Overview - Interactive Day Selector */}
        <SurfaceCard style={styles.weekCard}>
          <View style={styles.weekHeader}>
            <ThemedText type="defaultSemiBold">Your Weekly Schedule</ThemedText>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: palette.tint }]}
              onPress={() => handleAddSlot()}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <ThemedText style={styles.addButtonText}>Add</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Day Pills */}
          <View style={styles.dayPills}>
            {DAYS_SHORT.map((day, index) => {
              const daySlots = getDayTemplates(index);
              const hasSlots = daySlots.length > 0;
              const isSelected = selectedDay === index;
              const isToday = todayIndex === index;

              return (
                <TouchableOpacity
                  key={day}
                  onPress={() => {
                    setSelectedDay(index);
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[
                    styles.dayPill,
                    {
                      backgroundColor: isSelected
                        ? palette.tint
                        : hasSlots
                        ? `${palette.success}15`
                        : palette.background,
                      borderColor: isToday ? palette.tint : palette.border,
                      borderWidth: isToday ? 2 : 1,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.dayPillText,
                      {
                        color: isSelected
                          ? '#fff'
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
                    <View style={[styles.dayDot, { backgroundColor: palette.success }]} />
                  )}
                  {isSelected && (
                    <ThemedText style={styles.slotCount}>
                      {daySlots.length}
                    </ThemedText>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Summary */}
          <View style={[styles.summaryRow, { borderTopColor: palette.border }]}>
            <View style={styles.summaryItem}>
              <ThemedText style={[styles.summaryValue, { color: palette.tint }]}>
                {summaryStats.totalHours}
              </ThemedText>
              <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>
                hrs/week
              </ThemedText>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: palette.border }]} />
            <View style={styles.summaryItem}>
              <ThemedText style={[styles.summaryValue, { color: palette.tint }]}>
                {summaryStats.daysCount}
              </ThemedText>
              <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>
                days
              </ThemedText>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: palette.border }]} />
            <View style={styles.summaryItem}>
              <ThemedText style={[styles.summaryValue, { color: palette.tint }]}>
                {summaryStats.slotsCount}
              </ThemedText>
              <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>
                slots
              </ThemedText>
            </View>
          </View>
        </SurfaceCard>

        {/* Selected Day Details */}
        <SurfaceCard style={styles.dayDetailCard}>
          <View style={styles.dayDetailHeader}>
            <View>
              <ThemedText type="subtitle" style={styles.dayDetailTitle}>
                {DAYS_FULL[selectedDay]}
              </ThemedText>
              <ThemedText style={[styles.dayDetailSubtitle, { color: palette.muted }]}>
                {selectedDaySlots.length === 0
                  ? 'No availability set'
                  : `${selectedDaySlots.length} slot${selectedDaySlots.length !== 1 ? 's' : ''}`}
              </ThemedText>
            </View>
            {selectedDaySlots.length > 0 && (
              <TouchableOpacity
                style={[styles.miniAddButton, { borderColor: palette.tint }]}
                onPress={() => handleAddSlot(selectedDay)}
              >
                <Ionicons name="add" size={16} color={palette.tint} />
              </TouchableOpacity>
            )}
          </View>

          {selectedDaySlots.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: palette.background }]}>
              <Ionicons name="calendar-outline" size={40} color={palette.muted} />
              <ThemedText style={[styles.emptyTitle, { color: palette.text }]}>
                Not available
              </ThemedText>
              <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
                Add availability so athletes can book on {DAYS_FULL[selectedDay]}
              </ThemedText>
              <TouchableOpacity
                style={[styles.emptyAddButton, { backgroundColor: palette.tint }]}
                onPress={() => handleAddSlot(selectedDay)}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <ThemedText style={styles.emptyAddButtonText}>Add Slot</ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.slotsList}>
              {selectedDaySlots.map((template) => {
                const [startH] = template.startTime.split(':').map(Number);
                const [endH] = template.endTime.split(':').map(Number);
                const duration = endH - startH;

                return (
                  <View
                    key={template.id}
                    style={[styles.slotCard, { backgroundColor: palette.background, borderColor: palette.border }]}
                  >
                    <View style={[styles.slotTime, { backgroundColor: `${palette.success}12` }]}>
                      <Ionicons name="time-outline" size={16} color={palette.success} />
                      <ThemedText style={[styles.slotTimeText, { color: palette.success }]}>
                        {formatTimeRange(template.startTime, template.endTime)}
                      </ThemedText>
                    </View>

                    <View style={styles.slotInfo}>
                      <ThemedText style={styles.slotDuration}>
                        {duration} hour{duration !== 1 ? 's' : ''}
                      </ThemedText>
                      {template.location && (
                        <View style={styles.slotMeta}>
                          <Ionicons name="location-outline" size={12} color={palette.muted} />
                          <ThemedText style={[styles.slotMetaText, { color: palette.muted }]}>
                            {template.location}
                          </ThemedText>
                        </View>
                      )}
                    </View>

                    <View style={styles.slotActions}>
                      <TouchableOpacity
                        style={[styles.slotActionBtn, { borderColor: palette.border }]}
                        onPress={() => handleEditSlot(template)}
                      >
                        <Ionicons name="pencil-outline" size={16} color={palette.tint} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.slotActionBtn, { borderColor: palette.border }]}
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

        {/* Upcoming Bookings */}
        {upcomingBookings.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Upcoming Bookings"
              subtitle={`${upcomingBookings.length} session${upcomingBookings.length > 1 ? 's' : ''} scheduled`}
            />
            <SurfaceCard style={styles.bookingsCard}>
              {upcomingBookings.slice(0, 3).map((booking, index) => {
                const bookingDate = new Date(booking.scheduledAt);
                const dayName = bookingDate.toLocaleDateString('en-US', { weekday: 'short' });
                const dateStr = bookingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const timeStr = bookingDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

                return (
                  <View key={booking.id}>
                    {index > 0 && <View style={[styles.bookingDivider, { backgroundColor: palette.border }]} />}
                    <Clickable
                      onPress={() => router.push(`/booking/${booking.id}`)}
                      style={styles.bookingItem}
                    >
                      <View style={[styles.bookingDate, { backgroundColor: `${palette.tint}10` }]}>
                        <ThemedText style={[styles.bookingDayName, { color: palette.tint }]}>{dayName}</ThemedText>
                        <ThemedText style={[styles.bookingDateStr, { color: palette.tint }]}>{dateStr}</ThemedText>
                      </View>
                      <View style={styles.bookingInfo}>
                        <ThemedText type="defaultSemiBold" numberOfLines={1}>
                          {booking.athleteName || booking.service || 'Session'}
                        </ThemedText>
                        <ThemedText style={[styles.bookingTime, { color: palette.muted }]}>
                          {timeStr}
                        </ThemedText>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={palette.muted} />
                    </Clickable>
                  </View>
                );
              })}
            </SurfaceCard>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <SectionHeader title="Quick Actions" />
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={[styles.quickActionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
              onPress={() => handleAddSlot()}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: `${palette.success}15` }]}>
                <Ionicons name="add-circle-outline" size={22} color={palette.success} />
              </View>
              <ThemedText style={styles.quickActionTitle}>Add Availability</ThemedText>
              <ThemedText style={[styles.quickActionDesc, { color: palette.muted }]}>
                Set when you're available
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowBlockDateModal(true);
              }}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: `${palette.error}15` }]}>
                <Ionicons name="calendar-outline" size={22} color={palette.error} />
              </View>
              <ThemedText style={styles.quickActionTitle}>Block Time Off</ThemedText>
              <ThemedText style={[styles.quickActionDesc, { color: palette.muted }]}>
                Holidays, sick days, etc
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowRulesModal(true);
              }}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: `${palette.warning}15` }]}>
                <Ionicons name="settings-outline" size={22} color={palette.warning} />
              </View>
              <ThemedText style={styles.quickActionTitle}>Booking Rules</ThemedText>
              <ThemedText style={[styles.quickActionDesc, { color: palette.muted }]}>
                Notice, buffer, limits
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
              onPress={() => setShowQuickSetup(true)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: `${palette.tint}15` }]}>
                <Ionicons name="flash-outline" size={22} color={palette.tint} />
              </View>
              <ThemedText style={styles.quickActionTitle}>Quick Setup</ThemedText>
              <ThemedText style={[styles.quickActionDesc, { color: palette.muted }]}>
                Preset schedules
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Template Modal */}
      <RecurringTemplateModal
        visible={showTemplateModal}
        onClose={() => {
          setShowTemplateModal(false);
          setEditingTemplate(null);
          setPreselectedDay(undefined);
          setPreselectedHour(undefined);
        }}
        onSave={handleSaveTemplate}
        onDelete={handleDeleteTemplate}
        editingTemplate={editingTemplate}
        preselectedDay={preselectedDay}
        preselectedHour={preselectedHour}
      />

      {/* Quick Setup Modal */}
      <Modal visible={showQuickSetup} animationType="slide" transparent onRequestClose={() => setShowQuickSetup(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.setupModal, { backgroundColor: palette.surface }]}>
            <View style={styles.setupHeader}>
              <View>
                <ThemedText type="subtitle">Quick Setup</ThemedText>
                <ThemedText style={{ color: palette.muted, fontSize: 13, marginTop: 2 }}>
                  Choose a preset to get started
                </ThemedText>
              </View>
              <TouchableOpacity onPress={() => setShowQuickSetup(false)}>
                <Ionicons name="close" size={24} color={palette.muted} />
              </TouchableOpacity>
            </View>

            <View style={styles.presetList}>
              {QUICK_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.id}
                  style={[styles.presetCard, { backgroundColor: palette.background, borderColor: palette.border }]}
                  onPress={() => handleApplyPreset(preset.id)}
                >
                  <View style={[styles.presetIcon, { backgroundColor: `${palette.tint}15` }]}>
                    <Ionicons name={preset.icon} size={24} color={palette.tint} />
                  </View>
                  <View style={styles.presetInfo}>
                    <ThemedText type="defaultSemiBold">{preset.name}</ThemedText>
                    <ThemedText style={{ color: palette.muted, fontSize: 13 }}>
                      {preset.slots[0].days.map(d => DAYS_SHORT[d]).join(', ')} • {formatTimeRange(preset.slots[0].start, preset.slots[0].end)}
                    </ThemedText>
                  </View>
                  <Ionicons name="add-circle" size={24} color={palette.tint} />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.customButton, { borderColor: palette.border }]}
              onPress={() => {
                setShowQuickSetup(false);
                handleAddSlot();
              }}
            >
              <Ionicons name="create-outline" size={18} color={palette.tint} />
              <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>
                Create Custom Schedule
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.sm,
  },

  // Week Card
  weekCard: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radii.md,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  dayPills: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  dayPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    gap: 4,
  },
  dayPillText: {
    fontSize: 12,
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  slotCount: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 30,
  },

  // Day Detail Card
  dayDetailCard: {
    padding: Spacing.md,
  },
  dayDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  dayDetailTitle: {
    fontSize: 18,
  },
  dayDetailSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  miniAddButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    borderRadius: Radii.md,
    gap: Spacing.xs,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: Spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 240,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    marginTop: Spacing.md,
  },
  emptyAddButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  slotsList: {
    gap: Spacing.sm,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  slotTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radii.sm,
  },
  slotTimeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  slotInfo: {
    flex: 1,
    gap: 2,
  },
  slotDuration: {
    fontWeight: '500',
  },
  slotMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  slotMetaText: {
    fontSize: 12,
  },
  slotActions: {
    flexDirection: 'row',
    gap: 6,
  },
  slotActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Bookings
  bookingsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  bookingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  bookingDivider: {
    height: 1,
    marginHorizontal: Spacing.md,
  },
  bookingDate: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.sm,
    minWidth: 50,
  },
  bookingDayName: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  bookingDateStr: {
    fontSize: 12,
    fontWeight: '700',
  },
  bookingInfo: {
    flex: 1,
  },
  bookingTime: {
    fontSize: 12,
    marginTop: 2,
  },

  // Quick Actions
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  quickActionCard: {
    width: '48%',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  quickActionDesc: {
    fontSize: 12,
    lineHeight: 16,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  setupModal: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  setupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  presetList: {
    gap: Spacing.sm,
  },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.md,
  },
  presetIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetInfo: {
    flex: 1,
    gap: 2,
  },
  customButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginTop: Spacing.lg,
  },
});
