/**
 * RecoveryTimeline Component
 *
 * Displays the recovery progress of an injury with timeline of notes,
 * progress bar, and expected recovery date.
 */

import { View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Injury } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { injuryService } from '@/services/injury-service';
import { scaleFont } from '@/utils/scale';
import {
  RecoveryProgressCard,
  TimelineItem,
  TimelineEmptyState,
} from './recovery-timeline-sections';

interface RecoveryTimelineProps {
  injury: Injury;
  showProgress?: boolean;
}

export function RecoveryTimeline({ injury, showProgress = true }: RecoveryTimelineProps) {
  const { colors: palette } = useTheme();

  const statusInfo = injuryService.getStatusInfo(injury.status);
  const daysUntilRecovery = injuryService.getDaysUntilRecovery(injury);
  const expectedProgress = injuryService.calculateExpectedProgress(injury);

  const sortedNotes = [...injury.notes].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <View style={styles.container}>
      {showProgress && (
        <RecoveryProgressCard
          recoveryPercent={injury.recoveryPercent}
          statusInfo={statusInfo}
          expectedProgress={expectedProgress}
          expectedRecovery={injury.expectedRecovery}
          occurredAt={injury.occurredAt}
          daysUntilRecovery={daysUntilRecovery}
          palette={palette}
        />
      )}

      <View style={styles.timelineSection}>
        <ThemedText style={[styles.sectionTitle, { color: palette.muted }]}>
          Recovery Timeline
        </ThemedText>

        {sortedNotes.length === 0 ? (
          <TimelineEmptyState palette={palette} />
        ) : (
          <View style={styles.timeline}>
            {sortedNotes.map((note, index) => (
              <TimelineItem
                key={note.id}
                note={note}
                isFirst={index === 0}
                isLast={index === sortedNotes.length - 1}
                palette={palette}
                statusColor={statusInfo.color}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.lg },
  timelineSection: { gap: Spacing.sm },
  sectionTitle: {
    fontSize: scaleFont(13),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeline: { paddingLeft: Spacing.xs },
});
