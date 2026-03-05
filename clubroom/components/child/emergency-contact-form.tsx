import { memo, useState, useCallback } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { Spacer } from '@/components/primitives/spacer';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { EmergencyContact } from '@/constants/types';
import { Row, Column } from '@/components/primitives';
import { uiFeedback } from '@/services/ui-feedback';

/** Validates UK mobile (+447/07) and landline (+44[1-3]/0[1-3]) numbers */
function validateUKPhone(phone: string): boolean {
  const cleaned = phone.replace(/\s/g, '');
  const ukMobileRegex = /^(\+447\d{3}|07\d{3})\d{6}$/;
  const ukLandlineRegex = /^(\+44[1-3]|0[1-3])\d{8,9}$/;
  return ukMobileRegex.test(cleaned) || ukLandlineRegex.test(cleaned);
}

/** Basic email validation */
function validateEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

interface EmergencyContactFormProps {
  contact?: EmergencyContact;
  onSave: (contact: Omit<EmergencyContact, 'id'>) => void;
  onCancel: () => void;
}

export const EmergencyContactForm = memo(function EmergencyContactForm({
  contact,
  onSave,
  onCancel,
}: EmergencyContactFormProps) {
  const { colors } = useTheme();
  const [name, setName] = useState(contact?.name ?? '');
  const [relationship, setRelationship] = useState(contact?.relationship ?? '');
  const [phone, setPhone] = useState(contact?.phone ?? '');
  const [email, setEmail] = useState(contact?.email ?? '');
  const [canPickup, setCanPickup] = useState(contact?.canPickup ?? true);
  const [isPrimary, setIsPrimary] = useState(contact?.isPrimary ?? false);
  const [phoneError, setPhoneError] = useState<string>();
  const [emailError, setEmailError] = useState<string>();

  const isValid = name.trim() && relationship.trim() && phone.trim() && !phoneError && !emailError;

  const handlePhoneChange = useCallback((text: string) => {
    const sanitized = text.replace(/[^0-9\s+()-]/g, '');
    setPhone(sanitized);
    if (phoneError) setPhoneError(undefined);
  }, [phoneError]);

  const handlePhoneBlur = useCallback(() => {
    if (phone.trim() && !validateUKPhone(phone)) {
      setPhoneError('Please enter a valid UK phone number');
    }
  }, [phone]);

  const handleEmailChange = useCallback((text: string) => {
    setEmail(text.trim().toLowerCase());
    if (emailError) setEmailError(undefined);
  }, [emailError]);

  const handleEmailBlur = useCallback(() => {
    if (email.trim() && !validateEmail(email)) {
      setEmailError('Please enter a valid email address');
    }
  }, [email]);

  const handleSave = useCallback(() => {
    const errors: string[] = [];
    if (!name.trim()) errors.push('Name is required');
    if (!relationship.trim()) errors.push('Relationship is required');
    if (!phone.trim()) errors.push('Phone number is required');
    else if (!validateUKPhone(phone)) errors.push('Phone number is not a valid UK number');
    if (email.trim() && !validateEmail(email)) errors.push('Email address is invalid');

    if (errors.length > 0) {
      uiFeedback.alert('Validation Error', errors.join('\n'));
      return;
    }

    onSave({
      name: name.trim(),
      relationship: relationship.trim(),
      phone: phone.trim(),
      email: email.trim() ? email.trim().toLowerCase() : undefined,
      canPickup,
      isPrimary,
    });
  }, [name, relationship, phone, email, canPickup, isPrimary, onSave]);

  const inputStyle = [styles.input, { borderColor: colors.border, color: colors.text }];

  return (
    <SurfaceCard style={styles.card}>
      <Row style={styles.header}>
        <ThemedText type="defaultSemiBold">
          {contact ? 'Edit Contact' : 'Add Emergency Contact'}
        </ThemedText>
        <Clickable accessibilityLabel="Close" onPress={onCancel}>
          <Ionicons name="close" size={24} color={colors.muted} />
        </Clickable>
      </Row>

      <View style={styles.field}>
        <ThemedText style={styles.label}>Full Name *</ThemedText>
        <TextInput
          style={inputStyle}
          placeholder="Contact's full name"
          placeholderTextColor={colors.muted}
          value={name}
          onChangeText={setName}

            maxLength={50}
          />
      </View>

      <View style={styles.field}>
        <ThemedText style={styles.label}>Relationship *</ThemedText>
        <TextInput
          style={inputStyle}
          placeholder="e.g., Mother, Father, Grandparent"
          placeholderTextColor={colors.muted}
          value={relationship}
          onChangeText={setRelationship}

            maxLength={100}
          />
      </View>

      <View style={styles.field}>
        <ThemedText style={styles.label}>Phone Number *</ThemedText>
        <TextInput
          style={[inputStyle, phoneError ? { borderColor: colors.error } : undefined]}
          placeholder="07xxx xxx xxx"
          placeholderTextColor={colors.muted}
          value={phone}
          onChangeText={handlePhoneChange}
          onBlur={handlePhoneBlur}
          keyboardType="phone-pad"
          maxLength={20}
        />
        {phoneError && (
          <Row align="center" gap="xxs">
            <Ionicons name="alert-circle" size={14} color={colors.error} />
            <ThemedText style={[Typography.caption, { color: colors.error }]}>
              {phoneError}
            </ThemedText>
          </Row>
        )}
        <ThemedText style={[Typography.caption, { color: colors.muted }]}>
          UK mobile: 07700 900123
        </ThemedText>
      </View>

      <View style={styles.field}>
        <ThemedText style={styles.label}>Email (optional)</ThemedText>
        <TextInput
          style={[inputStyle, emailError ? { borderColor: colors.error } : undefined]}
          placeholder="name@example.com"
          placeholderTextColor={colors.muted}
          value={email}
          onChangeText={handleEmailChange}
          onBlur={handleEmailBlur}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={100}
        />
        {emailError && (
          <Row align="center" gap="xxs">
            <Ionicons name="alert-circle" size={14} color={colors.error} />
            <ThemedText style={[Typography.caption, { color: colors.error }]}>
              {emailError}
            </ThemedText>
          </Row>
        )}
      </View>

      <ToggleRow
        label="Can Pick Up Child"
        subtitle="Authorized to collect child after sessions"
        value={canPickup}
        onToggle={() => setCanPickup(!canPickup)}
        colors={colors}
      />

      {!contact && (
        <ToggleRow
          label="Set as Primary Contact"
          subtitle="First contact called in emergencies"
          value={isPrimary}
          onToggle={() => setIsPrimary(!isPrimary)}
          colors={colors}
        />
      )}

      <Button onPress={handleSave} disabled={!isValid}>
        {contact ? 'Save Changes' : 'Add Contact'}
      </Button>
    </SurfaceCard>
  );
});

