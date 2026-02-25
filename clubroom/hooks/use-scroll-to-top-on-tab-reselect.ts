import { useEffect, type RefObject } from 'react';
import type { ScrollView, FlatList } from 'react-native';
import { useNavigation } from 'expo-router';

type ScrollableRef =
  | RefObject<ScrollView | null>
  | RefObject<FlatList<unknown> | null>;

export function useScrollToTopOnTabReselect(ref: ScrollableRef) {
  const navigation = useNavigation();

  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      const current = ref.current as
        | { scrollTo?: (options: { y: number; animated: boolean }) => void }
        | { scrollToOffset?: (options: { offset: number; animated: boolean }) => void }
        | null;
      current?.scrollTo?.({ y: 0, animated: true });
      current?.scrollToOffset?.({ offset: 0, animated: true });
    });

    return unsubscribe;
  }, [navigation, ref]);
}
