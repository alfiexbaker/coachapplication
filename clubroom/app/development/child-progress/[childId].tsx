/**
 * Child Progress Screen
 *
 * Parent view of child's development profile, radar chart,
 * feedback list, and badges — with tabbed navigation.
 *
 * For parents with 2+ children, shows a child switcher at the top
 * that defaults to the active child.
 */

import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ViewStyle,
  FlatList,
  type ListRenderItemInfo,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { PageHeader } from '@/components/primitives/page-header';
import { FeedbackList } from '@/components/progress';
import { SkillRadar } from '@/components/analytics/skill-radar';
import { ChildProgressStats } from '@/components/development/child-progress-stats';
import { ChildProgressBadgeList } from '@/components/development/child-progress-badge-list';
import { ChildSwitcher } from '@/components/family/child-switcher';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useChildProgress, PROGRESS_TABS, type ProgressTab } from '@/hooks/use-child-progress';
import {
  LoadingState,
  ErrorState,
  EmptyState,
  SubmitProgressState,
} from '@/components/ui/screen-states';
import { Routes } from '@/navigation/routes';
import type { FootballSkill } from '@/types/progress-types';
import { useRequiredParam } from '@/hooks/use-required-param';
import type { ThemeColors } from '@/hooks/useTheme';

export default function ChildProgressScreen() {
  const childIdParam = useRequiredParam('childId');
  const { colors } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const {
    status,
    error,
    refreshing,
    showLoadingState,
    child,
    childProfile,
    progress,
    feedback,
    badges,
    activeTab,
    setActiveTab,
    handleRefresh,
    getTrendInfo,
    retry,
    // Child switcher
    switcherChildren,
    selectedChildId,
    activeChildId,
    handleSelectChild,
  } = useChildProgress();
  const renderSwitcher = () =>
    switcherChildren.length > 1 ? (
      <View style={styles.switcherWrap}>
        <ChildSwitcher
          options={switcherChildren}
          selectedId={selectedChildId}
          onSelect={handleSelectChild}
          activeChildId={activeChildId}
        />
      </View>
    ) : null;
  const renderShell = ({
    header,
    showSwitcher = false,
    content,
  }: {
    header: ReactNode;
    showSwitcher?: boolean;
    content: ReactNode;
  }) => (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {header}
      {showSwitcher ? renderSwitcher() : null}
      {content}
    </View>
  );
  const progressHeader = (
    <PageHeader title="Progress" showBack centerTitle onBackPress={() => router.back()} />
  );

  if (!childIdParam.valid) {
    return renderShell({
      header: progressHeader,
      content: <ErrorState message="Invalid child progress link." onRetry={() => router.back()} />,
    });
  }

  if (showLoadingState) {
    return renderShell({
      header: progressHeader,
      showSwitcher: true,
      content: <LoadingState variant="detail" />,
    });
  }

  if (status === 'error') {
    return renderShell({
      header: progressHeader,
      showSwitcher: true,
      content: (
        <ErrorState message={error?.message ?? 'Failed to load child progress.'} onRetry={retry} />
      ),
    });
  }

  if (status === 'empty' || !child || !progress) {
    return renderShell({
      header: progressHeader,
      showSwitcher: true,
      content: (
        <EmptyState
          icon="person-outline"
          title="Child not found"
          message="We couldn't find this child profile."
        />
      ),
    });
  }

  const trend = getTrendInfo(colors);
  const handleEditChildProfile = () => {
    if (!selectedChildId) {
      return;
    }
    router.push(Routes.modalEditChildProfile(selectedChildId));
  };
  const progressTabItems = getProgressTabItems(activeTab, colors, setActiveTab);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title={child.name}
        showBack
        centerTitle
        onBackPress={() => router.back()}
        actionIcon="create-outline"
        onActionPress={handleEditChildProfile}
      />

      {/* Child Switcher — only for parents with 2+ children */}
      {renderSwitcher()}

      {/* Trend Badge */}
      <View style={styles.trendWrap}>
        <Row
          align="center"
          gap="xxs"
          style={[styles.trendBadge, { backgroundColor: withAlpha(trend.color, 0.09) }]}
        >
          <Ionicons
            name={trend.icon as keyof typeof Ionicons.glyphMap}
            size={12}
            color={trend.color}
          />
          <ThemedText style={[Typography.caption, { color: trend.color }]}>
            {trend.label}
          </ThemedText>
        </Row>
      </View>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <FlatList
          contentInsetAdjustmentBehavior="automatic"
          horizontal
          showsHorizontalScrollIndicator={false}
          data={progressTabItems}
          keyExtractor={keyProgressTabItem}
          renderItem={renderProgressTabItem}
          contentContainerStyle={styles.tabContent}
        />
      </View>
      {refreshing ? (
        <SubmitProgressState label="Refreshing progress" style={styles.pendingState} />
      ) : null}

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {activeTab === 'profile' && (
          <View style={styles.tabSection}>
            <View style={styles.sectionHeader}>
              <ThemedText type="heading">Child Profile</ThemedText>
              <ThemedText style={[Typography.small, { color: colors.muted }]}>
                Details used for coaching, safety, and bookings
              </ThemedText>
            </View>

            <SurfaceCard style={styles.profileCard}>
              <ThemedText type="defaultSemiBold">Basic</ThemedText>
              <ThemedText style={[styles.profileLine, { color: colors.muted }]}>
                Full name:{' '}
                {childProfile ? `${childProfile.firstName} ${childProfile.lastName}` : child.name}
              </ThemedText>
              {!!childProfile?.nickname && (
                <ThemedText style={[styles.profileLine, { color: colors.muted }]}>
                  Nickname: {childProfile.nickname}
                </ThemedText>
              )}
              {!!childProfile?.dateOfBirth && (
                <ThemedText style={[styles.profileLine, { color: colors.muted }]}>
                  DOB: {childProfile.dateOfBirth}
                </ThemedText>
              )}
              {!!childProfile?.relationship && (
                <ThemedText style={[styles.profileLine, { color: colors.muted }]}>
                  Relationship: {childProfile.relationship}
                </ThemedText>
              )}
            </SurfaceCard>

            <SurfaceCard style={styles.profileCard}>
              <ThemedText type="defaultSemiBold">Medical & Support</ThemedText>
              <ThemedText style={[styles.profileLine, { color: colors.muted }]}>
                Allergies:{' '}
                {childProfile?.allergies.length ? childProfile.allergies.join(', ') : 'None'}
              </ThemedText>
              <ThemedText style={[styles.profileLine, { color: colors.muted }]}>
                Conditions:{' '}
                {childProfile?.medicalConditions.length
                  ? childProfile.medicalConditions.join(', ')
                  : 'None'}
              </ThemedText>
              <ThemedText style={[styles.profileLine, { color: colors.muted }]}>
                Medications:{' '}
                {childProfile?.medications.length ? childProfile.medications.join(', ') : 'None'}
              </ThemedText>
              <ThemedText style={[styles.profileLine, { color: colors.muted }]}>
                SEN: {childProfile?.hasSpecialNeeds ? 'Yes' : 'No'}
              </ThemedText>
            </SurfaceCard>

            <SurfaceCard style={styles.profileCard}>
              <ThemedText type="defaultSemiBold">Emergency</ThemedText>
              <ThemedText style={[styles.profileLine, { color: colors.muted }]}>
                Primary: {childProfile?.emergencyContactName || '--'} (
                {childProfile?.emergencyContactRelation || '--'})
              </ThemedText>
              <ThemedText style={[styles.profileLine, { color: colors.muted }]}>
                Phone: {childProfile?.emergencyContactPhone || '--'}
              </ThemedText>
              {!!childProfile?.secondaryEmergencyName && (
                <ThemedText style={[styles.profileLine, { color: colors.muted }]}>
                  Secondary: {childProfile.secondaryEmergencyName} (
                  {childProfile.secondaryEmergencyPhone || '--'})
                </ThemedText>
              )}
            </SurfaceCard>

            <SurfaceCard style={styles.profileCard}>
              <ThemedText type="defaultSemiBold">Coach Notes</ThemedText>
              <ThemedText style={[styles.profileLine, { color: colors.muted }]}>
                Communication:{' '}
                {childProfile?.communicationNotes?.trim() || 'No communication notes yet.'}
              </ThemedText>
              <ThemedText style={[styles.profileLine, { color: colors.muted }]}>
                Behavioral: {childProfile?.behavioralNotes?.trim() || 'No behavioral notes yet.'}
              </ThemedText>
            </SurfaceCard>

            <Row gap="sm">
              <Clickable
                onPress={handleEditChildProfile}
                style={[styles.profileAction, { backgroundColor: colors.tint }]}
              >
                <ThemedText style={[Typography.bodySmallSemiBold, { color: colors.onPrimary }]}>
                  Edit Profile Details
                </ThemedText>
              </Clickable>
              <Clickable
                onPress={() =>
                  selectedChildId && router.push(Routes.modalEditChildSen(selectedChildId))
                }
                style={[
                  styles.profileAction,
                  { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
                ]}
              >
                <ThemedText style={[Typography.bodySmallSemiBold, { color: colors.text }]}>
                  Edit SEN Details
                </ThemedText>
              </Clickable>
            </Row>
            <Row gap="sm">
              <Clickable
                onPress={() => router.push(Routes.HEALTH)}
                style={[
                  styles.profileAction,
                  { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
                ]}
              >
                <ThemedText style={[Typography.bodySmallSemiBold, { color: colors.text }]}>
                  Health Log
                </ThemedText>
              </Clickable>
              <Clickable
                onPress={() => selectedChildId && router.push(Routes.childMedical(selectedChildId))}
                style={[
                  styles.profileAction,
                  { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
                ]}
              >
                <ThemedText style={[Typography.bodySmallSemiBold, { color: colors.text }]}>
                  Medical Details
                </ThemedText>
              </Clickable>
              <Clickable
                onPress={() =>
                  selectedChildId && router.push(Routes.childEmergency(selectedChildId))
                }
                style={[
                  styles.profileAction,
                  { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
                ]}
              >
                <ThemedText style={[Typography.bodySmallSemiBold, { color: colors.text }]}>
                  Emergency Contacts
                </ThemedText>
              </Clickable>
            </Row>
          </View>
        )}

        {activeTab === 'feedback' && (
          <View style={styles.tabSection}>
            <View style={styles.sectionHeader}>
              <ThemedText type="heading">Session Feedback</ThemedText>
              <ThemedText style={[Typography.small, { color: colors.muted }]}>
                Notes from coaches after each session
              </ThemedText>
            </View>
            <FeedbackList
              feedback={feedback}
              showCoachName
              emptyMessage="No session feedback yet. Coaches will provide feedback after sessions."
            />
          </View>
        )}

        {activeTab === 'radar' && (
          <View style={styles.tabSection}>
            <View style={styles.sectionHeader}>
              <ThemedText type="heading">Skills Radar</ThemedText>
              <ThemedText style={[Typography.small, { color: colors.muted }]}>
                Visual breakdown of skill levels
              </ThemedText>
            </View>
            {progress.skills?.length > 0 ? (
              <SkillRadar
                skills={progress.skills.map((s) => ({
                  skillName: s.skill as FootballSkill,
                  category: '',
                  currentLevel: s.level,
                  previousLevel: s.previousLevel ?? s.level,
                  changePercent: 0,
                  history: s.history.map((h) => ({ date: h.date, level: h.level })),
                }))}
                showDetailedList
              />
            ) : (
              <SurfaceCard style={styles.emptyCard}>
                <Ionicons name="stats-chart-outline" size={32} color={colors.muted} />
                <ThemedText style={[Typography.bodySemiBold, { color: colors.muted }]}>
                  No skill data yet
                </ThemedText>
                <ThemedText
                  style={[Typography.small, { color: colors.muted, textAlign: 'center' }]}
                >
                  Skills radar will appear once coaches rate skills
                </ThemedText>
              </SurfaceCard>
            )}
          </View>
        )}

        {activeTab === 'badges' && (
          <View style={styles.tabSection}>
            <View style={styles.sectionHeader}>
              <ThemedText type="heading">Badges & Achievements</ThemedText>
              <ThemedText style={[Typography.small, { color: colors.muted }]}>
                {badges.length} badge{badges.length !== 1 ? 's' : ''} earned
              </ThemedText>
            </View>
            {badges.length > 0 ? (
              <ChildProgressBadgeList badges={badges} colors={colors} />
            ) : (
              <SurfaceCard style={styles.emptyCard}>
                <Ionicons name="ribbon-outline" size={32} color={colors.muted} />
                <ThemedText style={[Typography.bodySemiBold, { color: colors.muted }]}>
                  No badges earned yet
                </ThemedText>
                <ThemedText
                  style={[Typography.small, { color: colors.muted, textAlign: 'center' }]}
                >
                  Coaches award badges for achievements and milestones
                </ThemedText>
              </SurfaceCard>
            )}
          </View>
        )}

        <ChildProgressStats
          totalSessions={progress.totalSessions}
          averagePerformance={progress.averagePerformance}
          badgeCount={badges.length}
        />
      </ScrollView>
    </View>
  );
}

type ProgressTabDefinition = (typeof PROGRESS_TABS)[number];

interface ProgressTabItem {
  key: ProgressTab;
  tab: ProgressTabDefinition;
  isActive: boolean;
  colors: ThemeColors;
  onPress: () => void;
}

function getProgressTabItems(
  activeTab: ProgressTab,
  colors: ThemeColors,
  onSelectTab: (tabId: ProgressTab) => void,
): ProgressTabItem[] {
  return PROGRESS_TABS.map((tab) => ({
    key: tab.id,
    tab,
    isActive: activeTab === tab.id,
    colors,
    onPress: () => onSelectTab(tab.id),
  }));
}

function keyProgressTabItem(item: ProgressTabItem): string {
  return item.key;
}

function renderProgressTabItem({ item }: ListRenderItemInfo<ProgressTabItem>) {
  return (
    <Clickable
      onPress={item.onPress}
      style={
        [
          styles.tab,
          item.isActive ? { borderBottomColor: item.colors.tint, borderBottomWidth: 2 } : undefined,
        ].filter(Boolean) as ViewStyle[]
      }
    >
      <Row align="center" gap="xxs">
        <Ionicons
          name={item.tab.icon as keyof typeof Ionicons.glyphMap}
          size={18}
          color={item.isActive ? item.colors.tint : item.colors.muted}
        />
        <ThemedText
          style={[
            Typography.smallSemiBold,
            { color: item.isActive ? item.colors.tint : item.colors.muted },
          ]}
        >
          {item.tab.label}
        </ThemedText>
      </Row>
    </Clickable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  switcherWrap: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  trendWrap: {
    alignItems: 'center',
    paddingTop: Spacing.xxs,
    paddingBottom: Spacing.xs,
  },
  trendBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  tabBar: { borderBottomWidth: 1 },
  tabContent: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
  tab: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm, marginBottom: -1 },
  pendingState: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
  },
  content: { padding: Spacing.md, gap: Spacing.lg, paddingBottom: Spacing['2xl'] },
  tabSection: { gap: Spacing.sm },
  sectionHeader: { gap: Spacing.xxs, marginBottom: Spacing.sm },
  profileCard: { gap: Spacing.xs },
  profileLine: { ...Typography.small },
  profileAction: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  emptyCard: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.sm },
});
