import { memo } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

interface InviteManualTabProps {
  email: string;
  onEmailChange: (email: string) => void;
  onSend: () => void;
}

export const InviteManualTab = memo(function InviteManualTab({ email, onEmailChange, onSend }: InviteManualTabProps) {
  const { colors } = useTheme();

  return (
    <SurfaceCard style={styles.card}>
      <ThemedText type="defaultSemiBold">Invite by Email</ThemedText>
      <ThemedText style={[Typography.small, { color: colors.muted }]}>
        Send an invite link directly to someone&apos;s email
      </ThemedText>
      <Row style={styles.inputRow}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
          placeholder="email@example.com"
          placeholderTextColor={colors.muted}
          value={email}
          onChangeText={onEmailChange}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Clickable style={[styles.sendButton, { backgroundColor: colors.tint }]} onPress={onSend}>
          <Ionicons name="send" size={18} color={colors.onPrimary} />
        </Clickable>
      </Row>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  inputRow: { gap: Spacing.sm, marginTop: Spacing.xs },
  input: { flex: 1, borderWidth: 1, borderRadius: Radii.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, ...Typography.body },
  sendButton: { width: 44, height: 44, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
});
