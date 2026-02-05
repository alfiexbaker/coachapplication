import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { createLogger } from '@/utils/logger';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { academyService } from '@/services/academy-service';
import type { Academy, AcademyMembership } from '@/constants/types';

const logger = createLogger('AcademyDetailScreen');

function StaffCard({
  member,
  index,
  isOwner,
  onManage,
}: {
  member: AcademyMembership;
  index: number;
  isOwner: boolean;
  onManage: () => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const roleColors: Record<AcademyMembership['role'], string> = {
    OWNER: '#7C3AED',
    ADMIN: '#0284C7',
    HEAD_COACH: '#059669',
    COACH: palette.tint,
    ASSISTANT: '#6B7280',
    MEMBER: '#9CA3AF',
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <SurfaceCard style={styles.staffCard}>
        <View style={styles.staffMain}>
          {member.userPhotoUrl ? (
            <Image source={{ uri: member.userPhotoUrl }} style={styles.staffPhoto} />
          ) : (
            <View style={[styles.staffPhotoPlaceholder, { backgroundColor: palette.border }]}>
              <Ionicons name="person" size={20} color={palette.muted} />
            </View>
          )}
          <View style={styles.staffInfo}>
            <ThemedText type="defaultSemiBold">{member.userName}</ThemedText>
            <View
              style={[styles.roleBadge, { backgroundColor: `${roleColors[member.role]}15` }]}
            >
              <ThemedText style={[styles.roleText, { color: roleColors[member.role] }]}>
                {academyService.formatRole(member.role)}
              </ThemedText>
            </View>
          </View>
        </View>
        {isOwner && member.role !== 'OWNER' && (
          <Clickable onPress={onManage} hitSlop={8}>
            <Ionicons name="ellipsis-horizontal" size={20} color={palette.muted} />
          </Clickable>
        )}
      </SurfaceCard>
    </Animated.View>
  );
}

export default function AcademyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [academy, setAcademy] = useState<Academy | null>(null);
  const [staff, setStaff] = useState<AcademyMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [userMembership, setUserMembership] = useState<AcademyMembership | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [academyData, staffData] = await Promise.all([
        academyService.getAcademy(id),
        academyService.getStaff(id),
      ]);
      setAcademy(academyData);
      setStaff(staffData);

      if (currentUser?.id) {
        const membership = staffData.find((m) => m.userId === currentUser.id);
        setUserMembership(membership || null);
      }
    } catch (error) {
      logger.error('Failed to load academy:', error);
    } finally {
      setLoading(false);
    }
  }, [id, currentUser?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isOwner = userMembership?.role === 'OWNER';
  const canManage = isOwner || userMembership?.permissions.includes('MANAGE_STAFF');

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

  const primaryColor = academy.primaryColor || palette.tint;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={styles.bannerContainer}>
          {academy.bannerUrl ? (
            <Image source={{ uri: academy.bannerUrl }} style={styles.banner} />
          ) : (
            <View style={[styles.bannerPlaceholder, { backgroundColor: primaryColor }]} />
          )}
          <View style={styles.bannerOverlay} />
          <Clickable
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Clickable>
          {canManage && (
            <Clickable
              onPress={() => router.push(`/academy/${id}/settings`)}
              style={[styles.settingsButton, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
            >
              <Ionicons name="settings-outline" size={20} color="#fff" />
            </Clickable>
          )}
        </View>

        {/* Logo & Name */}
        <View style={styles.logoSection}>
          {academy.logoUrl ? (
            <Image source={{ uri: academy.logoUrl }} style={styles.logo} />
          ) : (
            <View style={[styles.logoPlaceholder, { backgroundColor: primaryColor }]}>
              <ThemedText style={styles.logoText}>
                {academy.name.slice(0, 2).toUpperCase()}
              </ThemedText>
            </View>
          )}
          <ThemedText type="title" style={styles.academyName}>
            {academy.name}
          </ThemedText>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={palette.muted} />
            <ThemedText style={[styles.location, { color: palette.muted }]}>
              {academy.city}
            </ThemedText>
          </View>
          {academy.rating && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#FFB800" />
              <ThemedText style={styles.ratingText}>
                {academy.rating.average.toFixed(1)}
              </ThemedText>
              <ThemedText style={[styles.reviewCount, { color: palette.muted }]}>
                ({academy.rating.reviewCount} reviews)
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: palette.surface }]}>
              <ThemedText type="heading" style={[styles.statValue, { color: primaryColor }]}>
                {academy.coachCount}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                Coaches
              </ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: palette.surface }]}>
              <ThemedText type="heading" style={[styles.statValue, { color: primaryColor }]}>
                {academy.athleteCount}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                Athletes
              </ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: palette.surface }]}>
              <ThemedText type="heading" style={[styles.statValue, { color: primaryColor }]}>
                {academy.sessionCount}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                Sessions
              </ThemedText>
            </View>
          </View>

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
              <View style={styles.tagsRow}>
                {academy.specialties.map((specialty) => (
                  <View
                    key={specialty}
                    style={[styles.tag, { backgroundColor: `${primaryColor}15` }]}
                  >
                    <ThemedText style={[styles.tagText, { color: primaryColor }]}>
                      {specialty}
                    </ThemedText>
                  </View>
                ))}
              </View>
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
                  <View style={styles.contactRow}>
                    <Ionicons name="mail-outline" size={18} color={palette.muted} />
                    <ThemedText style={[styles.contactText, { color: palette.text }]}>
                      {academy.email}
                    </ThemedText>
                  </View>
                )}
                {academy.phone && (
                  <View style={styles.contactRow}>
                    <Ionicons name="call-outline" size={18} color={palette.muted} />
                    <ThemedText style={[styles.contactText, { color: palette.text }]}>
                      {academy.phone}
                    </ThemedText>
                  </View>
                )}
                {academy.website && (
                  <View style={styles.contactRow}>
                    <Ionicons name="globe-outline" size={18} color={palette.muted} />
                    <ThemedText style={[styles.contactText, { color: palette.tint }]}>
                      {academy.website}
                    </ThemedText>
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
                  onPress={() => router.push(`/academy/${id}/invite`)}
                  style={[styles.inviteButton, { backgroundColor: primaryColor }]}
                >
                  <Ionicons name="person-add-outline" size={16} color="#fff" />
                  <ThemedText style={styles.inviteButtonText}>Invite</ThemedText>
                </Clickable>
              )}
            </View>
            <View style={styles.staffList}>
              {staff.map((member, index) => (
                <StaffCard
                  key={member.id}
                  member={member}
                  index={index}
                  isOwner={isOwner}
                  onManage={() => router.push(`/academy/${id}/staff/${member.id}`)}
                />
              ))}
            </View>
          </View>

          {/* Actions for non-members */}
          {!userMembership && (
            <View style={styles.joinSection}>
              <ThemedText style={[styles.joinText, { color: palette.muted }]}>
                Have an invite code?
              </ThemedText>
              <Clickable
                onPress={() => router.push('/academy/join')}
                style={[styles.joinButton, { backgroundColor: primaryColor }]}
              >
                <ThemedText style={styles.joinButtonText}>Join Team</ThemedText>
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
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  bannerContainer: {
    position: 'relative',
    height: 180,
  },
  banner: {
    width: '100%',
    height: '100%',
  },
  bannerPlaceholder: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  backButton: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginTop: -50,
    paddingHorizontal: Spacing.lg,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#fff',
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  academyName: {
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  location: {
    fontSize: 13,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  reviewCount: {
    fontSize: 13,
  },
  content: {
    padding: Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
  },
  statValue: {
    fontSize: 22,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  descriptionCard: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.md,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
  },
  contactCard: {
    marginBottom: Spacing.lg,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  contactText: {
    fontSize: 14,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.md,
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  staffList: {
    gap: Spacing.sm,
  },
  staffCard: {
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  staffMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  staffPhoto: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  staffPhotoPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffInfo: {
    flex: 1,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.sm,
    marginTop: 4,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  joinSection: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  joinText: {
    fontSize: 13,
    marginBottom: Spacing.sm,
  },
  joinButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
});
