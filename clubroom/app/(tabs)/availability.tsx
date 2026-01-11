import { useState, useEffect, useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, View, Alert, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { SectionHeader } from '@/components/primitives/section-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { Clickable } from '@/components/primitives/clickable';
import { RecurringTemplateModal } from '@/components/coach/recurring-template-modal';
import { availabilityService } from '@/services/availability-service';
import type { AvailabilityTemplate } from '@/constants/types';

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 6); // 6am to 8pm
const SCREEN_WIDTH = Dimensions.get('window').width;

// Quick template presets
const QUICK_TEMPLATES = [
  {
    id: 'full-time',
    name: 'Full-time',
    description: '9am - 5pm',
    icon: 'briefcase-outline' as const,
    slots: [
      { days: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '17:00' },
    ],
  },
  {
    id: 'afternoons',
    name: 'Afternoons',
    description: '2pm - 6pm',
    icon: 'sunny-outline' as const,
    slots: [
      { days: [1, 2, 3, 4, 5], startTime: '14:00', endTime: '18:00' },
    ],
  },
  {
    id: 'evenings',
    name: 'Evenings',
    description: '5pm - 8pm',
    icon: 'moon-outline' as const,
    slots: [
      { days: [1, 2, 3, 4, 5], startTime: '17:00', endTime: '20:00' },
    ],
  },
  {
    id: 'weekends',
    name: 'Weekends',
    description: '10am - 4pm',
    icon: 'calendar-outline' as const,
    slots: [
      { days: [0, 6], startTime: '10:00', endTime: '16:00' },
    ],
  },
];

interface CopyScheduleModalProps {
  visible: boolean;
  onClose: () => void;
  sourceDay: number;
  templates: AvailabilityTemplate[];
  onCopy: (targetDays: number[]) => void;
}

