import { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { PageContainer } from '@/components/primitives/page-container';
import { Colors, Spacing, Radii, Components, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getUserById } from '@/constants/mock-data';
import { childService, type ChildProfile } from '@/services/child-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SpecialNeedsScreen');

export default function SpecialNeedsScreen() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [childProfile, setChildProfile] = useState<ChildProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const athlete = getUserById(athleteId!);

  useEffect(() => {
    if (!athlete) return;

    const loadChildProfile = async () => {
      try {
        const nameParts = athlete.name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');
        const profile = await childService.getChildByName(firstName, lastName);
        setChildProfile(profile);
      } catch (error) {
        logger.error('Failed to load child profile', error);
      } finally {
        setLoading(false);
      }
    };

    loadChildProfile();
  }, [athlete]);

  if (!athlete) return null;

  if (loading) {
    return (
      <PageContainer>
        <ThemedText>Loading...</ThemedText>
      </PageContainer>
    );
  }

  const disabilityCount = childProfile?.disabilities.length ?? 0;
  const specialNeedsCount = childProfile?.specialNeeds.length ?? 0;
  const allergyCount = childProfile?.allergies.length ?? 0;
  const totalCount = disabilityCount + specialNeedsCount;

  return (
    <PageContainer
      gap={Spacing.md}
      header={
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={palette.foreground} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.headerTitle}>
            Special Needs
          </ThemedText>
          <View style={{ width: 24 }} />
        </View>
      }
    >
      {/* Athlete Header */}
      <SurfaceCard style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
            <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
              {athlete.avatar || athlete.name.charAt(0)}
            </ThemedText>
          </View>
          <View style={styles.heroInfo}>
            <ThemedText type="heading">{athlete.name}</ThemedText>
            <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
              {totalCount > 0
                ? `${totalCount} accommodation${totalCount !== 1 ? 's' : ''} documented`
                : 'No special needs documented'}
            </ThemedText>
          </View>
        </View>
      </SurfaceCard>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: withAlpha(palette.warning, 0.06) }]}>
          <ThemedText style={[styles.statNumber, { color: palette.warning }]}>{disabilityCount}</ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.warning }]}>Disabilities</ThemedText>
        </View>
        <View style={[styles.statCard, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
          <ThemedText style={[styles.statNumber, { color: palette.tint }]}>{specialNeedsCount}</ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.tint }]}>Special Needs</ThemedText>
        </View>
        <View style={[styles.statCard, { backgroundColor: withAlpha(palette.error, 0.06) }]}>
          <ThemedText style={[styles.statNumber, { color: palette.error }]}>{allergyCount}</ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.error }]}>Allergies</ThemedText>
        </View>
      </View>

      {/* Disabilities Section */}
      {childProfile && childProfile.disabilities.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: withAlpha(palette.warning, 0.09) }]}>
              <Ionicons name="alert-circle" size={Components.icon.md} color={palette.warning} />
            </View>
            <ThemedText type="heading">Disabilities</ThemedText>
          </View>

          {childProfile.disabilities.map((disability) => (
            <SurfaceCard key={disability.id} style={styles.detailCard}>
              <View style={styles.cardHeader}>
                <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
                  {disability.type}
                </ThemedText>
                {disability.diagnosisDate && (
                  <View style={[styles.dateBadge, { backgroundColor: withAlpha(palette.muted, 0.09) }]}>
                    <ThemedText style={[styles.dateText, { color: palette.muted }]}>
                      Since {disability.diagnosisDate.split('-')[0]}
                    </ThemedText>
                  </View>
                )}
              </View>

              {disability.description && (
                <ThemedText style={[styles.description, { color: palette.muted }]}>
                  {disability.description}
                </ThemedText>
              )}

              {disability.supportRequired && (
                <View style={[styles.infoBlock, { backgroundColor: withAlpha(palette.tint, 0.03) }]}>
                  <View style={styles.infoHeader}>
                    <Ionicons name="hand-left" size={Components.icon.sm} color={palette.tint} />
                    <ThemedText style={[styles.infoLabel, { color: palette.tint }]}>Support Required</ThemedText>
                  </View>
                  <ThemedText style={styles.infoText}>{disability.supportRequired}</ThemedText>
                </View>
              )}

              {disability.communicationPreferences && disability.communicationPreferences.length > 0 && (
                <View style={styles.tagSection}>
                  <View style={styles.tagHeader}>
                    <Ionicons name="chatbubble" size={Components.icon.sm} color={palette.success} />
                    <ThemedText style={[styles.tagLabel, { color: palette.success }]}>Communication</ThemedText>
                  </View>
                  <View style={styles.tagList}>
                    {disability.communicationPreferences.map((pref, idx) => (
                      <View key={idx} style={[styles.tag, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
                        <ThemedText style={[styles.tagText, { color: palette.success }]}>{pref}</ThemedText>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {disability.triggers && disability.triggers.length > 0 && (
                <View style={styles.tagSection}>
                  <View style={styles.tagHeader}>
                    <Ionicons name="warning" size={Components.icon.sm} color={palette.error} />
                    <ThemedText style={[styles.tagLabel, { color: palette.error }]}>Triggers to Avoid</ThemedText>
                  </View>
                  <View style={styles.tagList}>
                    {disability.triggers.map((trigger, idx) => (
                      <View key={idx} style={[styles.tag, { backgroundColor: withAlpha(palette.error, 0.09) }]}>
                        <ThemedText style={[styles.tagText, { color: palette.error }]}>{trigger}</ThemedText>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {disability.calmingStrategies && disability.calmingStrategies.length > 0 && (
                <View style={styles.tagSection}>
                  <View style={styles.tagHeader}>
                    <Ionicons name="happy" size={Components.icon.sm} color={palette.tint} />
                    <ThemedText style={[styles.tagLabel, { color: palette.tint }]}>Calming Strategies</ThemedText>
                  </View>
                  <View style={styles.tagList}>
                    {disability.calmingStrategies.map((strategy, idx) => (
                      <View key={idx} style={[styles.tag, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                        <ThemedText style={[styles.tagText, { color: palette.tint }]}>{strategy}</ThemedText>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </SurfaceCard>
          ))}
        </View>
      )}

      {/* Special Needs Section */}
      {childProfile && childProfile.specialNeeds.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
              <Ionicons name="accessibility" size={Components.icon.md} color={palette.tint} />
            </View>
            <ThemedText type="heading">Accommodations</ThemedText>
          </View>

          {childProfile.specialNeeds.map((need) => (
            <SurfaceCard key={need.id} style={styles.detailCard}>
              <View style={styles.cardHeader}>
                <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
                  {need.name}
                </ThemedText>
                {need.severity && (
                  <View style={[styles.severityBadge, {
                    backgroundColor: need.severity === 'SEVERE' ? withAlpha(palette.error, 0.09)
                      : need.severity === 'MODERATE' ? withAlpha(palette.warning, 0.09)
                      : withAlpha(palette.success, 0.09)
                  }]}>
                    <ThemedText style={[styles.severityText, {
                      color: need.severity === 'SEVERE' ? palette.error
                        : need.severity === 'MODERATE' ? palette.warning
                        : palette.success
                    }]}>
                      {need.severity}
                    </ThemedText>
                  </View>
                )}
              </View>

              {need.description && (
                <ThemedText style={[styles.description, { color: palette.muted }]}>
                  {need.description}
                </ThemedText>
              )}

              {need.accommodationsNeeded && need.accommodationsNeeded.length > 0 && (
                <View style={styles.accommodationsList}>
                  {need.accommodationsNeeded.map((accommodation, idx) => (
                    <View key={idx} style={styles.accommodationRow}>
                      <Ionicons name="checkmark-circle" size={Components.icon.sm} color={palette.success} />
                      <ThemedText style={styles.accommodationText}>{accommodation}</ThemedText>
                    </View>
                  ))}
                </View>
              )}

              {need.coachNotes && (
                <View style={[styles.coachNote, { backgroundColor: withAlpha(palette.warning, 0.03), borderColor: withAlpha(palette.warning, 0.19) }]}>
                  <Ionicons name="bulb" size={Components.icon.sm} color={palette.warning} />
                  <ThemedText style={styles.coachNoteText}>{need.coachNotes}</ThemedText>
                </View>
              )}
            </SurfaceCard>
          ))}
        </View>
      )}

      {/* Communication & Behavioral Notes */}
      {childProfile && (childProfile.communicationNotes || childProfile.behavioralNotes) && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
              <Ionicons name="chatbubbles" size={Components.icon.md} color={palette.success} />
            </View>
            <ThemedText type="heading">Coach Notes</ThemedText>
          </View>

          {childProfile.communicationNotes && (
            <SurfaceCard style={styles.noteCard}>
              <View style={styles.noteHeader}>
                <Ionicons name="megaphone" size={Components.icon.sm} color={palette.success} />
                <ThemedText style={[styles.noteLabel, { color: palette.success }]}>Communication</ThemedText>
              </View>
              <ThemedText style={styles.noteText}>{childProfile.communicationNotes}</ThemedText>
            </SurfaceCard>
          )}

          {childProfile.behavioralNotes && (
            <SurfaceCard style={styles.noteCard}>
              <View style={styles.noteHeader}>
                <Ionicons name="bulb" size={Components.icon.sm} color={palette.tint} />
                <ThemedText style={[styles.noteLabel, { color: palette.tint }]}>Behavioral</ThemedText>
              </View>
              <ThemedText style={styles.noteText}>{childProfile.behavioralNotes}</ThemedText>
            </SurfaceCard>
          )}
        </View>
      )}

      {/* Medical Alerts */}
      {childProfile && (childProfile.allergies.length > 0 || childProfile.medications.length > 0) && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: withAlpha(palette.error, 0.09) }]}>
              <Ionicons name="medkit" size={Components.icon.md} color={palette.error} />
            </View>
            <ThemedText type="heading">Medical Alerts</ThemedText>
          </View>

          {childProfile.allergies.length > 0 && (
            <SurfaceCard style={[styles.medicalCard, { borderColor: withAlpha(palette.error, 0.19) }]}>
              <View style={styles.medicalHeader}>
                <Ionicons name="warning" size={Components.icon.sm} color={palette.error} />
                <ThemedText style={[styles.medicalLabel, { color: palette.error }]}>Allergies</ThemedText>
              </View>
              <View style={styles.tagList}>
                {childProfile.allergies.map((allergy, idx) => (
                  <View key={idx} style={[styles.tag, { backgroundColor: withAlpha(palette.error, 0.09) }]}>
                    <ThemedText style={[styles.tagText, { color: palette.error }]}>{allergy}</ThemedText>
                  </View>
                ))}
              </View>
            </SurfaceCard>
          )}

          {childProfile.medications.length > 0 && (
            <SurfaceCard style={[styles.medicalCard, { borderColor: withAlpha(palette.warning, 0.19) }]}>
              <View style={styles.medicalHeader}>
                <Ionicons name="medical" size={Components.icon.sm} color={palette.warning} />
                <ThemedText style={[styles.medicalLabel, { color: palette.warning }]}>Medications</ThemedText>
              </View>
              <View style={styles.tagList}>
                {childProfile.medications.map((med, idx) => (
                  <View key={idx} style={[styles.tag, { backgroundColor: withAlpha(palette.warning, 0.09) }]}>
                    <ThemedText style={[styles.tagText, { color: palette.warning }]}>{med}</ThemedText>
                  </View>
                ))}
              </View>
            </SurfaceCard>
          )}
        </View>
      )}

      {/* Empty State */}
      {(!childProfile || totalCount === 0) && !loading && (
        <SurfaceCard style={styles.emptyCard}>
          <View style={[styles.emptyIcon, { backgroundColor: withAlpha(palette.muted, 0.06) }]}>
            <Ionicons name="accessibility-outline" size={Components.icon.xl} color={palette.muted} />
          </View>
          <ThemedText type="heading" style={{ textAlign: 'center' }}>No Special Needs</ThemedText>
          <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
            No disabilities or accommodations have been documented for this athlete.
          </ThemedText>
        </SurfaceCard>
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    ...Typography.heading,
  },

  // Hero
  heroCard: {
    padding: Spacing.sm,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: Components.avatar.md,
    height: Components.avatar.md,
    borderRadius: Components.avatar.md / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.heading,
  },
  heroInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  subtitle: {
    ...Typography.small,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  statCard: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: Radii.card,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statNumber: {
    ...Typography.title,
  },
  statLabel: {
    ...Typography.micro,
  },

  // Section
  section: {
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionIcon: {
    width: Components.avatar.sm,
    height: Components.avatar.sm,
    borderRadius: Components.avatar.sm / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Detail Card
  detailCard: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    ...Typography.body,
    flex: 1,
  },
  dateBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Components.pill.paddingVertical,
    borderRadius: Radii.sm,
  },
  dateText: {
    ...Typography.micro,
    textTransform: 'none',
  },
  severityBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Components.pill.paddingVertical,
    borderRadius: Radii.sm,
  },
  severityText: {
    ...Typography.micro,
  },
  description: {
    ...Typography.small,
  },

  // Info Block
  infoBlock: {
    padding: Spacing.sm,
    borderRadius: Radii.md,
    gap: Spacing.xs,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  infoLabel: {
    ...Typography.caption,
  },
  infoText: {
    ...Typography.small,
  },

  // Tags
  tagSection: {
    gap: Spacing.xs,
  },
  tagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  tagLabel: {
    ...Typography.caption,
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  tag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Components.pill.paddingVertical,
    borderRadius: Radii.pill,
  },
  tagText: {
    ...Typography.caption,
  },

  // Accommodations
  accommodationsList: {
    gap: Spacing.xs,
  },
  accommodationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  accommodationText: {
    ...Typography.small,
    flex: 1,
  },

  // Coach Note
  coachNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  coachNoteText: {
    ...Typography.small,
    flex: 1,
    fontStyle: 'italic',
  },

  // Notes
  noteCard: {
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  noteLabel: {
    ...Typography.caption,
  },
  noteText: {
    ...Typography.small,
  },

  // Medical
  medicalCard: {
    padding: Spacing.sm,
    gap: Spacing.sm,
    borderWidth: 1,
  },
  medicalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  medicalLabel: {
    ...Typography.caption,
  },

  // Empty
  emptyCard: {
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyIcon: {
    width: Components.avatar.xl,
    height: Components.avatar.xl,
    borderRadius: Components.avatar.xl / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyText: {
    ...Typography.small,
    textAlign: 'center',
  },
});
