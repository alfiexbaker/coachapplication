import { Fragment, memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { CardTier, PlayerCardData } from '@/types/progress-types';
import type { PlayerCardPalette } from './player-card-palette';

interface PlayerCardFrontProps {
  data: PlayerCardData;
  tier: CardTier;
  palette: PlayerCardPalette;
  compact?: boolean;
}

function splitName(name: string): { firstLine: string; secondLine: string } {
  const cleaned = name.trim();
  if (!cleaned) {
    return { firstLine: 'Player', secondLine: 'Card' };
  }

  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) {
    return { firstLine: parts[0], secondLine: '' };
  }

  return {
    firstLine: parts.slice(0, parts.length - 1).join(' '),
    secondLine: parts[parts.length - 1],
  };
}

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .slice(0, 2);
  if (parts.length === 0) {
    return 'PC';
  }
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
}

function toTierLabel(tier: CardTier): string {
  return `${tier.charAt(0).toUpperCase()}${tier.slice(1)}`;
}

/** FIFA-style 3-char abbreviation for stat chips */
function chipAbbrev(label: string): string {
  const firstWord = label.split(/[\s&,]+/)[0] ?? label;
  return firstWord.slice(0, 3).toUpperCase();
}

/** Compute OVR from any available positional attributes */
function computeOvr(attributes: PlayerCardData['attributes']): number | null {
  if (!attributes || attributes.length === 0) return null;
  const sum = attributes.reduce((acc, attr) => acc + attr.value, 0);
  return Math.round(sum / attributes.length);
}

/** Position abbreviation for OVR badge */
function positionAbbrev(position: PlayerCardData['position']): string {
  if (!position) return '';
  return position;
}

export const PlayerCardFront = memo(function PlayerCardFront({
  data,
  tier,
  palette,
  compact = false,
}: PlayerCardFrontProps) {
  const nameLines = useMemo(() => splitName(data.name), [data.name]);
  const initials = useMemo(() => getInitials(data.name), [data.name]);
  const textColor = palette.text;
  const softText = palette.softText;
  const badgeBackground = palette.badgeBackground;
  const faceOverlay = data.latestPhotoUri ? palette.mediaOverlayStrong : palette.mediaOverlaySoft;
  const shimmerX = useSharedValue(-160);
  const shimmerEnabled = tier === 'gold' || tier === 'platinum' || tier === 'diamond';

  const positionalAttributes = data.attributes ?? [];
  const showPositionalAttributes = positionalAttributes.length === 5;
  const ovr = useMemo(() => computeOvr(data.attributes), [data.attributes]);
  const posAbbrev = useMemo(() => positionAbbrev(data.position), [data.position]);

  useEffect(() => {
    if (!shimmerEnabled) {
      shimmerX.value = -160;
      return;
    }
    shimmerX.value = withRepeat(
      withSequence(
        withTiming(420, { duration: 2000, easing: Easing.linear }),
        withTiming(-160, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, [shimmerEnabled, shimmerX]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }, { rotate: '-12deg' }],
  }));

  const avatarSize = compact ? 84 : 96;

  return (
    <View style={styles.face}>
      {data.latestPhotoUri ? (
        <Image source={{ uri: data.latestPhotoUri }} style={StyleSheet.absoluteFill} blurRadius={20} />
      ) : null}

      <View style={[styles.overlay, { backgroundColor: faceOverlay }]} />
      {shimmerEnabled ? (
        <Animated.View pointerEvents="none" style={[styles.shimmer, shimmerStyle]} />
      ) : null}

      <Column flex style={[styles.content, compact ? styles.contentCompact : undefined]}>
        {/* Top row: Level + Tier */}
        <Row align="center" justify="between">
          <Row align="center" gap="xxs" style={[styles.levelBadge, { backgroundColor: badgeBackground }]}>
            <Ionicons name="trophy-outline" size={13} color={textColor} />
            <ThemedText style={[styles.levelBadgeText, { color: textColor }]}>Lv. {data.levelNumber}</ThemedText>
          </Row>
          <Row align="center" gap="xxs" style={[styles.levelBadge, { backgroundColor: badgeBackground }]}>
            <Ionicons name="sparkles-outline" size={13} color={textColor} />
            <ThemedText style={[styles.levelBadgeText, { color: textColor }]}>
              {toTierLabel(tier)}
            </ThemedText>
          </Row>
        </Row>

        {/* Hero: OVR badge (absolute top-left) + centered Avatar */}
        <View style={styles.heroBlock}>
          {/* OVR badge — positioned like FIFA cards, top-left of hero */}
          {(ovr !== null || posAbbrev) ? (
            <Column
              align="center"
              style={[
                styles.ovrBadge,
                compact ? styles.ovrBadgeCompact : undefined,
                ovr === null ? styles.ovrBadgeEmpty : undefined,
              ]}
            >
              <ThemedText
                style={[
                  styles.ovrNumber,
                  compact ? styles.ovrNumberCompact : undefined,
                  { color: ovr === null ? softText : textColor },
                ]}
              >
                {ovr ?? 'N/A'}
              </ThemedText>
              <View style={[styles.ovrDivider, { backgroundColor: withAlpha(textColor, 0.3) }]} />
              <ThemedText style={[styles.ovrPosition, { color: softText }]}>
                {posAbbrev}
              </ThemedText>
            </Column>
          ) : null}

          {/* Avatar — centered, full prominence */}
          <View
            style={[
              styles.avatarWrap,
              {
                width: avatarSize,
                height: avatarSize,
                borderRadius: avatarSize / 2,
                backgroundColor: palette.avatarBackground,
                borderColor: palette.avatarBorder,
              },
            ]}
          >
            {data.latestPhotoUri ? (
              <Image
                source={{ uri: data.latestPhotoUri }}
                style={styles.avatarImage}
              />
            ) : (
              <ThemedText
                style={[
                  styles.initialsText,
                  compact ? styles.initialsTextCompact : undefined,
                  { color: textColor },
                ]}
              >
                {initials}
              </ThemedText>
            )}
          </View>
        </View>

        {/* Name + Level name */}
        <Column align="center" gap="micro" style={styles.nameWrap}>
          <ThemedText
            style={[styles.nameText, compact ? styles.nameTextCompact : undefined, { color: textColor }]}
            numberOfLines={1}
          >
            {nameLines.firstLine.toUpperCase()}
          </ThemedText>
          {nameLines.secondLine ? (
            <ThemedText
              style={[styles.nameText, compact ? styles.nameTextCompact : undefined, { color: textColor }]}
              numberOfLines={1}
            >
              {nameLines.secondLine.toUpperCase()}
            </ThemedText>
          ) : null}
          <ThemedText
            style={[styles.levelName, compact ? styles.levelNameCompact : undefined, { color: softText }]}
            numberOfLines={1}
          >
            {data.levelName}
          </ThemedText>
        </Column>

        {/* Stats — frosted glass bar with micro-separators */}
        <View
          style={[
            styles.statsBar,
            compact ? styles.statsBarCompact : undefined,
            {
              backgroundColor: palette.statPanelBackground,
              borderWidth: 1,
              borderColor: palette.statPanelBorder,
            },
          ]}
        >
          <Row align="center" justify="between">
            {(showPositionalAttributes
              ? positionalAttributes.map((a) => ({ key: a.key, label: chipAbbrev(a.label), value: a.value }))
              : [
                  { key: 'tec', label: 'TEC', value: data.corners.technical },
                  { key: 'phy', label: 'PHY', value: data.corners.physical },
                  { key: 'psy', label: 'PSY', value: data.corners.psychological },
                  { key: 'soc', label: 'SOC', value: data.corners.social },
                ]
            ).map((stat, index) => (
              <Fragment key={stat.key}>
                {index > 0 ? (
                  <View style={[styles.statSeparator, { backgroundColor: palette.statSeparator }]} />
                ) : null}
                <Column align="center" gap="micro" style={styles.statColumn}>
                  <ThemedText style={[styles.statAbbrev, { color: softText }]}>
                    {stat.label}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.statValue,
                      compact ? styles.statValueCompact : undefined,
                      { color: textColor },
                    ]}
                  >
                    {stat.value}
                  </ThemedText>
                </Column>
              </Fragment>
            ))}
          </Row>
        </View>
      </Column>
    </View>
  );
});

