import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { LoadingState } from '@/components/ui/screen-states';
import { SettingsDetailsSection } from '@/components/club/settings-details-section';
import { SettingsInvitesSection } from '@/components/club/settings-invites-section';
import { SettingsSquadsSection } from '@/components/club/settings-squads-section';
import { SettingsMembersSection } from '@/components/club/settings-members-section';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useClubSettings, SETTINGS_SECTIONS } from '@/hooks/use-club-settings';

export default function ClubSettingsScreen() {
  const { colors } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const {
    club, clubId, squads, members, inviteCodes, loading,
    activeSection, setActiveSection,
    editName, setEditName, editTagline, setEditTagline, editCity, setEditCity,
    handleCopyCode, handleShareCode, handleGenerateCode,
    handleSaveDetails, handleCreateSquad, handleDeleteClub,
  } = useClubSettings();

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <LoadingState variant="form" />
      </SafeAreaView>
    );
  }

  if (!club) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.muted} />
          <ThemedText type="subtitle" style={{ textAlign: 'center' }}>No club found</ThemedText>
          <ThemedText style={{ color: colors.muted, textAlign: 'center' }}>Join or create a club to manage settings.</ThemedText>
          <Clickable onPress={() => router.back()} style={{ backgroundColor: colors.tint, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.button }}>
            <ThemedText style={{ color: colors.onPrimary, fontWeight: '600' }}>Go Back</ThemedText>
          </Clickable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Row gap="md" align="center" style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Clickable>
        <View style={{ flex: 1 }}>
          <ThemedText type="title">Club Settings</ThemedText>
          <ThemedText style={[Typography.small, { color: colors.muted, marginTop: Spacing.micro }]}>{club.name}</ThemedText>
        </View>
        <View style={{ width: 24 }} />
      </Row>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.tabsContent}>
        {SETTINGS_SECTIONS.map((section) => (
          <Clickable
            key={section.key}
            style={[styles.tab, activeSection === section.key && { backgroundColor: withAlpha(colors.tint, 0.09) },
              { borderColor: activeSection === section.key ? colors.tint : colors.border }].filter(Boolean) as ViewStyle[]}
            onPress={() => setActiveSection(section.key)}
          >
            <Row align="center" gap="xs">
              <Ionicons name={section.icon as keyof typeof Ionicons.glyphMap} size={18} color={activeSection === section.key ? colors.tint : colors.muted} />
              <ThemedText style={[Typography.smallSemiBold, { color: activeSection === section.key ? colors.tint : colors.muted }]}>{section.label}</ThemedText>
            </Row>
          </Clickable>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {activeSection === 'details' && (
          <SettingsDetailsSection editName={editName} editTagline={editTagline} editCity={editCity} colors={colors}
            onNameChange={setEditName} onTaglineChange={setEditTagline} onCityChange={setEditCity} onSave={handleSaveDetails} />
        )}
        {activeSection === 'invites' && (
          <SettingsInvitesSection inviteCodes={inviteCodes} colors={colors} onCopy={handleCopyCode} onShare={handleShareCode} onGenerate={handleGenerateCode} />
        )}
        {activeSection === 'squads' && (
          <SettingsSquadsSection squads={squads} colors={colors} onCreateSquad={handleCreateSquad} />
        )}
        {activeSection === 'members' && (
          <SettingsMembersSection members={members} clubId={clubId} colors={colors} />
        )}
        {activeSection === 'danger' && (
          <Animated.View entering={FadeInDown.springify()}>
            <SurfaceCard style={[styles.dangerCard, { borderColor: colors.error }]}>
              <ThemedText type="defaultSemiBold" style={[Typography.heading, { color: colors.error }]}>Danger Zone</ThemedText>
              <ThemedText style={[Typography.small, { color: colors.muted, marginTop: Spacing.micro }]}>These actions are irreversible</ThemedText>
              <Clickable style={[styles.dangerBtn, { borderColor: colors.error }]} onPress={handleDeleteClub}>
                <Row align="center" justify="center" gap="sm">
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                  <ThemedText style={{ color: colors.error, fontWeight: '600' }}>Delete Club</ThemedText>
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
  tab: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.full, borderWidth: 1 },
  content: { padding: Spacing.lg, paddingTop: 0, gap: Spacing.md },
  dangerCard: { gap: Spacing.md },
  dangerBtn: { paddingVertical: Spacing.md, borderRadius: Radii.md, borderWidth: 1.5 },
});
