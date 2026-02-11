/**
 * ProfileTabAbout — About tab content for coach profile.
 */
import React from 'react';
import { View, Linking, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { SocialLinks } from '@/components/profile/social-links';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type {
  CoachExperience,
  CoachCertification,
  CoachLanguage,
  SocialLinks as SocialLinksType,
} from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

function formatFullDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

interface ProfileTabAboutProps {
  coach: {
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
  };
  userRole?: string;
}

function ProfileTabAboutInner({ coach, userRole }: ProfileTabAboutProps) {
  const { colors: palette } = useTheme();

  return (
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
          <Clickable style={styles.contactItem} onPress={() => Linking.openURL(coach.website!)}>
            <Ionicons name="globe" size={20} color={palette.tint} />
            <ThemedText style={styles.contactText} numberOfLines={1}>
              {coach.website}
            </ThemedText>
          </Clickable>
        )}
      </SurfaceCard>

      {/* Social Links */}
      {coach.socialLinks && Object.values(coach.socialLinks).some((v) => v) && (
        <SurfaceCard style={styles.section}>
          <ThemedText type="subtitle">Social Media</ThemedText>
          <SocialLinks socialLinks={coach.socialLinks} size="md" variant="icons" />
        </SurfaceCard>
      )}

      {/* Experience */}
      <SurfaceCard style={styles.section}>
        <Row style={styles.sectionHeader}>
          <ThemedText type="subtitle">Experience</ThemedText>
          {userRole === 'COACH' && (
            <Clickable onPress={() => {}} style={styles.addButton}>
              <Ionicons name="add-circle" size={20} color={palette.tint} />
              <ThemedText style={[styles.addButtonText, { color: palette.tint }]}>Add</ThemedText>
            </Clickable>
          )}
        </Row>
        {coach.experiences && coach.experiences.length > 0 ? (
          coach.experiences.map((exp) => (
            <Row key={exp.id} style={styles.credentialItem}>
              <View
                style={[styles.credentialIcon, { backgroundColor: withAlpha(palette.tint, 0.1) }]}
              >
                <Ionicons name="briefcase" size={20} color={palette.tint} />
              </View>
              <View style={styles.credentialContent}>
                <ThemedText type="subtitle">{exp.title}</ThemedText>
                <ThemedText style={styles.credentialOrg}>{exp.organization}</ThemedText>
                <ThemedText style={styles.credentialDate}>
                  {formatDate(exp.startDate)} - {exp.current ? 'Present' : formatDate(exp.endDate!)}
                </ThemedText>
                {exp.description && (
                  <ThemedText style={styles.credentialDesc}>{exp.description}</ThemedText>
                )}
              </View>
              {userRole === 'COACH' && (
                <Clickable onPress={() => {}} style={styles.editButton}>
                  <Ionicons name="pencil" size={16} color={palette.muted} />
                </Clickable>
              )}
            </Row>
          ))
        ) : (
          <ThemedText style={styles.emptyText}>
            No experience added yet. Share your coaching and playing background.
          </ThemedText>
        )}
      </SurfaceCard>

      {/* Certifications */}
      <SurfaceCard style={styles.section}>
        <Row style={styles.sectionHeader}>
          <ThemedText type="subtitle">Certifications &amp; Licences</ThemedText>
          {userRole === 'COACH' && (
            <Clickable onPress={() => {}} style={styles.addButton}>
              <Ionicons name="add-circle" size={20} color={palette.tint} />
              <ThemedText style={[styles.addButtonText, { color: palette.tint }]}>Add</ThemedText>
            </Clickable>
          )}
        </Row>
        {coach.certifications && coach.certifications.length > 0 ? (
          coach.certifications.map((cert) => {
            const isExpiring = cert.expiryDate
              ? new Date(cert.expiryDate).getTime() - Date.now() < 90 * 24 * 60 * 60 * 1000
              : false;
            return (
              <Row key={cert.id} style={styles.credentialItem}>
                <View
                  style={[
                    styles.credentialIcon,
                    { backgroundColor: withAlpha(palette.success, 0.1) },
                  ]}
                >
                  <Ionicons
                    name={isExpiring ? 'warning' : 'ribbon'}
                    size={20}
                    color={isExpiring ? palette.warning : palette.success}
                  />
                </View>
                <View style={styles.credentialContent}>
                  <ThemedText type="subtitle">{cert.name}</ThemedText>
                  <ThemedText style={styles.credentialOrg}>{cert.issuer}</ThemedText>
                  <ThemedText style={styles.credentialDate}>
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
                  <Clickable onPress={() => {}} style={styles.editButton}>
                    <Ionicons name="pencil" size={16} color={palette.muted} />
                  </Clickable>
                )}
              </Row>
            );
          })
        ) : (
          <ThemedText style={styles.emptyText}>
            No certifications added yet. Add your FA, UEFA, or other coaching qualifications.
          </ThemedText>
        )}
      </SurfaceCard>

      {/* Achievements */}
      {coach.achievements && coach.achievements.length > 0 && (
        <SurfaceCard style={styles.section}>
          <ThemedText type="subtitle">Achievements</ThemedText>
          {coach.achievements.map((achievement, index) => (
            <Row key={index} style={styles.achievementItem}>
              <Ionicons name="trophy" size={18} color={palette.warning} />
              <ThemedText style={styles.achievementText}>{achievement}</ThemedText>
            </Row>
          ))}
        </SurfaceCard>
      )}

      {/* Languages */}
      {coach.languages && coach.languages.length > 0 && (
        <SurfaceCard style={styles.section}>
          <ThemedText type="subtitle">Languages</ThemedText>
          <Row style={styles.tagsRow}>
            {coach.languages.map((lang: CoachLanguage) => (
              <View
                key={lang.id}
                style={[styles.languageTag, { backgroundColor: withAlpha(palette.tint, 0.12) }]}
              >
                <ThemedText style={[styles.languageText, { color: palette.tint }]}>
                  {lang.name}
                </ThemedText>
                <ThemedText style={[styles.languageLevel, { color: palette.muted }]}>
                  {lang.proficiency}
                </ThemedText>
              </View>
            ))}
          </Row>
        </SurfaceCard>
      )}

      {/* Specialties */}
      <SurfaceCard style={styles.section}>
        <ThemedText type="subtitle">Coaching Specialties</ThemedText>
        <Row style={styles.tagsRow}>
          {coach.footballFocuses.map((focus) => (
            <View
              key={focus}
              style={[
                styles.specialtyTag,
                { backgroundColor: palette.card, borderColor: withAlpha(palette.text, 0.1) },
              ]}
            >
              <ThemedText style={styles.specialtyText}>{focus}</ThemedText>
            </View>
          ))}
        </Row>
      </SurfaceCard>
    </View>
  );
}

