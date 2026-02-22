import { memo, useCallback } from 'react';
import { Modal, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  SlideInRight,
} from 'react-native-reanimated';

import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { Center } from '@/components/primitives/center';
import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useMonthlyStory, type StoryPage } from '@/hooks/use-monthly-story';
import { AnimatedCounter } from './animated-counter';

interface MonthlyStoryProps {
  visible: boolean;
  pages: StoryPage[];
  onClose: () => void;
}

const PAGE_ICONS: Record<StoryPage['type'], React.ComponentProps<typeof Ionicons>['name']> = {
  intro: 'sparkles',
  stat: 'analytics',
  coach_quote: 'chatbubble-ellipses',
  badges: 'ribbon',
  next_focus: 'arrow-forward-circle',
};

export const MonthlyStory = memo(function MonthlyStory({
  visible,
  pages,
  onClose,
}: MonthlyStoryProps) {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const story = useMonthlyStory({ pages });

  const handleTapLeft = useCallback(() => {
    story.goBack();
  }, [story]);

  const handleTapRight = useCallback(() => {
    story.advance();
  }, [story]);

  const handleClose = useCallback(() => {
    story.close();
    onClose();
  }, [onClose, story]);

  const handleLongPressIn = useCallback(() => {
    story.pause();
  }, [story]);

  const handleLongPressOut = useCallback(() => {
    story.resume();
  }, [story]);

  if (!visible || !story.currentPage) return null;

  const page = story.currentPage;
  const icon = PAGE_ICONS[page.type];
  const accent = page.accent ?? colors.tint;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      <View style={[styles.container, { backgroundColor: '#0A0A0F' }]}>
        {/* Photo background with dark overlay */}
        {page.photo ? (
          <>
            <Image
              source={{ uri: page.photo }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
            <LinearGradient
              colors={['rgba(10,10,15,0.6)', 'rgba(10,10,15,0.85)', 'rgba(10,10,15,0.95)']}
              style={StyleSheet.absoluteFill}
            />
          </>
        ) : null}

        {/* Progress bars */}
        <View style={[styles.progressRow, { paddingTop: insets.top + Spacing.xs }]}>
          {pages.map((p, i) => (
            <View
              key={p.id}
              style={[
                styles.progressTrack,
                { backgroundColor: withAlpha('#FFFFFF', 0.2) },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: '#FFFFFF',
                    width:
                      i < story.pageIndex
                        ? '100%'
                        : i === story.pageIndex
                          ? `${story.progress * 100}%`
                          : '0%',
                  },
                ]}
              />
            </View>
          ))}
        </View>

        {/* Close button */}
        <Clickable
          style={[styles.closeButton, { top: insets.top + Spacing.xs }]}
          onPress={handleClose}
          accessibilityLabel="Close story"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </Clickable>

        {/* Touch zones */}
        <View style={styles.touchZones}>
          <Clickable
            style={[styles.touchZoneLeft, { width: screenWidth * 0.3 }]}
            onPress={handleTapLeft}
            accessibilityLabel="Previous page"
            accessibilityRole="button"
          />
          <Clickable
            style={[styles.touchZoneRight, { width: screenWidth * 0.7 }]}
            onPress={handleTapRight}
            onPressIn={handleLongPressIn}
            onPressOut={handleLongPressOut}
            accessibilityLabel="Next page"
            accessibilityRole="button"
          />
        </View>

        {/* Content */}
        <Center style={styles.contentWrap}>
          <Animated.View
            key={`story-page-${story.pageIndex}`}
            entering={SlideInRight.duration(280).springify()}
            exiting={FadeOut.duration(120)}
          >
            <Column align="center" gap="md" style={styles.pageContent}>
              {/* Icon */}
              <Animated.View
                entering={FadeInDown.delay(80).springify()}
                style={[
                  styles.pageIcon,
                  { backgroundColor: withAlpha(accent, 0.2) },
                ]}
              >
                <Ionicons name={icon} size={36} color={accent} />
              </Animated.View>

              {/* Stat counter */}
              {page.stat ? (
                <Animated.View entering={FadeIn.delay(200)}>
                  <Column align="center" gap="xxs">
                    <AnimatedCounter
                      value={Number(page.stat.value) || 0}
                      style={[styles.statValue, { color: accent }]}
                    />
                    <ThemedText style={[styles.statLabel, { color: withAlpha('#FFFFFF', 0.7) }]}>
                      {page.stat.label}
                    </ThemedText>
                  </Column>
                </Animated.View>
              ) : null}

              {/* Title */}
              <Animated.View entering={FadeInDown.delay(120).springify()}>
                <ThemedText style={styles.pageTitle}>{page.title}</ThemedText>
              </Animated.View>

              {/* Body */}
              <Animated.View entering={FadeInDown.delay(200).springify()}>
                <ThemedText style={styles.pageBody}>{page.body}</ThemedText>
              </Animated.View>

              {/* Page indicator */}
              <ThemedText style={[styles.pageIndicator, { color: withAlpha('#FFFFFF', 0.4) }]}>
                {story.pageIndex + 1} / {story.totalPages}
              </ThemedText>
            </Column>
          </Animated.View>
        </Center>

        {/* Branding */}
        <Animated.View entering={FadeIn.delay(300)} style={styles.branding}>
          <ThemedText style={[styles.brandText, { color: withAlpha('#FFFFFF', 0.3) }]}>
            clubroom
          </ThemedText>
        </Animated.View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  progressRow: {
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: Spacing.sm,
    zIndex: 10,
  },
  progressTrack: {
    flex: 1,
    height: 2.5,
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radii.pill,
  },
  closeButton: {
    position: 'absolute',
    right: Spacing.sm,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  touchZones: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    zIndex: 5,
  },
  touchZoneLeft: {
    height: '100%',
  },
  touchZoneRight: {
    height: '100%',
  },
  contentWrap: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    zIndex: 1,
  },
  pageContent: {
    maxWidth: 320,
    alignItems: 'center',
  },
  pageIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 48,
    fontWeight: '800',
    textAlign: 'center',
  },
  statLabel: {
    ...Typography.bodySmall,
    textAlign: 'center',
  },
  pageTitle: {
    ...Typography.title,
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
  pageBody: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 22,
  },
  pageIndicator: {
    ...Typography.micro,
    marginTop: Spacing.sm,
  },
  branding: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  brandText: {
    ...Typography.caption,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
