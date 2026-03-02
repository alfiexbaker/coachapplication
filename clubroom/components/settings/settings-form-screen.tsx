import { useEffect, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';

import { PageHeader } from '@/components/primitives/page-header';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Routes } from '@/navigation/routes';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SettingsFormScreen');

interface SettingsFormScreenProps {
  title: string;
  infoText?: string;
  children: ReactNode;
}

export function SettingsFormScreen({ title, infoText, children }: SettingsFormScreenProps) {
  const { colors: palette } = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    logger.debug('Settings screen entry', {
      title,
      pathname,
      canGoBack: router.canGoBack(),
    });
  }, [pathname, title]);

  const handleBackPress = () => {
    logger.info('Settings back pressed', {
      title,
      pathname,
      canGoBack: router.canGoBack(),
    });

    if (router.canGoBack()) {
      router.back();
      return;
    }

    logger.warn('Settings back had no history; fallback to home', { title, pathname });
    router.replace(Routes.HOME);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader
        title={title}
        showBack
        backIcon="arrow-back"
        onBackPress={handleBackPress}
        centerTitle
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {children}
        {infoText ? (
          <View style={styles.infoContainer}>
            <ThemedText style={[styles.infoText, { color: palette.muted }]}>{infoText}</ThemedText>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    gap: Spacing.lg,
  },
  infoContainer: {
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.sm,
  },
  infoText: {
    ...Typography.small,
    textAlign: 'center',
  },
});
