import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useScreen } from '@/hooks/use-screen';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { ok, err, notFound, serviceError } from '@/types/result';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { academyService } from '@/services/academy-service';
import { AcademyBanner } from '@/components/academy/academy-banner';
import { AcademyStaffCard } from '@/components/academy/academy-staff-card';
import type { Academy, AcademyMembership } from '@/constants/types';

interface AcademyDetailData {
  academy: Academy;
  staff: AcademyMembership[];
}

export default function AcademyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useAuth();

  const {
    data,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    colors: palette,
  } = useScreen<AcademyDetailData>({
    load: async () => {
      if (!id) return err(serviceError('VALIDATION', 'No academy ID'));
      try {
        const [academyResult, staffResult] = await Promise.all([
          academyService.getAcademy(id),
          academyService.getStaff(id),
        ]);
        if (!academyResult.success) return err(academyResult.error);
        if (!staffResult.success) return err(staffResult.error);
        if (!academyResult.data) return err(notFound('Academy', id));
        return ok({ academy: academyResult.data, staff: staffResult.data });
      } catch (e) {
        return err(
          serviceError('UNKNOWN', e instanceof Error ? e.message : 'Failed to load academy'),
        );
      }
    },
    deps: [id],
  });

  if (status === 'loading') return <LoadingState variant="detail" />;
  if (status === 'error') return <ErrorState message={error!.message} onRetry={retry} />;
  if (status === 'empty')
    return (
      <EmptyState
        icon="business-outline"
        title="Academy not found"
        message="This academy may have been removed"
      />
    );

  const { academy, staff } = data!;
  const userMembership = staff.find((m) => m.userId === currentUser?.id) || null;
  const isOwner = userMembership?.role === 'OWNER';
  const canManage = isOwner || userMembership?.permissions.includes('MANAGE_STAFF');
  const color = academy.primaryColor || palette.tint;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <AcademyBanner
          academy={academy}
          colors={palette}
          primaryColor={color}
          canManage={!!canManage}
        />

        <View style={styles.content}>
          {/* Stats */}
          <Row style={styles.statsRow}>
            {[
              { label: 'Coaches', value: academy.coachCount },
              { label: 'Athletes', value: academy.athleteCount },
              { label: 'Sessions', value: academy.sessionCount },
            ].map((stat) => (
              <View
                key={stat.label}
                style={[styles.statCard, { backgroundColor: palette.surface }]}
              >
                <ThemedText type="heading" style={{ color }}>
                  {stat.value}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                  {stat.label}
                </ThemedText>
              </View>
            ))}
          </Row>

          {/* Description */}
          {academy.description && (
            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <SurfaceCard style={styles.descriptionCard}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                  About
                </ThemedText>
                <ThemedText style={[styles.description, { color: palette.muted }]}>
                  {academy.description}
                </ThemedText>
              </SurfaceCard>
            </Animated.View>
          )}

          {/* Specialties */}
          {academy.specialties && academy.specialties.length > 0 && (
            <View style={styles.section}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                Specialties
              </ThemedText>
              <Row style={styles.tagsRow}>
                {academy.specialties.map((specialty) => (
                  <View
                    key={specialty}
                    style={[styles.tag, { backgroundColor: withAlpha(color, 0.09) }]}
                  >
                    <ThemedText style={[styles.tagText, { color }]}>{specialty}</ThemedText>
                  </View>
                ))}
              </Row>
            </View>
          )}

          {/* Contact Info */}
          {(academy.email || academy.phone || academy.website) && (
            <Animated.View entering={FadeInDown.delay(150).springify()}>
              <SurfaceCard style={styles.contactCard}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                  Contact
                </ThemedText>
                {academy.email && (
                  <Row style={styles.contactRow}>
                    <Ionicons name="mail-outline" size={18} color={palette.muted} />
                    <ThemedText style={{ color: palette.text }}>{academy.email}</ThemedText>
                  </Row>
                )}
                {academy.phone && (
                  <Row style={styles.contactRow}>
                    <Ionicons name="call-outline" size={18} color={palette.muted} />
                    <ThemedText style={{ color: palette.text }}>{academy.phone}</ThemedText>
                  </Row>
                )}
                {academy.website && (
                  <Row style={styles.contactRow}>
                    <Ionicons name="globe-outline" size={18} color={palette.muted} />
                    <ThemedText style={{ color: palette.tint }}>{academy.website}</ThemedText>
                  </Row>
                )}
              </SurfaceCard>
            </Animated.View>
          )}

          {/* Staff Section */}
          <View style={styles.section}>
            <Row style={styles.sectionHeader}>
              <ThemedText type="subtitle">Staff ({staff.length})</ThemedText>
              {canManage && (
                <Clickable
                  onPress={() => router.push(Routes.academyInvite(id))}
                  style={[styles.inviteButton, { backgroundColor: color }]}
                >
                  <Row align="center" gap="xxs">
                    <Ionicons name="person-add-outline" size={16} color={palette.onPrimary} />
                    <ThemedText style={[styles.inviteButtonText, { color: palette.onPrimary }]}>
                      Invite
                    </ThemedText>
                  </Row>
                </Clickable>
              )}
            </Row>
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
              <ThemedText style={[styles.joinText, { color: palette.muted }]}>
                Have an invite code?
              </ThemedText>
              <Clickable
                onPress={() => router.push(Routes.ACADEMY_JOIN)}
                style={[styles.joinButton, { backgroundColor: color }]}
              >
                <ThemedText style={[styles.joinButtonText, { color: palette.onPrimary }]}>
                  Join Team
                </ThemedText>
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
  header: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  content: { padding: Spacing.lg },
  statsRow: { gap: Spacing.sm, marginBottom: Spacing.lg },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderRadius: Radii.md },
  statLabel: { ...Typography.caption, marginTop: Spacing.micro },
  descriptionCard: { marginBottom: Spacing.lg },
  sectionTitle: { marginBottom: Spacing.sm },
  description: { ...Typography.bodySmall },
  section: { marginBottom: Spacing.lg },
  sectionHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  tagsRow: { flexWrap: 'wrap', gap: Spacing.xs },
  tag: {
    paddingHorizontal: Spacing.xs + Spacing.xxs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.md,
  },
  tagText: { ...Typography.smallSemiBold },
  contactCard: { marginBottom: Spacing.lg },
  contactRow: { alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  inviteButton: {
    paddingHorizontal: Spacing.xs + Spacing.xxs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.md,
  },
  inviteButtonText: { ...Typography.smallSemiBold },
  staffList: { gap: Spacing.sm },
  joinSection: { alignItems: 'center', paddingVertical: Spacing.lg },
  joinText: { ...Typography.small, marginBottom: Spacing.sm },
  joinButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  joinButtonText: { ...Typography.bodySemiBold },
  bottomSpacer: { height: 40 },
});
