import { useState, type ComponentProps } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { SelfAssessmentPrompt } from '@/services/progress/progress-self-assessment-service';

interface JournalPromptEntry {
  id: string;
  sessionId: string;
  personalNotes: string;
  mood: number;
  energyLevel: number;
  createdAt: string;
}

interface JournalPromptProps {
  showPrompt: boolean;
  pendingPrompt?: SelfAssessmentPrompt | null;
  latestEntry: JournalPromptEntry | null;
  onSavePrompt: (entry: {
    personalNotes: string;
    mood: number;
    energyLevel: number;
    confidence: number;
  }) => void;
  onViewAll?: () => void;
}

const MOOD_OPTIONS: { value: number; icon: ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 1, icon: 'sad-outline' },
  { value: 2, icon: 'happy-outline' },
  { value: 3, icon: 'happy' },
  { value: 4, icon: 'happy' },
  { value: 5, icon: 'flame-outline' },
];

function formatDate(dateString: string): string {
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return 'Recently';
  }
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const RATING_OPTIONS = [1, 2, 3, 4, 5] as const;

export const JournalPrompt = function JournalPrompt({
  showPrompt,
  pendingPrompt,
  latestEntry,
  onSavePrompt,
  onViewAll,
}: JournalPromptProps) {
  const { colors } = useTheme();
  const [note, setNote] = useState('');
  const [mood, setMood] = useState(3);
  const [energyLevel, setEnergyLevel] = useState(3);
  const [confidence, setConfidence] = useState(3);
  const dueLabel = (() => {
    if (!pendingPrompt?.dueAt) {
      return null;
    }
    const parsed = new Date(pendingPrompt.dueAt);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return `Due ${formatDate(pendingPrompt.dueAt)}`;
  })();

  if (!showPrompt && !latestEntry) {
    return null;
  }

  if (!showPrompt && latestEntry) {
    return (
      <SurfaceCard style={styles.card}>
        <Column gap="sm">
          <Row align="center" justify="between">
            <ThemedText style={styles.title}>Journal</ThemedText>
            {onViewAll ? (
              <Clickable
                style={styles.viewAllButton}
                onPress={onViewAll}
                accessibilityLabel="View all journal entries"
                accessibilityRole="button"
              >
                <Row align="center" gap="xxs">
                  <ThemedText style={[styles.viewAllText, { color: colors.tint }]}>View all</ThemedText>
                  <Ionicons name="arrow-forward" size={14} color={colors.tint} />
                </Row>
              </Clickable>
            ) : null}
          </Row>
          <ThemedText style={[styles.metaText, { color: colors.muted }]}>
            Last entry: {formatDate(latestEntry.createdAt)}
          </ThemedText>
          <ThemedText style={styles.summaryText}>{latestEntry.personalNotes}</ThemedText>
        </Column>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard style={styles.card}>
      <Column gap="sm">
        <ThemedText style={styles.title}>How was training?</ThemedText>
        {pendingPrompt ? (
          <ThemedText style={[styles.metaText, { color: colors.muted }]}>
            {dueLabel ?? 'Session check-in'}
          </ThemedText>
        ) : null}

        <Row wrap gap="xs">
          {MOOD_OPTIONS.map((option) => {
            const selected = option.value === mood;
            return (
              <Clickable
                key={option.value}
                style={[
                  styles.moodButton,
                  {
                    borderColor: selected ? colors.tint : colors.border,
                    backgroundColor: selected ? withAlpha(colors.tint, 0.12) : colors.background,
                  },
                ]}
                onPress={() => setMood(option.value)}
                accessibilityLabel={`Mood ${option.value}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Ionicons name={option.icon} size={18} color={selected ? colors.tint : colors.muted} />
              </Clickable>
            );
          })}
        </Row>

        <Column gap="xxs">
          <ThemedText style={[styles.inputLabel, { color: colors.muted }]}>Energy</ThemedText>
          <Row wrap gap="xs">
            {RATING_OPTIONS.map((value) => {
              const selected = value === energyLevel;
              return (
                <Clickable
                  key={`energy-${value}`}
                  style={[
                    styles.valueButton,
                    {
                      borderColor: selected ? colors.tint : colors.border,
                      backgroundColor: selected ? withAlpha(colors.tint, 0.12) : colors.background,
                    },
                  ]}
                  onPress={() => setEnergyLevel(value)}
                  accessibilityLabel={`Energy ${value}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <ThemedText style={[styles.valueText, { color: selected ? colors.tint : colors.muted }]}>
                    {value}
                  </ThemedText>
                </Clickable>
              );
            })}
          </Row>
        </Column>

        <Column gap="xxs">
          <ThemedText style={[styles.inputLabel, { color: colors.muted }]}>Confidence</ThemedText>
          <Row wrap gap="xs">
            {RATING_OPTIONS.map((value) => {
              const selected = value === confidence;
              return (
                <Clickable
                  key={`confidence-${value}`}
                  style={[
                    styles.valueButton,
                    {
                      borderColor: selected ? colors.tint : colors.border,
                      backgroundColor: selected ? withAlpha(colors.tint, 0.12) : colors.background,
                    },
                  ]}
                  onPress={() => setConfidence(value)}
                  accessibilityLabel={`Confidence ${value}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <ThemedText style={[styles.valueText, { color: selected ? colors.tint : colors.muted }]}>
                    {value}
                  </ThemedText>
                </Clickable>
              );
            })}
          </Row>
        </Column>

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Add a note..."
          placeholderTextColor={colors.muted}
          style={[
            styles.input,
            {
              color: colors.text,
              borderColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
          multiline

            maxLength={500}
          />

        <Clickable
          style={[styles.saveButton, { backgroundColor: colors.tint }]}
          onPress={() => {
            onSavePrompt({
              personalNotes: note.trim(),
              mood,
              energyLevel,
              confidence,
            });
            setNote('');
            setMood(3);
            setEnergyLevel(3);
            setConfidence(3);
          }}
          accessibilityLabel="Save journal entry"
          accessibilityRole="button"
        >
          <ThemedText style={[styles.saveText, { color: colors.onPrimary }]}>Save</ThemedText>
        </Clickable>
      </Column>
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
  },
  title: {
    ...Typography.subheading,
    fontWeight: '700',
  },
  viewAllButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxs,
  },
  viewAllText: {
    ...Typography.bodySmallSemiBold,
  },
  metaText: {
    ...Typography.caption,
  },
  summaryText: {
    ...Typography.bodySmall,
  },
  moodButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: {
    ...Typography.caption,
  },
  valueButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    ...Typography.bodySmallSemiBold,
  },
  input: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    ...Typography.bodySmall,
  },
  saveButton: {
    minHeight: 44,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  saveText: {
    ...Typography.bodySmallSemiBold,
  },
});
