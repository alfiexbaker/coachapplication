import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { RatingStars } from '@/components/review/rating-stars';

const FOCUS_OPTIONS = ['Passing', 'Shooting', 'Dribbling', 'Defending', 'Conditioning'];
const ATTENDANCE = ['Present', 'Late', 'No-show'];

export function SessionNotesForm({
  onSubmit,
}: {
  onSubmit: (payload: {
    summary: string;
    focus: string[];
    improvements: string;
    homework: string;
    effort: number;
    attendance: string;
  }) => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [summary, setSummary] = useState('');
  const [focus, setFocus] = useState<string[]>([]);
  const [improvements, setImprovements] = useState('');
  const [homework, setHomework] = useState('');
  const [attendance, setAttendance] = useState('Present');
  const [effort, setEffort] = useState(4);

  const toggleFocus = (item: string) => {
    setFocus((prev) => (prev.includes(item) ? prev.filter((f) => f !== item) : [...prev, item]));
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={{ gap: Spacing.sm }}>
        <ThemedText type="defaultSemiBold">Session summary</ThemedText>
        <TextInput
          placeholder="What we covered today"
          placeholderTextColor={palette.muted}
          style={[styles.textArea, { borderColor: palette.border, color: palette.text }]}
          value={summary}
          onChangeText={setSummary}
          multiline
        />
      </View>

      <View style={{ gap: Spacing.sm }}>
        <ThemedText type="defaultSemiBold">Focus areas</ThemedText>
        <View style={styles.rowWrap}>
          {FOCUS_OPTIONS.map((item) => {
            const active = focus.includes(item);
            return (
              <Clickable
                key={item}
                onPress={() => toggleFocus(item)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? `${palette.tint}15` : palette.surface,
                    borderColor: active ? palette.tint : palette.border,
                  },
                ]}
              >
                <ThemedText style={{ color: active ? palette.tint : palette.text }}>{item}</ThemedText>
              </Clickable>
            );
          })}
        </View>
      </View>

      <View style={{ gap: Spacing.sm }}>
        <ThemedText type="defaultSemiBold">Improvements seen</ThemedText>
        <TextInput
          placeholder="Much better first touch under pressure"
          placeholderTextColor={palette.muted}
          style={[styles.textArea, { borderColor: palette.border, color: palette.text }]}
          value={improvements}
          onChangeText={setImprovements}
          multiline
        />
      </View>

      <View style={{ gap: Spacing.sm }}>
        <ThemedText type="defaultSemiBold">Homework</ThemedText>
        <TextInput
          placeholder="Practice wall passes 20 min daily"
          placeholderTextColor={palette.muted}
          style={[styles.textArea, { borderColor: palette.border, color: palette.text }]}
          value={homework}
          onChangeText={setHomework}
          multiline
        />
      </View>

      <View style={{ gap: Spacing.sm }}>
        <ThemedText type="defaultSemiBold">Effort rating</ThemedText>
        <RatingStars rating={effort} onRate={setEffort} />
      </View>

      <View style={{ gap: Spacing.sm }}>
        <ThemedText type="defaultSemiBold">Attendance</ThemedText>
        <View style={styles.rowWrap}>
          {ATTENDANCE.map((item) => {
            const active = attendance === item;
            return (
              <Clickable
                key={item}
                onPress={() => setAttendance(item)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? `${palette.tint}15` : palette.surface,
                    borderColor: active ? palette.tint : palette.border,
                  },
                ]}
              >
                <ThemedText style={{ color: active ? palette.tint : palette.text }}>{item}</ThemedText>
              </Clickable>
            );
          })}
        </View>
      </View>

      <Clickable
        onPress={() => onSubmit({ summary, focus, improvements, homework, effort, attendance })}
        style={[styles.submit, { backgroundColor: palette.tint }]}
      >
        <Ionicons name="checkmark-circle" size={18} color="#fff" />
        <ThemedText style={{ color: '#fff', fontWeight: '700' }}>Submit Notes</ThemedText>
      </Clickable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  textArea: {
    minHeight: 96,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    padding: Spacing.md,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
  },
  submit: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: Radii.button,
  },
});
