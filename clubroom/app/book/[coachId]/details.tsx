import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { BookingWizardHeader } from '@/components/ui/booking/booking-wizard';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing  , withAlpha } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useBookingFlow } from '@/context/booking-flow-context';

const LOCATION_OPTIONS = [
  'Coach preferred location',
  'My location',
  'Neutral venue',
  'Virtual session',
];

export default function DetailsScreen() {
  const { coachId } = useLocalSearchParams<{ coachId: string }>();
  const { draft, updateDraft } = useBookingFlow();
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <BookingWizardHeader
          title="Add details"
          subtitle="Tell your coach what you need"
          step={3}
        />

        <View style={{ gap: Spacing.sm }}>
          <ThemedText type="defaultSemiBold">Location</ThemedText>
          {LOCATION_OPTIONS.map((option) => {
            const active = draft.locationOption === option;
            return (
              <Clickable
                key={option}
                onPress={() => updateDraft({ locationOption: option })}
                style={[
                  styles.option,
                  {
                    backgroundColor: active ? withAlpha(palette.tint, 0.07) : palette.surface,
                    borderColor: active ? palette.tint : palette.border,
                  },
                ]}
              >
                <ThemedText>{option}</ThemedText>
              </Clickable>
            );
          })}
          <TextInput
            placeholder="Add address or Zoom link"
            placeholderTextColor={palette.muted}
            style={[styles.input, { borderColor: palette.border, color: palette.text }]}
            value={draft.locationText}
            onChangeText={(text) => updateDraft({ locationText: text })}
          />
        </View>

        <View style={{ gap: Spacing.sm }}>
          <ThemedText type="defaultSemiBold">Special requests</ThemedText>
          <TextInput
            placeholder="Focus on passing technique"
            placeholderTextColor={palette.muted}
            style={[styles.textArea, { borderColor: palette.border, color: palette.text }]}
            value={draft.notes}
            onChangeText={(text) => updateDraft({ notes: text })}
            multiline
          />
        </View>

        <View style={{ gap: Spacing.sm }}>
          <ThemedText type="defaultSemiBold">Add child</ThemedText>
          <TextInput
            placeholder="Type child name"
            placeholderTextColor={palette.muted}
            style={[styles.input, { borderColor: palette.border, color: palette.text }]}
            value={draft.childId}
            onChangeText={(text) => updateDraft({ childId: text })}
          />
        </View>
      </ScrollView>
      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        <Clickable
          onPress={() => router.push(Routes.bookReview(coachId))}
          style={[styles.cta, { backgroundColor: palette.tint }]}
        >
          <Row justify="center" align="center" gap="sm">
            <Ionicons name="arrow-forward" size={18} color={palette.onPrimary} />
            <ThemedText style={{ color: palette.onPrimary, fontWeight: '700' }}>Continue</ThemedText>
          </Row>
        </Clickable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  option: { padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1.5 },
  input: { borderWidth: 1.5, borderRadius: Radii.md, padding: Spacing.md },
  textArea: { borderWidth: 1.5, borderRadius: Radii.md, padding: Spacing.md, minHeight: 120, textAlignVertical: 'top' },
  footer: { padding: Spacing.lg, borderTopWidth: 1 },
  cta: { padding: Spacing.md, borderRadius: Radii.button },
});
