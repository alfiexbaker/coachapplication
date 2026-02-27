import { useMemo } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
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
    deletionRequest,
    setEditingEmail,
    setEditingPhone,
    setEmail,
    setPhone,
    handleSaveEmail,
    handleSavePhone,
    handleChangePassword,
    handleDeleteAccount,
    handleCancelDeletion,
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
          subtitle="Update your account password"
          onPress={handleChangePassword}
        />
      </SettingsSection>

      <SettingsSection title="Connected Accounts">
        <SettingsRow
          icon="logo-google"
          title="Google"
          value="Not connected"
          onPress={() => Alert.alert('Coming Soon', 'Google sign-in coming soon')}
        />
        <SettingsRow
          icon="logo-apple"
          title="Apple"
          value="Not connected"
          onPress={() => Alert.alert('Coming Soon', 'Apple sign-in coming soon')}
        />
      </SettingsSection>

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

      {deletionRequest && deletionRequest.status === 'pending' && (
        <SurfaceCard style={[styles.deletionBanner, { borderColor: colors.error }]}>
          <Row align="center" gap="sm">
            <Ionicons name="warning" size={24} color={colors.error} />
            <ThemedText type="defaultSemiBold" style={{ color: colors.error }}>
              Account Deletion Scheduled
            </ThemedText>
          </Row>
          <ThemedText style={[Typography.body, { marginTop: Spacing.xs }]}>
            Your account will be deleted on{' '}
            {new Date(deletionRequest.scheduledDeletionAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
            .
          </ThemedText>
          <ThemedText style={[Typography.caption, { color: colors.muted, marginTop: Spacing.xxs }]}>
            {Math.max(
              0,
              Math.ceil(
                (new Date(deletionRequest.scheduledDeletionAt).getTime() - Date.now()) /
                  (1000 * 60 * 60 * 24),
              ),
            )}{' '}
            days remaining to cancel
          </ThemedText>
          <Button
            onPress={handleCancelDeletion}
            variant="primary"
            style={{ marginTop: Spacing.md }}
          >
            Cancel Deletion
          </Button>
        </SurfaceCard>
      )}

      <SettingsSection title="Danger Zone">
        <SurfaceCard style={[styles.dangerCard, { borderColor: colors.error }]}>
          <SettingsRow
            icon="pause-circle"
            title="Deactivate Account"
            subtitle="Temporarily hide your account"
            onPress={handleDeactivateAccount}
            iconColor={colors.warning}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingsRow
            icon="trash"
            title="Delete Account"
            subtitle="Permanently delete all your data"
            onPress={handleDeleteAccount}
            destructive
          />
        </SurfaceCard>
      </SettingsSection>

      <Row gap="sm" align="flex-start" style={styles.warningContainer}>
        <Ionicons name="warning" size={16} color={colors.warning} />
        <ThemedText style={[styles.warningText, { color: colors.muted }]}>
          Deleting your account schedules a 30-day grace period. After that, all data is permanently removed.
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
  infoCard: { gap: Spacing.md, paddingHorizontal: Spacing.sm },
  infoLabel: { ...Typography.bodySmall },
  deletionBanner: { borderWidth: 2, marginBottom: Spacing.md },
  dangerCard: { padding: 0, borderWidth: 1 },
  divider: { height: 1, marginHorizontal: Spacing.sm },
  warningContainer: { paddingHorizontal: Spacing.sm, marginTop: Spacing.sm },
  warningText: { flex: 1, ...Typography.small },
});
