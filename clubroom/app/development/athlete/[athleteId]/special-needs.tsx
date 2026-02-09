/**
 * Special Needs Screen
 *
 * Displays athlete disabilities, accommodations, coach notes, and medical alerts.
 * Read-only view for coaches to understand athlete requirements.
 */

import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { PageContainer } from '@/components/primitives/page-container';
import { SpecialNeedsHero } from '@/components/development/special-needs-hero';
import { SpecialNeedsDisabilities } from '@/components/development/special-needs-disabilities';
import { SpecialNeedsAccommodations } from '@/components/development/special-needs-accommodations';
import { SpecialNeedsNotesSection } from '@/components/development/special-needs-notes-section';
import { Spacing, Components, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useSpecialNeeds } from '@/hooks/use-special-needs';

export default function SpecialNeedsScreen() {
  const { colors } = useTheme();
  const { athlete, childProfile, loading, disabilityCount, specialNeedsCount, allergyCount, totalCount } = useSpecialNeeds();

  if (!athlete) return null;

  if (loading) {
    return (
      <PageContainer>
        <ThemedText>Loading...</ThemedText>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      gap={Spacing.md}
      header={
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </Clickable>
          <ThemedText type="title" style={Typography.heading}>Special Needs</ThemedText>
          <View style={{ width: 24 }} />
        </View>
      }
    >
      <SpecialNeedsHero
        name={athlete.name}
        avatar={athlete.avatar}
        totalCount={totalCount}
        disabilityCount={disabilityCount}
        specialNeedsCount={specialNeedsCount}
        allergyCount={allergyCount}
      />

      {childProfile && <SpecialNeedsDisabilities disabilities={childProfile.disabilities} />}
      {childProfile && <SpecialNeedsAccommodations specialNeeds={childProfile.specialNeeds} />}
      {childProfile && <SpecialNeedsNotesSection childProfile={childProfile} />}

      {/* Empty State */}
      {(!childProfile || totalCount === 0) && !loading && (
        <SurfaceCard style={styles.emptyCard}>
          <View style={[styles.emptyIcon, { backgroundColor: withAlpha(colors.muted, 0.06) }]}>
            <Ionicons name="accessibility-outline" size={Components.icon.xl} color={colors.muted} />
          </View>
          <ThemedText type="heading" style={{ textAlign: 'center' }}>No Special Needs</ThemedText>
          <ThemedText style={[Typography.small, { color: colors.muted, textAlign: 'center' }]}>
            No disabilities or accommodations have been documented for this athlete.
          </ThemedText>
        </SurfaceCard>
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  backButton: { padding: Spacing.xs },
  emptyCard: { padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm },
  emptyIcon: { width: Components.avatar.xl, height: Components.avatar.xl, borderRadius: Components.avatar.xl / 2, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
});
