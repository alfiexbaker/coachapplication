import { useState, useEffect, useCallback } from 'react';
import { ScrollView, StyleSheet, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';

import { SectionHeader } from '@/components/primitives/section-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { Clickable } from '@/components/primitives/clickable';
import { AvailabilityGrid, DayScheduleView } from '@/components/coach/availability-grid';
import { RecurringTemplateModal } from '@/components/coach/recurring-template-modal';
import { availabilityService } from '@/services/availability-service';
import type { AvailabilityTemplate } from '@/constants/types';

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

  // Mock coach data
  const coachName = currentUser?.role === 'Coach' ? 'Elite Sports Academy' : 'Your School';
  const coachTitle = 'Professional Football Coach';
  const coachId = currentUser?.id || 'coach_1';

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
      // Sort by date
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

  // Reload bookings when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadUpcomingBookings();
    }, [loadUpcomingBookings])
  );

  const handleSlotPress = (dayOfWeek: number, hour: number) => {
    setPreselectedDay(dayOfWeek);
    setPreselectedHour(hour);
    setEditingTemplate(null);
    setShowTemplateModal(true);
  };

  const handleSlotLongPress = (template: AvailabilityTemplate) => {
    setEditingTemplate(template);
    setPreselectedDay(undefined);
    setPreselectedHour(undefined);
    setShowTemplateModal(true);
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

  const handleBlockDate = () => {
    Alert.prompt(
      'Block Date',
      'Enter the date to block (YYYY-MM-DD):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          onPress: async (date) => {
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

  // Calculate stats
  const weeklyHours = templates.reduce((total, t) => {
    const [startH, startM] = t.startTime.split(':').map(Number);
    const [endH, endM] = t.endTime.split(':').map(Number);
    return total + (endH * 60 + endM - startH * 60 - startM) / 60;
  }, 0);

  const daysWithSlots = new Set(templates.map((t) => t.dayOfWeek)).size;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>Your Calendar</ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            Manage your coaching schedule and availability
          </ThemedText>
        </View>

        {/* Coach Identity Card */}
        <SurfaceCard style={[styles.identityCard, { backgroundColor: palette.surface }]}>
          <View style={styles.identityHeader}>
            <View style={[styles.avatarCircle, { backgroundColor: palette.premium }]}>
              <Ionicons name="person" size={28} color="#FFFFFF" />
            </View>
            <View style={styles.identityInfo}>
              <ThemedText style={styles.schoolName}>{coachName}</ThemedText>
              <ThemedText style={[styles.coachTitle, { color: palette.muted }]}>{coachTitle}</ThemedText>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>{weeklyHours.toFixed(0)}h</ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Weekly</ThemedText>
            </View>
            <View style={[styles.divider, { backgroundColor: palette.border }]} />
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>{daysWithSlots}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Days</ThemedText>
            </View>
            <View style={[styles.divider, { backgroundColor: palette.border }]} />
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>{templates.length}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Slots</ThemedText>
            </View>
          </View>
        </SurfaceCard>

        <SectionHeader
          title="Weekly Schedule"
          subtitle="Tap slots to add, long press to edit"
        />

        <SurfaceCard style={styles.calendarCard}>
          <AvailabilityGrid
            templates={templates}
            onSlotPress={handleSlotPress}
            onSlotLongPress={handleSlotLongPress}
            selectedDay={selectedDay}
            onDaySelect={setSelectedDay}
          />
        </SurfaceCard>

        {/* Day Detail View */}
        {selectedDay !== null && (
          <SurfaceCard style={styles.dayDetailCard}>
            <DayScheduleView
              dayOfWeek={selectedDay}
              templates={templates}
              onEditTemplate={(t) => {
                setEditingTemplate(t);
                setShowTemplateModal(true);
              }}
              onDeleteTemplate={handleDeleteTemplate}
              onAddTemplate={() => {
                setPreselectedDay(selectedDay);
                setPreselectedHour(undefined);
                setEditingTemplate(null);
                setShowTemplateModal(true);
              }}
            />
          </SurfaceCard>
        )}

        {/* Upcoming Bookings Section */}
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
                      <View style={[styles.bookingDateBadge, { backgroundColor: palette.tint + '15' }]}>
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
                          {booking.location && (
                            <>
                              <Ionicons name="location-outline" size={14} color={palette.muted} style={{ marginLeft: 8 }} />
                              <ThemedText style={[styles.bookingMetaText, { color: palette.muted }]} numberOfLines={1}>
                                {booking.location}
                              </ThemedText>
                            </>
                          )}
                        </View>
                        {booking.isGroupSession && (
                          <View style={styles.groupBadge}>
                            <Ionicons name="people-outline" size={12} color={palette.secondary} />
                            <ThemedText style={[styles.groupBadgeText, { color: palette.secondary }]}>
                              {booking.currentParticipants || 0}/{booking.maxParticipants} participants
                            </ThemedText>
                          </View>
                        )}
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: booking.status === 'CONFIRMED' ? palette.success + '20' : palette.warning + '20' }]}>
                        <ThemedText style={[styles.statusText, { color: booking.status === 'CONFIRMED' ? palette.success : palette.warning }]}>
                          {booking.status === 'CONFIRMED' ? 'Confirmed' : 'Pending'}
                        </ThemedText>
                      </View>
                    </Clickable>
                  </View>
                );
              })}
              {upcomingBookings.length > 5 && (
                <Clickable
                  onPress={() => router.push('/(tabs)/bookings')}
                  style={[styles.viewAllButton, { borderTopColor: palette.border }]}
                >
                  <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>
                    View all {upcomingBookings.length} bookings
                  </ThemedText>
                  <Ionicons name="chevron-forward" size={18} color={palette.tint} />
                </Clickable>
              )}
            </SurfaceCard>
          </>
        )}

        <SurfaceCard style={styles.actionsCard}>
          <ThemedText type="defaultSemiBold">Quick Actions</ThemedText>
          <View style={styles.actionRow}>
            <Clickable
              style={[styles.actionButton, { borderColor: palette.border }]}
              onPress={() => {
                setEditingTemplate(null);
                setPreselectedDay(undefined);
                setPreselectedHour(undefined);
                setShowTemplateModal(true);
              }}
            >
              <Ionicons name="add-circle" size={18} color={palette.tint} />
              <ThemedText style={{ color: palette.tint, fontWeight: '700' }}>Add slot</ThemedText>
            </Clickable>
            <Clickable style={[styles.actionButton, { borderColor: palette.border }]} onPress={handleBlockDate}>
              <Ionicons name="close-circle" size={18} color={palette.error} />
              <ThemedText style={{ color: palette.error, fontWeight: '700' }}>Block date</ThemedText>
            </Clickable>
          </View>
          <ThemedText style={{ color: palette.muted }}>
            Set recurring weekly availability or block specific dates.
          </ThemedText>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg + 4,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.lg,
  },
  header: {
    gap: Spacing.xs + 2,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  identityCard: {
    padding: Spacing.lg + 4,
    gap: Spacing.lg,
  },
  identityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md + 2,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityInfo: {
    flex: 1,
    gap: Spacing.xs - 2,
  },
  schoolName: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  coachTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: Spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs - 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 32,
  },
  calendarCard: {
    padding: Spacing.lg,
    minHeight: 400,
  },
  dayDetailCard: {
    padding: Spacing.lg,
  },
  actionsCard: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  gridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs - 2,
  },
  gridHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  cell: {
    flex: 1,
    height: 64,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellLabel: {
    fontWeight: '700',
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
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
  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  groupBadgeText: {
    fontSize: 11,
    fontWeight: '600',
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
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
});
