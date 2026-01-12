import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Appearance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { logger } from '@/utils/logger';
import { Colors, Spacing, Radii } from '@/constants/theme';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo, reset: () => void) => ReactNode;
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
    // Log error with detailed information
    logger.error('React Error Boundary caught an error', error);
    logger.group('Error Details');
    logger.error('Component Stack', new Error(errorInfo.componentStack));
    logger.error('Error Name', { name: error.name });
    logger.error('Error Message', { message: error.message });
    logger.error('Error Stack', { stack: error.stack });
    logger.groupEnd();

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
        return this.props.fallback(
          this.state.error!,
          this.state.errorInfo!,
          this.resetError
        );
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
              The app encountered an unexpected error. This has been logged for debugging.
            </Text>

            {__DEV__ && this.state.error && (
              <View style={[styles.errorDetails, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <Text style={[styles.errorTitle, { color: palette.error }]}>Error Details (Dev Only):</Text>
                <Text style={[styles.errorName, { color: palette.error }]}>{this.state.error.name}</Text>
                <Text style={[styles.errorMessage, { color: palette.muted }]}>{this.state.error.message}</Text>
                {this.state.error.stack && (
                  <ScrollView style={[styles.stackContainer, { backgroundColor: palette.surfaceSecondary }]} horizontal>
                    <Text style={[styles.errorStack, { color: palette.foreground }]}>{this.state.error.stack}</Text>
                  </ScrollView>
                )}
                {this.state.errorInfo && (
                  <>
                    <Text style={[styles.componentStackTitle, { color: palette.error }]}>Component Stack:</Text>
                    <ScrollView style={[styles.stackContainer, { backgroundColor: palette.surfaceSecondary }]}>
                      <Text style={[styles.componentStack, { color: palette.muted }]}>
                        {this.state.errorInfo.componentStack}
                      </Text>
                    </ScrollView>
                  </>
                )}
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: pressed ? palette.tintPressed : palette.tint },
              ]}
              onPress={this.resetError}
            >
              <Text style={styles.buttonText}>Try Again</Text>
            </Pressable>
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    maxWidth: 400,
    lineHeight: 24,
  },
  errorDetails: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    width: '100%',
    maxWidth: 600,
    gap: Spacing.sm,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  errorName: {
    fontSize: 13,
    fontWeight: '600',
  },
  errorMessage: {
    fontSize: 12,
    marginBottom: Spacing.sm,
  },
  stackContainer: {
    maxHeight: 200,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
  },
  errorStack: {
    fontSize: 10,
    fontFamily: 'monospace',
  },
  componentStackTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: Spacing.md,
  },
  componentStack: {
    fontSize: 10,
    fontFamily: 'monospace',
  },
  button: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    marginTop: Spacing.lg,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