const styles = StyleSheet.create({
  face: {
    flex: 1,
    borderRadius: Radii.xl,
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  shimmer: {
    position: 'absolute',
    top: -40,
    bottom: -40,
    width: 100,
    backgroundColor: withAlpha('#FFFFFF', 0.14),
  },
  content: {
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
    width: '100%',
  },
  contentCompact: {
    paddingHorizontal: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  levelBadge: {
    borderRadius: Radii.pill,
    minHeight: 26,
    paddingHorizontal: Spacing.xs,
  },
  levelBadgeText: {
    ...Typography.caption,
  },
  heroBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ovrBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1,
    alignItems: 'center',
    minWidth: 44,
  },
  ovrBadgeCompact: {
    minWidth: 38,
  },
  ovrBadgeEmpty: {
    minHeight: 54,
    justifyContent: 'center',
  },
  ovrNumber: {
    fontSize: Typography.heroLarge.fontSize,
    fontWeight: '800',
    lineHeight: Typography['2xl'].lineHeight,
    letterSpacing: Typography.heroLarge.letterSpacing,
  },
  ovrNumberCompact: {
    fontSize: Typography.hero.fontSize,
    lineHeight: Typography.hero.lineHeight,
  },
  ovrDivider: {
    width: '80%',
    height: 1,
    marginVertical: Spacing.micro,
  },
  ovrPosition: {
    ...Typography.caption,
    fontWeight: '700',
    letterSpacing: 1,
  },
  avatarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  initialsText: {
    ...Typography.subheading,
    letterSpacing: 0.4,
  },
  initialsTextCompact: {
    ...Typography.bodySmallSemiBold,
  },
  nameWrap: {
    width: '100%',
    paddingHorizontal: Spacing.xs,
  },
  nameText: {
    ...Typography.heading,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.8,
  },
  nameTextCompact: {
    ...Typography.subheading,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.8,
  },
  levelName: {
    ...Typography.caption,
    textAlign: 'center',
  },
  levelNameCompact: {
    ...Typography.micro,
    textAlign: 'center',
  },
  statsBar: {
    borderRadius: Radii.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  statsBarCompact: {
    paddingVertical: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
  },
  statSeparator: {
    width: 1,
    height: 24,
  },
  statColumn: {
    flex: 1,
    alignItems: 'center',
  },
  statAbbrev: {
    ...Typography.caption,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  statValue: {
    ...Typography.heading,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statValueCompact: {
    ...Typography.subheading,
    fontWeight: '800',
  },
});
