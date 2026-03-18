import { useMemo } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SettingsFormScreen, SettingsRow, SettingsSection } from '@/components/settings';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Button } from '@/components/primitives/button';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAccountSettings } from '@/hooks/use-account-settings';

export default function AccountSettingsScreen() {
  const { colors } = useTheme();
  const {
    currentUser,
    editingEmail,
    editingPhone,
    email,
    phone,
    setEditingEmail,
    setEditingPhone,
    setEmail,
    setPhone,
    handleSaveEmail,
    handleSavePhone,
    handleChangePassword,
    handleDeleteAccount,
    handleDeactivateAccount,
  } = useAccountSettings();
  const memberSinceLabel = useMemo(() => {
    const maybeCreatedAt =
      currentUser && typeof currentUser === 'object' && 'createdAt' in currentUser
        ? (currentUser as { createdAt?: string }).createdAt
        : undefined;
    const parsed = maybeCreatedAt ? new Date(maybeCreatedAt) : null;
    const fallback = new Date();
    fallback.setMonth(fallback.getMonth() - 3);
    const date = parsed && !Number.isNaN(parsed.getTime()) ? parsed : fallback;
    return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  }, [currentUser]);

  return (
    <SettingsFormScreen title="Account">
      <SettingsSection title="Email Address">
        <SurfaceCard style={styles.inputCard}>
          {editingEmail ? (
            <View style={styles.editContainer}>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surfaceSecondary, color: colors.text },
                ]}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
                accessibilityLabel="Email address"
                accessibilityRole="none"

            maxLength={100}
          />
              <Row justify="flex-end" align="center" gap="md">
                <Clickable onPress={() => setEditingEmail(false)} accessibilityLabel="Cancel email edit" accessibilityRole="button">
                  <ThemedText style={{ color: colors.muted }}>Cancel</ThemedText>
                </Clickable>
                <Button onPress={handleSaveEmail} accessibilityLabel="Save email">Save</Button>
              </Row>
            </View>
          ) : (
            <SettingsRow
              icon="mail"
              title="Email"
              value={email}
              onPress={() => setEditingEmail(true)}
            />
          )}
        </SurfaceCard>
      </SettingsSection>

      <SettingsSection title="Phone Number">
        <SurfaceCard style={styles.inputCard}>
          {editingPhone ? (
            <View style={styles.editContainer}>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surfaceSecondary, color: colors.text },
                ]}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoFocus
                placeholder="+44 7XXX XXXXXX"
                placeholderTextColor={colors.muted}
                accessibilityLabel="Phone number"

            maxLength={20}
          />
              <Row justify="flex-end" align="center" gap="md">
                <Clickable onPress={() => setEditingPhone(false)} accessibilityLabel="Cancel phone edit" accessibilityRole="button">
                  <ThemedText style={{ color: colors.muted }}>Cancel</ThemedText>
                </Clickable>
                <Button onPress={handleSavePhone} accessibilityLabel="Save phone number">Save</Button>
              </Row>
            </View>
          ) : (
            <SettingsRow
              icon="call"
              title="Phone"
              value={phone || 'Not set'}
              onPress={() => setEditingPhone(true)}
            />
          )}
        </SurfaceCard>
      </SettingsSection>

      <SettingsSection title="Password">
        <SettingsRow
          icon="key"
          title="Change Password"
          subtitle="Open a support email to request a reset"
          onPress={handleChangePassword}
        />
      </SettingsSection>

      <SurfaceCard style={styles.honestyCard}>
        <Row gap="sm" align="flex-start">
          <Ionicons name="information-circle" size={18} color={colors.tint} />
          <View style={styles.honestyCopy}>
            <ThemedText type="defaultSemiBold">Contact details vs verification</ThemedText>
            <ThemedText style={[styles.honestyText, { color: colors.muted }]}>
              Updating your email or phone changes the account details stored in the app. Verification
              status is reviewed separately and is not re-run from this screen.
            </ThemedText>
          </View>
        </Row>
      </SurfaceCard>

      <SettingsSection title="Account Information">
        <View style={styles.infoCard}>
          <InfoRow
            label="Account Type"
            value={currentUser?.role || 'USER'}
            colors={colors}
            bold
          />
          <InfoRow label="User ID" value={currentUser?.id || 'N/A'} colors={colors} mono />
          <InfoRow label="Member Since" value={memberSinceLabel} colors={colors} />
        </View>
      </SettingsSection>

      <SettingsSection title="Danger Zone">
        <SurfaceCard style={[styles.dangerCard, { borderColor: colors.error }]}>
          <SettingsRow
            icon="pause-circle"
            title="Request Account Pause"
            subtitle="Support can temporarily disable your access"
            onPress={handleDeactivateAccount}
            iconColor={colors.warning}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingsRow
            icon="trash"
            title="Request Account Closure"
            subtitle="Support will handle account closure manually"
            onPress={handleDeleteAccount}
            destructive
          />
        </SurfaceCard>
      </SettingsSection>

      <Row gap="sm" align="flex-start" style={styles.warningContainer}>
        <Ionicons name="warning" size={16} color={colors.warning} />
        <ThemedText style={[styles.warningText, { color: colors.muted }]}>
          Account pause and closure requests are support-assisted in this build so the lifecycle
          action is logged against the correct account.
        </ThemedText>
      </Row>
    </SettingsFormScreen>
  );
}

function InfoRow({
  label,
  value,
  colors,
  bold,
  mono,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof import('@/hooks/useTheme').useTheme>['colors'];
  bold?: boolean;
  mono?: boolean;
}) {
  return (
    <Row justify="space-between" align="center">
      <ThemedText style={[styles.infoLabel, { color: colors.muted }]}>{label}</ThemedText>
      <ThemedText
        type={bold ? 'defaultSemiBold' : undefined}
        style={mono ? { fontFamily: 'monospace' } : undefined}
      >
        {value}
      </ThemedText>
    </Row>
  );
}

const styles = StyleSheet.create({
  inputCard: { padding: 0 },
  editContainer: { padding: Spacing.md, gap: Spacing.md },
  input: { height: 48, borderRadius: Radii.md, paddingHorizontal: Spacing.md, ...Typography.body },
  honestyCard: { marginBottom: Spacing.xs },
  honestyCopy: { flex: 1, gap: Spacing.xxs },
  honestyText: { ...Typography.small },
  infoCard: { gap: Spacing.md, paddingHorizontal: Spacing.sm },
  infoLabel: { ...Typography.bodySmall },
  dangerCard: { padding: 0, borderWidth: 1 },
  divider: { height: 1, marginHorizontal: Spacing.sm },
  warningContainer: { paddingHorizontal: Spacing.sm, marginTop: Spacing.sm },
  warningText: { flex: 1, ...Typography.small },
});
