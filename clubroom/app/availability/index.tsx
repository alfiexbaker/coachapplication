import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { DAY_NAMES, DAY_ABBREVS } from '@/constants/booking-types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { availabilityService } from '@/services/availability-service';
import type { AvailabilityTemplate, AvailabilityOverride } from '@/constants/types';

function TemplateCard({
  template,
  index,
  onEdit,
  onDelete,
}: {
  template: AvailabilityTemplate;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <SurfaceCard style={styles.templateCard}>
        <View style={styles.templateMain}>
          <View style={[styles.dayBadge, { backgroundColor: `${palette.tint}15` }]}>
            <ThemedText style={[styles.dayText, { color: palette.tint }]}>
              {DAY_ABBREVS[template.dayOfWeek]}
            </ThemedText>
          </View>
          <View style={styles.templateInfo}>
            <ThemedText type="defaultSemiBold">{DAY_NAMES[template.dayOfWeek]}</ThemedText>
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={14} color={palette.muted} />
              <ThemedText style={[styles.timeText, { color: palette.muted }]}>
                {template.startTime} - {template.endTime}
              </ThemedText>
            </View>
            {template.location && (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color={palette.muted} />
                <ThemedText style={[styles.locationText, { color: palette.muted }]} numberOfLines={1}>
                  {template.location}
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        <View style={styles.templateMeta}>
          <View style={styles.metaItem}>
            <ThemedText style={[styles.metaLabel, { color: palette.muted }]}>Max slots</ThemedText>
            <ThemedText style={styles.metaValue}>{template.maxConcurrent}</ThemedText>
          </View>
          <View style={styles.metaItem}>
            <ThemedText style={[styles.metaLabel, { color: palette.muted }]}>Buffer</ThemedText>
            <ThemedText style={styles.metaValue}>{template.bufferMinutes}min</ThemedText>
          </View>
        </View>

        <View style={styles.templateActions}>
          <Clickable onPress={onEdit} style={[styles.actionButton, { backgroundColor: `${palette.tint}10` }]}>
            <Ionicons name="pencil-outline" size={16} color={palette.tint} />
          </Clickable>
          <Clickable onPress={onDelete} style={[styles.actionButton, { backgroundColor: `${palette.error}10` }]}>
            <Ionicons name="trash-outline" size={16} color={palette.error} />
          </Clickable>
        </View>
      </SurfaceCard>
    </Animated.View>
  );
}

function BlockedDateCard({
  override,
  index,
  onUnblock,
}: {
  override: AvailabilityOverride;
  index: number;
  onUnblock: () => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const date = new Date(override.date);

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <SurfaceCard style={styles.blockedCard}>
        <View style={styles.blockedMain}>
          <View style={[styles.blockedIcon, { backgroundColor: `${palette.error}15` }]}>
            <Ionicons name="close-circle" size={18} color={palette.error} />
          </View>
          <View style={styles.blockedInfo}>
            <ThemedText type="defaultSemiBold">
              {date.toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </ThemedText>
            {override.reason && (
              <ThemedText style={[styles.blockedReason, { color: palette.muted }]}>
                {override.reason}
              </ThemedText>
            )}
          </View>
        </View>
        <Clickable onPress={onUnblock} hitSlop={8}>
          <ThemedText style={[styles.unblockText, { color: palette.tint }]}>Unblock</ThemedText>
        </Clickable>
      </SurfaceCard>
    </Animated.View>
  );
}

export default function AvailabilityScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [templates, setTemplates] = useState<AvailabilityTemplate[]>([]);
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<{
    weeklyHours: number;
    daysAvailable: string[];
  } | null>(null);

  useEffect(() => {
    loadData();
  }, [currentUser?.id]);

  const loadData = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const [tmpl, ovr, sum] = await Promise.all([
        availabilityService.getTemplates(currentUser.id),
        availabilityService.getOverrides(currentUser.id),
        availabilityService.getAvailabilitySummary(currentUser.id),
      ]);
      setTemplates(tmpl);
      setOverrides(ovr.filter((o) => o.isBlocked));
      setSummary(sum);
    } catch (error) {
      console.error('Failed to load availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await availabilityService.deleteTemplate(templateId);
      loadData();
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleUnblockDate = async (date: string) => {
    if (!currentUser?.id) return;
    try {
      await availabilityService.unblockDate(currentUser.id, date);
      loadData();
    } catch (error) {
      console.error('Failed to unblock date:', error);
    }
  };

  // Group templates by day
  const templatesByDay = templates.reduce((acc, template) => {
    const day = template.dayOfWeek;
    if (!acc[day]) acc[day] = [];
    acc[day].push(template);
    return acc;
  }, {} as Record<number, AvailabilityTemplate[]>);

  const sortedDays = Object.keys(templatesByDay)
    .map(Number)
    .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b)); // Sunday last

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <View style={styles.headerTitle}>
          <ThemedText type="title">Availability</ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            Manage your schedule
          </ThemedText>
        </View>
        <Clickable
          onPress={() => router.push('/availability/add-template')}
          style={[styles.addButton, { backgroundColor: palette.tint }]}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </Clickable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary Card */}
        {summary && (
          <Animated.View entering={FadeInDown.springify()}>
            <SurfaceCard style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <View style={[styles.summaryIcon, { backgroundColor: `${palette.tint}15` }]}>
                    <Ionicons name="time-outline" size={20} color={palette.tint} />
                  </View>
                  <ThemedText type="heading" style={styles.summaryValue}>
                    {summary.weeklyHours}h
                  </ThemedText>
                  <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>
                    Weekly hours
                  </ThemedText>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: palette.border }]} />
                <View style={styles.summaryItem}>
                  <View style={[styles.summaryIcon, { backgroundColor: `${palette.success}15` }]}>
                    <Ionicons name="calendar-outline" size={20} color={palette.success} />
                  </View>
                  <ThemedText type="heading" style={styles.summaryValue}>
                    {summary.daysAvailable.length}
                  </ThemedText>
                  <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>
                    Days available
                  </ThemedText>
                </View>
              </View>
              <View style={styles.daysRow}>
                {summary.daysAvailable.map((day) => (
                  <View key={day} style={[styles.dayChip, { backgroundColor: `${palette.success}15` }]}>
                    <ThemedText style={[styles.dayChipText, { color: palette.success }]}>
                      {day.slice(0, 3)}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </SurfaceCard>
          </Animated.View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Clickable
            onPress={() => router.push('/availability/block-date')}
            style={[styles.quickAction, { backgroundColor: palette.surface }]}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: `${palette.error}15` }]}>
              <Ionicons name="calendar-outline" size={18} color={palette.error} />
            </View>
            <ThemedText style={styles.quickActionText}>Block Date</ThemedText>
          </Clickable>
          <Clickable
            onPress={() => router.push('/availability/calendar')}
            style={[styles.quickAction, { backgroundColor: palette.surface }]}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: `${palette.tint}15` }]}>
              <Ionicons name="eye-outline" size={18} color={palette.tint} />
            </View>
            <ThemedText style={styles.quickActionText}>View Calendar</ThemedText>
          </Clickable>
        </View>

        {/* Templates Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle">Weekly Schedule</ThemedText>
            <ThemedText style={[styles.sectionMeta, { color: palette.muted }]}>
              {templates.length} time slots
            </ThemedText>
          </View>

          {templates.length === 0 ? (
            <SurfaceCard style={styles.emptyCard}>
              <View style={[styles.emptyIcon, { backgroundColor: `${palette.muted}15` }]}>
                <Ionicons name="calendar-outline" size={24} color={palette.muted} />
              </View>
              <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
                No availability set yet
              </ThemedText>
              <ThemedText style={[styles.emptySubtext, { color: palette.muted }]}>
                Add your weekly schedule to start receiving bookings
              </ThemedText>
              <Clickable
                onPress={() => router.push('/availability/add-template')}
                style={[styles.emptyButton, { backgroundColor: palette.tint }]}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <ThemedText style={styles.emptyButtonText}>Add time slot</ThemedText>
              </Clickable>
            </SurfaceCard>
          ) : (
            <View style={styles.templatesList}>
              {sortedDays.flatMap((day) =>
                templatesByDay[day].map((template, idx) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    index={idx}
                    onEdit={() => router.push(`/availability/edit-template?id=${template.id}`)}
                    onDelete={() => handleDeleteTemplate(template.id)}
                  />
                ))
              )}
            </View>
          )}
        </View>

        {/* Blocked Dates Section */}
        {overrides.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle">Blocked Dates</ThemedText>
              <View style={[styles.blockedBadge, { backgroundColor: `${palette.error}15` }]}>
                <ThemedText style={[styles.blockedBadgeText, { color: palette.error }]}>
                  {overrides.length}
                </ThemedText>
              </View>
            </View>
            <View style={styles.blockedList}>
              {overrides.map((override, index) => (
                <BlockedDateCard
                  key={override.id}
                  override={override}
                  index={index}
                  onUnblock={() => handleUnblockDate(override.date)}
                />
              ))}
            </View>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  headerTitle: {
    flex: 1,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  summaryCard: {
    marginBottom: Spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: Spacing.md,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  summaryValue: {
    fontSize: 22,
  },
  summaryLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 50,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  dayChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  dayChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  quickActionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionMeta: {
    fontSize: 12,
  },
  templatesList: {
    gap: Spacing.sm,
  },
  templateCard: {
    padding: Spacing.md,
  },
  templateMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  dayBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '700',
  },
  templateInfo: {
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  timeText: {
    fontSize: 13,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontSize: 12,
    flex: 1,
  },
  templateMeta: {
    flexDirection: 'row',
    gap: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaLabel: {
    fontSize: 12,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  templateActions: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  blockedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  blockedList: {
    gap: Spacing.sm,
  },
  blockedCard: {
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  blockedMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  blockedIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockedInfo: {
    flex: 1,
  },
  blockedReason: {
    fontSize: 12,
    marginTop: 2,
  },
  unblockText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 250,
    marginBottom: Spacing.lg,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
});
