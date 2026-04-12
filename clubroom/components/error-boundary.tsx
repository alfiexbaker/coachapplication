import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView, Appearance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clickable } from '@/components/primitives/clickable';
import { logger } from '@/utils/logger';
import { Colors, Spacing, Radii, Typography } from '@/constants/theme';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo, reset: () => void) => ReactNode;
  onGoHome?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component with advanced logging
 *
 * Catches React errors and logs them with detailed information
 * Provides a fallback UI when errors occur
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('React Error Boundary caught an error', error, {
      componentStack: errorInfo.componentStack,
    });

    if (__DEV__) {
      console.group('Error Details');
      console.error('Component Stack:', errorInfo.componentStack);
      console.error('Error Name:', error.name);
      console.error('Error Message:', error.message);
      console.error('Error Stack:', error.stack);
      console.groupEnd();
    }

    // Update state with error info
    this.setState({
      errorInfo,
    });
  }

  resetError = () => {
    logger.info('Error boundary reset requested');
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!, this.state.errorInfo!, this.resetError);
      }

      // Get current color scheme
      const scheme = Appearance.getColorScheme() ?? 'light';
      const palette = Colors[scheme];

      // Default error UI
      return (
        <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={[styles.title, { color: palette.foreground }]}>Something went wrong</Text>
            <Text style={[styles.message, { color: palette.muted }]}>
              {__DEV__
                ? 'The app encountered an unexpected error. See details below.'
                : "We're sorry for the inconvenience. Please try again."}
            </Text>

            {__DEV__ && this.state.error && (
              <View
                style={[
                  styles.errorDetails,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}
              >
                <Text style={[styles.errorTitle, { color: palette.error }]}>
                  Error Details (Dev Only):
                </Text>
                <Text style={[styles.errorName, { color: palette.error }]}>
                  {this.state.error.name}
                </Text>
                <Text style={[styles.errorMessage, { color: palette.muted }]}>
                  {this.state.error.message}
                </Text>
                {this.state.error.stack && (
                  <ScrollView
                    style={[styles.stackContainer, { backgroundColor: palette.surfaceSecondary }]}
                    horizontal
                  >
                    <Text style={[styles.errorStack, { color: palette.foreground }]}>
                      {this.state.error.stack}
                    </Text>
                  </ScrollView>
                )}
                {this.state.errorInfo && (
                  <>
                    <Text style={[styles.componentStackTitle, { color: palette.error }]}>
                      Component Stack:
                    </Text>
                    <ScrollView
                      style={[styles.stackContainer, { backgroundColor: palette.surfaceSecondary }]}
                    >
                      <Text style={[styles.componentStack, { color: palette.muted }]}>
                        {this.state.errorInfo.componentStack}
                      </Text>
                    </ScrollView>
                  </>
                )}
              </View>
            )}

            <Clickable
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: pressed ? palette.tintPressed : palette.tint },
              ]}
              onPress={this.resetError}
              accessibilityRole="button"
              accessibilityLabel="Try again"
            >
              <Text style={[styles.buttonText, { color: palette.onPrimary }]}>Try Again</Text>
            </Clickable>

            {this.props.onGoHome && (
              <Clickable
                style={({ pressed }) => [
                  styles.secondaryButton,
                  { borderColor: palette.border, opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={this.props.onGoHome}
                accessibilityRole="button"
                accessibilityLabel="Go to home screen"
              >
                <Text style={[styles.buttonText, { color: palette.foreground }]}>Go Home</Text>
              </Clickable>
            )}
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  title: { ...Typography.display, textAlign: 'center' },
  message: { ...Typography.subheading, textAlign: 'center', maxWidth: 400 },
  errorDetails: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    width: '100%',
    maxWidth: 600,
    gap: Spacing.sm,
  },
  errorTitle: { ...Typography.bodySmallSemiBold, marginBottom: Spacing.sm },
  errorName: { ...Typography.smallSemiBold },
  errorMessage: { ...Typography.caption, marginBottom: Spacing.sm },
  stackContainer: {
    maxHeight: 200,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
  },
  errorStack: { ...Typography.micro, fontFamily: 'monospace' },
  componentStackTitle: { ...Typography.smallSemiBold, marginTop: Spacing.md },
  componentStack: { ...Typography.micro, fontFamily: 'monospace' },
  button: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    marginTop: Spacing.lg,
  },
  secondaryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  buttonText: { ...Typography.subheading },
});
