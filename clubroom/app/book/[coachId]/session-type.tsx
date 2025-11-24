import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { BookingWizardHeader } from '@/components/booking/booking-wizard';
import { SessionTypeSelector } from '@/components/booking/session-type-selector';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useBookingFlow } from '@/context/booking-flow-context';

export default function SessionTypeScreen() {
  const { coachId } = useLocalSearchParams<{ coachId: string }>();
  const { draft, updateDraft } = useBookingFlow();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <BookingWizardHeader
          title="Book a session"
          subtitle="Pick your format and duration"
          step={1}
        />

        <SessionTypeSelector selected={draft.sessionType} onSelect={(id) => updateDraft({ sessionType: id, coachId })} />

        <View style={{ gap: Spacing.sm }}>
          <ThemedText type="defaultSemiBold">Duration</ThemedText>
          <View style={styles.row}>
            {[60, 90, 120].map((duration) => {
              const active = draft.duration === duration;
              return (
                <Clickable
                  key={duration}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? `${palette.tint}15` : palette.surface,
                      borderColor: active ? palette.tint : palette.border,
                    },
                  ]}
                  onPress={() => updateDraft({ duration })}
                >
                  <ThemedText style={{ color: active ? palette.tint : palette.text }}>{duration} mins</ThemedText>
                </Clickable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: Spacing.sm }}>
          <ThemedText type="defaultSemiBold">Participants (if group)</ThemedText>
          <TextInput
            placeholder="4"
            keyboardType="number-pad"
            placeholderTextColor={palette.muted}
            style={[styles.input, { borderColor: palette.border, color: palette.text }]}
            value={draft.participants?.toString() || ''}
            onChangeText={(text) => updateDraft({ participants: Number(text) })}
          />
        </View>
      </ScrollView>
      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        <Clickable
          onPress={() => router.push(`/book/${coachId}/schedule`)}
          style={[styles.cta, { backgroundColor: palette.tint }]}
        >
          <Ionicons name="arrow-forward" size={18} color="#fff" />
          <ThemedText style={{ color: '#fff', fontWeight: '700' }}>Continue</ThemedText>
        </Clickable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  row: { flexDirection: 'row', gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.pill, borderWidth: 1.5 },
  input: { borderWidth: 1.5, borderRadius: Radii.md, padding: Spacing.md },
  footer: { padding: Spacing.lg, borderTopWidth: 1 },
  cta: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radii.button },
});
