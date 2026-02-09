import { useState, useEffect, useCallback, memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { clubService, type ClubMember } from '@/services/club-service';

// ─── Types ──────────────────────────────────────────────────────────────────

interface InlineAthleteSelectorProps {
  clubId: string;
  selectedAthleteIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

function InlineAthleteSelectorInner({ clubId, selectedAthleteIds, onSelectionChange }: InlineAthleteSelectorProps) {
  const { colors: palette } = useTheme();
  const [athletes, setAthletes] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAthletes = useCallback(async () => {
    setLoading(true);
    try {
      const members = await clubService.getMembers(clubId);
      setAthletes(members.filter((m) => m.role === 'MEMBER' && m.status === 'active'));
    } catch {
      setAthletes([]);
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    loadAthletes();
  }, [loadAthletes]);

  const toggleAthlete = useCallback((userId: string) => {
    const newSelection = selectedAthleteIds.includes(userId)
      ? selectedAthleteIds.filter((id) => id !== userId)
      : [...selectedAthleteIds, userId];
    onSelectionChange(newSelection);
  }, [selectedAthleteIds, onSelectionChange]);

  const selectAll = useCallback(() => {
    onSelectionChange(athletes.map((a) => a.userId));
  }, [athletes, onSelectionChange]);

  const selectNone = useCallback(() => {
    onSelectionChange([]);
  }, [onSelectionChange]);

  if (loading) {
    return (
      <SurfaceCard style={styles.selectorCard}>
        <ThemedText style={{ ...Typography.small, color: palette.muted }}>Loading athletes...</ThemedText>
      </SurfaceCard>
    );
  }

  if (athletes.length === 0) {
    return (
      <SurfaceCard style={styles.selectorCard}>
        <View style={{ alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md }}>
          <Ionicons name="person-outline" size={32} color={palette.muted} />
          <ThemedText style={{ ...Typography.small, color: palette.muted }}>No athletes in this club</ThemedText>
        </View>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard style={styles.selectorCard}>
      <View style={styles.selectorHeader}>
        <Ionicons name="football" size={20} color={palette.tint} />
        <ThemedText type="defaultSemiBold">Select Athletes</ThemedText>
      </View>

      {athletes.length > 1 && (
        <View style={styles.quickActions}>
          <Clickable
            onPress={selectAll}
            style={[styles.quickActionButton, { backgroundColor: withAlpha(palette.tint, 0.06) }]}
          >
            <Ionicons name="checkmark-done" size={14} color={palette.tint} />
            <ThemedText style={{ color: palette.tint, ...Typography.caption }}>Select All</ThemedText>
          </Clickable>
          <Clickable
            onPress={selectNone}
            style={[styles.quickActionButton, { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1 }]}
          >
            <ThemedText style={{ ...Typography.caption, color: palette.text }}>Clear</ThemedText>
          </Clickable>
        </View>
      )}

      <View style={styles.athleteList}>
        {athletes.map((athlete) => {
          const isSelected = selectedAthleteIds.includes(athlete.userId);
          const initials = athlete.userName.slice(0, 2).toUpperCase();
          return (
            <Clickable
              key={athlete.userId}
              onPress={() => toggleAthlete(athlete.userId)}
              style={[
                styles.athleteRow,
                {
                  backgroundColor: isSelected ? withAlpha(palette.tint, 0.06) : palette.surface,
                  borderColor: isSelected ? palette.tint : palette.border,
                },
              ]}
            >
              <View style={[styles.athleteAvatar, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                <ThemedText style={{ ...Typography.caption, color: palette.tint }}>{initials}</ThemedText>
              </View>
              <ThemedText style={{ flex: 1 }} type="defaultSemiBold">{athlete.userName}</ThemedText>
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: isSelected ? palette.tint : 'transparent',
                    borderColor: isSelected ? palette.tint : palette.border,
                  },
                ]}
              >
                {isSelected && <Ionicons name="checkmark" size={14} color={palette.onPrimary} />}
              </View>
            </Clickable>
          );
        })}
      </View>

      {selectedAthleteIds.length > 0 && (
        <View style={[styles.selectionSummary, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
          <Ionicons name="checkmark-circle" size={16} color={palette.tint} />
          <ThemedText style={{ color: palette.tint, ...Typography.small }}>
            {selectedAthleteIds.length} athlete{selectedAthleteIds.length !== 1 ? 's' : ''} selected
          </ThemedText>
        </View>
      )}
    </SurfaceCard>
  );
}

export const InlineAthleteSelector = memo(InlineAthleteSelectorInner);

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  selectorCard: { gap: Spacing.md },
  selectorHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  selectionSummary: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.sm, borderRadius: Radii.sm },
  quickActions: { flexDirection: 'row', gap: Spacing.xs },
  quickActionButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: Radii.md },
  athleteList: { gap: Spacing.xs },
  athleteRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.sm, borderRadius: Radii.md, borderWidth: 1 },
  athleteAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  checkbox: { width: 22, height: 22, borderRadius: Radii.md, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
