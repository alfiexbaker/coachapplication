import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAcademyDetail } from '@/hooks/use-academy-detail';
import { AcademyBanner } from '@/components/academy/academy-banner';
import { AcademyStaffCard } from '@/components/academy/academy-staff-card';

export default function AcademyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: palette } = useTheme();
  const { academy, staff, loading, userMembership, isOwner, canManage, primaryColor } = useAcademyDetail(id);

  if (loading || !academy) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title">Loading...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const color = primaryColor || palette.tint;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <AcademyBanner academy={academy} colors={palette} primaryColor={color} canManage={!!canManage} />

        <View style={styles.content}>
          {/* Stats */}
          <View style={styles.statsRow}>
            {[
              { label: 'Coaches', value: academy.coachCount },
              { label: 'Athletes', value: academy.athleteCount },
              { label: 'Sessions', value: academy.sessionCount },
            ].map((stat) => (
              <View key={stat.label} style={[styles.statCard, { backgroundColor: palette.surface }]}>
                <ThemedText type="heading" style={{ color }}>{stat.value}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: palette.muted }]}>{stat.label}</ThemedText>
              </View>
            ))}
          </View>

          {/* Description */}
          {academy.description && (
            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <SurfaceCard style={styles.descriptionCard}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>About</ThemedText>
                <ThemedText style={[styles.description, { color: palette.muted }]}>{academy.description}</ThemedText>
              </SurfaceCard>
            </Animated.View>
          )}

          {/* Specialties */}
          {academy.specialties && academy.specialties.length > 0 && (
            <View style={styles.section}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Specialties</ThemedText>
              <View style={styles.tagsRow}>
                {academy.specialties.map((specialty) => (
                  <View key={specialty} style={[styles.tag, { backgroundColor: withAlpha(color, 0.09) }]}>
                    <ThemedText style={[styles.tagText, { color }]}>{specialty}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Contact Info */}
          {(academy.email || academy.phone || academy.website) && (
            <Animated.View entering={FadeInDown.delay(150).springify()}>
              <SurfaceCard style={styles.contactCard}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Contact</ThemedText>
                {academy.email && (
                  <View style={styles.contactRow}>
                    <Ionicons name="mail-outline" size={18} color={palette.muted} />
                    <ThemedText style={{ color: palette.text }}>{academy.email}</ThemedText>
                  </View>
                )}
                {academy.phone && (
                  <View style={styles.contactRow}>
                    <Ionicons name="call-outline" size={18} color={palette.muted} />
                    <ThemedText style={{ color: palette.text }}>{academy.phone}</ThemedText>
                  </View>
                )}
                {academy.website && (
                  <View style={styles.contactRow}>
                    <Ionicons name="globe-outline" size={18} color={palette.muted} />
                    <ThemedText style={{ color: palette.tint }}>{academy.website}</ThemedText>
                  </View>
                )}
              </SurfaceCard>
            </Animated.View>
          )}

          {/* Staff Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle">Staff ({staff.length})</ThemedText>
              {canManage && (
                <Clickable
                  onPress={() => router.push(Routes.academyInvite(id))}
                  style={[styles.inviteButton, { backgroundColor: color }]}
                >
                  <Ionicons name="person-add-outline" size={16} color={palette.onPrimary} />
                  <ThemedText style={[styles.inviteButtonText, { color: palette.onPrimary }]}>Invite</ThemedText>
                </Clickable>
              )}
            </View>
            <View style={styles.staffList}>
              {staff.map((member, index) => (
                <AcademyStaffCard
                  key={member.id}
                  member={member}
                  index={index}
                  isOwner={isOwner}
                  onManage={() => router.push(Routes.academyStaffMember(id, member.id))}
                />
              ))}
            </View>
          </View>

          {/* Join for non-members */}
          {!userMembership && (
            <View style={styles.joinSection}>
              <ThemedText style={[styles.joinText, { color: palette.muted }]}>Have an invite code?</ThemedText>
              <Clickable onPress={() => router.push(Routes.ACADEMY_JOIN)} style={[styles.joinButton, { backgroundColor: color }]}>
                <ThemedText style={[styles.joinButtonText, { color: palette.onPrimary }]}>Join Team</ThemedText>
              </Clickable>
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  content: { padding: Spacing.lg },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderRadius: Radii.md },
  statLabel: { ...Typography.caption, marginTop: Spacing.micro },
  descriptionCard: { marginBottom: Spacing.lg },
  sectionTitle: { marginBottom: Spacing.sm },
  description: { ...Typography.bodySmall },
  section: { marginBottom: Spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  tag: { paddingHorizontal: Spacing.xs + Spacing.xxs, paddingVertical: Spacing.xxs, borderRadius: Radii.md },
  tagText: { ...Typography.smallSemiBold },
  contactCard: { marginBottom: Spacing.lg },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  inviteButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, paddingHorizontal: Spacing.xs + Spacing.xxs, paddingVertical: Spacing.xxs, borderRadius: Radii.md },
  inviteButtonText: { ...Typography.smallSemiBold },
  staffList: { gap: Spacing.sm },
  joinSection: { alignItems: 'center', paddingVertical: Spacing.lg },
  joinText: { ...Typography.small, marginBottom: Spacing.sm },
  joinButton: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, borderRadius: Radii.md },
  joinButtonText: { ...Typography.bodySemiBold },
  bottomSpacer: { height: 40 },
});
