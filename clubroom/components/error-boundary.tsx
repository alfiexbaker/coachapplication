import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { logger } from '@/utils/logger';

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

      // Default error UI
      return (
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.emoji}>💥</Text>
            <Text style={styles.title}>Oops! Something went wrong</Text>
            <Text style={styles.message}>
              The app encountered an unexpected error. This has been logged for debugging.
            </Text>

            {__DEV__ && this.state.error && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorTitle}>Error Details (Dev Only):</Text>
                <Text style={styles.errorName}>{this.state.error.name}</Text>
                <Text style={styles.errorMessage}>{this.state.error.message}</Text>
                {this.state.error.stack && (
                  <ScrollView style={styles.stackContainer} horizontal>
                    <Text style={styles.errorStack}>{this.state.error.stack}</Text>
                  </ScrollView>
                )}
                {this.state.errorInfo && (
                  <>
                    <Text style={styles.componentStackTitle}>Component Stack:</Text>
                    <ScrollView style={styles.stackContainer}>
                      <Text style={styles.componentStack}>
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
                pressed && styles.buttonPressed,
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
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  emoji: {
    fontSize: 64,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    maxWidth: 400,
    lineHeight: 24,
  },
  errorDetails: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    width: '100%',
    maxWidth: 600,
    gap: 8,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#d32f2f',
    marginBottom: 8,
  },
  errorName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#d32f2f',
  },
  errorMessage: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  stackContainer: {
    maxHeight: 200,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
  },
  errorStack: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#333',
  },
  componentStackTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#d32f2f',
    marginTop: 12,
  },
  componentStack: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#666',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  buttonPressed: {
    backgroundColor: '#0051D5',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
