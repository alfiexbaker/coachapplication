import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import type { ReactNode } from 'react';

import { GroupChatSection } from '@/components/community/group-chat-section';
import { GroupManageTab } from '@/components/community/group-manage-tab';
import { GroupMembersModal } from '@/components/community/group-members-modal';
import { GroupRolePicker } from '@/components/community/group-role-picker';
import { GroupChatHeader } from '@/components/community/group-chat-header-sections';
import {
  ErrorState,
  EmptyState,
  SubmitProgressState,
} from '@/components/ui/screen-states';
import type { ParentGroup, GroupMessage, GroupMember, GroupMemberRole } from '@/constants/types';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useScreen } from '@/hooks/use-screen';
import { err, ok, serviceError } from '@/types/result';
import { useAuth } from '@/hooks/use-auth';
import { communityService } from '@/services/community-service';
import { communityGroupService } from '@/services/community/community-group-service';
import { ServiceEvents } from '@/services/event-bus';
import { createLogger } from '@/utils/logger';
import { Routes } from '@/navigation/routes';
import { uiFeedback } from '@/services/ui-feedback';
import { Skeleton, SkeletonCircle, SkeletonCluster, SkeletonPill, SkeletonText } from '@/components/ui/skeleton';
import { SurfaceCard } from '@/components/primitives/surface-card';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('GroupChatScreen');

interface GroupChatData {
  group: ParentGroup | null;
  messages: GroupMessage[];
}

function GroupChatSkeleton({
  borderColor,
  showManageChrome,
}: {
  borderColor: string;
  showManageChrome: boolean;
}) {
  return (
    <>
      <Row style={[styles.loadingHeader, { borderBottomColor: borderColor }]}>
        <Skeleton width={24} height={24} accessibilityLabel="Loading back button" />
        <View style={styles.loadingHeaderCopy}>
          <Skeleton width="40%" height={18} accessibilityLabel="Loading group name" />
          <Skeleton width="76%" height={12} accessibilityLabel="Loading group members" />
        </View>
        <SkeletonCircle size={28} accessibilityLabel="Loading group action" />
      </Row>

      <View style={styles.loadingBody}>
        {showManageChrome ? (
          <>
            <Row gap="xs" style={styles.loadingTabBar}>
              <SkeletonPill width={72} accessibilityLabel="Loading chat tab" />
              <SkeletonPill width={84} accessibilityLabel="Loading manage tab" />
            </Row>

            <SurfaceCard style={styles.loadingSummaryCard}>
              <SkeletonCluster gap={Spacing.sm} accessibilityLabel="Loading group summary">
                <Skeleton width="32%" height={16} accessibilityLabel="Loading group summary heading" />
                <SkeletonText
                  lines={3}
                  widths={['100%', '84%', '66%']}
                  accessibilityLabel="Loading group summary copy"
                />
              </SkeletonCluster>
            </SurfaceCard>
          </>
        ) : null}

        {Array.from({ length: 4 }).map((_, index) => (
          <Row
            key={index}
            style={[
              styles.loadingMessageRow,
              index % 3 === 2 ? styles.loadingOwnMessageRow : styles.loadingOtherMessageRow,
            ]}
          >
            {index % 3 === 2 ? null : (
              <SkeletonCircle size={36} accessibilityLabel={`Loading group avatar ${index + 1}`} />
            )}
            <View
              style={[
                styles.loadingMessageBubble,
                index % 3 === 2
                  ? styles.loadingOwnMessageBubble
                  : styles.loadingOtherMessageBubble,
              ]}
            >
              {index % 3 === 2 ? (
                <SkeletonText
                  lines={2}
                  widths={['68%', '100%']}
                  accessibilityLabel={`Loading own group message ${index + 1}`}
                />
              ) : (
                <SkeletonText
                  lines={3}
                  widths={['34%', '100%', '72%']}
                  accessibilityLabel={`Loading group message ${index + 1}`}
                />
              )}
            </View>
          </Row>
        ))}

        <SurfaceCard style={styles.loadingComposer}>
          <Row align="center" gap="sm">
            <View style={styles.flex}>
              <Skeleton height={44} radius={Radii.pill} accessibilityLabel="Loading message composer" />
            </View>
            <SkeletonCircle size={44} accessibilityLabel="Loading send button" />
          </Row>
        </SurfaceCard>
      </View>
    </>
  );
}

