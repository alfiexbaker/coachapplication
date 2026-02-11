import React, { memo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { ClubPostType, FeedType } from '@/constants/types';
import { POST_TYPES } from '@/hooks/use-create-club-post';

interface FeedTypeSelectorProps {
  feedType: FeedType;
  clubName?: string;
  onSelect: (ft: FeedType) => void;
}

export const FeedTypeSelector = memo(function FeedTypeSelector({
  feedType,
  clubName,
  onSelect,
}: FeedTypeSelectorProps) {
  const { colors: palette } = useTheme();
  const opts: { key: FeedType; label: string; icon: string; color: string }[] = [
    {
      key: 'PERSONAL',
      label: 'My Personal Feed',
      icon: 'person-circle-outline',
      color: palette.success,
    },
    ...(clubName
      ? [
          { key: 'CLUB' as FeedType, label: clubName, icon: 'shield-outline', color: palette.tint },
          { key: 'BOTH' as FeedType, label: 'Both', icon: 'globe-outline', color: palette.warning },
        ]
      : []),
  ];
  return (
    <View style={styles.section}>
      <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Post To</ThemedText>
      <Row wrap gap="xs">
        {opts.map((o) => (
          <Clickable
            key={o.key}
            style={[
              styles.chip,
              { borderColor: feedType === o.key ? o.color : palette.border },
              feedType === o.key ? { backgroundColor: withAlpha(o.color, 0.06) } : undefined,
            ]}
            onPress={() => onSelect(o.key)}
          >
            <Ionicons
              name={o.icon as keyof typeof Ionicons.glyphMap}
              size={18}
              color={feedType === o.key ? o.color : palette.muted}
            />
            <ThemedText
              style={{
                color: feedType === o.key ? o.color : palette.text,
                ...Typography.smallSemiBold,
              }}
              numberOfLines={1}
            >
              {o.label}
            </ThemedText>
          </Clickable>
        ))}
      </Row>
    </View>
  );
});

interface PostTypeSelectorProps {
  postType: ClubPostType;
  onSelect: (pt: ClubPostType) => void;
}

export const PostTypeSelector = memo(function PostTypeSelector({
  postType,
  onSelect,
}: PostTypeSelectorProps) {
  const { colors: palette } = useTheme();
  return (
    <View style={styles.section}>
      <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Post Type</ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {POST_TYPES.map((type) => (
          <Clickable
            key={type.key}
            style={[
              styles.chip,
              { borderColor: postType === type.key ? palette.tint : palette.border },
              postType === type.key
                ? { backgroundColor: withAlpha(palette.tint, 0.06) }
                : undefined,
            ]}
            onPress={() => onSelect(type.key)}
          >
            <Ionicons
              name={type.icon as keyof typeof Ionicons.glyphMap}
              size={20}
              color={postType === type.key ? palette.tint : palette.muted}
            />
            <ThemedText
              style={[
                styles.chipLabel,
                { color: postType === type.key ? palette.tint : palette.text },
              ]}
            >
              {type.label}
            </ThemedText>
          </Clickable>
        ))}
      </ScrollView>
    </View>
  );
});

interface PostAsSelectorProps {
  postAs: 'self' | 'club';
  onSelect: (pa: 'self' | 'club') => void;
}

export const PostAsSelector = memo(function PostAsSelector({
  postAs,
  onSelect,
}: PostAsSelectorProps) {
  const { colors: palette } = useTheme();
  return (
    <View style={styles.section}>
      <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Post As</ThemedText>
      <Row gap="sm">
        {(['self', 'club'] as const).map((pa) => (
          <Clickable
            key={pa}
            style={[
              styles.twoColOption,
              { borderColor: postAs === pa ? palette.tint : palette.border },
              postAs === pa ? { backgroundColor: withAlpha(palette.tint, 0.06) } : undefined,
            ]}
            onPress={() => onSelect(pa)}
          >
            <Ionicons
              name={pa === 'self' ? 'person-outline' : 'shield-outline'}
              size={18}
              color={postAs === pa ? palette.tint : palette.muted}
            />
            <ThemedText style={{ color: postAs === pa ? palette.tint : palette.text }}>
              {pa === 'self' ? 'Yourself' : 'Club'}
            </ThemedText>
          </Clickable>
        ))}
      </Row>
    </View>
  );
});

interface AudienceSelectorProps {
  audienceType: 'club' | 'squad';
  selectedSquadId: string | null;
  squads: { id: string; name: string; memberCount: number }[];
  onSelectClub: () => void;
  onSelectSquad: () => void;
  onSelectSquadId: (id: string) => void;
}

export const AudienceSelector = memo(function AudienceSelector({
  audienceType,
  selectedSquadId,
  squads,
  onSelectClub,
  onSelectSquad,
  onSelectSquadId,
}: AudienceSelectorProps) {
  const { colors: palette } = useTheme();
  if (squads.length === 0) return null;
  return (
    <View style={styles.section}>
      <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Post To</ThemedText>
      <Row gap="sm">
        <Clickable
          style={[
            styles.twoColOption,
            { borderColor: audienceType === 'club' ? palette.tint : palette.border },
            audienceType === 'club'
              ? { backgroundColor: withAlpha(palette.tint, 0.06) }
              : undefined,
          ]}
          onPress={onSelectClub}
        >
          <Ionicons
            name="people-outline"
            size={18}
            color={audienceType === 'club' ? palette.tint : palette.muted}
          />
          <ThemedText style={{ color: audienceType === 'club' ? palette.tint : palette.text }}>
            All Members
          </ThemedText>
        </Clickable>
        <Clickable
          style={[
            styles.twoColOption,
            { borderColor: audienceType === 'squad' ? palette.tint : palette.border },
            audienceType === 'squad'
              ? { backgroundColor: withAlpha(palette.tint, 0.06) }
              : undefined,
          ]}
          onPress={onSelectSquad}
        >
          <Ionicons
            name="grid-outline"
            size={18}
            color={audienceType === 'squad' ? palette.tint : palette.muted}
          />
          <ThemedText style={{ color: audienceType === 'squad' ? palette.tint : palette.text }}>
            Specific Group
          </ThemedText>
        </Clickable>
      </Row>
      {audienceType === 'squad' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.row, { marginTop: Spacing.sm }]}
        >
          {squads.map((squad) => (
            <Clickable
              key={squad.id}
              style={[
                styles.squadOption,
                {
                  borderColor: selectedSquadId === squad.id ? palette.success : palette.border,
                  backgroundColor:
                    selectedSquadId === squad.id
                      ? withAlpha(palette.success, 0.06)
                      : palette.surface,
                },
              ]}
              onPress={() => onSelectSquadId(squad.id)}
            >
              <View
                style={[
                  styles.squadBadge,
                  {
                    backgroundColor: selectedSquadId === squad.id ? palette.success : palette.muted,
                  },
                ]}
              >
                <ThemedText style={{ color: palette.onPrimary, ...Typography.micro }}>
                  {squad.name.slice(0, 2).toUpperCase()}
                </ThemedText>
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={{ ...Typography.smallSemiBold }}>{squad.name}</ThemedText>
                <ThemedText style={{ color: palette.muted, ...Typography.caption }}>
                  {squad.memberCount} members
                </ThemedText>
              </View>
              {selectedSquadId === squad.id && (
                <Ionicons name="checkmark-circle" size={18} color={palette.success} />
              )}
            </Clickable>
          ))}
        </ScrollView>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  section: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  sectionLabel: {
    ...Typography.caption,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  chipLabel: { ...Typography.smallSemiBold },
  // twoCol replaced by Row primitive
  twoColOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  squadOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    minWidth: 180,
  },
  squadBadge: {
    width: 28,
    height: 28,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
