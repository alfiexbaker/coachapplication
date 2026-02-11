import { View } from 'react-native';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import type { WaitlistEntry, WaitlistSummary } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

import {
  WaitlistHeader,
  WaitlistActions,
  WaitlistEntryRow,
  WaitlistEmptyExpanded,
  styles,
} from './waitlist-manage-sections';

interface WaitlistManageProps {
  summary: WaitlistSummary;
  entries: WaitlistEntry[];
  isExpanded: boolean;
  isLoading?: boolean;
  onToggleExpand: () => void;
  onNotifyNext: () => void;
  onPromote: () => void;
  onRemoveEntry: (entryId: string, userName: string) => void;
}

export function WaitlistManage({
  summary,
  entries,
  isExpanded,
  isLoading = false,
  onToggleExpand,
  onNotifyNext,
  onPromote,
  onRemoveEntry,
}: WaitlistManageProps) {
  const { colors: palette } = useTheme();

  return (
    <SurfaceCard style={styles.card}>
      <WaitlistHeader
        summary={summary}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
        palette={palette}
      />

      {summary.totalWaiting > 0 && (
        <WaitlistActions
          isLoading={isLoading}
          onNotifyNext={onNotifyNext}
          onPromote={onPromote}
          palette={palette}
        />
      )}

      {isExpanded && entries.length > 0 && (
        <View style={[styles.entriesList, { borderTopColor: palette.border }]}>
          <ThemedText style={[styles.entriesHeader, { color: palette.muted }]}>
            Waitlist ({entries.length})
          </ThemedText>
          {entries.map((entry, index) => (
            <WaitlistEntryRow
              key={entry.id}
              entry={entry}
              isLast={index === entries.length - 1}
              onRemoveEntry={onRemoveEntry}
              palette={palette}
            />
          ))}
        </View>
      )}

      {isExpanded && entries.length === 0 && <WaitlistEmptyExpanded palette={palette} />}
    </SurfaceCard>
  );
}
