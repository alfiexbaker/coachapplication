import { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { GroupChatSection } from '@/components/community/group-chat-section';
import { GroupMembersModal } from '@/components/community/group-members-modal';
import { GroupRolePicker } from '@/components/community/group-role-picker';
import { Spacing, Typography } from '@/constants/theme';
import type { ParentGroup, GroupMessage, GroupMember, GroupMemberRole } from '@/constants/types';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useAuth } from '@/hooks/use-auth';
import { communityService } from '@/services/community-service';
import { communityGroupService } from '@/services/community/community-group-service';
import { scaleFont } from '@/utils/scale';
import { createLogger } from '@/utils/logger';

const logger = createLogger('GroupChatScreen');

export default function GroupChatScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const { currentUser } = useAuth();
  const parentId = currentUser?.id ?? 'parent1';
  const parentName = currentUser?.fullName ?? currentUser?.name ?? 'Parent';

  const [group, setGroup] = useState<ParentGroup | undefined>();
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null);
  const [showRolePickerModal, setShowRolePickerModal] = useState(false);

  // -------------------------------------------------------------------------
  // Data loading
  // -------------------------------------------------------------------------

  const loadData = useCallback(async () => {
    if (!groupId) return;
    try {
      const [groupData, messagesData] = await Promise.all([
        communityService.getGroup(groupId),
        communityService.getGroupMessages(groupId),
      ]);
      setGroup(groupData);
      setMessages(messagesData);
      if (groupData) {
        await communityService.markMessagesRead(groupId, parentId);
      }
    } catch (error) {
      logger.error('Failed to load group data:', error);
    } finally {
      setLoading(false);
    }
  }, [groupId, parentId]);

  useEffect(() => { loadData(); }, [loadData]);

  // -------------------------------------------------------------------------
  // Send message
  // -------------------------------------------------------------------------

  const handleSend = async () => {
    if (!inputValue.trim() || !groupId || sending) return;
    const messageText = inputValue.trim();
    setInputValue('');
    setSending(true);
    try {
      await communityService.sendGroupMessage(groupId, parentId, parentName, messageText);
      await loadData();
    } catch (error) {
      logger.error('Failed to send message:', error);
      Alert.alert('Send Failed', 'Could not send your message. Please try again.');
      setInputValue(messageText);
    } finally {
      setSending(false);
    }
  };

  // -------------------------------------------------------------------------
  // Leave group
  // -------------------------------------------------------------------------

  const handleLeaveGroup = () => {
    Alert.alert('Leave Group', 'Are you sure you want to leave this group?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            if (!groupId) return;
            await communityService.leaveGroup(groupId, parentId);
            router.back();
          } catch (error) {
            Alert.alert('Error', String(error));
          }
        },
      },
    ]);
  };

  // -------------------------------------------------------------------------
  // Role management
  // -------------------------------------------------------------------------

  const currentMember = group?.members.find((m) => m.parentId === parentId);
  const currentRole = currentMember?.role ?? 'MEMBER';
  const isAdmin = currentRole === 'OWNER' || currentRole === 'ADMIN';
  const assignableRoles = communityGroupService.getAssignableRoles(currentRole);

  const roleBreakdown = group ? communityGroupService.getRoleBreakdown(group.members) : null;

  const renderRoleBreakdown = () => {
    if (!roleBreakdown) return '';
    const parts: string[] = [];
    if (roleBreakdown.OWNER > 0) parts.push(`${roleBreakdown.OWNER} Owner`);
    if (roleBreakdown.ADMIN > 0) parts.push(`${roleBreakdown.ADMIN} Admin${roleBreakdown.ADMIN > 1 ? 's' : ''}`);
    if (roleBreakdown.MODERATOR > 0) parts.push(`${roleBreakdown.MODERATOR} Mod${roleBreakdown.MODERATOR > 1 ? 's' : ''}`);
    if (roleBreakdown.MEMBER > 0) parts.push(`${roleBreakdown.MEMBER} Member${roleBreakdown.MEMBER > 1 ? 's' : ''}`);
    return parts.join(' / ');
  };

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
        Alert.alert('Error', result.error.message);
        return;
      }
      setShowRolePickerModal(false);
      setSelectedMember(null);
      await loadData();
    } catch (error) {
      Alert.alert('Error', String(error));
    }
  };

  // -------------------------------------------------------------------------
  // Loading / not-found states
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.loadingContainer}>
          <ThemedText style={{ color: palette.muted }}>Loading...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.loadingContainer}>
          <ThemedText>Group not found</ThemedText>
          <Clickable onPress={() => router.back()}>
            <ThemedText style={{ color: palette.tint }}>Go back</ThemedText>
          </Clickable>
        </View>
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <Row style={[styles.header, { borderBottomColor: palette.border }]}>
        <Clickable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <Clickable style={styles.headerInfo} onPress={() => setShowMembersModal(true)}>
          <ThemedText type="subtitle" style={styles.headerName}>
            {group.name}
          </ThemedText>
          <ThemedText style={[styles.headerSubtitle, { color: palette.muted }]}>
            {group.members.length} members{roleBreakdown ? ` \u00B7 ${renderRoleBreakdown()}` : ''}
          </ThemedText>
        </Clickable>
        {group.type === 'SQUAD' ? (
          <Clickable onPress={() => setShowMembersModal(true)} style={styles.moreButton}>
            <Ionicons name="information-circle-outline" size={22} color={palette.tint} />
          </Clickable>
        ) : (
          <Clickable onPress={handleLeaveGroup} style={styles.moreButton}>
            <Ionicons name="exit-outline" size={22} color={palette.error} />
          </Clickable>
        )}
      </Row>

      {/* Chat */}
      <GroupChatSection
        messages={messages}
        parentId={parentId}
        inputValue={inputValue}
        sending={sending}
        onInputChange={setInputValue}
        onSend={handleSend}
      />

      {/* Members modal */}
      <GroupMembersModal
        visible={showMembersModal}
        onClose={() => setShowMembersModal(false)}
        members={group.members}
        parentId={parentId}
        currentRole={currentRole}
        isAdmin={isAdmin}
        onMemberManage={handleMemberManage}
      />

      {/* Role picker modal */}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
    marginLeft: -Spacing.xs,
  },
  headerInfo: {
    flex: 1,
    gap: Spacing.micro,
  },
  headerName: {
    ...Typography.heading,
    fontSize: scaleFont(Typography.heading.fontSize),
  },
  headerSubtitle: {
    ...Typography.caption,
    fontSize: scaleFont(Typography.caption.fontSize),
  },
  moreButton: {
    padding: Spacing.xs,
  },
});
