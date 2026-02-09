import { memo } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { PastSessionUser } from '@/hooks/use-club-invite';

interface InvitePastSessionsTabProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filteredUsers: PastSessionUser[];
  selectedUsers: Set<string>;
  onToggleUser: (userId: string) => void;
  onSelectAll: () => void;
}

export const InvitePastSessionsTab = memo(function InvitePastSessionsTab({
  searchQuery, onSearchChange, filteredUsers, selectedUsers, onToggleUser, onSelectAll,
}: InvitePastSessionsTabProps) {
  const { colors } = useTheme();

  return (
    <>
      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.muted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by name..."
          placeholderTextColor={colors.muted}
          value={searchQuery}
          onChangeText={onSearchChange}
        />
        {searchQuery ? (
          <Clickable accessibilityLabel="Clear search" onPress={() => onSearchChange('')}>
            <Ionicons name="close-circle" size={20} color={colors.muted} />
          </Clickable>
        ) : null}
      </View>

      {/* Select All */}
      {filteredUsers.length > 0 && (
        <Row align="center" justify="space-between" style={styles.selectAllRow}>
          <ThemedText style={{ color: colors.muted }}>
            {selectedUsers.size} of {filteredUsers.length} selected
          </ThemedText>
          <Clickable onPress={onSelectAll}>
            <ThemedText style={{ color: colors.tint, fontWeight: '600' }}>
              {selectedUsers.size === filteredUsers.length ? 'Deselect All' : 'Select All'}
            </ThemedText>
          </Clickable>
        </Row>
      )}

      {/* User List */}
      {filteredUsers.length === 0 ? (
        <SurfaceCard style={styles.emptyCard}>
          <Ionicons name="people-outline" size={48} color={colors.muted} />
          <ThemedText style={{ color: colors.muted, textAlign: 'center' }}>
            {searchQuery ? 'No users match your search' : 'No past session users found. Complete some sessions first!'}
          </ThemedText>
        </SurfaceCard>
      ) : (
        <View style={styles.userList}>
          {filteredUsers.map((user, index) => {
            const isSelected = selectedUsers.has(user.userId);
            return (
              <Animated.View key={user.userId} entering={FadeInDown.delay(index * 30).springify()}>
                <Clickable
                  style={[
                    styles.userRow,
                    { borderColor: isSelected ? colors.tint : colors.border, backgroundColor: isSelected ? withAlpha(colors.tint, 0.03) : colors.surface },
                  ]}
                  onPress={() => onToggleUser(user.userId)}
                >
                  <View style={styles.userLeft}>
                    <View style={[styles.checkbox, { borderColor: isSelected ? colors.tint : colors.border, backgroundColor: isSelected ? colors.tint : 'transparent' }]}>
                      {isSelected && <Ionicons name="checkmark" size={14} color={colors.onPrimary} />}
                    </View>
                    <View style={[styles.avatar, { backgroundColor: withAlpha(colors.tint, 0.12) }]}>
                      <ThemedText style={{ color: colors.tint, fontWeight: '600' }}>{user.userName.charAt(0)}</ThemedText>
                    </View>
                    <View style={styles.userInfo}>
                      <ThemedText type="defaultSemiBold">{user.userName}</ThemedText>
                      <Row gap="sm" align="center">
                        {user.isParent && user.childName && (
                          <ThemedText style={[Typography.caption, { color: colors.muted }]}>Parent of {user.childName}</ThemedText>
                        )}
                        <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                          {user.sessionCount} session{user.sessionCount !== 1 ? 's' : ''}
                        </ThemedText>
                      </Row>
                    </View>
                  </View>
                  <Row gap="xxs" align="center">
                    <Ionicons name="calendar-outline" size={14} color={colors.muted} />
                    <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                      {new Date(user.lastSessionDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                    </ThemedText>
                  </Row>
                </Clickable>
              </Animated.View>
            );
          })}
        </View>
      )}
    </>
  );
});

const styles = StyleSheet.create({
  searchContainer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.md, borderWidth: 1 },
  searchInput: { flex: 1, ...Typography.body, padding: 0 },
  selectAllRow: { paddingHorizontal: Spacing.xs },
  emptyCard: { alignItems: 'center', gap: Spacing.md, padding: Spacing.xl },
  userList: { gap: Spacing.sm },
  userRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1.5 },
  userLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  checkbox: { width: 22, height: 22, borderRadius: Radii.sm, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 40, height: 40, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  userInfo: { flex: 1, gap: Spacing.micro },
});
