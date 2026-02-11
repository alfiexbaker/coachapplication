/**
 * Section Primitive
 *
 * Screen section with optional title, subtitle, and trailing action slot.
 * Wraps children with consistent vertical spacing and optional horizontal padding.
 *
 * Usage:
 *   <Section title="Upcoming">
 *     <BookingCard ... />
 *   </Section>
 *
 *   <Section title="Athletes" subtitle="Manage your squad" action={<Button title="Add" />}>
 *     {children}
 *   </Section>
 */

import React, { useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Row } from '@/components/primitives/row';

import { Fonts, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SectionProps {
  /** Section heading */
  title?: string;
  /** Description shown below the title */
  subtitle?: string;
  /** Trailing element in the header row (e.g. a "See all" button) */
  action?: React.ReactNode;
  /** Section content */
  children: React.ReactNode;
  /** Remove default horizontal padding (default: false) */
  noPadding?: boolean;
  /** Additional container styles */
  style?: StyleProp<ViewStyle>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function SectionInner({
  title,
  subtitle,
  action,
  children,
  noPadding = false,
  style,
}: SectionProps) {
  const { colors } = useTheme();
  const hasHeader = Boolean(title || action);

  const themedStyles = useMemo(
    () => ({
      title: { color: colors.foreground },
      subtitle: { color: colors.muted },
    }),
    [colors],
  );

  return (
    <View style={[styles.container, style]}>
      {hasHeader ? (
        <Row align="center" justify="between" style={!noPadding ? styles.headerPadded : undefined}>
          <View style={styles.headerText}>
            {title ? (
              <Text style={[styles.title, themedStyles.title]} numberOfLines={1}>
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text style={[styles.subtitle, themedStyles.subtitle]} numberOfLines={2}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {action ? <View>{action}</View> : null}
        </Row>
      ) : null}

      <View style={noPadding ? undefined : styles.content}>{children}</View>
    </View>
  );
}

export const Section = React.memo(SectionInner);

// ---------------------------------------------------------------------------
// Styles (color-independent)
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  // header replaced by Row primitive
  headerPadded: {
    paddingHorizontal: Spacing.sm,
  },
  headerText: {
    flex: 1,
    gap: Spacing.micro,
  },
  title: {
    ...Typography.heading,
    fontFamily: Fonts?.sans,
  },
  subtitle: {
    ...Typography.small,
    fontFamily: Fonts?.sans,
  },
  content: {
    paddingHorizontal: Spacing.sm,
  },
});
