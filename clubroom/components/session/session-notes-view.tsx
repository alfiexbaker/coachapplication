import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function SessionNotesView({
  summary,
  focus,
  improvements,
  homework,
  effort,
  attendance,
}: {
  summary: string;
  focus: string[];
  improvements: string;
  homework: string;
  effort: number;
  attendance: string;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  return (
    <View style={{ gap: Spacing.md }}>
      <NoteBlock label="Summary" value={summary} />
      <NoteBlock label="Focus areas" value={focus.join(', ')} />
      <NoteBlock label="Improvements" value={improvements} />
      <NoteBlock label="Homework" value={homework} />
      <NoteBlock label="Effort" value={`${effort}/5`} />
      <NoteBlock label="Attendance" value={attendance} />
      <View style={{ padding: Spacing.md, backgroundColor: `${palette.premium}12`, borderRadius: 12 }}>
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
