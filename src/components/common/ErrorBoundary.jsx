/**
 * @module ErrorBoundary
 * @description Error Boundary component to catch render errors and display fallback UI
 *              Prevents white screen of death from unhandled errors
 *              Logs errors for debugging
 */

import React, { Component } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors.js';
import { typography } from '../theme/typography.js';
import { spacing } from '../theme/spacing.js';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('🔴 Error Boundary caught:', error);
    console.error('Error Stack:', errorInfo.componentStack);
    
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.content}>
              <Text style={styles.emoji}>⚠️</Text>
              <Text style={styles.title}>Oops! Something went wrong</Text>
              
              <View style={styles.messageBox}>
                <Text style={styles.errorMessage}>
                  {this.state.error?.message || 'An unexpected error occurred'}
                </Text>
              </View>

              {__DEV__ && this.state.errorInfo && (
                <View style={styles.debugBox}>
                  <Text style={styles.debugTitle}>Debug Info (dev only):</Text>
                  <Text style={styles.debugText}>{this.state.errorInfo.componentStack}</Text>
                </View>
              )}

              <TouchableOpacity 
                style={styles.button}
                onPress={this.handleReset}
              >
                <Text style={styles.buttonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
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
    backgroundColor: colors.bgPrimary,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: typography.fontBold,
    fontSize: typography.xl,
    color: colors.textPrimary,
    marginBottom: spacing.base,
    textAlign: 'center',
  },
  messageBox: {
    backgroundColor: colors.danger + '10',
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
    borderRadius: 8,
    padding: spacing.base,
    marginBottom: spacing.lg,
  },
  errorMessage: {
    fontFamily: typography.fontRegular,
    fontSize: typography.sm,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  debugBox: {
    backgroundColor: colors.bgSubtle,
    borderRadius: 8,
    padding: spacing.base,
    marginBottom: spacing.lg,
    maxHeight: 200,
  },
  debugTitle: {
    fontFamily: typography.fontBold,
    fontSize: typography.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  debugText: {
    fontFamily: typography.fontMono,
    fontSize: typography.xs,
    color: colors.textMuted,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.base,
    marginTop: spacing.lg,
  },
  buttonText: {
    fontFamily: typography.fontBold,
    fontSize: typography.base,
    color: colors.textInverse,
    textAlign: 'center',
  },
});

export default ErrorBoundary;
