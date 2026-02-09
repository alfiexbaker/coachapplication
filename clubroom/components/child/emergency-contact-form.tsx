import { memo, useState, useCallback } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { EmergencyContact } from '@/constants/types';

interface EmergencyContactFormProps {
  contact?: EmergencyContact;
  onSave: (contact: Omit<EmergencyContact, 'id'>) => void;
  onCancel: () => void;
}

export const EmergencyContactForm = memo(function EmergencyContactForm({
  contact, onSave, onCancel,
}: EmergencyContactFormProps) {
  const { colors } = useTheme();
  const [name, setName] = useState(contact?.name ?? '');
  const [relationship, setRelationship] = useState(contact?.relationship ?? '');
  const [phone, setPhone] = useState(contact?.phone ?? '');
  const [email, setEmail] = useState(contact?.email ?? '');
  const [canPickup, setCanPickup] = useState(contact?.canPickup ?? true);
  const [isPrimary, setIsPrimary] = useState(contact?.isPrimary ?? false);

  const isValid = name.trim() && relationship.trim() && phone.trim();

  const handleSave = useCallback(() => {
    if (!name.trim() || !relationship.trim() || !phone.trim()) return;
    onSave({
      name: name.trim(),
      relationship: relationship.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      canPickup,
      isPrimary,
    });
  }, [name, relationship, phone, email, canPickup, isPrimary, onSave]);

  const inputStyle = [styles.input, { borderColor: colors.border, color: colors.text }];

  return (
    <SurfaceCard style={styles.card}>
      <View style={styles.header}>
        <ThemedText type="defaultSemiBold">{contact ? 'Edit Contact' : 'Add Emergency Contact'}</ThemedText>
        <Clickable accessibilityLabel="Close" onPress={onCancel}>
          <Ionicons name="close" size={24} color={colors.muted} />
        </Clickable>
      </View>

      <View style={styles.field}>
        <ThemedText style={styles.label}>Full Name *</ThemedText>
        <TextInput style={inputStyle} placeholder="Contact's full name" placeholderTextColor={colors.muted} value={name} onChangeText={setName} />
      </View>

      <View style={styles.field}>
        <ThemedText style={styles.label}>Relationship *</ThemedText>
        <TextInput style={inputStyle} placeholder="e.g., Mother, Father, Grandparent" placeholderTextColor={colors.muted} value={relationship} onChangeText={setRelationship} />
      </View>

      <View style={styles.field}>
        <ThemedText style={styles.label}>Phone Number *</ThemedText>
        <TextInput style={inputStyle} placeholder="+44 7700 900000" placeholderTextColor={colors.muted} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      </View>

      <View style={styles.field}>
        <ThemedText style={styles.label}>Email (optional)</ThemedText>
        <TextInput style={inputStyle} placeholder="email@example.com" placeholderTextColor={colors.muted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      </View>

      <ToggleRow label="Can Pick Up Child" subtitle="Authorized to collect child after sessions" value={canPickup} onToggle={() => setCanPickup(!canPickup)} colors={colors} />

      {!contact && (
        <ToggleRow label="Set as Primary Contact" subtitle="First contact called in emergencies" value={isPrimary} onToggle={() => setIsPrimary(!isPrimary)} colors={colors} />
      )}

      <Button onPress={handleSave} disabled={!isValid}>
        {contact ? 'Save Changes' : 'Add Contact'}
      </Button>
    </SurfaceCard>
  );
});

function ToggleRow({ label, subtitle, value, onToggle, colors }: {
  label: string; subtitle: string; value: boolean; onToggle: () => void;
  colors: { success: string; border: string; muted: string; surface: string };
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <ThemedText type="defaultSemiBold">{label}</ThemedText>
        <ThemedText style={{ color: colors.muted, ...Typography.small }}>{subtitle}</ThemedText>
      </View>
      <Clickable onPress={onToggle}>
        <View style={[styles.toggle, { backgroundColor: value ? colors.success : colors.border }]}>
          <View style={[styles.toggleKnob, { backgroundColor: colors.surface, transform: [{ translateX: value ? 18 : 2 }] }]} />
        </View>
      </Clickable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  field: { gap: Spacing.xs },
  label: { ...Typography.bodySmallSemiBold },
  input: { borderWidth: 1.5, borderRadius: Radii.md, padding: Spacing.sm, ...Typography.body },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  toggle: { width: 48, height: 28, borderRadius: Radii.lg, justifyContent: 'center' },
  toggleKnob: { width: 24, height: 24, borderRadius: Radii.md },
});
