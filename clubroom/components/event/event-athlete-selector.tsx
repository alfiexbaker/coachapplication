import { useState, useEffect, startTransition } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { clubService, type ClubMember } from '@/services/club-service';
import { Row } from '@/components/primitives';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

// ─── Types ──────────────────────────────────────────────────────────────────

interface InlineAthleteSelectorProps {
  clubId: string;
  selectedAthleteIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

function InlineAthleteSelectorInner({
  clubId,
  selectedAthleteIds,
  onSelectionChange,
}: InlineAthleteSelectorProps) {
  const { colors: palette } = useTheme();
  const [athletes, setAthletes] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAthletes = async () => {
      setLoading(true);

      await runAsyncTryCatchFinally(
        async () => {
          const members = await clubService.getMembers(clubId);
          setAthletes(members.filter((m) => m.role === 'MEMBER' && m.status === 'active'));
        },
        async () => {
          setAthletes([]);
        },
        () => {
          setLoading(false);
        },
      );
    };

    startTransition(() => {
      void loadAthletes();
    });
  }, [clubId]);

  const toggleAthlete = (userId: string) => {
    const newSelection = selectedAthleteIds.includes(userId)
      ? selectedAthleteIds.filter((id) => id !== userId)
      : [...selectedAthleteIds, userId];
    onSelectionChange(newSelection);
  };

  const selectAll = () => {
    onSelectionChange(athletes.map((a) => a.userId));
  };

  const selectNone = () => {
    onSelectionChange([]);
  };

  if (loading) {
    return (
      <SurfaceCard style={styles.selectorCard}>
        <ThemedText style={{ ...Typography.small, color: palette.muted }}>
          Loading athletes…
        </ThemedText>
      </SurfaceCard>
    );
  }

  if (athletes.length === 0) {
    return (
      <SurfaceCard style={styles.selectorCard}>
        <View style={{ alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md }}>
          <Ionicons name="person-outline" size={32} color={palette.muted} />
          <ThemedText style={{ ...Typography.small, color: palette.muted }}>
            No athletes in this club
          </ThemedText>
        </View>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard style={styles.selectorCard}>
      <Row style={styles.selectorHeader}>
        <Ionicons name="football" size={20} color={palette.tint} />
        <ThemedText type="defaultSemiBold">Select Athletes</ThemedText>
      </Row>

      {athletes.length > 1 && (
        <Row style={styles.quickActions}>
          <Clickable
            onPress={selectAll}
            disabled={selectedAthleteIds.length === athletes.length}
            style={[
              styles.quickActionButton,
              {
                backgroundColor: withAlpha(palette.tint, 0.06),
                opacity: selectedAthleteIds.length === athletes.length ? 0.5 : 1,
              },
            ]}
          >
            <Ionicons name="checkmark-done" size={14} color={palette.tint} />
            <ThemedText style={{ color: palette.tint, ...Typography.caption }}>
              Select All ({athletes.length - selectedAthleteIds.length})
            </ThemedText>
          </Clickable>
          <Clickable
            onPress={selectNone}
            disabled={selectedAthleteIds.length === 0}
            style={[
              styles.quickActionButton,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                borderWidth: 1,
                opacity: selectedAthleteIds.length === 0 ? 0.5 : 1,
              },
            ]}
          >
            <ThemedText style={{ ...Typography.caption, color: palette.text }}>
              Deselect All ({selectedAthleteIds.length})
            </ThemedText>
          </Clickable>
        </Row>
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
              <View
                style={[styles.athleteAvatar, { backgroundColor: withAlpha(palette.tint, 0.09) }]}
              >
                <ThemedText style={{ ...Typography.caption, color: palette.tint }}>
                  {initials}
                </ThemedText>
              </View>
              <ThemedText style={{ flex: 1 }} type="defaultSemiBold">
                {athlete.userName}
              </ThemedText>
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
        <Row style={[styles.selectionSummary, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
          <Ionicons name="checkmark-circle" size={16} color={palette.tint} />
          <ThemedText style={{ color: palette.tint, ...Typography.small }}>
            {selectedAthleteIds.length} athlete{selectedAthleteIds.length !== 1 ? 's' : ''} selected
          </ThemedText>
        </Row>
      )}
    </SurfaceCard>
  );
}

export const InlineAthleteSelector = InlineAthleteSelectorInner;

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  selectorCard: { gap: Spacing.md },
  selectorHeader: { alignItems: 'center', gap: Spacing.sm },
  selectionSummary: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
  },
  quickActions: { gap: Spacing.xs },
  quickActionButton: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
  },
  athleteList: { gap: Spacing.xs },
  athleteRow: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  athleteAvatar: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: Radii.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
