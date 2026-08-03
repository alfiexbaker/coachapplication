import { StyleSheet, TextInput, View } from 'react-native';

import { SettingsFormScreen, SettingsRow, SettingsSection } from '@/components/settings';
import { Button } from '@/components/primitives/button';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAccountSettings } from '@/hooks/use-account-settings';
import { formatSupportRef } from '@/utils/support-ref';

export default function AccountSettingsScreen() {
  const { colors } = useTheme();
  const {
    currentUser,
    editingPhone,
    phone,
    setEditingPhone,
    setPhone,
    handleSavePhone,
    handleSendPasswordReset,
    handleDeleteAccount,
    handleDeactivateAccount,
    accountClosureSubtitle,
    isAccountClosurePending,
    isAccountClosureBusy,
    savingPhone,
    sendingPasswordReset,
  } = useAccountSettings();

  return (
    <SettingsFormScreen title="Account">
      <SettingsSection title="Contact">
        <SettingsRow
          icon="mail"
          title="Email"
          subtitle={currentUser?.email || 'Not available'}
          showChevron={false}
          accessibilityLabel={`Email, ${currentUser?.email || 'not available'}`}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
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
              editable={!savingPhone}
              placeholder="+44 7XXX XXXXXX"
              placeholderTextColor={colors.muted}
              accessibilityLabel="Phone number"
              accessibilityState={{ disabled: savingPhone }}
              maxLength={20}
            />
            <Row justify="flex-end" align="center" gap="md">
              <Clickable
                onPress={() => setEditingPhone(false)}
                disabled={savingPhone}
                accessibilityLabel="Cancel phone edit"
                accessibilityRole="button"
              >
                <ThemedText style={{ color: colors.muted }}>Cancel</ThemedText>
              </Clickable>
              <Button
                onPress={handleSavePhone}
                disabled={savingPhone}
                accessibilityLabel="Save phone number"
                label={savingPhone ? 'Saving…' : 'Save'}
              />
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
      </SettingsSection>

      <SettingsSection title="Security">
        <SettingsRow
          icon="key"
          title="Send password reset link"
          value={sendingPasswordReset ? 'Sending…' : undefined}
          onPress={handleSendPasswordReset}
          disabled={sendingPasswordReset}
        />
      </SettingsSection>

      <SettingsSection title="Support">
        <SettingsRow
          icon="pricetag"
          title="Support ref"
          value={formatSupportRef(currentUser?.id)}
          showChevron={false}
        />
      </SettingsSection>

      <SettingsSection title="Account access">
        <SettingsRow
          icon="pause-circle"
          title="Request account pause"
          subtitle="Opens an email to support"
          onPress={handleDeactivateAccount}
          iconColor={colors.warning}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingsRow
          icon="trash"
          title="Request account closure"
          subtitle={accountClosureSubtitle}
          onPress={handleDeleteAccount}
          value={isAccountClosurePending ? 'Pending' : undefined}
          disabled={isAccountClosurePending || isAccountClosureBusy}
          destructive
        />
      </SettingsSection>
    </SettingsFormScreen>
  );
}

const styles = StyleSheet.create({
  editContainer: { padding: Spacing.md, gap: Spacing.md },
  input: { height: 48, borderRadius: Radii.md, paddingHorizontal: Spacing.md, ...Typography.body },
  divider: { height: 1, marginHorizontal: Spacing.sm },
});
