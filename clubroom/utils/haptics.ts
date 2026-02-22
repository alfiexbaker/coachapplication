import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function canHaptic(): boolean {
  return Platform.OS !== 'web';
}

async function runImpact(style: Haptics.ImpactFeedbackStyle): Promise<void> {
  if (!canHaptic()) {
    return;
  }
  try {
    await Haptics.impactAsync(style);
  } catch {
    // No-op: haptics are non-critical feedback.
  }
}

async function runNotification(type: Haptics.NotificationFeedbackType): Promise<void> {
  if (!canHaptic()) {
    return;
  }
  try {
    await Haptics.notificationAsync(type);
  } catch {
    // No-op: haptics are non-critical feedback.
  }
}

export const HapticPatterns = {
  tap: async (): Promise<void> => runImpact(Haptics.ImpactFeedbackStyle.Light),
  flip: async (): Promise<void> => runImpact(Haptics.ImpactFeedbackStyle.Medium),
  longPress: async (): Promise<void> => runImpact(Haptics.ImpactFeedbackStyle.Heavy),
  success: async (): Promise<void> => runNotification(Haptics.NotificationFeedbackType.Success),
  error: async (): Promise<void> => runNotification(Haptics.NotificationFeedbackType.Error),
  milestone: async (): Promise<void> => {
    await runNotification(Haptics.NotificationFeedbackType.Success);
    await delay(160);
    await runImpact(Haptics.ImpactFeedbackStyle.Medium);
  },
  challengeComplete: async (): Promise<void> => {
    await runNotification(Haptics.NotificationFeedbackType.Success);
    await delay(100);
    await runNotification(Haptics.NotificationFeedbackType.Success);
  },
  levelUp: async (): Promise<void> => {
    await runImpact(Haptics.ImpactFeedbackStyle.Heavy);
    await delay(150);
    await runImpact(Haptics.ImpactFeedbackStyle.Heavy);
    await delay(150);
    await runImpact(Haptics.ImpactFeedbackStyle.Heavy);
  },
  feedbackSwipe: async (): Promise<void> => runImpact(Haptics.ImpactFeedbackStyle.Light),
  goalComplete: async (): Promise<void> => {
    await runNotification(Haptics.NotificationFeedbackType.Success);
    await delay(120);
    await runImpact(Haptics.ImpactFeedbackStyle.Medium);
  },
  counterComplete: async (): Promise<void> => runImpact(Haptics.ImpactFeedbackStyle.Light),
  storyPageAdvance: async (): Promise<void> => runImpact(Haptics.ImpactFeedbackStyle.Light),
  shareCapture: async (): Promise<void> => runNotification(Haptics.NotificationFeedbackType.Success),
  dailyChallengeComplete: async (): Promise<void> => {
    await runNotification(Haptics.NotificationFeedbackType.Success);
    await delay(80);
    await runImpact(Haptics.ImpactFeedbackStyle.Heavy);
  },
};