function ToggleRow({
  label,
  subtitle,
  value,
  onToggle,
  colors,
}: {
  label: string;
  subtitle: string;
  value: boolean;
  onToggle: () => void;
  colors: { success: string; border: string; muted: string; surface: string };
}) {
  return (
    <Row style={styles.toggleRow}>
      <Column flex>
        <ThemedText type="defaultSemiBold">{label}</ThemedText>
        <ThemedText style={{ color: colors.muted, ...Typography.small }}>{subtitle}</ThemedText>
      </Column>
      <Clickable onPress={onToggle}>
        <View style={[styles.toggle, { backgroundColor: value ? colors.success : colors.border }]}>
          <View
            style={[
              styles.toggleKnob,
              { backgroundColor: colors.surface, transform: [{ translateX: value ? 18 : 2 }] },
            ]}
          />
        </View>
      </Clickable>
    </Row>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.md },
  header: { justifyContent: 'space-between', alignItems: 'center' },
  field: { gap: Spacing.xs },
  label: { ...Typography.bodySmallSemiBold },
  input: { borderWidth: 1.5, borderRadius: Radii.md, padding: Spacing.sm, ...Typography.body },
  toggleRow: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  toggle: { width: 48, height: 28, borderRadius: Radii.lg, justifyContent: 'center' },
  toggleKnob: { width: 24, height: 24, borderRadius: Radii.md },
});
