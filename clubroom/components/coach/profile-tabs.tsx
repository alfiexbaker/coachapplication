import React from 'react';
import {
  Image,
  Linking,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { SocialLinks } from '@/components/profile/social-links';
import { SessionOfferingCard } from '@/components/sessions/session-offering-card';
import { Colors, Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type {
  CoachExperience,
  CoachCertification,
  CoachLanguage,
  SessionOffering,
  SocialLinks as SocialLinksType,
} from '@/constants/types';

// ─── Types ──────────────────────────────────────────────────────

export type TabType = 'posts' | 'about' | 'photos' | 'sessions' | 'reviews';

export interface ProfileTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export interface ProfileTabContentProps {
  activeTab: TabType;
  coach: {
    fullName: string;
    profilePhotoUrl?: string;
    bio?: string;
    shortBio?: string;
    email?: string;
    phone?: string;
    website?: string;
    socialLinks?: SocialLinksType;
    experiences?: CoachExperience[];
    certifications?: CoachCertification[];
    achievements?: string[];
    languages?: CoachLanguage[];
    footballFocuses: string[];
    posts?: Array<{
      id: string;
      content: string;
      createdAt: string;
      likes: number;
      comments: number;
      mediaUrls?: string[];
      mediaType?: string;
    }>;
    photoGallery?: string[];
  };
  sessionOfferings: SessionOffering[];
  userRole?: string;
  /** Called when a session offering card is pressed */
  onOfferingPress: (offering: SessionOffering) => void;
  /** Render a single post card (delegated to ProfilePostCard) */
  renderPostCard: (post: {
    id: string;
    content: string;
    createdAt: string;
    likes: number;
    comments: number;
    mediaUrls?: string[];
    mediaType?: string;
  }) => React.ReactNode;
}

// ─── Tab Bar ────────────────────────────────────────────────────

function ProfileTabBarInner({ activeTab, onTabChange }: ProfileTabsProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const tabs: { key: TabType; label: string }[] = [
    { key: 'posts', label: 'Posts' },
    { key: 'about', label: 'About' },
    { key: 'sessions', label: 'Sessions' },
    { key: 'photos', label: 'Photos' },
    { key: 'reviews', label: 'Reviews' },
  ];

  return (
    <View style={[styles.tabsContainer, { borderBottomColor: palette.border }]}>
      {tabs.map((tab) => (
        <Clickable
          key={tab.key}
          onPress={() => onTabChange(tab.key)}
          style={
            [
              styles.tabButton,
              activeTab === tab.key && {
                borderBottomColor: palette.tint,
                borderBottomWidth: 2,
              },
            ].filter(Boolean) as ViewStyle[]
          }
        >
          <ThemedText
            style={
              [
                styles.tabText,
                { color: palette.muted },
                activeTab === tab.key && {
                  ...Typography.bodySmallSemiBold,
                  color: palette.tint,
                },
              ].filter(Boolean) as TextStyle[]
            }
          >
            {tab.label}
          </ThemedText>
        </Clickable>
      ))}
    </View>
  );
}

// ─── Tab Content ────────────────────────────────────────────────

function ProfileTabContentInner({
  activeTab,
  coach,
  sessionOfferings,
  userRole,
  onOfferingPress,
  renderPostCard,
}: ProfileTabContentProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  };

  const formatFullDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderExperience = (exp: CoachExperience) => (
    <View key={exp.id} style={styles.experienceItem}>
      <View style={styles.experienceIcon}>
        <Ionicons name="briefcase" size={20} color={palette.tint} />
      </View>
      <View style={styles.experienceContent}>
        <ThemedText type="subtitle">{exp.title}</ThemedText>
        <ThemedText style={styles.experienceOrg}>{exp.organization}</ThemedText>
        <ThemedText style={styles.experienceDate}>
          {formatDate(exp.startDate)} -{' '}
          {exp.current ? 'Present' : formatDate(exp.endDate!)}
        </ThemedText>
        {exp.description && (
          <ThemedText style={styles.experienceDesc}>{exp.description}</ThemedText>
        )}
      </View>
      {userRole === 'COACH' && (
        <Clickable
          onPress={() => alert('Edit experience: ' + exp.title)}
          style={styles.editButton}
        >
          <Ionicons name="pencil" size={16} color={palette.muted} />
        </Clickable>
      )}
    </View>
  );

  const renderCertification = (cert: CoachCertification) => {
    const isExpiring = cert.expiryDate
      ? new Date(cert.expiryDate).getTime() - Date.now() < 90 * 24 * 60 * 60 * 1000
      : false;

    return (
      <View key={cert.id} style={styles.certItem}>
        <View style={styles.certIcon}>
          <Ionicons
            name={isExpiring ? 'warning' : 'ribbon'}
            size={20}
            color={isExpiring ? palette.warning : palette.success}
          />
        </View>
        <View style={styles.certContent}>
          <ThemedText type="subtitle">{cert.name}</ThemedText>
          <ThemedText style={styles.certIssuer}>{cert.issuer}</ThemedText>
          <ThemedText style={styles.certDate}>
            Issued {formatFullDate(cert.issueDate)}
            {cert.expiryDate && ` \u2022 Expires ${formatFullDate(cert.expiryDate)}`}
          </ThemedText>
          {isExpiring && (
            <ThemedText style={[styles.certWarning, { color: palette.warning }]}>
              Expiring soon - renewal required
            </ThemedText>
          )}
        </View>
        {userRole === 'COACH' && (
          <Clickable
            onPress={() => alert('Edit certification: ' + cert.name)}
            style={styles.editButton}
          >
            <Ionicons name="pencil" size={16} color={palette.muted} />
          </Clickable>
        )}
      </View>
    );
  };

  return (
    <View style={styles.tabContent}>
      {/* Posts Tab */}
      {activeTab === 'posts' && (
        <>
          {userRole === 'Coach' && (
            <Clickable
              style={[styles.createPostButton, { backgroundColor: palette.card }]}
              onPress={() => alert('Create post')}
            >
              <Ionicons name="add-circle" size={24} color={palette.tint} />
              <ThemedText style={[styles.createPostText, { color: palette.muted }]}>
                Share an update...
              </ThemedText>
            </Clickable>
          )}
          {coach.posts && coach.posts.length > 0 ? (
            coach.posts.map((post) => (
              <View key={post.id}>{renderPostCard(post)}</View>
            ))
          ) : (
            <SurfaceCard style={styles.emptyState}>
              <ThemedText style={styles.emptyStateText}>No posts yet</ThemedText>
            </SurfaceCard>
          )}
        </>
      )}

      {/* About Tab */}
      {activeTab === 'about' && (
        <View style={styles.aboutContent}>
          {/* Bio */}
          <SurfaceCard style={styles.section}>
            <ThemedText type="subtitle">About</ThemedText>
            <ThemedText style={styles.bio}>{coach.bio || coach.shortBio}</ThemedText>
          </SurfaceCard>

          {/* Contact */}
          <SurfaceCard style={styles.section}>
            <ThemedText type="subtitle">Contact Information</ThemedText>
            {coach.email && (
              <Clickable
                style={styles.contactItem}
                onPress={() => Linking.openURL(`mailto:${coach.email}`)}
              >
                <Ionicons name="mail" size={20} color={palette.tint} />
                <ThemedText style={styles.contactText} numberOfLines={1}>
                  {coach.email}
                </ThemedText>
              </Clickable>
            )}
            {coach.phone && (
              <Clickable
                style={styles.contactItem}
                onPress={() => Linking.openURL(`tel:${coach.phone}`)}
              >
                <Ionicons name="call" size={20} color={palette.tint} />
                <ThemedText style={styles.contactText} numberOfLines={1}>
                  {coach.phone}
                </ThemedText>
              </Clickable>
            )}
            {coach.website && (
              <Clickable
                style={styles.contactItem}
                onPress={() => Linking.openURL(coach.website!)}
              >
                <Ionicons name="globe" size={20} color={palette.tint} />
                <ThemedText style={styles.contactText} numberOfLines={1}>
                  {coach.website}
                </ThemedText>
              </Clickable>
            )}
          </SurfaceCard>

          {/* Social Links */}
          {coach.socialLinks &&
            Object.values(coach.socialLinks).some((v) => v) && (
              <SurfaceCard style={styles.section}>
                <ThemedText type="subtitle">Social Media</ThemedText>
                <SocialLinks
                  socialLinks={coach.socialLinks}
                  size="md"
                  variant="icons"
                />
              </SurfaceCard>
            )}

          {/* Experience */}
          <SurfaceCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle">Experience</ThemedText>
              {userRole === 'COACH' && (
                <Clickable
                  onPress={() => alert('Add new experience')}
                  style={styles.addButton}
                >
                  <Ionicons name="add-circle" size={20} color={palette.tint} />
                  <ThemedText style={[styles.addButtonText, { color: palette.tint }]}>
                    Add
                  </ThemedText>
                </Clickable>
              )}
            </View>
            {coach.experiences && coach.experiences.length > 0 ? (
              coach.experiences.map(renderExperience)
            ) : (
              <ThemedText style={styles.emptyText}>
                No experience added yet. Share your coaching and playing background.
              </ThemedText>
            )}
          </SurfaceCard>

          {/* Certifications */}
          <SurfaceCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle">Certifications &amp; Licences</ThemedText>
              {userRole === 'COACH' && (
                <Clickable
                  onPress={() => alert('Add new certification')}
                  style={styles.addButton}
                >
                  <Ionicons name="add-circle" size={20} color={palette.tint} />
                  <ThemedText style={[styles.addButtonText, { color: palette.tint }]}>
                    Add
                  </ThemedText>
                </Clickable>
              )}
            </View>
            {coach.certifications && coach.certifications.length > 0 ? (
              coach.certifications.map(renderCertification)
            ) : (
              <ThemedText style={styles.emptyText}>
                No certifications added yet. Add your FA, UEFA, or other coaching
                qualifications.
              </ThemedText>
            )}
          </SurfaceCard>

          {/* Achievements */}
          {coach.achievements && coach.achievements.length > 0 && (
            <SurfaceCard style={styles.section}>
              <ThemedText type="subtitle">Achievements</ThemedText>
              {coach.achievements.map((achievement, index) => (
                <View key={index} style={styles.achievementItem}>
                  <Ionicons name="trophy" size={18} color={palette.warning} />
                  <ThemedText style={styles.achievementText}>
                    {achievement}
                  </ThemedText>
                </View>
              ))}
            </SurfaceCard>
          )}

          {/* Languages */}
          {coach.languages && coach.languages.length > 0 && (
            <SurfaceCard style={styles.section}>
              <ThemedText type="subtitle">Languages</ThemedText>
              <View style={styles.languagesRow}>
                {coach.languages.map((lang: CoachLanguage) => (
                  <View
                    key={lang.id}
                    style={[
                      styles.languageTag,
                      { backgroundColor: withAlpha(palette.tint, 0.12) },
                    ]}
                  >
                    <ThemedText
                      style={[styles.languageText, { color: palette.tint }]}
                    >
                      {lang.name}
                    </ThemedText>
                    <ThemedText
                      style={[styles.languageLevel, { color: palette.muted }]}
                    >
                      {lang.proficiency}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </SurfaceCard>
          )}

          {/* Specialties */}
          <SurfaceCard style={styles.section}>
            <ThemedText type="subtitle">Coaching Specialties</ThemedText>
            <View style={styles.specialtiesRow}>
              {coach.footballFocuses.map((focus) => (
                <View
                  key={focus}
                  style={[styles.specialtyTag, { backgroundColor: palette.card }]}
                >
                  <ThemedText style={styles.specialtyText}>{focus}</ThemedText>
                </View>
              ))}
            </View>
          </SurfaceCard>
        </View>
      )}

      {/* Photos Tab */}
      {activeTab === 'photos' && (
        <View style={styles.photosGrid}>
          {coach.photoGallery && coach.photoGallery.length > 0 ? (
            coach.photoGallery.map((url, index) => (
              <Image key={index} source={{ uri: url }} style={styles.gridPhoto} />
            ))
          ) : (
            <SurfaceCard style={styles.emptyState}>
              <ThemedText style={styles.emptyStateText}>No photos yet</ThemedText>
            </SurfaceCard>
          )}
        </View>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <>
          {sessionOfferings.length > 0 ? (
            sessionOfferings.map((offering) => (
              <SessionOfferingCard
                key={offering.id}
                offering={offering}
                showCoach={false}
                showCapacity={true}
                onPress={() => onOfferingPress(offering)}
              />
            ))
          ) : (
            <SurfaceCard style={styles.emptyState}>
              <ThemedText style={styles.emptyStateText}>
                No active sessions available
              </ThemedText>
            </SurfaceCard>
          )}
        </>
      )}

      {/* Reviews Tab */}
      {activeTab === 'reviews' && (
        <SurfaceCard style={styles.emptyState}>
          <ThemedText style={styles.emptyStateText}>No reviews yet</ThemedText>
        </SurfaceCard>
      )}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.lg,
  },
  tabButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  tabText: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
  tabContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  createPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.lg,
    gap: Spacing.sm,
  },
  createPostText: {
    ...Typography.body,
    opacity: 0.6,
  },
  aboutContent: {
    gap: Spacing.md,
  },
  section: {
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
  },
  addButtonText: {
    ...Typography.bodySmallSemiBold,
  },
  bio: {
    ...Typography.body,
    lineHeight: 20,
    opacity: 0.8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  contactText: {
    ...Typography.body,
    flex: 1,
  },
  experienceItem: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.md,
  },
  experienceIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(99,102,241,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  experienceContent: {
    flex: 1,
    gap: Spacing.micro,
  },
  experienceOrg: {
    ...Typography.body,
    fontWeight: '500',
    opacity: 0.8,
  },
  experienceDate: {
    ...Typography.caption,
    opacity: 0.6,
  },
  experienceDesc: {
    ...Typography.bodySmall,
    opacity: 0.7,
    marginTop: Spacing.xxs,
    lineHeight: 18,
  },
  certItem: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.md,
  },
  certIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(0,217,163,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  certContent: {
    flex: 1,
    gap: Spacing.micro,
  },
  certIssuer: {
    ...Typography.body,
    fontWeight: '500',
    opacity: 0.8,
  },
  certDate: {
    ...Typography.caption,
    opacity: 0.6,
  },
  certWarning: {
    ...Typography.caption,
    fontWeight: '600',
    marginTop: Spacing.xxs,
  },
  editButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  emptyText: {
    ...Typography.bodySmall,
    opacity: 0.6,
    fontStyle: 'italic',
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  achievementText: {
    ...Typography.body,
    flex: 1,
  },
  languagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  languageTag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
  },
  languageText: {
    ...Typography.bodySemiBold,
  },
  languageLevel: {
    ...Typography.caption,
  },
  specialtiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  specialtyTag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  specialtyText: {
    ...Typography.bodySemiBold,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.micro,
  },
  gridPhoto: {
    width: '32.5%',
    aspectRatio: 1,
  },
  emptyState: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyStateText: {
    ...Typography.body,
    opacity: 0.6,
  },
});

// ─── Exports ────────────────────────────────────────────────────

export const ProfileTabBar = React.memo(ProfileTabBarInner);
export const ProfileTabContent = React.memo(ProfileTabContentInner);
export default ProfileTabBar;
