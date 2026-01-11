import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SettingsRow, SettingsSection } from '@/components/settings';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Button } from '@/components/primitives/button';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';
import { mockUserProfile } from '@/constants/mock-data';

const logger = createLogger('AccountSettings');

export default function AccountSettingsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser, logout } = useAuth();

  // Edit mode states
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [email, setEmail] = useState(mockUserProfile.email);
  const [phone, setPhone] = useState(mockUserProfile.phone || '');

  const handleSaveEmail = () => {
    logger.press('SaveEmail', { email });
    Alert.alert(
      'Verify Email',
      `We'll send a verification email to ${email}. Please check your inbox.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setEditingEmail(false) },
        { text: 'Send', onPress: () => {
          setEditingEmail(false);
          Alert.alert('Success', 'Verification email sent!');
        }},
      ]
    );
  };

  const handleSavePhone = () => {
    logger.press('SavePhone', { phone });
    setEditingPhone(false);
    Alert.alert('Success', 'Phone number updated!');
  };

  const handleChangePassword = () => {
    logger.press('ChangePassword');
    Alert.alert(
      'Change Password',
      'We\'ll send you a password reset link to your email.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send Link', onPress: () => {
          Alert.alert('Success', 'Password reset link sent to your email.');
        }},
      ]
    );
  };

  const handleDeleteAccount = () => {
    logger.press('DeleteAccount');
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm Deletion',
              'This will permanently delete all your data including bookings, messages, and profile information.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Forever',
                  style: 'destructive',
                  onPress: async () => {
                    logger.info('Account deletion confirmed');
                    await logout();
                    router.replace('/');
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleDeactivateAccount = () => {
    logger.press('DeactivateAccount');
    Alert.alert(
      'Deactivate Account',
      'Your account will be hidden and you can reactivate it later by logging in.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          onPress: async () => {
            Alert.alert('Success', 'Your account has been deactivated.');
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <ThemedText type="title" style={styles.headerTitle}>
          Account
        </ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Email Section */}
        <SettingsSection title="Email Address">
          <SurfaceCard style={styles.inputCard}>
            {editingEmail ? (
              <View style={styles.editContainer}>
                <TextInput
                  style={[styles.input, { backgroundColor: palette.surfaceSecondary, color: palette.text }]}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus
                />
                <View style={styles.editActions}>
                  <Clickable onPress={() => setEditingEmail(false)}>
                    <ThemedText style={{ color: palette.muted }}>Cancel</ThemedText>
                  </Clickable>
                  <Button onPress={handleSaveEmail}>Save</Button>
                </View>
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

        {/* Phone Section */}
        <SettingsSection title="Phone Number">
          <SurfaceCard style={styles.inputCard}>
            {editingPhone ? (
              <View style={styles.editContainer}>
                <TextInput
                  style={[styles.input, { backgroundColor: palette.surfaceSecondary, color: palette.text }]}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoFocus
                  placeholder="+44 7XXX XXXXXX"
                  placeholderTextColor={palette.muted}
                />
                <View style={styles.editActions}>
                  <Clickable onPress={() => setEditingPhone(false)}>
                    <ThemedText style={{ color: palette.muted }}>Cancel</ThemedText>
                  </Clickable>
                  <Button onPress={handleSavePhone}>Save</Button>
                </View>
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

        {/* Password Section */}
        <SettingsSection title="Password">
          <SettingsRow
            icon="key"
            title="Change Password"
            subtitle="Update your account password"
            onPress={handleChangePassword}
          />
        </SettingsSection>

        {/* Connected Accounts */}
        <SettingsSection title="Connected Accounts">
          <SettingsRow
            icon="logo-google"
            title="Google"
            value="Not connected"
            onPress={() => {
              logger.press('ConnectGoogle');
              Alert.alert('Coming Soon', 'Google sign-in coming soon');
            }}
          />
          <SettingsRow
            icon="logo-apple"
            title="Apple"
            value="Not connected"
            onPress={() => {
              logger.press('ConnectApple');
              Alert.alert('Coming Soon', 'Apple sign-in coming soon');
            }}
          />
        </SettingsSection>

        {/* Account Info */}
        <SettingsSection title="Account Information">
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <ThemedText style={[styles.infoLabel, { color: palette.muted }]}>Account Type</ThemedText>
              <ThemedText type="defaultSemiBold">{currentUser?.role || 'USER'}</ThemedText>
            </View>
            <View style={styles.infoRow}>
              <ThemedText style={[styles.infoLabel, { color: palette.muted }]}>User ID</ThemedText>
              <ThemedText style={{ fontFamily: 'monospace' }}>{currentUser?.id || 'N/A'}</ThemedText>
            </View>
            <View style={styles.infoRow}>
              <ThemedText style={[styles.infoLabel, { color: palette.muted }]}>Member Since</ThemedText>
              <ThemedText>January 2024</ThemedText>
            </View>
          </View>
        </SettingsSection>

        {/* Danger Zone */}
        <SettingsSection title="Danger Zone">
          <SurfaceCard style={[styles.dangerCard, { borderColor: palette.error }]}>
            <SettingsRow
              icon="pause-circle"
              title="Deactivate Account"
              subtitle="Temporarily hide your account"
              onPress={handleDeactivateAccount}
              iconColor={palette.warning}
            />
            <View style={[styles.divider, { backgroundColor: palette.border }]} />
            <SettingsRow
              icon="trash"
              title="Delete Account"
              subtitle="Permanently delete all your data"
              onPress={handleDeleteAccount}
              destructive
            />
          </SurfaceCard>
        </SettingsSection>

        {/* Warning text */}
        <View style={styles.warningContainer}>
          <Ionicons name="warning" size={16} color={palette.warning} />
          <ThemedText style={[styles.warningText, { color: palette.muted }]}>
            Deleting your account will remove all your data permanently and cannot be undone.
          </ThemedText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    gap: Spacing.lg,
  },
  inputCard: {
    padding: 0,
  },
  editContainer: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  input: {
    height: 48,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.md,
  },
  infoCard: {
    gap: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
  },
  dangerCard: {
    padding: 0,
    borderWidth: 1,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.sm,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
