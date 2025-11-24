import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { bookingService } from '@/services/booking-service';

const reasons = ['Schedule conflict', 'Weather', 'Injury/Illness', 'Found another coach', 'Other'];

export default function CancelBookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reason, setReason] = useState(reasons[0]);
  const [note, setNote] = useState('');
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">Cancel booking</ThemedText>
        <ThemedText style={{ color: palette.muted }}>Policy: free >24h, 50% within 12-24h, no refund inside 12h.</ThemedText>

        <View style={{ gap: Spacing.sm }}>
          <ThemedText type="defaultSemiBold">Reason</ThemedText>
          {reasons.map((r) => {
            const active = reason === r;
            return (
              <Clickable
                key={r}
                onPress={() => setReason(r)}
                style={[styles.option, { borderColor: active ? palette.tint : palette.border, backgroundColor: active ? `${palette.tint}10` : palette.surface }]}
              >
                <ThemedText style={{ color: active ? palette.tint : palette.text }}>{r}</ThemedText>
              </Clickable>
            );
          })}
        </View>

        <View style={{ gap: Spacing.sm }}>
          <ThemedText type="defaultSemiBold">Message to coach</ThemedText>
          <TextInput
            placeholder="Let them know why you're cancelling"
            placeholderTextColor={palette.muted}
            style={[styles.textArea, { borderColor: palette.border, color: palette.text }]}
            value={note}
            onChangeText={setNote}
            multiline
          />
        </View>
      </ScrollView>
      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        <Clickable
          onPress={async () => {
            await bookingService.cancel(id, reason);
            Alert.alert('Booking cancelled', 'We notified the coach and processed the mock refund.');
            router.back();
          }}
          style={[styles.cta, { backgroundColor: palette.error }]}
        >
          <ThemedText style={{ color: '#fff', fontWeight: '700' }}>Confirm cancellation</ThemedText>
        </Clickable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  option: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  textArea: {
    minHeight: 120,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    padding: Spacing.md,
    textAlignVertical: 'top',
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  cta: {
    padding: Spacing.md,
    borderRadius: Radii.button,
    alignItems: 'center',
  },
});
