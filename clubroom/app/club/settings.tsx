import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { LoadingState, EmptyState } from '@/components/ui/screen-states';
import { SettingsDetailsSection } from '@/components/club/settings-details-section';
import { SettingsInvitesSection } from '@/components/club/settings-invites-section';
import { SettingsSquadsSection } from '@/components/club/settings-squads-section';
import { SettingsMembersSection } from '@/components/club/settings-members-section';
import { SettingsBrandingSection } from '@/components/club/settings-branding-section';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useClubSettings, SETTINGS_SECTIONS } from '@/hooks/use-club-settings';

export default function ClubSettingsScreen() {
  const { colors } = useTheme();
  const {
    club,
    clubId,
    squads,
    members,
    inviteCodes,
    canManageClub,
    loading,
    activeSection,
    setActiveSection,
    editName,
    setEditName,
    editTagline,
    setEditTagline,
    editCity,
    setEditCity,
    brandingDraft,
    isSavingBranding,
    handleCopyCode,
    handleShareCode,
    handleGenerateCode,
    handleDeleteCode,
    handleSaveDetails,
    handleBrandingChange,
    handleSaveBranding,
    handleCreateSquad,
    handleDeleteClub,
  } = useClubSettings();

  const visibleSections = canManageClub
    ? SETTINGS_SECTIONS
    : SETTINGS_SECTIONS.filter(
        (section) => section.key === 'details' || section.key === 'branding',
      );

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <LoadingState variant="form" />
      </SafeAreaView>
    );
  }

  if (!club) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <EmptyState
          icon="settings-outline"
          title="No club found"
          message="Join or create a club to manage settings."
          actionLabel="Go Back"
          onPressAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <Row gap="md" align="center" style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Clickable>
        <View style={{ flex: 1 }}>
          <ThemedText type="title">Club Settings</ThemedText>
          <ThemedText style={[Typography.small, { color: colors.muted, marginTop: Spacing.micro }]}>
            {club.name}
          </ThemedText>
        </View>
        <View style={{ width: 24 }} />
      </Row>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={styles.tabsContent}
      >
        {visibleSections.map((section) => (
          <Clickable
            key={section.key}
            style={
              [
                styles.tab,
                activeSection === section.key && { backgroundColor: withAlpha(colors.tint, 0.09) },
                { borderColor: activeSection === section.key ? colors.tint : colors.border },
              ].filter(Boolean) as ViewStyle[]
            }
            onPress={() => setActiveSection(section.key)}
          >
            <Row align="center" gap="xs">
              <Ionicons
                name={section.icon as keyof typeof Ionicons.glyphMap}
                size={18}
                color={activeSection === section.key ? colors.tint : colors.muted}
              />
              <ThemedText
                style={[
                  Typography.smallSemiBold,
                  { color: activeSection === section.key ? colors.tint : colors.muted },
                ]}
              >
                {section.label}
              </ThemedText>
            </Row>
          </Clickable>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!canManageClub && (
          <SurfaceCard style={[styles.readOnlyCard, { borderColor: colors.border }]}>
            <ThemedText style={Typography.smallSemiBold}>Read-only access</ThemedText>
            <ThemedText style={[Typography.small, { color: colors.muted }]}>
              Club leaders (Owner/Admin/Head Coach) can edit settings, invites, and member controls.
            </ThemedText>
          </SurfaceCard>
        )}
        {activeSection === 'details' && (
          <SettingsDetailsSection
            editName={editName}
            editTagline={editTagline}
            editCity={editCity}
            colors={colors}
            onNameChange={setEditName}
            onTaglineChange={setEditTagline}
            onCityChange={setEditCity}
            onSave={handleSaveDetails}
          />
        )}
        {activeSection === 'branding' && brandingDraft && (
          <SettingsBrandingSection
            branding={brandingDraft}
            colors={colors}
            canManageClub={canManageClub}
            isSaving={isSavingBranding}
            onChange={handleBrandingChange}
            onSave={handleSaveBranding}
          />
        )}
        {activeSection === 'invites' && (
          <SettingsInvitesSection
            inviteCodes={inviteCodes}
            colors={colors}
            onCopy={handleCopyCode}
            onShare={handleShareCode}
            onGenerate={handleGenerateCode}
            onDelete={handleDeleteCode}
          />
        )}
        {activeSection === 'squads' && (
          <SettingsSquadsSection
            squads={squads}
            colors={colors}
            onCreateSquad={handleCreateSquad}
          />
        )}
        {activeSection === 'members' && (
          <SettingsMembersSection members={members} clubId={clubId} colors={colors} />
        )}
        {activeSection === 'danger' && (
          <Animated.View entering={FadeInDown.springify()}>
            <SurfaceCard style={[styles.dangerCard, { borderColor: colors.error }]}>
              <ThemedText
                type="defaultSemiBold"
                style={[Typography.heading, { color: colors.error }]}
              >
                Danger Zone
              </ThemedText>
              <ThemedText
                style={[Typography.small, { color: colors.muted, marginTop: Spacing.micro }]}
              >
                These actions are irreversible
              </ThemedText>
              <Clickable
                style={[styles.dangerBtn, { borderColor: colors.error }]}
                onPress={handleDeleteClub}
              >
                <Row align="center" justify="center" gap="sm">
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                  <ThemedText style={{ color: colors.error, fontWeight: '600' }}>
                    Delete Club
                  </ThemedText>
                </Row>
              </Clickable>
            </SurfaceCard>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  tabsContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, gap: Spacing.sm },
  tab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  content: { padding: Spacing.lg, paddingTop: 0, gap: Spacing.md },
  readOnlyCard: { gap: Spacing.xs, borderWidth: 1 },
  dangerCard: { gap: Spacing.md },
  dangerBtn: { paddingVertical: Spacing.md, borderRadius: Radii.md, borderWidth: 1.5 },
});
