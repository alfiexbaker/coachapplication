import React, { memo } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { MatchType } from '@/constants/types';
import { MATCH_TYPES } from '@/hooks/use-create-match';
import { matchService } from '@/services/match-service';

interface CreateMatchDetailsProps {
  matchType: MatchType;
  opponent: string;
  isHome: boolean;
  venue: string;
  address: string;
  colors: ThemeColors;
  onMatchTypeChange: (type: MatchType) => void;
  onOpponentChange: (text: string) => void;
  onIsHomeChange: (isHome: boolean) => void;
  onVenueChange: (text: string) => void;
  onAddressChange: (text: string) => void;
}

export const CreateMatchDetails = memo(function CreateMatchDetails({
  matchType,
  opponent,
  isHome,
  venue,
  address,
  colors,
  onMatchTypeChange,
  onOpponentChange,
  onIsHomeChange,
  onVenueChange,
  onAddressChange,
}: CreateMatchDetailsProps) {
  return (
    <View style={styles.stepContent}>
      <ThemedText type="defaultSemiBold" style={styles.stepTitle}>
        Match Details
      </ThemedText>

      <View style={styles.fieldGroup}>
        <ThemedText style={[styles.fieldLabel, { color: colors.muted }]}>Match Type</ThemedText>
        <Row wrap gap="sm">
          {MATCH_TYPES.map((t) => {
            const isSelected = matchType === t.type;
            const color = matchService.getMatchTypeColor(t.type);
            return (
              <Clickable
                key={t.type}
                style={[
                  styles.typeBtn,
                  { borderColor: isSelected ? color : colors.border },
                  isSelected && { backgroundColor: withAlpha(color, 0.09) },
                ]}
                onPress={() => onMatchTypeChange(t.type)}
              >
                <Row align="center" gap="xs">
                  <Ionicons
                    name={t.icon as keyof typeof Ionicons.glyphMap}
                    size={20}
                    color={isSelected ? color : colors.muted}
                  />
                  <ThemedText
                    style={[
                      Typography.bodySmallSemiBold,
                      { color: isSelected ? color : colors.text },
                    ]}
                  >
                    {t.label}
                  </ThemedText>
                </Row>
              </Clickable>
            );
          })}
        </Row>
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText style={[styles.fieldLabel, { color: colors.muted }]}>Opponent *</ThemedText>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
          ]}
          placeholder="e.g., Hackney FC"
          placeholderTextColor={colors.muted}
          value={opponent}
          onChangeText={onOpponentChange}
        />
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText style={[styles.fieldLabel, { color: colors.muted }]}>Location</ThemedText>
        <Row gap="sm">
          {[
            { label: 'Home', icon: 'home', val: true },
            { label: 'Away', icon: 'airplane', val: false },
          ].map(({ label, icon, val }) => (
            <Clickable
              key={label}
              style={[
                styles.toggleBtn,
                { flex: 1, borderColor: isHome === val ? colors.tint : colors.border },
                isHome === val && { backgroundColor: withAlpha(colors.tint, 0.09) },
              ]}
              onPress={() => onIsHomeChange(val)}
            >
              <Row align="center" justify="center" gap="xs">
                <Ionicons
                  name={icon as keyof typeof Ionicons.glyphMap}
                  size={18}
                  color={isHome === val ? colors.tint : colors.muted}
                />
                <ThemedText style={{ color: isHome === val ? colors.tint : colors.text }}>
                  {label}
                </ThemedText>
              </Row>
            </Clickable>
          ))}
        </Row>
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText style={[styles.fieldLabel, { color: colors.muted }]}>Venue *</ThemedText>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
          ]}
          placeholder="e.g., Bradwell Sports Ground"
          placeholderTextColor={colors.muted}
          value={venue}
          onChangeText={onVenueChange}
        />
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText style={[styles.fieldLabel, { color: colors.muted }]}>
          Address (optional)
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
          ]}
          placeholder="Full address for parents"
          placeholderTextColor={colors.muted}
          value={address}
          onChangeText={onAddressChange}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  stepContent: { gap: Spacing.md },
  stepTitle: { ...Typography.heading, marginBottom: Spacing.sm },
  fieldGroup: { gap: Spacing.xs },
  fieldLabel: { ...Typography.smallSemiBold },
  input: {
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.body,
  },
  typeBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  toggleBtn: { paddingVertical: Spacing.md, borderRadius: Radii.md, borderWidth: 1 },
});
