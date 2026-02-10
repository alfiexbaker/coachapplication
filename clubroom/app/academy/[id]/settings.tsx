import { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Alert, Switch, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useScreen } from '@/hooks/use-screen';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { ok, err, notFound, serviceError } from '@/types/result';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { academyService } from '@/services/academy-service';
import { Routes } from '@/navigation/routes';
import type { Academy } from '@/constants/types';

export default function AcademySettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useAuth();

  const { data: academy, status, error: loadError, refreshing, onRefresh, retry, colors: palette } = useScreen<Academy>({
    load: async () => {
      if (!id) return err(serviceError('VALIDATION', 'No academy ID'));
      try {
        const result = await academyService.getAcademy(id);
        if (!result.success) return err(result.error);
        if (!result.data) return err(notFound('Academy', id));
        return ok(result.data);
      } catch (e) {
        return err(serviceError('UNKNOWN', e instanceof Error ? e.message : 'Failed to load'));
      }
    },
    deps: [id],
  });

  // Form state
  const [name, setName] = useState(academy?.name ?? '');
  const [description, setDescription] = useState(academy?.description ?? '');
  const [isPublic, setIsPublic] = useState(academy?.isPublic ?? true);
  const [requiresApproval, setRequiresApproval] = useState(academy?.requiresApproval ?? false);
  const [saving, setSaving] = useState(false);

  const isOwner = academy?.ownerId === currentUser?.id;

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const result = await academyService.updateSettings(id, { name, description, isPublic, requiresApproval });
      if (!result.success) {
        Alert.alert('Error', result.error.message);
        return;
      }
    } finally {
      setSaving(false);
    }
  };

  const navigateToBranding = () => router.push(Routes.academyBranding(id!));
  const navigateToStaff = () => router.push(Routes.academyStaff(id!));
  const handleDeleteAcademy = () => {
    Alert.alert('Delete Academy', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        if (id) {
          const result = await academyService.deleteAcademy(id);
          if (!result.success) {
            Alert.alert('Error', result.error.message);
            return;
          }
        }
        router.back();
      }},
    ]);
  };

  if (status === 'loading') return <LoadingState variant="detail" />;
  if (status === 'error') return <ErrorState message={loadError!.message} onRetry={retry} />;
  if (status === 'empty') return <EmptyState icon="business-outline" title="Academy not found" message="This academy may have been removed" />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <Row style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <ThemedText type="title" style={{ flex: 1 }}>Academy Settings</ThemedText>
      </Row>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
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
            <Row align="center" gap="md">
              <View style={[styles.linkIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}><Ionicons name="color-palette" size={20} color={palette.tint} /></View>
              <View style={styles.linkContent}>
                <ThemedText type="defaultSemiBold">Branding</ThemedText>
                <ThemedText style={[styles.linkDescription, { color: palette.muted }]}>Logo, colors, and banner</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={palette.muted} />
            </Row>
          </Clickable>
          <Clickable onPress={navigateToStaff} style={styles.linkRow}>
            <Row align="center" gap="md">
              <View style={[styles.linkIcon, { backgroundColor: withAlpha(palette.success, 0.09) }]}><Ionicons name="people" size={20} color={palette.success} /></View>
              <View style={styles.linkContent}>
                <ThemedText type="defaultSemiBold">Staff Management</ThemedText>
                <ThemedText style={[styles.linkDescription, { color: palette.muted }]}>Invite and manage coaches</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={palette.muted} />
            </Row>
          </Clickable>
        </SurfaceCard>

        {isOwner && (
          <SurfaceCard style={styles.card}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Privacy</ThemedText>
            <Row style={styles.toggleRow}>
              <View style={styles.toggleInfo}><ThemedText type="defaultSemiBold">Public Academy</ThemedText><ThemedText style={[styles.toggleDescription, { color: palette.muted }]}>Allow anyone to discover your academy</ThemedText></View>
              <Switch value={isPublic} onValueChange={setIsPublic} trackColor={{ true: palette.tint, false: palette.border }} />
            </Row>
            <Row style={styles.toggleRow}>
              <View style={styles.toggleInfo}><ThemedText type="defaultSemiBold">Require Approval</ThemedText><ThemedText style={[styles.toggleDescription, { color: palette.muted }]}>Review membership requests before approving</ThemedText></View>
              <Switch value={requiresApproval} onValueChange={setRequiresApproval} trackColor={{ true: palette.tint, false: palette.border }} />
            </Row>
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
  header: { alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  content: { padding: Spacing.lg, gap: Spacing.md },
  card: { gap: Spacing.md },
  sectionTitle: { marginBottom: Spacing.xs },
  inputGroup: { gap: Spacing.xs },
  inputLabel: { ...Typography.smallSemiBold },
  input: { height: 48, borderRadius: Radii.md, paddingHorizontal: Spacing.md, ...Typography.body },
  textArea: { minHeight: 100, borderRadius: Radii.md, padding: Spacing.md, ...Typography.body, textAlignVertical: 'top' },
  linkRow: { paddingVertical: Spacing.sm },
  linkIcon: { width: 40, height: 40, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  linkContent: { flex: 1 },
  linkDescription: { ...Typography.caption, marginTop: Spacing.micro },
  toggleRow: { alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  toggleInfo: { flex: 1, marginRight: Spacing.md },
  toggleDescription: { ...Typography.caption, marginTop: Spacing.micro },
  dangerText: { ...Typography.small },
  dangerButton: { paddingVertical: Spacing.md, borderRadius: Radii.md, borderWidth: 1, alignItems: 'center' },
  bottomSpacer: { height: 100 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.lg, borderTopWidth: 1 },
});
