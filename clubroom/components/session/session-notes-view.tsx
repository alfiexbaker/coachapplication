import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  return (
    <View style={{ gap: Spacing.sm }}>
      <NoteBlock label="Summary" value={formatValue(summary)} />
      <NoteBlock label="Focus areas" value={formatList(focus)} />
      <NoteBlock label="Improvements" value={formatValue(improvements, 'Waiting to be logged')} />
      <NoteBlock label="Homework" value={formatValue(homework, 'Share quick reminders for parents')} />
      <NoteBlock label="Effort" value={`${effort || '—'}/5`} />
      <NoteBlock label="Attendance" value={formatValue(attendance, 'Not captured yet')} />
      {updatedAt ? (
        <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
          Updated {new Date(updatedAt).toLocaleString()}
        </ThemedText>
      ) : null}
      <View style={{ padding: Spacing.sm, backgroundColor: `${palette.premium}12`, borderRadius: 12 }}>
        <ThemedText type="defaultSemiBold">Parent view</ThemedText>
        <ThemedText style={{ color: palette.muted }}>
          Parents will see this inside booking details along with progression charts.
        </ThemedText>
      </View>
    </View>
  );
}

function NoteBlock({ label, value }: { label: string; value: string }) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  return (
    <View style={styles.block}>
      <ThemedText style={{ color: palette.muted, fontWeight: '600' }}>{label}</ThemedText>
      <ThemedText>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: 6,
  },
});