function CopyScheduleModal({ visible, onClose, sourceDay, templates, onCopy }: CopyScheduleModalProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const sourceTemplates = templates.filter(t => t.dayOfWeek === sourceDay);

  const toggleDay = (day: number) => {
    if (day === sourceDay) return;
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCopy = () => {
    if (selectedDays.length === 0) {
      Alert.alert('Select Days', 'Please select at least one day to copy to.');
      return;
    }
    onCopy(selectedDays);
    setSelectedDays([]);
    onClose();
  };

  useEffect(() => {
    if (!visible) {
      setSelectedDays([]);
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.copyModal, { backgroundColor: palette.surface }]}>
          <View style={styles.copyModalHeader}>
            <ThemedText type="subtitle">Copy Schedule</ThemedText>
            <Clickable onPress={onClose}>
              <Ionicons name="close" size={24} color={palette.muted} />
            </Clickable>
          </View>

          <ThemedText style={{ color: palette.muted, marginBottom: Spacing.md }}>
            Copy {DAYS_FULL[sourceDay]}'s {sourceTemplates.length} slot{sourceTemplates.length !== 1 ? 's' : ''} to other days:
          </ThemedText>

          <View style={styles.copyDaysGrid}>
            {DAYS_FULL.map((day, index) => {
              const isSource = index === sourceDay;
              const isSelected = selectedDays.includes(index);
              const existingSlots = templates.filter(t => t.dayOfWeek === index).length;

              return (
                <Clickable
                  key={day}
                  onPress={() => toggleDay(index)}
                  disabled={isSource}
                  style={[
                    styles.copyDayButton,
                    {
                      backgroundColor: isSource
                        ? `${palette.success}15`
                        : isSelected
                        ? `${palette.tint}15`
                        : palette.background,
                      borderColor: isSource
                        ? palette.success
                        : isSelected
                        ? palette.tint
                        : palette.border,
                      opacity: isSource ? 0.6 : 1,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.copyDayText,
                      { color: isSource ? palette.success : isSelected ? palette.tint : palette.text },
                    ]}
                  >
                    {day}
                  </ThemedText>
                  {isSource && (
                    <ThemedText style={{ fontSize: 10, color: palette.success }}>Source</ThemedText>
                  )}
                  {!isSource && existingSlots > 0 && (
                    <ThemedText style={{ fontSize: 10, color: palette.muted }}>
                      {existingSlots} slot{existingSlots !== 1 ? 's' : ''}
                    </ThemedText>
                  )}
                  {isSelected && (
                    <View style={[styles.checkmark, { backgroundColor: palette.tint }]}>
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    </View>
                  )}
                </Clickable>
              );
            })}
          </View>

          {selectedDays.length > 0 && (
            <ThemedText style={{ color: palette.warning, fontSize: 12, marginTop: Spacing.sm }}>
              Note: Existing slots on target days will be replaced.
            </ThemedText>
          )}

          <View style={styles.copyModalActions}>
            <Clickable
              onPress={onClose}
              style={[styles.copyModalButton, { borderColor: palette.border }]}
            >
              <ThemedText>Cancel</ThemedText>
            </Clickable>
            <Clickable
              onPress={handleCopy}
              style={[
                styles.copyModalButton,
                { backgroundColor: palette.tint, borderColor: palette.tint },
              ]}
            >
              <Ionicons name="copy-outline" size={16} color="#fff" />
              <ThemedText style={{ color: '#fff', fontWeight: '600' }}>
                Copy to {selectedDays.length} day{selectedDays.length !== 1 ? 's' : ''}
              </ThemedText>
            </Clickable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function AvailabilityScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [templates, setTemplates] = useState<AvailabilityTemplate[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AvailabilityTemplate | null>(null);
  const [preselectedDay, setPreselectedDay] = useState<number | undefined>();
  const [preselectedHour, setPreselectedHour] = useState<number | undefined>();
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySourceDay, setCopySourceDay] = useState<number>(0);
  const [scheduleMode, setScheduleMode] = useState<'same' | 'custom'>('custom');

  const coachId = currentUser?.id || 'coach_1';

  // Calculate summary stats
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

  // Get slot status for grid cell
  const getSlotStatus = useCallback(
    (dayOfWeek: number, hour: number): { available: boolean; template?: AvailabilityTemplate } => {
      const template = templates.find((t) => {
        if (t.dayOfWeek !== dayOfWeek) return false;
        const [startHour] = t.startTime.split(':').map(Number);
        const [endHour] = t.endTime.split(':').map(Number);
        return hour >= startHour && hour < endHour;
      });
      return { available: !!template, template };
    },
    [templates]
  );

  const handleSlotPress = (dayOfWeek: number, hour: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPreselectedDay(dayOfWeek);
    setPreselectedHour(hour);
    setEditingTemplate(null);
    setShowTemplateModal(true);
  };

  const handleSlotLongPress = (dayOfWeek: number, hour: number) => {
    const { template } = getSlotStatus(dayOfWeek, hour);
    if (template) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setEditingTemplate(template);
      setPreselectedDay(undefined);
      setPreselectedHour(undefined);
      setShowTemplateModal(true);
    }
  };

  const handleSaveTemplate = async (
    templateData: Omit<AvailabilityTemplate, 'id' | 'coachId'>
  ) => {
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
    } catch (error) {
      throw error;
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await availabilityService.deleteTemplate(templateId);
      await loadTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleApplyQuickTemplate = async (templateId: string) => {
    const quickTemplate = QUICK_TEMPLATES.find(t => t.id === templateId);
    if (!quickTemplate) return;

    Alert.alert(
      `Apply ${quickTemplate.name} Schedule`,
      `This will add availability for ${quickTemplate.description}. Existing slots will be kept.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: async () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            try {
              for (const slotDef of quickTemplate.slots) {
                for (const day of slotDef.days) {
                  await availabilityService.saveTemplate({
                    coachId,
                    dayOfWeek: day as 0 | 1 | 2 | 3 | 4 | 5 | 6,
                    startTime: slotDef.startTime,
                    endTime: slotDef.endTime,
                    isRecurring: true,
                    maxConcurrent: 1,
                    bufferMinutes: 15,
                  });
                }
              }
              await loadTemplates();
            } catch (error) {
              console.error('Failed to apply template:', error);
              Alert.alert('Error', 'Failed to apply template. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleCopySchedule = async (targetDays: number[]) => {
    const sourceTemplates = templates.filter(t => t.dayOfWeek === copySourceDay);

    try {
      // Delete existing templates on target days
      for (const day of targetDays) {
        const existingTemplates = templates.filter(t => t.dayOfWeek === day);
        for (const template of existingTemplates) {
          await availabilityService.deleteTemplate(template.id);
        }
      }

      // Copy source templates to target days
      for (const sourceTemplate of sourceTemplates) {
        for (const targetDay of targetDays) {
          await availabilityService.saveTemplate({
            coachId,
            dayOfWeek: targetDay as 0 | 1 | 2 | 3 | 4 | 5 | 6,
            startTime: sourceTemplate.startTime,
            endTime: sourceTemplate.endTime,
            isRecurring: true,
            maxConcurrent: sourceTemplate.maxConcurrent,
            bufferMinutes: sourceTemplate.bufferMinutes,
            location: sourceTemplate.location,
          });
        }
      }

      await loadTemplates();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to copy schedule:', error);
      Alert.alert('Error', 'Failed to copy schedule. Please try again.');
    }
  };

  const handleClearAllSlots = () => {
    Alert.alert(
      'Clear All Availability',
      'This will remove all your availability slots. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const template of templates) {
                await availabilityService.deleteTemplate(template.id);
              }
              await loadTemplates();
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch (error) {
              console.error('Failed to clear slots:', error);
            }
          },
        },
      ]
    );
  };

  const handleBlockDate = () => {
    Alert.prompt(
      'Block Date',
      'Enter the date to block (YYYY-MM-DD):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          onPress: async (date: string | undefined) => {
            if (!date) return;
            try {
              await availabilityService.blockDate(coachId, date, 'Blocked via app');
              Alert.alert('Date Blocked', `${date} has been blocked.`);
            } catch (error) {
              console.error('Failed to block date:', error);
            }
          },
        },
      ],
      'plain-text',
      new Date().toISOString().split('T')[0]
    );
  };

  const getDayTemplates = (dayOfWeek: number) => {
    return templates.filter(t => t.dayOfWeek === dayOfWeek);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header with explanation */}
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>Availability</ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            Set your weekly coaching hours. Athletes will only be able to book during these times.
          </ThemedText>
        </View>

        {/* Summary Stats Card */}
        <SurfaceCard style={[styles.summaryCard, { backgroundColor: palette.tint }]}>
          <View style={styles.summaryContent}>
            <Ionicons name="time" size={32} color="#fff" style={styles.summaryIcon} />
            <View style={styles.summaryTextContainer}>
              <ThemedText style={styles.summaryValue}>
                {summaryStats.totalHours} hours/week
              </ThemedText>
              <ThemedText style={styles.summarySubtext}>
                {summaryStats.slotsCount} slot{summaryStats.slotsCount !== 1 ? 's' : ''} across {summaryStats.daysCount} day{summaryStats.daysCount !== 1 ? 's' : ''}
              </ThemedText>
            </View>
          </View>
          {summaryStats.totalHours === 0 && (
            <View style={styles.emptyPrompt}>
              <Ionicons name="arrow-down" size={16} color="rgba(255,255,255,0.7)" />
              <ThemedText style={styles.emptyPromptText}>
                Use quick templates below or tap the grid to add slots
              </ThemedText>
            </View>
          )}
        </SurfaceCard>

        {/* Quick Templates */}
        <View style={styles.section}>
          <SectionHeader
            title="Quick Templates"
            subtitle="Apply a preset schedule instantly"
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.templatesScroll}
          >
            {QUICK_TEMPLATES.map((template) => (
              <Clickable
                key={template.id}
                onPress={() => handleApplyQuickTemplate(template.id)}
                style={[styles.quickTemplateCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
              >
                <View style={[styles.quickTemplateIcon, { backgroundColor: `${palette.tint}10` }]}>
                  <Ionicons name={template.icon} size={24} color={palette.tint} />
                </View>
                <ThemedText type="defaultSemiBold" style={styles.quickTemplateName}>
                  {template.name}
                </ThemedText>
                <ThemedText style={[styles.quickTemplateDesc, { color: palette.muted }]}>
                  {template.description}
                </ThemedText>
              </Clickable>
            ))}
          </ScrollView>
        </View>

        {/* Weekly Schedule Grid */}
        <View style={styles.section}>
          <SectionHeader
            title="Weekly Schedule"
            subtitle="Tap to add slots, long press to edit"
          />

          <SurfaceCard style={styles.gridCard}>
            {/* Day Headers Row */}
            <View style={styles.gridHeader}>
              <View style={styles.timeColumnHeader} />
              {DAYS_SHORT.map((day, index) => {
                const daySlots = getDayTemplates(index);
                const hasSlots = daySlots.length > 0;
                const isSelected = selectedDay === index;

                return (
                  <Clickable
                    key={day}
                    onPress={() => setSelectedDay(isSelected ? null : index)}
                    style={[
                      styles.dayHeaderCell,
                      {
                        backgroundColor: isSelected
                          ? `${palette.tint}15`
                          : hasSlots
                          ? `${palette.success}08`
                          : 'transparent',
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.dayHeaderText,
                        { color: isSelected ? palette.tint : hasSlots ? palette.success : palette.muted },
                      ]}
                    >
                      {day}
                    </ThemedText>
                    {hasSlots && (
                      <View style={[styles.dayDot, { backgroundColor: palette.success }]} />
                    )}
                  </Clickable>
                );
              })}
            </View>

            {/* Grid Body */}
            <ScrollView style={styles.gridScroll} showsVerticalScrollIndicator={false}>
              {HOURS.map((hour) => (
                <View key={hour} style={styles.gridRow}>
                  <View style={styles.timeColumn}>
                    <ThemedText style={[styles.timeLabel, { color: palette.muted }]}>
                      {hour === 12 ? '12pm' : hour > 12 ? `${hour - 12}pm` : `${hour}am`}
                    </ThemedText>
                  </View>

                  {DAYS_SHORT.map((_, dayIndex) => {
                    const { available } = getSlotStatus(dayIndex, hour);
                    const isSelected = selectedDay === dayIndex;

                    return (
                      <Clickable
                        key={`${dayIndex}-${hour}`}
                        onPress={() => handleSlotPress(dayIndex, hour)}
                        onLongPress={() => handleSlotLongPress(dayIndex, hour)}
                        delayLongPress={400}
                        style={[
                          styles.gridCell,
                          {
                            backgroundColor: available
                              ? `${palette.success}25`
                              : isSelected
                              ? `${palette.tint}05`
                              : palette.background,
                            borderColor: available ? palette.success : palette.border,
                            borderWidth: available ? 1.5 : 0.5,
                          },
                        ]}
                      >
                        {available && (
                          <View style={[styles.slotDot, { backgroundColor: palette.success }]} />
                        )}
                      </Clickable>
                    );
                  })}
                </View>
              ))}
            </ScrollView>

            {/* Legend */}
            <View style={[styles.legend, { borderTopColor: palette.border }]}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: palette.success }]} />
                <ThemedText style={[styles.legendText, { color: palette.muted }]}>Available</ThemedText>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: palette.border }]} />
                <ThemedText style={[styles.legendText, { color: palette.muted }]}>Not set</ThemedText>
              </View>
            </View>
          </SurfaceCard>
        </View>

        {/* Selected Day Detail */}
        {selectedDay !== null && (
          <SurfaceCard style={styles.dayDetailCard}>
            <View style={styles.dayDetailHeader}>
              <View>
                <ThemedText type="subtitle">{DAYS_FULL[selectedDay]}</ThemedText>
                <ThemedText style={{ color: palette.muted, fontSize: 13 }}>
                  {getDayTemplates(selectedDay).length} availability slot{getDayTemplates(selectedDay).length !== 1 ? 's' : ''}
                </ThemedText>
              </View>
              <View style={styles.dayDetailActions}>
                {getDayTemplates(selectedDay).length > 0 && (
                  <Clickable
                    onPress={() => {
                      setCopySourceDay(selectedDay);
                      setShowCopyModal(true);
                    }}
                    style={[styles.dayActionButton, { borderColor: palette.border }]}
                  >
                    <Ionicons name="copy-outline" size={16} color={palette.tint} />
                    <ThemedText style={{ color: palette.tint, fontSize: 13, fontWeight: '600' }}>
                      Copy
                    </ThemedText>
                  </Clickable>
                )}
                <Clickable
                  onPress={() => {
                    setPreselectedDay(selectedDay);
                    setPreselectedHour(undefined);
                    setEditingTemplate(null);
                    setShowTemplateModal(true);
                  }}
                  style={[styles.dayActionButton, { backgroundColor: palette.tint, borderColor: palette.tint }]}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                  <ThemedText style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>
                    Add Slot
                  </ThemedText>
                </Clickable>
              </View>
            </View>

            {getDayTemplates(selectedDay).length === 0 ? (
              <View style={[styles.emptyDayState, { backgroundColor: palette.background }]}>
                <Ionicons name="calendar-outline" size={40} color={palette.muted} />
                <ThemedText style={{ color: palette.muted, marginTop: Spacing.sm, textAlign: 'center' }}>
                  No availability set for {DAYS_FULL[selectedDay]}
                </ThemedText>
                <ThemedText style={{ color: palette.muted, fontSize: 13, marginTop: Spacing.xs }}>
                  Tap "Add Slot" to set your hours
                </ThemedText>
              </View>
            ) : (
              <View style={styles.slotsList}>
                {getDayTemplates(selectedDay)
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map((template) => {
                    const [startH] = template.startTime.split(':').map(Number);
                    const [endH] = template.endTime.split(':').map(Number);
                    const duration = endH - startH;

                    return (
                      <View
                        key={template.id}
                        style={[styles.slotItem, { backgroundColor: palette.background, borderColor: palette.border }]}
                      >
                        <View style={[styles.slotTimeBlock, { backgroundColor: `${palette.success}12` }]}>
                          <ThemedText type="defaultSemiBold" style={{ color: palette.success, fontSize: 15 }}>
                            {template.startTime}
                          </ThemedText>
                          <View style={[styles.slotTimeLine, { backgroundColor: palette.success }]} />
                          <ThemedText type="defaultSemiBold" style={{ color: palette.success, fontSize: 15 }}>
                            {template.endTime}
                          </ThemedText>
                        </View>

                        <View style={styles.slotDetails}>
                          <ThemedText style={{ fontWeight: '600' }}>
                            {duration} hour{duration !== 1 ? 's' : ''}
                          </ThemedText>
                          {template.location && (
                            <View style={styles.slotDetailRow}>
                              <Ionicons name="location-outline" size={14} color={palette.muted} />
                              <ThemedText style={{ color: palette.muted, fontSize: 13 }}>
                                {template.location}
                              </ThemedText>
                            </View>
                          )}
                          <View style={styles.slotDetailRow}>
                            <Ionicons name="people-outline" size={14} color={palette.muted} />
                            <ThemedText style={{ color: palette.muted, fontSize: 13 }}>
                              Max {template.maxConcurrent} concurrent
                            </ThemedText>
                          </View>
                        </View>

                        <View style={styles.slotActions}>
                          <Clickable
                            onPress={() => {
                              setEditingTemplate(template);
                              setPreselectedDay(undefined);
                              setPreselectedHour(undefined);
                              setShowTemplateModal(true);
                            }}
                            style={[styles.slotActionBtn, { borderColor: palette.border }]}
                          >
                            <Ionicons name="pencil-outline" size={16} color={palette.tint} />
                          </Clickable>
                          <Clickable
                            onPress={() => handleDeleteTemplate(template.id)}
                            style={[styles.slotActionBtn, { borderColor: palette.border }]}
                          >
                            <Ionicons name="trash-outline" size={16} color={palette.error} />
                          </Clickable>
                        </View>
                      </View>
                    );
                  })}
              </View>
            )}
          </SurfaceCard>
        )}

        {/* Upcoming Bookings */}
        {upcomingBookings.length > 0 && (
          <>
            <SectionHeader
              title="Upcoming Bookings"
              subtitle={`${upcomingBookings.length} session${upcomingBookings.length > 1 ? 's' : ''} scheduled`}
            />
            <SurfaceCard style={styles.bookingsCard}>
              {upcomingBookings.slice(0, 5).map((booking, index) => {
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
                      <View style={[styles.bookingDateBadge, { backgroundColor: `${palette.tint}10` }]}>
                        <ThemedText style={[styles.bookingDayName, { color: palette.tint }]}>{dayName}</ThemedText>
                        <ThemedText style={[styles.bookingDate, { color: palette.tint }]}>{dateStr}</ThemedText>
                      </View>
                      <View style={styles.bookingInfo}>
                        <ThemedText type="defaultSemiBold" numberOfLines={1}>
                          {booking.athleteName || booking.service || 'Session'}
                        </ThemedText>
                        <View style={styles.bookingMeta}>
                          <Ionicons name="time-outline" size={14} color={palette.muted} />
                          <ThemedText style={[styles.bookingMetaText, { color: palette.muted }]}>
                            {timeStr}
                          </ThemedText>
                        </View>
                      </View>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: booking.status === 'CONFIRMED' ? `${palette.success}20` : `${palette.warning}20` }
                      ]}>
                        <ThemedText style={[
                          styles.statusText,
                          { color: booking.status === 'CONFIRMED' ? palette.success : palette.warning }
                        ]}>
                          {booking.status === 'CONFIRMED' ? 'Confirmed' : 'Pending'}
                        </ThemedText>
                      </View>
                    </Clickable>
                  </View>
                );
              })}
            </SurfaceCard>
          </>
        )}

        {/* Quick Actions */}
        <SurfaceCard style={styles.actionsCard}>
          <ThemedText type="defaultSemiBold" style={{ marginBottom: Spacing.sm }}>
            Quick Actions
          </ThemedText>
          <View style={styles.actionsRow}>
            <Clickable
              style={[styles.actionButton, { borderColor: palette.border }]}
              onPress={() => {
                setEditingTemplate(null);
                setPreselectedDay(undefined);
                setPreselectedHour(undefined);
                setShowTemplateModal(true);
              }}
            >
              <Ionicons name="add-circle-outline" size={20} color={palette.tint} />
              <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>Add Slot</ThemedText>
            </Clickable>
            <Clickable
              style={[styles.actionButton, { borderColor: palette.border }]}
              onPress={handleBlockDate}
            >
              <Ionicons name="close-circle-outline" size={20} color={palette.warning} />
              <ThemedText style={{ color: palette.warning, fontWeight: '600' }}>Block Date</ThemedText>
            </Clickable>
          </View>
          {templates.length > 0 && (
            <Clickable
              style={[styles.clearAllButton, { borderColor: palette.error }]}
              onPress={handleClearAllSlots}
            >
              <Ionicons name="trash-outline" size={18} color={palette.error} />
              <ThemedText style={{ color: palette.error, fontWeight: '500' }}>
                Clear All Availability
              </ThemedText>
            </Clickable>
          )}
        </SurfaceCard>
      </ScrollView>

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

      <CopyScheduleModal
        visible={showCopyModal}
        onClose={() => setShowCopyModal(false)}
        sourceDay={copySourceDay}
        templates={templates}
        onCopy={handleCopySchedule}
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
  header: {
    gap: Spacing.xs,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  section: {
    gap: Spacing.sm,
  },
  summaryCard: {
    padding: Spacing.lg,
    borderRadius: Radii.lg,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIcon: {
    marginRight: Spacing.md,
  },
  summaryTextContainer: {
    flex: 1,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  summarySubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  emptyPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  emptyPromptText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
  templatesScroll: {
    gap: Spacing.sm,
  },
  quickTemplateCard: {
    width: 120,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  quickTemplateIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  quickTemplateName: {
    fontSize: 14,
    textAlign: 'center',
  },
  quickTemplateDesc: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  gridCard: {
    padding: Spacing.sm,
    minHeight: 400,
  },
  gridHeader: {
    flexDirection: 'row',
    paddingVertical: Spacing.xs,
  },
  timeColumnHeader: {
    width: 44,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
    marginHorizontal: 1,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  gridScroll: {
    maxHeight: 350,
  },
  gridRow: {
    flexDirection: 'row',
    height: 32,
  },
  timeColumn: {
    width: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: Spacing.xs,
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  gridCell: {
    flex: 1,
    marginHorizontal: 1,
    marginVertical: 0.5,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingTop: Spacing.md,
    marginTop: Spacing.sm,
    borderTopWidth: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
  },
  dayDetailCard: {
    padding: Spacing.lg,
  },
  dayDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  dayDetailActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  dayActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  emptyDayState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    borderRadius: Radii.md,
  },
  slotsList: {
    gap: Spacing.sm,
  },
  slotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.md,
  },
  slotTimeBlock: {
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
  },
  slotTimeLine: {
    width: 2,
    height: 12,
    marginVertical: 2,
    borderRadius: 1,
  },
  slotDetails: {
    flex: 1,
    gap: 4,
  },
  slotDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  slotActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  slotActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  bookingDateBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.sm,
    minWidth: 56,
  },
  bookingDayName: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  bookingDate: {
    fontSize: 13,
    fontWeight: '700',
  },
  bookingInfo: {
    flex: 1,
    gap: 2,
  },
  bookingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bookingMetaText: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionsCard: {
    padding: Spacing.lg,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  copyModal: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
  },
  copyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  copyDaysGrid: {
    gap: Spacing.xs,
  },
  copyDayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  copyDayText: {
    fontWeight: '600',
    flex: 1,
  },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyModalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  copyModalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
});
