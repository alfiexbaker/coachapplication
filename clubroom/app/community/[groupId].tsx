import { useState, useCallback } from 'react';
import { StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';

import { GroupChatSection } from '@/components/community/group-chat-section';
import { GroupMembersModal } from '@/components/community/group-members-modal';
import { GroupRolePicker } from '@/components/community/group-role-picker';
import { GroupChatHeader } from '@/components/community/group-chat-header-sections';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import type { ParentGroup, GroupMessage, GroupMember, GroupMemberRole } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { useScreen } from '@/hooks/use-screen';
import { err, ok, serviceError } from '@/types/result';
import { useAuth } from '@/hooks/use-auth';
import { communityService } from '@/services/community-service';
import { communityGroupService } from '@/services/community/community-group-service';
import { ServiceEvents } from '@/services/event-bus';
import { createLogger } from '@/utils/logger';

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
      return err(serviceError('UNKNOWN', 'Failed to load group data. Pull down to refresh.', loadError));
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
      const sendResult = await communityService.sendGroupMessage(groupId, parentId, parentName, messageText);
      if (!sendResult.success) {
        Alert.alert('Send Failed', sendResult.error.message);
        setInputValue(messageText);
        return;
      }
      onRefresh();
    } catch (sendError) {
      logger.error('Failed to send message:', sendError);
      Alert.alert('Send Failed', 'Could not send your message. Please try again.');
      setInputValue(messageText);
    } finally {
      setSending(false);
    }
  }, [groupId, inputValue, sending, parentId, parentName, onRefresh]);

  const handleLeaveGroup = useCallback(() => {
    Alert.alert('Leave Group', 'Are you sure you want to leave this group?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            if (!groupId) return;
            const leaveResult = await communityService.leaveGroup(groupId, parentId);
            if (!leaveResult.success) {
              Alert.alert('Error', leaveResult.error.message);
              return;
            }
            router.back();
          } catch (leaveError) {
            Alert.alert('Error', String(leaveError));
          }
        },
      },
    ]);
  }, [groupId, parentId]);

  const currentMember = group?.members.find((member) => member.parentId === parentId);
  const currentRole = currentMember?.role ?? 'MEMBER';
  const isAdmin = currentRole === 'OWNER' || currentRole === 'ADMIN';
  const assignableRoles = communityGroupService.getAssignableRoles(currentRole);
  const roleBreakdown = group ? communityGroupService.getRoleBreakdown(group.members) : null;

  const handleMemberManage = useCallback((member: GroupMember) => {
    if (member.parentId === parentId) return;
    setSelectedMember(member);
    setShowRolePickerModal(true);
  }, [parentId]);

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
          Alert.alert('Error', result.error.message);
          return;
        }
        setShowRolePickerModal(false);
        setSelectedMember(null);
        onRefresh();
      } catch (changeError) {
        Alert.alert('Error', String(changeError));
      }
    },
    [selectedMember, groupId, parentId, onRefresh]
  );

  if (status === 'loading') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <LoadingState variant="detail" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <ErrorState message={error?.message || 'Failed to load this group.'} onRetry={retry} />
      </SafeAreaView>
    );
  }

  if (status === 'empty' || !group) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <EmptyState
          icon="chatbubble-ellipses-outline"
          title="Group not found"
          message="This group could not be loaded."
          actionLabel="Go Back"
          onPressAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <GroupChatHeader
        colors={palette}
        group={group}
        roleBreakdown={roleBreakdown}
        onBack={() => router.back()}
        onInfoOrMembersPress={() => setShowMembersModal(true)}
        onLeavePress={handleLeaveGroup}
      />

      <GroupChatSection
        messages={messages}
        parentId={parentId}
        inputValue={inputValue}
        sending={sending}
        onInputChange={setInputValue}
        onSend={handleSend}
      />

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
