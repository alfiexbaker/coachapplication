import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

function formatValue(value?: string, fallback: string = 'Not captured yet') {
  if (!value) return fallback;
  return value;
}

function formatList(values: string[] = [], fallback: string = 'Not captured yet') {
  if (!values.length) return fallback;
  return values.join(', ');
}

export function SessionNotesView({
  summary,
  focus,
  improvements,
  homework,
  effort,
  attendance,
  updatedAt,
}: {
  summary: string;
  focus: string[];
  improvements: string;
  homework: string;
  effort: number;
  attendance: string;
  updatedAt?: string;
}) {
  const { colors: palette } = useTheme();
  return (
    <View style={{ gap: Spacing.sm }}>
      <NoteBlock label="Summary" value={formatValue(summary)} />
      <NoteBlock label="Focus areas" value={formatList(focus)} />
      <NoteBlock label="Improvements" value={formatValue(improvements, 'Waiting to be logged')} />
      <NoteBlock label="Homework" value={formatValue(homework, 'Share quick reminders for parents')} />
      <NoteBlock label="Effort" value={`${effort || '—'}/5`} />
      <NoteBlock label="Attendance" value={formatValue(attendance, 'Not captured yet')} />
      {updatedAt ? (
        <ThemedText style={{ ...Typography.caption, color: palette.muted }}>
          Updated {new Date(updatedAt).toLocaleString()}
        </ThemedText>
      ) : null}
      <View style={{ padding: Spacing.sm, backgroundColor: withAlpha(palette.premium, 0.07), borderRadius: Radii.md }}>
        <ThemedText type="defaultSemiBold">Parent view</ThemedText>
        <ThemedText style={{ color: palette.muted }}>
          Parents will see this inside booking details along with progression charts.
        </ThemedText>
      </View>
    </View>
  );
}

function NoteBlock({ label, value }: { label: string; value: string }) {
  const { colors: palette } = useTheme();
  return (
    <View style={styles.block}>
      <ThemedText style={{ color: palette.muted, fontWeight: '600' }}>{label}</ThemedText>
      <ThemedText>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: Spacing.xxs,
  },
});
