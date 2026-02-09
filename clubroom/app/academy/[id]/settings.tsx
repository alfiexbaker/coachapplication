import { View, StyleSheet, ScrollView, TextInput, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAcademySettings } from '@/hooks/use-academy-settings';

export default function AcademySettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: palette } = useTheme();
  const {
    academy, loading, saving, isOwner,
    name, description, isPublic, requiresApproval,
    setName, setDescription, setIsPublic, setRequiresApproval,
    handleSave, navigateToBranding, navigateToStaff, handleDeleteAcademy,
  } = useAcademySettings(id);

  if (loading || !academy) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title">Loading...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <ThemedText type="title" style={{ flex: 1 }}>Academy Settings</ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SurfaceCard style={styles.card}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Basic Information</ThemedText>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Academy Name</ThemedText>
            <TextInput style={[styles.input, { backgroundColor: palette.surfaceSecondary, color: palette.text }]} value={name} onChangeText={setName} editable={isOwner} accessibilityLabel="Academy name" />
          </View>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Description</ThemedText>
            <TextInput style={[styles.textArea, { backgroundColor: palette.surfaceSecondary, color: palette.text }]} value={description} onChangeText={setDescription} multiline numberOfLines={4} editable={isOwner} accessibilityLabel="Academy description" />
          </View>
        </SurfaceCard>

        <SurfaceCard style={styles.card}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Quick Actions</ThemedText>
          <Clickable onPress={navigateToBranding} style={styles.linkRow}>
            <View style={[styles.linkIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}><Ionicons name="color-palette" size={20} color={palette.tint} /></View>
            <View style={styles.linkContent}>
              <ThemedText type="defaultSemiBold">Branding</ThemedText>
              <ThemedText style={[styles.linkDescription, { color: palette.muted }]}>Logo, colors, and banner</ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={palette.muted} />
          </Clickable>
          <Clickable onPress={navigateToStaff} style={styles.linkRow}>
            <View style={[styles.linkIcon, { backgroundColor: withAlpha(palette.success, 0.09) }]}><Ionicons name="people" size={20} color={palette.success} /></View>
            <View style={styles.linkContent}>
              <ThemedText type="defaultSemiBold">Staff Management</ThemedText>
              <ThemedText style={[styles.linkDescription, { color: palette.muted }]}>Invite and manage coaches</ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={palette.muted} />
          </Clickable>
        </SurfaceCard>

        {isOwner && (
          <SurfaceCard style={styles.card}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Privacy</ThemedText>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}><ThemedText type="defaultSemiBold">Public Academy</ThemedText><ThemedText style={[styles.toggleDescription, { color: palette.muted }]}>Allow anyone to discover your academy</ThemedText></View>
              <Switch value={isPublic} onValueChange={setIsPublic} trackColor={{ true: palette.tint, false: palette.border }} />
            </View>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}><ThemedText type="defaultSemiBold">Require Approval</ThemedText><ThemedText style={[styles.toggleDescription, { color: palette.muted }]}>Review membership requests before approving</ThemedText></View>
              <Switch value={requiresApproval} onValueChange={setRequiresApproval} trackColor={{ true: palette.tint, false: palette.border }} />
            </View>
          </SurfaceCard>
        )}

        {isOwner && (
          <SurfaceCard style={[styles.card, { borderColor: palette.error }]}>
            <ThemedText type="defaultSemiBold" style={{ color: palette.error }}>Danger Zone</ThemedText>
            <ThemedText style={[styles.dangerText, { color: palette.muted }]}>These actions cannot be undone.</ThemedText>
            <Clickable onPress={handleDeleteAcademy} style={[styles.dangerButton, { borderColor: palette.error }]}>
              <ThemedText style={{ color: palette.error, fontWeight: '600' }}>Delete Academy</ThemedText>
            </Clickable>
          </SurfaceCard>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {isOwner && (
        <View style={[styles.footer, { borderTopColor: palette.border }]}>
          <Button onPress={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  content: { padding: Spacing.lg, gap: Spacing.md },
  card: { gap: Spacing.md },
  sectionTitle: { marginBottom: Spacing.xs },
  inputGroup: { gap: Spacing.xs },
  inputLabel: { ...Typography.smallSemiBold },
  input: { height: 48, borderRadius: Radii.md, paddingHorizontal: Spacing.md, ...Typography.body },
  textArea: { minHeight: 100, borderRadius: Radii.md, padding: Spacing.md, ...Typography.body, textAlignVertical: 'top' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  linkIcon: { width: 40, height: 40, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  linkContent: { flex: 1 },
  linkDescription: { ...Typography.caption, marginTop: Spacing.micro },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  toggleInfo: { flex: 1, marginRight: Spacing.md },
  toggleDescription: { ...Typography.caption, marginTop: Spacing.micro },
  dangerText: { ...Typography.small },
  dangerButton: { paddingVertical: Spacing.md, borderRadius: Radii.md, borderWidth: 1, alignItems: 'center' },
  bottomSpacer: { height: 100 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.lg, borderTopWidth: 1 },
});
