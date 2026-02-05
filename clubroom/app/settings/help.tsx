import { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SettingsRow, SettingsSection } from '@/components/settings';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';

const logger = createLogger('HelpSettings');

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'How do I book a session?',
    answer: 'Navigate to the Discover tab, find a coach you like, and tap "Book Session". Follow the steps to select a date, time, and session type.',
  },
  {
    question: 'How do I cancel a booking?',
    answer: 'Go to your Bookings tab, find the session you want to cancel, and tap on it. Then select "Cancel Booking". Note that cancellation policies may apply.',
  },
  {
    question: 'How do I become a coach?',
    answer: 'To become a coach, sign up with a coach account and complete the verification process. This includes providing credentials and background check information.',
  },
  {
    question: 'How do payments work?',
    answer: 'Payments are processed securely through our platform. Parents pay when booking, and coaches receive payouts weekly to their connected bank account.',
  },
  {
    question: 'How do I update my availability?',
    answer: 'Coaches can update their availability by going to Settings > Availability. Set your weekly schedule and any one-off time blocks.',
  },
];

function FAQCard({ item, expanded, onToggle }: { item: FAQItem; expanded: boolean; onToggle: () => void }) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <SurfaceCard style={styles.faqCard} onPress={onToggle}>
      <View style={styles.faqHeader}>
        <ThemedText type="defaultSemiBold" style={styles.faqQuestion}>
          {item.question}
        </ThemedText>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={palette.muted}
        />
      </View>
      {expanded && (
        <ThemedText style={[styles.faqAnswer, { color: palette.muted }]}>
          {item.answer}
        </ThemedText>
      )}
    </SurfaceCard>
  );
}

export default function HelpSettingsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const handleContactSupport = () => {
    logger.press('ContactSupport');
    Alert.alert(
      'Contact Support',
      'How would you like to reach us?',
      [
        {
          text: 'Email',
          onPress: () => Linking.openURL('mailto:support@clubroom.app'),
        },
        {
          text: 'Live Chat',
          onPress: () => Alert.alert('Coming Soon', 'Live chat support coming soon!'),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleReportProblem = () => {
    logger.press('ReportProblem');
    router.push('/(tabs)/bookings/report-problem');
  };

  const handleSendFeedback = () => {
    logger.press('SendFeedback');
    Alert.alert(
      'Send Feedback',
      'Your feedback helps us improve Clubroom. What would you like to share?',
      [
        {
          text: 'Feature Request',
          onPress: () => Linking.openURL('mailto:feedback@clubroom.app?subject=Feature%20Request'),
        },
        {
          text: 'General Feedback',
          onPress: () => Linking.openURL('mailto:feedback@clubroom.app?subject=General%20Feedback'),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleRateApp = () => {
    logger.press('RateApp');
    Alert.alert(
      'Rate Clubroom',
      'Enjoying the app? We\'d love your rating on the App Store!',
      [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'Rate Now',
          onPress: () => {
            // In production, this would link to App Store
            Alert.alert('Thank You!', 'Thanks for rating Clubroom!');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <ThemedText type="title" style={styles.headerTitle}>
          Help & Support
        </ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Actions */}
        <SettingsSection title="Get Help">
          <SettingsRow
            icon="chatbubbles"
            iconColor={palette.success}
            title="Contact Support"
            subtitle="Chat with our support team"
            onPress={handleContactSupport}
          />
          <SettingsRow
            icon="flag"
            iconColor={palette.warning}
            title="Report a Problem"
            subtitle="Let us know about an issue"
            onPress={handleReportProblem}
          />
          <SettingsRow
            icon="bulb"
            title="Send Feedback"
            subtitle="Share your ideas and suggestions"
            onPress={handleSendFeedback}
          />
        </SettingsSection>

        {/* FAQ */}
        <View style={styles.faqSection}>
          <ThemedText style={[styles.sectionTitle, { color: palette.muted }]}>
            FREQUENTLY ASKED QUESTIONS
          </ThemedText>
          <View style={styles.faqList}>
            {FAQ_ITEMS.map((item, index) => (
              <FAQCard
                key={index}
                item={item}
                expanded={expandedFAQ === index}
                onToggle={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
              />
            ))}
          </View>
        </View>

        {/* Resources */}
        <SettingsSection title="Resources">
          <SettingsRow
            icon="book"
            title="Help Center"
            subtitle="Browse articles and guides"
            onPress={() => {
              logger.press('HelpCenter');
              Linking.openURL('https://help.clubroom.app');
            }}
          />
          <SettingsRow
            icon="videocam"
            title="Video Tutorials"
            subtitle="Learn how to use Clubroom"
            onPress={() => {
              logger.press('VideoTutorials');
              Alert.alert('Coming Soon', 'Video tutorials coming soon!');
            }}
          />
          <SettingsRow
            icon="newspaper"
            title="Community Forum"
            subtitle="Connect with other users"
            onPress={() => {
              logger.press('CommunityForum');
              Alert.alert('Coming Soon', 'Community forum coming soon!');
            }}
          />
        </SettingsSection>

        {/* Rate & Share */}
        <SettingsSection title="Support Us">
          <SettingsRow
            icon="star"
            iconColor={palette.warning}
            title="Rate Clubroom"
            subtitle="Share your experience on the App Store"
            onPress={handleRateApp}
          />
          <SettingsRow
            icon="share-social"
            title="Share Clubroom"
            subtitle="Invite friends to join"
            onPress={() => {
              logger.press('ShareApp');
              Alert.alert('Share', 'Share functionality coming soon!');
            }}
          />
        </SettingsSection>

        {/* Contact Info Card */}
        <SurfaceCard style={styles.contactCard}>
          <View style={[styles.contactIcon, { backgroundColor: `${palette.accent}15` }]}>
            <Ionicons name="mail" size={24} color={palette.accent} />
          </View>
          <View style={styles.contactInfo}>
            <ThemedText type="defaultSemiBold">Still need help?</ThemedText>
            <ThemedText style={[styles.contactText, { color: palette.muted }]}>
              Email us at support@clubroom.app
            </ThemedText>
            <ThemedText style={[styles.contactText, { color: palette.muted }]}>
              Response time: Within 24 hours
            </ThemedText>
          </View>
        </SurfaceCard>

        {/* Debug Info (for support) */}
        <View style={styles.debugInfo}>
          <ThemedText style={[styles.debugText, { color: palette.muted }]}>
            App Version: 1.0.0 | User ID: {currentUser?.id || 'N/A'}
          </ThemedText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    gap: Spacing.lg,
  },
  faqSection: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  faqList: {
    gap: Spacing.sm,
  },
  faqCard: {
    gap: Spacing.sm,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 20,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
    gap: 2,
  },
  contactText: {
    fontSize: 13,
  },
  debugInfo: {
    alignItems: 'center',
    paddingTop: Spacing.md,
  },
  debugText: {
    fontSize: 11,
  },
});
