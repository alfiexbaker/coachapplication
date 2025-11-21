import { PropsWithChildren, ReactNode } from 'react';
import { View, StyleSheet, ScrollView, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface PageContainerProps extends PropsWithChildren {
  /**
   * Optional header component to display at the top of the page
   */
  header?: ReactNode;

  /**
   * Additional style for the container
   */
  style?: StyleProp<ViewStyle>;

  /**
   * Additional style for the content area
   */
  contentStyle?: StyleProp<ViewStyle>;

  /**
   * Whether to use ScrollView (default: true)
   */
  scrollable?: boolean;

  /**
   * SafeAreaView edges to respect (default: ['top'])
   */
  edges?: ('top' | 'bottom' | 'left' | 'right')[];

  /**
   * Horizontal padding (default: Spacing.lg)
   */
  horizontalSpacing?: number;

  /**
   * Top padding (default: Spacing.lg)
   */
  topSpacing?: number;

  /**
   * Bottom padding (default: Spacing['2xl'] for tab bar clearance)
   */
  bottomSpacing?: number;

  /**
   * Gap between children (default: Spacing.lg)
   */
  gap?: number;

  /**
   * Show scrollbar indicator (default: false)
   */
  showsScrollIndicator?: boolean;
}

/**
 * PageContainer provides consistent layout, spacing, and safe area handling
 * across all screens. Use this wrapper for all top-level screen components.
 *
 * Features:
 * - Automatic safe area handling
 * - Consistent horizontal/vertical padding
 * - Proper bottom spacing for tab bar
 * - Optional scrollable content
 * - Header support
 *
 * @example
 * ```tsx
 * <PageContainer
 *   header={<PageHeader title="Development" action="Add Session" />}
 *   gap={Spacing.md}
 * >
 *   <SectionHeader title="Athletes" />
 *   <AthleteList />
 * </PageContainer>
 * ```
 */
export function PageContainer({
  children,
  header,
  style,
  contentStyle,
  scrollable = true,
  edges = ['top'],
  horizontalSpacing = Spacing.lg,
  topSpacing = Spacing.lg,
  bottomSpacing = Spacing['2xl'],
  gap = Spacing.lg,
  showsScrollIndicator = false,
}: PageContainerProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const containerStyle = [
    styles.container,
    { backgroundColor: palette.background },
    style,
  ];

  const innerContentStyle = [
    styles.content,
    {
      paddingHorizontal: horizontalSpacing,
      paddingTop: topSpacing,
      paddingBottom: bottomSpacing,
      gap,
    },
    contentStyle,
  ];

  const content = (
    <>
      {header}
      {scrollable ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={innerContentStyle}
          showsVerticalScrollIndicator={showsScrollIndicator}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={innerContentStyle}>
          {children}
        </View>
      )}
    </>
  );

  return (
    <SafeAreaView style={containerStyle} edges={edges}>
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
});
