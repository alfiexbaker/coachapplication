import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { FadeInDown, FadeOut } from 'react-native-reanimated';

const DEFAULT_ENTER_DURATION = 260;
const DEFAULT_EXIT_DURATION = 180;
const STAGGER_STEP_MS = 40;

export function useResultsProgramMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) {
        setReduceMotion(enabled);
      }
    });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const getDelay = (index: number, start = 0) =>
    reduceMotion ? 0 : start + Math.min(index, 9) * STAGGER_STEP_MS;

  const getEnter = (index: number, start = 0) =>
    FadeInDown.duration(reduceMotion ? 0 : DEFAULT_ENTER_DURATION).delay(getDelay(index, start));

  const getExit = () => FadeOut.duration(reduceMotion ? 0 : DEFAULT_EXIT_DURATION);

  return {
    reduceMotion,
    getDelay,
    getEnter,
    getExit,
  };
}