export default function GroupChatScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();
  const parentId = currentUser?.id ?? 'parent1';
  const parentName = currentUser?.fullName ?? currentUser?.name ?? 'Parent';

  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null);
  const [showRolePickerModal, setShowRolePickerModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'manage'>('chat');

  const loadData = async () => {
    if (!groupId) return ok<GroupChatData>({ group: null, messages: [] });

    try {
      const [groupResult, messagesResult] = await Promise.all([
        communityService.getGroup(groupId),
        communityService.getGroupMessages(groupId),
      ]);

      if (!groupResult.success) return err(groupResult.error);
      if (!messagesResult.success) return err(messagesResult.error);

      const markReadResult = await communityService.markMessagesRead(groupId, parentId);
      if (!markReadResult.success) {
        logger.warn('Failed to mark group messages as read', markReadResult.error);
      }

      return ok<GroupChatData>({ group: groupResult.data, messages: messagesResult.data });
    } catch (loadError) {
      logger.error('Failed to load group data:', loadError);
      return err(
        serviceError('UNKNOWN', 'Failed to load group data. Pull down to refresh.', loadError),
      );
    }
  };

  const {
    data,
    status,
    error,
    retry,
    pendingState,
    showLoadingState,
    showSectionSkeleton,
    hasRequestedTruthfulFrame,
    isPending,
  } = useScreen<GroupChatData>({
    load: loadData,
    deps: [groupId, parentId],
    events: [ServiceEvents.GROUP_MEMBER_JOINED, ServiceEvents.GROUP_MEMBER_ROLE_CHANGED],
    isEmpty: (value) => value.group === null,
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
    dataKey: groupId ?? null,
  });

  const group = data?.group ?? null;
  const messages = data?.messages ?? [];
  const isGroupChangePending =
    showSectionSkeleton &&
    pendingState.mode === 'dependency-change' &&
    !hasRequestedTruthfulFrame;
  const shouldShowGroupSkeleton = showLoadingState || isGroupChangePending;

  const handleSend = async () => {
    if (!inputValue.trim() || !groupId || sending) return;

    const messageText = inputValue.trim();
    setInputValue('');
    setSending(true);

    return await runAsyncTryCatchFinally(async () => {
      const sendResult = await communityService.sendGroupMessage(
        groupId,
        parentId,
        parentName,
        messageText,
      );
      if (!sendResult.success) {
        uiFeedback.showToast(sendResult.error.message, 'error');
        setInputValue(messageText);
        return;
      }
      retry();
    }, async sendError => {
      logger.error('Failed to send message:', sendError);
      uiFeedback.showToast('Could not send your message. Please try again.', 'error');
      setInputValue(messageText);
    }, () => {
      setSending(false);
    });
  };

  const handleLeaveGroup = () => {
    uiFeedback.alert('Leave Group', 'Are you sure you want to leave this group?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            if (!groupId) return;
            const leaveResult = await communityService.leaveGroup(groupId, parentId);
            if (!leaveResult.success) {
              uiFeedback.showToast(leaveResult.error.message, 'error');
              return;
            }
            router.back();
          } catch (leaveError) {
            uiFeedback.showToast(String(leaveError), 'error');
          }
        },
      },
    ]);
  };

  const currentMember = group?.members.find((member) => member.parentId === parentId);
  const currentRole = currentMember?.role ?? 'MEMBER';
  const isAdmin = currentRole === 'OWNER' || currentRole === 'ADMIN';
  const isCoachPrivileged =
    currentUser?.role === 'COACH' &&
    (currentRole === 'OWNER' || currentRole === 'ADMIN' || currentRole === 'MODERATOR');
  const canAccessManage = isAdmin || isCoachPrivileged;
  const assignableRoles = communityGroupService.getAssignableRoles(currentRole);
  const roleBreakdown = group ? communityGroupService.getRoleBreakdown(group.members) : null;

  const handleMemberManage = (member: GroupMember) => {
    if (member.parentId === parentId) return;
    setSelectedMember(member);
    setShowRolePickerModal(true);
  };

  const handleRoleChange = async (newRole: GroupMemberRole) => {
    if (!selectedMember || !groupId) return;
    try {
      const result = await communityService.changeMemberRole({
        groupId,
        requesterId: parentId,
        memberId: selectedMember.parentId,
        newRole,
      });
      if (!result.success) {
        uiFeedback.showToast(result.error.message, 'error');
        return;
      }
      setShowRolePickerModal(false);
      setSelectedMember(null);
      retry();
    } catch (changeError) {
      uiFeedback.showToast(String(changeError), 'error');
    }
  };

  const handleOpenSessionInvite = () => {
    router.push(Routes.SESSION_INVITES_GROUP);
  };

  const handleOpenClubInvite = () => {
    router.push(Routes.CLUB_INVITE_MEMBERS);
  };

  const handleOpenClubHub = () => {
    if (!group?.clubId) return;
    router.push(Routes.clubHub({ clubId: group.clubId }));
  };

  const renderStateShell = (content: ReactNode) => (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      {content}
    </SafeAreaView>
  );
  const renderMainShell = (content: ReactNode) => (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      {content}
    </SafeAreaView>
  );

  if (shouldShowGroupSkeleton) {
    return renderMainShell(
      <GroupChatSkeleton
        borderColor={palette.border}
        showManageChrome={false}
      />,
    );
  }

  if (status === 'error') {
    return renderStateShell(
      <ErrorState message={error?.message || 'Failed to load this group.'} onRetry={retry} />,
    );
  }

  if (status === 'empty' || !group) {
    return renderStateShell(
      <EmptyState
        icon="chatbubble-ellipses-outline"
        title="Group not found"
        message="This group could not be loaded."
        actionLabel="Go Back"
        onPressAction={() => router.back()}
      />,
    );
  }

  return renderMainShell(
    <>
      <GroupChatHeader
        colors={palette}
        group={group}
        roleBreakdown={roleBreakdown}
        onBack={() => router.back()}
        onInfoOrMembersPress={() => setShowMembersModal(true)}
        onLeavePress={handleLeaveGroup}
      />

      {isPending ? (
        <SubmitProgressState label="Refreshing group" style={styles.pendingState} />
      ) : null}

      {canAccessManage ? (
        <Row style={[styles.tabBar, { borderBottomColor: palette.border }]}>
          <Clickable
            onPress={() => setActiveTab('chat')}
            style={[
              styles.tabButton,
              activeTab === 'chat'
                ? { backgroundColor: palette.tint, borderColor: palette.tint }
                : { borderColor: palette.border, backgroundColor: palette.surface },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open chat tab"
          >
            <ThemedText
              style={[
                styles.tabLabel,
                { color: activeTab === 'chat' ? palette.onPrimary : palette.text },
              ]}
            >
              Chat
            </ThemedText>
          </Clickable>
          <Clickable
            onPress={() => setActiveTab('manage')}
            style={[
              styles.tabButton,
              activeTab === 'manage'
                ? { backgroundColor: palette.tint, borderColor: palette.tint }
                : { borderColor: palette.border, backgroundColor: palette.surface },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open manage tab"
          >
            <ThemedText
              style={[
                styles.tabLabel,
                { color: activeTab === 'manage' ? palette.onPrimary : palette.text },
              ]}
            >
              Manage
            </ThemedText>
          </Clickable>
        </Row>
      ) : null}

      {activeTab === 'manage' && canAccessManage ? (
        <GroupManageTab
          group={group}
          currentRole={currentRole}
          isCoach={currentUser?.role === 'COACH'}
          isAdmin={isAdmin}
          onManageMembers={() => setShowMembersModal(true)}
          onInviteToSession={handleOpenSessionInvite}
          onInviteMembers={handleOpenClubInvite}
          onOpenClub={handleOpenClubHub}
        />
      ) : (
        <GroupChatSection
          messages={messages}
          parentId={parentId}
          inputValue={inputValue}
          sending={sending}
          onInputChange={setInputValue}
          onSend={handleSend}
        />
      )}

      <GroupMembersModal
        visible={showMembersModal}
        onClose={() => setShowMembersModal(false)}
        members={group.members}
        parentId={parentId}
        currentRole={currentRole}
        isAdmin={isAdmin}
        onMemberManage={handleMemberManage}
      />

      <GroupRolePicker
        visible={showRolePickerModal}
        onClose={() => {
          setShowRolePickerModal(false);
          setSelectedMember(null);
        }}
        selectedMember={selectedMember}
        assignableRoles={assignableRoles}
        onRoleChange={handleRoleChange}
      />
    </>,
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  loadingHeader: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  loadingHeaderCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  loadingBody: {
    flex: 1,
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  loadingTabBar: {
    paddingBottom: Spacing.xs,
  },
  loadingSummaryCard: {
    gap: Spacing.sm,
  },
  loadingMessageRow: {
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  loadingOtherMessageRow: {
    alignSelf: 'flex-start',
  },
  loadingOwnMessageRow: {
    alignSelf: 'flex-end',
  },
  loadingMessageBubble: {
    borderRadius: Radii.card,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  loadingOtherMessageBubble: {
    flex: 1,
    maxWidth: '82%',
  },
  loadingOwnMessageBubble: {
    maxWidth: '70%',
    minWidth: '44%',
  },
  loadingComposer: {
    marginTop: 'auto',
  },
  pendingState: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  tabBar: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    ...Typography.smallSemiBold,
  },
});
