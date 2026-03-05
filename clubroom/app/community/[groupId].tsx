import { useState, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import type { ReactNode } from 'react';

import { GroupChatSection } from '@/components/community/group-chat-section';
import { GroupManageTab } from '@/components/community/group-manage-tab';
import { GroupMembersModal } from '@/components/community/group-members-modal';
import { GroupRolePicker } from '@/components/community/group-role-picker';
import { GroupChatHeader } from '@/components/community/group-chat-header-sections';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
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

const logger = createLogger('GroupChatScreen');

interface GroupChatData {
  group: ParentGroup | null;
  messages: GroupMessage[];
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

  const loadData = useCallback(async () => {
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
  }, [groupId, parentId]);

  const { data, status, error, onRefresh, retry } = useScreen<GroupChatData>({
    load: loadData,
    deps: [groupId, parentId],
    events: [ServiceEvents.GROUP_MEMBER_JOINED, ServiceEvents.GROUP_MEMBER_ROLE_CHANGED],
    isEmpty: (value) => value.group === null,
    refetchOnFocus: true,
  });

  const group = data?.group ?? null;
  const messages = data?.messages ?? [];

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || !groupId || sending) return;

    const messageText = inputValue.trim();
    setInputValue('');
    setSending(true);
    try {
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
      onRefresh();
    } catch (sendError) {
      logger.error('Failed to send message:', sendError);
      uiFeedback.showToast('Could not send your message. Please try again.', 'error');
      setInputValue(messageText);
    } finally {
      setSending(false);
    }
  }, [groupId, inputValue, sending, parentId, parentName, onRefresh]);

  const handleLeaveGroup = useCallback(() => {
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
  }, [groupId, parentId]);

  const currentMember = group?.members.find((member) => member.parentId === parentId);
  const currentRole = currentMember?.role ?? 'MEMBER';
  const isAdmin = currentRole === 'OWNER' || currentRole === 'ADMIN';
  const isCoachPrivileged =
    currentUser?.role === 'COACH' &&
    (currentRole === 'OWNER' || currentRole === 'ADMIN' || currentRole === 'MODERATOR');
  const canAccessManage = isAdmin || isCoachPrivileged;
  const assignableRoles = communityGroupService.getAssignableRoles(currentRole);
  const roleBreakdown = group ? communityGroupService.getRoleBreakdown(group.members) : null;

  const handleMemberManage = useCallback(
    (member: GroupMember) => {
      if (member.parentId === parentId) return;
      setSelectedMember(member);
      setShowRolePickerModal(true);
    },
    [parentId],
  );

  const handleRoleChange = useCallback(
    async (newRole: GroupMemberRole) => {
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
        onRefresh();
      } catch (changeError) {
        uiFeedback.showToast(String(changeError), 'error');
      }
    },
    [selectedMember, groupId, parentId, onRefresh],
  );

  const handleOpenSessionInvite = useCallback(() => {
    router.push(Routes.SESSION_INVITES_GROUP);
  }, []);

  const handleOpenClubInvite = useCallback(() => {
    router.push(Routes.CLUB_INVITE_MEMBERS);
  }, []);

  const handleOpenClubHub = useCallback(() => {
    if (!group?.clubId) return;
    router.push(Routes.clubHub({ clubId: group.clubId }));
  }, [group?.clubId]);

  const handleOpenManageHub = useCallback(() => {
    router.push(Routes.MANAGE);
  }, []);
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

  if (status === 'loading') {
    return renderStateShell(<LoadingState variant="detail" />);
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
          onOpenManageHub={handleOpenManageHub}
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
