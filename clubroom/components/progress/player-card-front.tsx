import { memo, useEffect, useMemo } from 'react';
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
import { useTheme } from '@/hooks/useTheme';
import type { CardTier, PlayerCardData } from '@/types/progress-types';

interface PlayerCardFrontProps {
  data: PlayerCardData;
  tier: CardTier;
  tierAccent: string;
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

export const PlayerCardFront = memo(function PlayerCardFront({
  data,
  tier,
  tierAccent,
  compact = false,
}: PlayerCardFrontProps) {
  const { colors } = useTheme();
  const nameLines = useMemo(() => splitName(data.name), [data.name]);
  const initials = useMemo(() => getInitials(data.name), [data.name]);
  const textColor = colors.onPrimary;
  const softText = withAlpha(textColor, 0.86);
  const badgeBackground = withAlpha(textColor, 0.2);
  const scoreBackground = withAlpha(textColor, 0.15);
  const photoOverlayOpacity = data.latestPhotoUri ? (compact ? 0.52 : 0.48) : 0.18;
  const shimmerX = useSharedValue(-160);
  const shimmerEnabled = tier === 'gold' || tier === 'platinum' || tier === 'diamond';

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

  const positionalAttributes = data.attributes ?? [];
  const showPositionalAttributes = positionalAttributes.length === 5;

  return (
    <View style={styles.face}>
      {data.latestPhotoUri ? (
        <Image source={{ uri: data.latestPhotoUri }} style={StyleSheet.absoluteFill} blurRadius={20} />
      ) : null}

      <View style={[styles.overlay, { backgroundColor: withAlpha(tierAccent, photoOverlayOpacity) }]} />
      {shimmerEnabled ? (
        <Animated.View pointerEvents="none" style={[styles.shimmer, shimmerStyle]} />
      ) : null}

      <Column flex style={[styles.content, compact ? styles.contentCompact : undefined]}>
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

        <Column
          align="center"
          justify="center"
          style={styles.heroBlock}
          gap="micro"
        >
          <View
            style={[
              styles.avatarWrap,
              compact ? styles.avatarWrapCompact : undefined,
              { backgroundColor: withAlpha(textColor, 0.12) },
            ]}
          >
            {data.latestPhotoUri ? (
              <Image source={{ uri: data.latestPhotoUri }} style={styles.avatarImage} />
            ) : (
              <ThemedText style={[styles.initialsText, compact ? styles.initialsTextCompact : undefined, { color: textColor }]}>
                {initials}
              </ThemedText>
            )}
          </View>

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
          </Column>

          <ThemedText
            style={[styles.levelName, compact ? styles.levelNameCompact : undefined, { color: softText }]}
            numberOfLines={1}
          >
            {data.levelName}
          </ThemedText>
        </Column>

        <Column gap="xxs">
          {showPositionalAttributes ? (
            <>
              <Row align="center" gap="xxs">
                {positionalAttributes.slice(0, 3).map((attribute) => (
                  <Row
                    key={attribute.key}
                    align="center"
                    justify="between"
                    style={[
                      styles.scorePillPositional,
                      compact ? styles.scorePillCompact : undefined,
                      { backgroundColor: scoreBackground },
                    ]}
                  >
                    <ThemedText
                      style={[styles.chipAbbrev, { color: softText }]}
                    >
                      {chipAbbrev(attribute.label)}
                    </ThemedText>
                    <View
                      style={[
                        styles.scoreBadge,
                        compact ? styles.scoreBadgeCompact : undefined,
                        { backgroundColor: withAlpha(textColor, 0.22) },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.scoreText,
                          compact ? styles.scoreTextCompact : undefined,
                          { color: textColor },
                        ]}
                      >
                        {attribute.value}
                      </ThemedText>
                    </View>
                  </Row>
                ))}
              </Row>

              <Row align="center" justify="center" gap="xxs">
                {positionalAttributes.slice(3).map((attribute) => (
                  <Row
                    key={attribute.key}
                    align="center"
                    justify="between"
                    style={[
                      styles.scorePillPositionalBottom,
                      compact ? styles.scorePillCompact : undefined,
                      { backgroundColor: scoreBackground },
                    ]}
                  >
                    <ThemedText
                      style={[styles.chipAbbrev, { color: softText }]}
                    >
                      {chipAbbrev(attribute.label)}
                    </ThemedText>
                    <View
                      style={[
                        styles.scoreBadge,
                        compact ? styles.scoreBadgeCompact : undefined,
                        { backgroundColor: withAlpha(textColor, 0.22) },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.scoreText,
                          compact ? styles.scoreTextCompact : undefined,
                          { color: textColor },
                        ]}
                      >
                        {attribute.value}
                      </ThemedText>
                    </View>
                  </Row>
                ))}
              </Row>
            </>
          ) : (
            <>
              <Row align="center" gap="xxs">
                <Row
                  align="center"
                  justify="between"
                  style={[
                    styles.scorePill,
                    compact ? styles.scorePillCompact : undefined,
                    { backgroundColor: scoreBackground },
                  ]}
                >
                  <ThemedText style={[styles.chipAbbrev, { color: softText }]}>TEC</ThemedText>
                  <View
                    style={[
                      styles.scoreBadge,
                      compact ? styles.scoreBadgeCompact : undefined,
                      { backgroundColor: withAlpha(textColor, 0.22) },
                    ]}
                  >
                    <ThemedText style={[styles.scoreText, compact ? styles.scoreTextCompact : undefined, { color: textColor }]}>
                      {data.corners.technical}
                    </ThemedText>
                  </View>
                </Row>
                <Row
                  align="center"
                  justify="between"
                  style={[
                    styles.scorePill,
                    compact ? styles.scorePillCompact : undefined,
                    { backgroundColor: scoreBackground },
                  ]}
                >
                  <ThemedText style={[styles.chipAbbrev, { color: softText }]}>PHY</ThemedText>
                  <View
                    style={[
                      styles.scoreBadge,
                      compact ? styles.scoreBadgeCompact : undefined,
                      { backgroundColor: withAlpha(textColor, 0.22) },
                    ]}
                  >
                    <ThemedText style={[styles.scoreText, compact ? styles.scoreTextCompact : undefined, { color: textColor }]}>
                      {data.corners.physical}
                    </ThemedText>
                  </View>
                </Row>
              </Row>
              <Row align="center" gap="xxs">
                <Row
                  align="center"
                  justify="between"
                  style={[
                    styles.scorePill,
                    compact ? styles.scorePillCompact : undefined,
                    { backgroundColor: scoreBackground },
                  ]}
                >
                  <ThemedText style={[styles.chipAbbrev, { color: softText }]}>PSY</ThemedText>
                  <View
                    style={[
                      styles.scoreBadge,
                      compact ? styles.scoreBadgeCompact : undefined,
                      { backgroundColor: withAlpha(textColor, 0.22) },
                    ]}
                  >
                    <ThemedText style={[styles.scoreText, compact ? styles.scoreTextCompact : undefined, { color: textColor }]}>
                      {data.corners.psychological}
                    </ThemedText>
                  </View>
                </Row>
                <Row
                  align="center"
                  justify="between"
                  style={[
                    styles.scorePill,
                    compact ? styles.scorePillCompact : undefined,
                    { backgroundColor: scoreBackground },
                  ]}
                >
                  <ThemedText style={[styles.chipAbbrev, { color: softText }]}>SOC</ThemedText>
                  <View
                    style={[
                      styles.scoreBadge,
                      compact ? styles.scoreBadgeCompact : undefined,
                      { backgroundColor: withAlpha(textColor, 0.22) },
                    ]}
                  >
                    <ThemedText style={[styles.scoreText, compact ? styles.scoreTextCompact : undefined, { color: textColor }]}>
                      {data.corners.social}
                    </ThemedText>
                  </View>
                </Row>
              </Row>
            </>
          )}
        </Column>
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
  },
  nameWrap: {
    width: '100%',
    paddingHorizontal: Spacing.xs,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: withAlpha('#FFFFFF', 0.35),
    overflow: 'hidden',
  },
  avatarWrapCompact: {
    width: 56,
    height: 56,
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
  nameText: {
    ...Typography.subheading,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  nameTextCompact: {
    ...Typography.bodySmallSemiBold,
    textAlign: 'center',
  },
  levelName: {
    ...Typography.caption,
    textAlign: 'center',
  },
  levelNameCompact: {
    ...Typography.micro,
    textAlign: 'center',
  },
  scorePill: {
    flex: 1,
    borderRadius: Radii.pill,
    minHeight: 32,
    paddingHorizontal: Spacing.xs,
  },
  scorePillCompact: {
    minHeight: 28,
  },
  scorePillPositional: {
    flex: 1,
    borderRadius: Radii.pill,
    minHeight: 32,
    paddingHorizontal: Spacing.xs,
  },
  scorePillPositionalBottom: {
    width: '48%',
    borderRadius: Radii.pill,
    minHeight: 32,
    paddingHorizontal: Spacing.xs,
  },
  chipAbbrev: {
    ...Typography.micro,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  scoreText: {
    ...Typography.smallSemiBold,
  },
  scoreTextCompact: {
    ...Typography.caption,
  },
  scoreBadge: {
    minWidth: 30,
    minHeight: 22,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxs,
  },
  scoreBadgeCompact: {
    minWidth: 26,
    minHeight: 18,
  },
});
