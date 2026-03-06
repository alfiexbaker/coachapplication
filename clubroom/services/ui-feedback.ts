import type { KeyboardTypeOptions } from 'react-native';

export type FeedbackTone = 'default' | 'success' | 'error' | 'warning';
export type FeedbackButtonStyle = 'default' | 'cancel' | 'destructive';

export interface FeedbackAlertButton {
  text?: string;
  onPress?: () => void;
  style?: FeedbackButtonStyle;
}

export interface FeedbackPromptButton {
  text?: string;
  onPress?: (value: string) => void;
  style?: FeedbackButtonStyle;
}

export interface FeedbackActionOption {
  id: string;
  label: string;
  destructive?: boolean;
}

type ToastPresenter = {
  showToast: (message: string, tone?: FeedbackTone) => void;
};

type AlertPresenter = {
  show: (title: string, message?: string, buttons?: FeedbackAlertButton[]) => void;
  confirm: (options: {
    title: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
  }) => Promise<boolean>;
};

type ActionSheetPresenter = {
  choose: (options: {
    title?: string;
    message?: string;
    options: FeedbackActionOption[];
    cancelText?: string;
  }) => Promise<string | null>;
};

type PromptPresenter = {
  promptText: (options: {
    title: string;
    message?: string;
    placeholder?: string;
    defaultValue?: string;
    confirmText?: string;
    cancelText?: string;
    keyboardType?: KeyboardTypeOptions;
  }) => Promise<string | null>;
};

let toastPresenter: ToastPresenter | null = null;
let alertPresenter: AlertPresenter | null = null;
let actionSheetPresenter: ActionSheetPresenter | null = null;
let promptPresenter: PromptPresenter | null = null;

function inferTone(title: string, message?: string): FeedbackTone {
  const haystack = `${title} ${message ?? ''}`.toLowerCase();

  if (
    /(error|failed|invalid|required|missing|unable|cannot|can't|not found|forbidden|denied)/.test(
      haystack,
    )
  ) {
    return 'error';
  }

  if (/(warning|deadline|expired|closed|permission)/.test(haystack)) {
    return 'warning';
  }

  if (/(success|saved|sent|created|updated|deleted|cancelled|confirmed|done|completed)/.test(haystack)) {
    return 'success';
  }

  return 'default';
}

function normalizeAlertButtons(buttons?: FeedbackAlertButton[]): FeedbackAlertButton[] {
  if (!buttons || buttons.length === 0) return [];
  return buttons.map((button, index) => ({
    text: button.text ?? (index === buttons.length - 1 ? 'OK' : `Option ${index + 1}`),
    onPress: button.onPress,
    style: button.style ?? 'default',
  }));
}

function findCancelButton(buttons: FeedbackAlertButton[]): FeedbackAlertButton | undefined {
  return (
    buttons.find((button) => button.style === 'cancel') ??
    buttons.find((button) => /cancel|close|keep/i.test(button.text ?? ''))
  );
}

function findPrimaryButton(buttons: FeedbackAlertButton[]): FeedbackAlertButton | undefined {
  const cancel = findCancelButton(buttons);
  const nonCancel = buttons.filter((button) => button !== cancel);
  return nonCancel[nonCancel.length - 1];
}

function fallbackLog(method: string): void {
  console.warn(`[uiFeedback] Presenter unavailable for ${method}.`);
}

export function registerToastPresenter(presenter: ToastPresenter): () => void {
  toastPresenter = presenter;
  return () => {
    if (toastPresenter === presenter) {
      toastPresenter = null;
    }
  };
}

export function registerAlertPresenter(presenter: AlertPresenter): () => void {
  alertPresenter = presenter;
  return () => {
    if (alertPresenter === presenter) {
      alertPresenter = null;
    }
  };
}

export function registerActionSheetPresenter(presenter: ActionSheetPresenter): () => void {
  actionSheetPresenter = presenter;
  return () => {
    if (actionSheetPresenter === presenter) {
      actionSheetPresenter = null;
    }
  };
}

export function registerPromptPresenter(presenter: PromptPresenter): () => void {
  promptPresenter = presenter;
  return () => {
    if (promptPresenter === presenter) {
      promptPresenter = null;
    }
  };
}

function showToastMessage(message: string, tone?: FeedbackTone): void {
  if (toastPresenter) {
    toastPresenter.showToast(message, tone);
    return;
  }
  fallbackLog('showToast');
}