export const ProfileTabAbout = React.memo(ProfileTabAboutInner);

const styles = StyleSheet.create({
  aboutContent: { gap: Spacing.md },
  section: { gap: Spacing.md },
  sectionHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  addButton: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
  },
  addButtonText: { ...Typography.bodySmallSemiBold },
  bio: { ...Typography.body, opacity: 0.8 },
  contactItem: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  contactText: { ...Typography.body, flex: 1 },
  credentialItem: { gap: Spacing.sm, paddingTop: Spacing.md },
  credentialIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  credentialContent: { flex: 1, gap: Spacing.micro },
  credentialOrg: { ...Typography.body, fontWeight: '500', opacity: 0.8 },
  credentialDate: { ...Typography.caption, opacity: 0.6 },
  credentialDesc: { ...Typography.bodySmall, opacity: 0.7, marginTop: Spacing.xxs },
  certWarning: { ...Typography.caption, fontWeight: '600', marginTop: Spacing.xxs },
  editButton: { padding: Spacing.xs, marginLeft: Spacing.xs },
  emptyText: { ...Typography.bodySmall, opacity: 0.6, fontStyle: 'italic' },
  achievementItem: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  achievementText: { ...Typography.body, flex: 1 },
  tagsRow: { flexWrap: 'wrap', gap: Spacing.xs },
  languageTag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
  },
  languageText: { ...Typography.bodySemiBold },
  languageLevel: { ...Typography.caption },
  specialtyTag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  specialtyText: { ...Typography.bodySemiBold },
});
