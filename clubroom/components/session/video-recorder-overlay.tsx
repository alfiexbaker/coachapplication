import React, { useEffect, useRef, useState } from 'react';
import { Modal, Platform, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

import { runAsyncFinally, runAsyncTryCatchFinally } from '@/utils/async-control';

interface VideoRecorderOverlayProps {
  visible: boolean;
  mode: 'photo' | 'video';
  isRecording: boolean;
  secondsRemaining: number;
  onClose: () => void;
  onPhotoCaptured: (payload: { uri: string; width: number; height: number }) => Promise<void>;
  onVideoCaptured: (payload: { uri: string; duration: number }) => Promise<void>;
  onRecordingStateChange: (isRecording: boolean) => void;
  onSecondsRemainingChange: (seconds: number) => void;
}

interface CountdownTimerRef {
  current: ReturnType<typeof setInterval> | null;
}

function clearCountdownTimer(timerRef: CountdownTimerRef) {
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
}

export const VideoRecorderOverlay = function VideoRecorderOverlay({
  visible,
  mode,
  isRecording,
  secondsRemaining,
  onClose,
  onPhotoCaptured,
  onVideoCaptured,
  onRecordingStateChange,
  onSecondsRemainingChange,
}: VideoRecorderOverlayProps) {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const secondsRef = useRef(secondsRemaining);

  useEffect(() => {
    secondsRef.current = secondsRemaining;
  }, [secondsRemaining]);

  useEffect(() => {
    if (!visible || Platform.OS === 'web') {
      return;
    }
    if (!permission?.granted) {
      void requestPermission();
    }
  }, [permission?.granted, requestPermission, visible]);

  const clearCountdown = () => {
    clearCountdownTimer(timerRef);
  };

  const startCountdown = () => {
    onSecondsRemainingChange(10);
    secondsRef.current = 10;
    clearCountdown();
    timerRef.current = setInterval(() => {
      secondsRef.current = Math.max(0, secondsRef.current - 1);
      onSecondsRemainingChange(secondsRef.current);
      if (secondsRef.current <= 0) {
        clearCountdown();
      }
    }, 1000);
  };

  useEffect(() => {
    return () => {
      clearCountdownTimer(timerRef);
    };
  }, []);

  const handleClose = async () => {
    if (isRecording) {
      try {
        await cameraRef.current?.stopRecording();
      } catch {
        // no-op: recording may already be stopped
      }
    }
    clearCountdown();
    onRecordingStateChange(false);
    onSecondsRemainingChange(10);
    onClose();
  };

  const handleTakePhoto = async () => {
    const camera = cameraRef.current;
    if (!camera || isBusy) {
      return;
    }
    setIsBusy(true);

    await runAsyncTryCatchFinally(
      async () => {
        const photo = await camera.takePictureAsync({
          quality: 0.8,
          shutterSound: false,
        });
        await onPhotoCaptured({
          uri: photo.uri,
          width: photo.width,
          height: photo.height,
        });
      },
      async (error) => {
        onClose();
      },
      () => {
        setIsBusy(false);
      },
    );
  };

  const handleStartStopVideo = async () => {
    const camera = cameraRef.current;
    if (!camera || isBusy) {
      return;
    }

    if (isRecording) {
      setIsBusy(true);

      await runAsyncFinally(
        async () => {
          await camera.stopRecording();
        },
        () => {
          setIsBusy(false);
        },
      );

      return;
    }

    setIsBusy(true);
    onRecordingStateChange(true);
    startCountdown();

    return await runAsyncTryCatchFinally(
      async () => {
        const video = await camera.recordAsync({ maxDuration: 10 });
        if (!video?.uri) {
          onClose();
          return;
        }
        const duration = Math.max(0, 10 - secondsRef.current);
        await onVideoCaptured({
          uri: video.uri,
          duration,
        });
      },
      async (error) => {
        onClose();
      },
      () => {
        clearCountdown();
        onRecordingStateChange(false);
        onSecondsRemainingChange(10);
        setIsBusy(false);
      },
    );
  };

  if (Platform.OS === 'web') {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={() => void handleClose()}>
      <View style={[styles.container, { backgroundColor: colors.text }]}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          mode={mode === 'video' ? 'video' : 'picture'}
        />

        <View style={[styles.topBar, { backgroundColor: withAlpha(colors.text, 0.35) }]}>
          <Row align="center" justify="between">
            <ThemedText style={[styles.modeLabel, { color: colors.onPrimary }]}>
              {mode === 'video' ? 'Video' : 'Photo'}
            </ThemedText>
            {mode === 'video' ? (
              <ThemedText style={[styles.timer, { color: colors.onPrimary }]}>
                {Math.max(0, secondsRemaining)}s
              </ThemedText>
            ) : null}
          </Row>
        </View>

        {!permission?.granted ? (
          <View style={[styles.permissionCard, { backgroundColor: colors.background }]}>
            <Column gap="sm">
              <ThemedText style={styles.permissionTitle}>Camera access required</ThemedText>
              <Clickable
                style={[styles.permissionButton, { backgroundColor: colors.tint }]}
                onPress={() => {
                  void requestPermission();
                }}
                accessibilityLabel="Grant camera permission"
                accessibilityRole="button"
              >
                <ThemedText style={[styles.permissionButtonText, { color: colors.onPrimary }]}>
                  Grant permission
                </ThemedText>
              </Clickable>
            </Column>
          </View>
        ) : (
          <View style={styles.controls}>
            <Row align="center" justify="between">
              <Clickable
                style={[styles.controlButton, { backgroundColor: withAlpha(colors.text, 0.5) }]}
                onPress={() => void handleClose()}
                accessibilityLabel="Close camera"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={20} color={colors.onPrimary} />
              </Clickable>

              <Clickable
                style={[
                  styles.captureButton,
                  {
                    backgroundColor:
                      mode === 'video' && isRecording ? colors.error : colors.onPrimary,
                  },
                ]}
                onPress={() => {
                  if (mode === 'video') {
                    void handleStartStopVideo();
                    return;
                  }
                  void handleTakePhoto();
                }}
                disabled={isBusy}
                accessibilityLabel={mode === 'video' ? 'Start or stop recording' : 'Take photo'}
                accessibilityRole="button"
              >
                <Ionicons
                  name={mode === 'video' ? (isRecording ? 'stop' : 'videocam') : 'camera'}
                  size={24}
                  color={mode === 'video' && isRecording ? colors.onPrimary : colors.text}
                />
              </Clickable>

              <View style={styles.controlButtonSpacer} />
            </Row>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  modeLabel: {
    ...Typography.subheading,
  },
  timer: {
    ...Typography.subheading,
  },
  controls: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.md,
    right: Spacing.md,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonSpacer: {
    width: 44,
    height: 44,
  },
  permissionCard: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    bottom: Spacing['2xl'],
    borderRadius: Radii.lg,
    padding: Spacing.md,
  },
  permissionTitle: {
    ...Typography.subheading,
  },
  permissionButton: {
    minHeight: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  permissionButtonText: {
    ...Typography.bodySmallSemiBold,
  },
});
