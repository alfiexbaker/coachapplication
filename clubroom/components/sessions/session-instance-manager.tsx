/**
 * SessionInstanceManager — Coach view: manage upcoming recurring instances + end series.
 */
import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Radii, Spacing, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { scaleFont } from '@/utils/scale';

interface SessionInstanceManagerProps {
  showInstanceManagement: boolean;
  onToggle: () => void;
  upcomingInstances: Date[];
  onCancelInstance: (instanceDate: Date) => void;
  onEndSeries: () => void;
}

function SessionInstanceManagerInner({
  showInstanceManagement, onToggle, upcomingInstances, onCancelInstance, onEndSeries,
}: SessionInstanceManagerProps) {
  const { colors: palette } = useTheme();

  return (
    <SurfaceCard style={styles.card}>
      <Clickable style={styles.header} onPress={onToggle}>
        <View style={styles.headerLeft}>
          <Ionicons name="calendar" size={20} color={palette.tint} />
          <ThemedText type="subtitle" style={styles.title}>Manage Sessions</ThemedText>
        </View>
        <Ionicons name={showInstanceManagement ? 'chevron-up' : 'chevron-down'} size={20} color={palette.icon} />
      </Clickable>

      {showInstanceManagement && (
        <View style={styles.content}>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            Upcoming sessions ({upcomingInstances.length})
          </ThemedText>

          {upcomingInstances.length === 0 ? (
            <ThemedText style={styles.emptyText}>No upcoming sessions</ThemedText>
          ) : (
            upcomingInstances.map((instance, index) => (
              <View key={`instance-${index}`} style={[styles.row, { borderBottomColor: palette.border }]}>
                <View style={styles.info}>
                  <ThemedText style={styles.date}>
                    {instance.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </ThemedText>
                  <ThemedText style={[styles.time, { color: palette.muted }]}>
                    {instance.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </ThemedText>
                </View>
                <Clickable
                  style={[styles.cancelButton, { borderColor: palette.error }]}
                  onPress={() => onCancelInstance(instance)}
                >
                  <Ionicons name="close" size={16} color={palette.error} />
                </Clickable>
              </View>
            ))
          )}

          <Clickable
            style={[styles.endSeriesButton, { backgroundColor: withAlpha(palette.error, 0.06), borderColor: palette.error }]}
            onPress={onEndSeries}
          >
            <Ionicons name="stop-circle-outline" size={20} color={palette.error} />
            <ThemedText style={[styles.endSeriesText, { color: palette.error }]}>End Recurring Series</ThemedText>
          </Clickable>
        </View>
      )}
    </SurfaceCard>
  );
}

export const SessionInstanceManager = memo(SessionInstanceManagerInner);

const styles = StyleSheet.create({
  card: { marginBottom: 16, padding: 20, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: scaleFont(16) },
  content: { marginTop: 16, gap: Spacing.xs + Spacing.xxs },
  subtitle: { fontSize: scaleFont(13), fontWeight: '500' },
  emptyText: { fontSize: scaleFont(15), opacity: 0.5, fontStyle: 'italic', marginTop: 10, lineHeight: scaleFont(21) },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.xs + Spacing.xxs, borderBottomWidth: 1 },
  info: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  date: { fontSize: scaleFont(15), fontWeight: '600' },
  time: { fontSize: scaleFont(14) },
  cancelButton: { width: 32, height: 32, borderRadius: Radii.lg, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  endSeriesButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: Radii.md, borderWidth: 1, marginTop: 8 },
  endSeriesText: { fontSize: scaleFont(15), fontWeight: '600' },
});
