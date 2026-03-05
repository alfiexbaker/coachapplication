/**
 * SessionInstanceManager — Coach view: manage upcoming recurring instances + end series.
 */
import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Radii, Spacing, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { scaleFont } from '@/utils/scale';
import { uiFeedback } from '@/services/ui-feedback';

interface SessionInstanceManagerProps {
  showInstanceManagement: boolean;
  onToggle: () => void;
  upcomingInstances: Date[];
  onCancelInstance: (instanceDate: Date) => void;
  onEndSeries: () => void;
}

function SessionInstanceManagerInner({
  showInstanceManagement,
  onToggle,
  upcomingInstances,
  onCancelInstance,
  onEndSeries,
}: SessionInstanceManagerProps) {
  const { colors: palette } = useTheme();

  const handleCancelInstance = useCallback((instance: Date) => {
    const dateStr = instance.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    uiFeedback.alert(
      'Cancel Session',
      `Cancel the session on ${dateStr}? Registered participants will be notified.`,
      [
        { text: 'Back', style: 'cancel' },
        {
          text: 'Cancel Session',
          style: 'destructive',
          onPress: () => onCancelInstance(instance),
        },
      ],
    );
  }, [onCancelInstance]);

  const handleEndSeries = useCallback(() => {
    uiFeedback.alert(
      'End Recurring Series',
      `This will cancel all ${upcomingInstances.length} upcoming session${upcomingInstances.length !== 1 ? 's' : ''} in this series. This cannot be undone.`,
      [
        { text: 'Back', style: 'cancel' },
        {
          text: 'End Series',
          style: 'destructive',
          onPress: onEndSeries,
        },
      ],
    );
  }, [upcomingInstances.length, onEndSeries]);

  return (
    <SurfaceCard style={styles.card}>
      <Clickable style={styles.header} onPress={onToggle}>
        <Row align="center" justify="between">
          <Row align="center" gap={10}>
            <Ionicons name="calendar" size={20} color={palette.tint} />
            <ThemedText type="subtitle" style={styles.title}>
              Manage Sessions
            </ThemedText>
          </Row>
          <Ionicons
            name={showInstanceManagement ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={palette.icon}
          />
        </Row>
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
              <Row
                key={`instance-${index}`}
                align="center"
                justify="between"
                style={[styles.row, { borderBottomColor: palette.border }]}
              >
                <Row align="center" gap="sm">
                  <ThemedText style={styles.date}>
                    {instance.toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </ThemedText>
                  <ThemedText style={[styles.time, { color: palette.muted }]}>
                    {instance.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </ThemedText>
                </Row>
                <Clickable
                  style={[styles.cancelButton, { borderColor: palette.error }]}
                  onPress={() => handleCancelInstance(instance)}
                >
                  <Ionicons name="close" size={16} color={palette.error} />
                </Clickable>
              </Row>
            ))
          )}

          <Clickable
            style={[
              styles.endSeriesButton,
              { backgroundColor: withAlpha(palette.error, 0.06), borderColor: palette.error },
            ]}
            onPress={handleEndSeries}
          >
            <Row align="center" justify="center" gap={8}>
              <Ionicons name="stop-circle-outline" size={20} color={palette.error} />
              <ThemedText style={[styles.endSeriesText, { color: palette.error }]}>
                End Recurring Series
              </ThemedText>
            </Row>
          </Clickable>
        </View>
      )}
    </SurfaceCard>
  );
}

export const SessionInstanceManager = memo(SessionInstanceManagerInner);

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.sm, padding: Spacing.md, gap: Spacing.sm },
  header: {},
  title: { fontSize: scaleFont(16) },
  content: { marginTop: Spacing.sm, gap: Spacing.xs + Spacing.xxs },
  subtitle: { fontSize: scaleFont(13), fontWeight: '500' },
  emptyText: {
    fontSize: scaleFont(15),
    opacity: 0.5,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
    lineHeight: scaleFont(21),
  },
  row: { paddingVertical: Spacing.xs + Spacing.xxs, borderBottomWidth: 1 },
  date: { fontSize: scaleFont(15), fontWeight: '600' },
  time: { fontSize: scaleFont(14) },
  cancelButton: {
    width: 32,
    height: 32,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endSeriesButton: { paddingVertical: Spacing.sm, borderRadius: Radii.md, borderWidth: 1, marginTop: Spacing.xs },
  endSeriesText: { fontSize: scaleFont(15), fontWeight: '600' },
});
