import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Clickable } from '@/components/primitives/clickable';

export function CardForm({ onSave }: { onSave: (card: any) => void }) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [name, setName] = useState('');
  const [billing, setBilling] = useState('');

  const inputStyle = [styles.input, { borderColor: palette.border, color: palette.text }];

  return (
    <View style={{ gap: Spacing.md }}>
      <ThemedText type="defaultSemiBold">Card number</ThemedText>
      <TextInput placeholder="4242 4242 4242 4242" style={inputStyle} placeholderTextColor={palette.muted} value={cardNumber} onChangeText={setCardNumber} />
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <View style={{ flex: 1 }}>
          <ThemedText type="defaultSemiBold">Expiry</ThemedText>
          <TextInput placeholder="12/28" style={inputStyle} placeholderTextColor={palette.muted} value={expiry} onChangeText={setExpiry} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="defaultSemiBold">CVV</ThemedText>
          <TextInput placeholder="123" style={inputStyle} placeholderTextColor={palette.muted} value={cvv} onChangeText={setCvv} />
        </View>
      </View>
      <ThemedText type="defaultSemiBold">Cardholder name</ThemedText>
      <TextInput placeholder="Alex Smith" style={inputStyle} placeholderTextColor={palette.muted} value={name} onChangeText={setName} />
      <ThemedText type="defaultSemiBold">Billing address</ThemedText>
      <TextInput placeholder="221B Baker Street" style={inputStyle} placeholderTextColor={palette.muted} value={billing} onChangeText={setBilling} />

      <Clickable
        onPress={() => onSave({ cardNumber, expiry, cvv, name, billing })}
        style={[styles.saveButton, { backgroundColor: palette.tint }]}>
        <ThemedText style={{ color: '#fff', fontWeight: '700' }}>Save card</ThemedText>
      </Clickable>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.sm,
  },
  saveButton: {
    padding: Spacing.sm,
    borderRadius: Radii.button,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
});