async function showChooseDialog(
  title: string,
  message: string | undefined,
  buttons: FeedbackAlertButton[],
): Promise<void> {
  if (!actionSheetPresenter) {
    if (alertPresenter) {
      alertPresenter.show(title, message, buttons);
      return;
    }
    fallbackLog('choose');
    return;
  }

  const cancelButton = findCancelButton(buttons);
  const optionButtons = buttons.filter((button) => button !== cancelButton);
  const options = optionButtons.map((button, index) => ({
    id: String(index),
    label: button.text ?? `Option ${index + 1}`,
    destructive: button.style === 'destructive',
  }));

  const selected = await actionSheetPresenter.choose({
    title,
    message,
    options,
    cancelText: cancelButton?.text ?? 'Cancel',
  });

  if (selected === null) {
    cancelButton?.onPress?.();
    return;
  }

  const selectedIndex = Number.parseInt(selected, 10);
  const selectedButton = optionButtons[selectedIndex];
  selectedButton?.onPress?.();
}

export const uiFeedback = {
  showToast(message: string, tone: FeedbackTone = 'default'): void {
    showToastMessage(message, tone);
  },

  async confirm(options: {
    title: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
  }): Promise<boolean> {
    if (alertPresenter) {
      return alertPresenter.confirm(options);
    }

    if (actionSheetPresenter) {
      const selected = await actionSheetPresenter.choose({
        title: options.title,
        message: options.message,
        options: [
          {
            id: 'confirm',
            label: options.confirmText ?? 'Confirm',
            destructive: options.destructive,
          },
        ],
        cancelText: options.cancelText ?? 'Cancel',
      });
      return selected === 'confirm';
    }

    fallbackLog('confirm');
    return false;
  },

  async choose(options: {
    title?: string;
    message?: string;
    options: FeedbackActionOption[];
    cancelText?: string;
  }): Promise<string | null> {
    if (actionSheetPresenter) {
      return actionSheetPresenter.choose(options);
    }
    fallbackLog('choose');
    return null;
  },

  alert(
    title: string,
    message?: string,
    buttons?: FeedbackAlertButton[],
    _options?: { cancelable?: boolean; onDismiss?: () => void },
  ): void {
    const normalizedButtons = normalizeAlertButtons(buttons);

    if (normalizedButtons.length === 0) {
      showToastMessage(message ? `${title}: ${message}` : title, inferTone(title, message));
      return;
    }

    if (normalizedButtons.length === 1) {
      const [onlyButton] = normalizedButtons;
      if (!onlyButton.onPress && onlyButton.style !== 'destructive') {
        showToastMessage(message ? `${title}: ${message}` : title, inferTone(title, message));
        return;
      }
      if (alertPresenter) {
        alertPresenter.show(title, message, normalizedButtons);
        return;
      }
      fallbackLog('alert(single)');
      return;
    }

    if (normalizedButtons.length === 2) {
      const cancelButton = findCancelButton(normalizedButtons);
      const primaryButton = findPrimaryButton(normalizedButtons);

      if (cancelButton && primaryButton && alertPresenter) {
        void alertPresenter
          .confirm({
            title,
            message,
            cancelText: cancelButton.text ?? 'Cancel',
            confirmText: primaryButton.text ?? 'Confirm',
            destructive: primaryButton.style === 'destructive',
          })
          .then((confirmed) => {
            if (confirmed) {
              primaryButton.onPress?.();
            } else {
              cancelButton.onPress?.();
            }
          });
        return;
      }
    }

    void showChooseDialog(title, message, normalizedButtons);
  },

  prompt(
    title: string,
    message?: string,
    callbackOrButtons?: ((value: string) => void) | FeedbackPromptButton[],
    _type?: unknown,
    defaultValue?: string,
    keyboardType?: KeyboardTypeOptions,
  ): void {
    if (!promptPresenter) {
      fallbackLog('prompt');
      return;
    }

    const buttons: FeedbackPromptButton[] = Array.isArray(callbackOrButtons)
      ? callbackOrButtons
      : callbackOrButtons
        ? [{ text: 'OK', onPress: callbackOrButtons }]
        : [{ text: 'Cancel', style: 'cancel' }, { text: 'OK' }];

    const cancelButton =
      buttons.find((button) => button.style === 'cancel') ??
      buttons.find((button) => /cancel|close/i.test(button.text ?? ''));
    const submitButton = buttons.find((button) => button !== cancelButton) ?? buttons[buttons.length - 1];

    void promptPresenter
      .promptText({
        title,
        message,
        defaultValue,
        keyboardType,
        confirmText: submitButton?.text ?? 'OK',
        cancelText: cancelButton?.text ?? 'Cancel',
      })
      .then((value) => {
        if (value === null) {
          return;
        }
        submitButton?.onPress?.(value);
      });
  },
};
