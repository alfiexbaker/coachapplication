
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import { uiFeedback } from '@/services/ui-feedback';

export function useUnsavedChangesWarning(isDirty: boolean): void {
  const navigation = useNavigation();

  usePreventRemove(isDirty, ({ data }) => {
    const action = data?.action;
    uiFeedback.alert('Discard changes?', 'You have unsaved changes. Are you sure you want to leave?', [
      { text: 'Keep editing', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          if (action) {
            navigation.dispatch(action);
            return;
          }
          navigation.goBack();
        },
      },
    ]);
  });
}
