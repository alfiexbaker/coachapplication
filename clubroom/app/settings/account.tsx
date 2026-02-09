import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SettingsRow, SettingsSection } from '@/components/settings';
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
    currentUser, editingEmail, editingPhone, email, phone,
    setEditingEmail, setEditingPhone, setEmail, setPhone,
    handleSaveEmail, handleSavePhone, handleChangePassword,
    handleDeleteAccount, handleDeactivateAccount,
  } = useAccountSettings();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Row justify="space-between" align="center" style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Clickable>
        <ThemedText type="title" style={styles.headerTitle}>Account</ThemedText>
        <View style={{ width: 24 }} />
      </Row>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SettingsSection title="Email Address">
          <SurfaceCard style={styles.inputCard}>
            {editingEmail ? (
              <View style={styles.editContainer}>
                <TextInput style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text }]} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoFocus accessibilityLabel="Email address" />
                <Row justify="flex-end" align="center" gap="md">
                  <Clickable onPress={() => setEditingEmail(false)}>
                    <ThemedText style={{ color: colors.muted }}>Cancel</ThemedText>
                  </Clickable>
                  <Button onPress={handleSaveEmail}>Save</Button>
                </Row>
              </View>
            ) : (
              <SettingsRow icon="mail" title="Email" value={email} onPress={() => setEditingEmail(true)} />
            )}
          </SurfaceCard>
        </SettingsSection>

        <SettingsSection title="Phone Number">
          <SurfaceCard style={styles.inputCard}>
            {editingPhone ? (
              <View style={styles.editContainer}>
                <TextInput style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text }]} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoFocus placeholder="+44 7XXX XXXXXX" placeholderTextColor={colors.muted} />
                <Row justify="flex-end" align="center" gap="md">
                  <Clickable onPress={() => setEditingPhone(false)}>
                    <ThemedText style={{ color: colors.muted }}>Cancel</ThemedText>
                  </Clickable>
                  <Button onPress={handleSavePhone}>Save</Button>
                </Row>
              </View>
            ) : (
              <SettingsRow icon="call" title="Phone" value={phone || 'Not set'} onPress={() => setEditingPhone(true)} />
            )}
          </SurfaceCard>
        </SettingsSection>

        <SettingsSection title="Password">
          <SettingsRow icon="key" title="Change Password" subtitle="Update your account password" onPress={handleChangePassword} />
        </SettingsSection>

        <SettingsSection title="Connected Accounts">
          <SettingsRow icon="logo-google" title="Google" value="Not connected" onPress={() => Alert.alert('Coming Soon', 'Google sign-in coming soon')} />
          <SettingsRow icon="logo-apple" title="Apple" value="Not connected" onPress={() => Alert.alert('Coming Soon', 'Apple sign-in coming soon')} />
        </SettingsSection>

        <SettingsSection title="Account Information">
          <View style={styles.infoCard}>
            <InfoRow label="Account Type" value={currentUser?.role || 'USER'} colors={colors} bold />
            <InfoRow label="User ID" value={currentUser?.id || 'N/A'} colors={colors} mono />
            <InfoRow label="Member Since" value="January 2024" colors={colors} />
          </View>
        </SettingsSection>

        <SettingsSection title="Danger Zone">
          <SurfaceCard style={[styles.dangerCard, { borderColor: colors.error }]}>
            <SettingsRow icon="pause-circle" title="Deactivate Account" subtitle="Temporarily hide your account" onPress={handleDeactivateAccount} iconColor={colors.warning} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingsRow icon="trash" title="Delete Account" subtitle="Permanently delete all your data" onPress={handleDeleteAccount} destructive />
          </SurfaceCard>
        </SettingsSection>

        <Row gap="sm" align="flex-start" style={styles.warningContainer}>
          <Ionicons name="warning" size={16} color={colors.warning} />
          <ThemedText style={[styles.warningText, { color: colors.muted }]}>
            Deleting your account will remove all your data permanently and cannot be undone.
          </ThemedText>
        </Row>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, colors, bold, mono }: { label: string; value: string; colors: ReturnType<typeof import('@/hooks/useTheme').useTheme>['colors']; bold?: boolean; mono?: boolean }) {
  return (
    <Row justify="space-between" align="center">
      <ThemedText style={[styles.infoLabel, { color: colors.muted }]}>{label}</ThemedText>
      <ThemedText type={bold ? 'defaultSemiBold' : undefined} style={mono ? { fontFamily: 'monospace' } : undefined}>{value}</ThemedText>
    </Row>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  headerTitle: { ...Typography.heading },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing['3xl'], gap: Spacing.lg },
  inputCard: { padding: 0 },
  editContainer: { padding: Spacing.md, gap: Spacing.md },
  input: { height: 48, borderRadius: Radii.md, paddingHorizontal: Spacing.md, ...Typography.body },
  infoCard: { gap: Spacing.md, paddingHorizontal: Spacing.sm },
  infoLabel: { ...Typography.bodySmall },
  dangerCard: { padding: 0, borderWidth: 1 },
  divider: { height: 1, marginHorizontal: Spacing.sm },
  warningContainer: { paddingHorizontal: Spacing.sm, marginTop: Spacing.sm },
  warningText: { flex: 1, ...Typography.small },
});
