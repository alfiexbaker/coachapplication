/**
 * BlockUserModal — Confirmation modal for blocking a user.
 *
 * Explains what blocking does and provides Block / Cancel actions.
 */

import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { ModalStyles, ButtonStyles } from '@/constants/styles';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { blockService } from '@/services/block-service';
import { useAuth } from '@/hooks/use-auth';

interface BlockUserModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

export function BlockUserModal({
  visible,
  onClose,
  userId,
  userName,
}: BlockUserModalProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [blocking, setBlocking] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const handleBlock = async () => {
    if (!currentUser) return;

    setBlocking(true);
    try {
      await blockService.blockUser(currentUser.id, userId);
      setBlocked(true);
    } catch {
      // Silently handle — in production this would show an error toast
    } finally {
      setBlocking(false);
    }
  };

  const handleClose = () => {
    setBlocking(false);
    setBlocked(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={ModalStyles.overlayCenter}>
        <View style={[ModalStyles.containerCenter, { backgroundColor: palette.surface }]}>
          {blocked ? (
            /* Success state */
            <View style={styles.content}>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: `${palette.success}15` },
                ]}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={40}
                  color={palette.success}
                />
              </View>
              <ThemedText type="title" style={styles.title}>
                User Blocked
              </ThemedText>
              <ThemedText style={[styles.message, { color: palette.muted }]}>
                {userName} has been blocked. They will no longer be able to
                contact you or find you in search.
              </ThemedText>
              <Pressable
                style={[ButtonStyles.primary, ButtonStyles.fullWidth]}
                onPress={handleClose}
              >
                <ThemedText style={ButtonStyles.primaryText}>Done</ThemedText>
              </Pressable>
            </View>
          ) : (
            /* Confirmation state */
            <View style={styles.content}>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: `${palette.error}15` },
                ]}
              >
                <Ionicons
                  name="ban"
                  size={40}
                  color={palette.error}
                />
              </View>
              <ThemedText type="title" style={styles.title}>
                Block {userName}?
              </ThemedText>
              <ThemedText style={[styles.message, { color: palette.muted }]}>
                They won&apos;t be able to message you, send invites, or find you in
                search. You can unblock them later from your settings.
              </ThemedText>

              {/* Actions */}
              <View style={styles.actions}>
                <Pressable
                  style={[
                    ButtonStyles.primary,
                    styles.blockButton,
                    { backgroundColor: palette.error },
                  ]}
                  onPress={handleBlock}
                  disabled={blocking}
                >
                  {blocking ? (
                    <ActivityIndicator color={palette.surface} size="small" />
                  ) : (
                    <>
                      <Ionicons name="ban" size={18} color={palette.surface} />
                      <ThemedText style={ButtonStyles.primaryText}>
                        Block
                      </ThemedText>
                    </>
                  )}
                </Pressable>
                <Pressable
                  style={[ButtonStyles.secondary, styles.cancelButton]}
                  onPress={handleClose}
                  disabled={blocking}
                >
                  <ThemedText style={ButtonStyles.secondaryText}>
                    Cancel
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  actions: {
    width: '100%',
    gap: Spacing.xs,
  },
  blockButton: {
    flex: 0,
    width: '100%',
  },
  cancelButton: {
    flex: 0,
    width: '100%',
  },
});
