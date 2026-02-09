import React, { memo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

interface SquadQuickActionsProps {
  colors: ThemeColors;
  openingGroupChat: boolean;
  onGroupChat: () => void;
  onInvite: () => void;
}

export const SquadQuickActions = memo(function SquadQuickActions({
  colors, openingGroupChat, onGroupChat, onInvite,
}: SquadQuickActionsProps) {
  return (
    <View style={styles.container}>
      <Clickable
        style={[styles.chatBtn, { backgroundColor: withAlpha(colors.tint, 0.06), borderColor: colors.border }]}
        onPress={onGroupChat}
        disabled={openingGroupChat}
      >
        {openingGroupChat ? (
          <>
            <ActivityIndicator size="small" color={colors.tint} />
            <ThemedText style={[Typography.bodySemiBold, { color: colors.tint }]}>Opening...</ThemedText>
          </>
        ) : (
          <>
            <Ionicons name="chatbubbles-outline" size={18} color={colors.tint} />
            <ThemedText style={[Typography.bodySemiBold, { color: colors.tint }]}>Group Chat</ThemedText>
          </>
        )}
      </Clickable>
      <Clickable style={[styles.inviteBtn, { backgroundColor: colors.tint }]} onPress={onInvite}>
        <Ionicons name="paper-plane-outline" size={18} color={colors.surface} />
        <ThemedText style={[Typography.bodySemiBold, { color: colors.surface }]}>Send Squad Invite</ThemedText>
      </Clickable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  chatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, minHeight: 48, paddingVertical: Spacing.md, borderRadius: Radii.md, borderWidth: 1 },
  inviteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.md, borderRadius: Radii.md },
});
