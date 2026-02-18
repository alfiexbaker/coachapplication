import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { PageHeader } from '@/components/primitives/page-header';
import { Row } from '@/components/primitives/row';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';

export default function TravelRadiusScreen() {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();

  const postcode = currentUser?.postcode ?? 'Not set';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader
        title="Travel Radius"
        showBack
        backIcon="arrow-back"
        onBackPress={() => router.back()}
        centerTitle
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={[styles.description, { color: palette.muted }]}>
          Set how far you're willing to travel for coaching sessions. Parents searching nearby will
          see you in their results.
        </ThemedText>

        <SurfaceCard style={styles.card}>
          <ThemedText type="defaultSemiBold">Your Location</ThemedText>
          <Row gap="sm" align="center">
            <Ionicons name="location" size={20} color={palette.tint} />
            <ThemedText>{postcode}</ThemedText>
          </Row>
        </SurfaceCard>

        <SurfaceCard style={styles.card}>
          <ThemedText type="defaultSemiBold">Travel Radius</ThemedText>
          <ThemedText style={{ color: palette.muted }}>
            Your current travel radius is set to your default location. Parents within this area will
            see you when searching for coaches.
          </ThemedText>
        </SurfaceCard>

        <SurfaceCard style={styles.card}>
          <Row gap="sm" align="flex-start">
            <Ionicons name="information-circle" size={20} color={palette.tint} />
            <ThemedText style={[styles.infoText, { color: palette.muted }]}>
              Advanced radius settings with map-based selection will be available in a future update.
              You can update your postcode from your profile settings.
            </ThemedText>
          </Row>
        </SurfaceCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  description: { ...Typography.body },
  card: { gap: Spacing.sm },
  infoText: { flex: 1, ...Typography.small },
});
