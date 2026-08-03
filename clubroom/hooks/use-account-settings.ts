import { useEffect, useMemo, useState } from 'react';

import { apiClient } from '@/services/api-client';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';
import { uiFeedback } from '@/services/ui-feedback';
import { authService } from '@/services/auth-service';
import { dataDeletionRequestService, type DataDeletionRequest } from '@/services/trust';
import { buildMailtoUrl, openExternalUrl } from '@/utils/external-url';
import { formatSupportRef } from '@/utils/support-ref';

const logger = createLogger('useAccountSettings');
const SUPPORT_EMAIL = 'support@clubroom.app';

type DeletionRequestStatus = 'idle' | 'loading' | 'submitting';

function formatRequestDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function useAccountSettings() {
  const { currentUser } = useAuth();
  const persistedPhone = (currentUser as unknown as Record<string, string>)?.phone || '';

  const [editingPhone, setEditingPhoneState] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState(persistedPhone);
  const [savingPhone, setSavingPhone] = useState(false);
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);
  const [dataDeletionRequests, setDataDeletionRequests] = useState<DataDeletionRequest[]>([]);
  const [deletionRequestStatus, setDeletionRequestStatus] = useState<DeletionRequestStatus>('idle');
  const [deletionRequestError, setDeletionRequestError] = useState<string | null>(null);

  useEffect(() => {
    if (apiClient.isMockMode || !currentUser?.id) {
      setDataDeletionRequests([]);
      setDeletionRequestError(null);
      setDeletionRequestStatus('idle');
      return;
    }

    let active = true;
    setDeletionRequestStatus('loading');
    setDeletionRequestError(null);
    void dataDeletionRequestService
      .listSelfRequests()
      .then((result) => {
        if (!active) return;
        if (result.success) {
          setDataDeletionRequests(result.data);
          setDeletionRequestError(null);
        } else {
          setDeletionRequestError(result.error.message);
        }
        setDeletionRequestStatus('idle');
      })
      .catch((error: unknown) => {
        if (!active) return;
        logger.error('Account closure status lookup rejected', error);
        setDeletionRequestError('Account closure status is unavailable.');
        setDeletionRequestStatus('idle');
      });

    return () => {
      active = false;
    };
  }, [currentUser?.id]);

  const setEditingPhone = (editing: boolean) => {
    if (editing) {
      setPhoneDraft(persistedPhone);
    }
    setEditingPhoneState(editing);
  };

  const pendingDataDeletionRequest = useMemo(
    () =>
      dataDeletionRequests.find(
        (request) => request.status === 'PENDING' && !request.cancelledAt,
      ) ?? null,
    [dataDeletionRequests],
  );

  const accountClosureSubtitle = useMemo(() => {
    if (apiClient.isMockMode) {
      return 'Opens an email to support';
    }
    if (deletionRequestStatus === 'loading') {
      return 'Checking status…';
    }
    if (deletionRequestStatus === 'submitting') {
      return 'Creating request…';
    }
    if (pendingDataDeletionRequest) {
      const requested = formatRequestDate(pendingDataDeletionRequest.requestedAt);
      const scheduled = formatRequestDate(pendingDataDeletionRequest.scheduledDeletionAt);
      if (requested && scheduled) {
        return `Requested ${requested}. Review ends ${scheduled}.`;
      }
      if (requested) {
        return `Pending since ${requested}.`;
      }
      return 'Closure request pending';
    }
    if (deletionRequestError) {
      return 'Status unavailable. Try again.';
    }
    return 'Starts a review period before deletion';
  }, [deletionRequestError, deletionRequestStatus, pendingDataDeletionRequest]);

  const handleSavePhone = async () => {
    if (!currentUser?.id || savingPhone) return;

    logger.press('SavePhone');
    const nextPhone = phoneDraft.trim();
    setSavingPhone(true);
    await authService
      .updateProfile({ phone: nextPhone })
      .then((result) => {
        if (!result.success) {
          uiFeedback.showToast(result.error.message, 'error');
          return;
        }
        setPhoneDraft(result.data.user.phone || '');
        setEditingPhoneState(false);
        uiFeedback.showToast('Phone number saved.', 'success');
      })
      .catch((error: unknown) => {
        logger.error('Phone update rejected', error);
        uiFeedback.showToast('Phone number was not saved. Try again.', 'error');
      })
      .finally(() => setSavingPhone(false));
  };

  const handleSendPasswordReset = async () => {
    if (!currentUser?.email || sendingPasswordReset) return;

    logger.press('SendPasswordReset');
    setSendingPasswordReset(true);
    await authService
      .forgotPassword(currentUser.email)
      .then((result) => {
        if (!result.success) {
          uiFeedback.showToast(result.error.message, 'error');
          return;
        }
        uiFeedback.showToast('Password reset link sent.', 'success');
      })
      .catch((error: unknown) => {
        logger.error('Password reset request rejected', error);
        uiFeedback.showToast('Password reset link was not sent. Try again.', 'error');
      })
      .finally(() => setSendingPasswordReset(false));
  };

  const handleRequestLifecycleSupport = (mode: 'pause' | 'close') => {
    const subject =
      mode === 'pause' ? 'Clubroom account pause request' : 'Clubroom account closure request';
    const intro =
      mode === 'pause'
        ? 'I would like support to pause my Clubroom account.'
        : 'I would like support to close my Clubroom account.';
    const body = [
      intro,
      '',
      `Support ref: ${formatSupportRef(currentUser?.id)}`,
      `Email on file: ${currentUser?.email || 'not set'}`,
    ].join('\n');

    void openExternalUrl(
      buildMailtoUrl(SUPPORT_EMAIL, {
        subject,
        body,
      }),
      'Could not open your email app right now.',
    );
  };

  const requestAccountClosure = async () => {
    if (pendingDataDeletionRequest) {
      uiFeedback.showToast('Account closure request is already pending.', 'warning');
      return;
    }

    const confirmed = await uiFeedback.confirm({
      title: 'Request Account Closure',
      message: 'Your account stays open during the review period.',
      confirmText: 'Create request',
      cancelText: 'Cancel',
      destructive: true,
    });
    if (!confirmed) return;

    setDeletionRequestStatus('submitting');
    setDeletionRequestError(null);
    await dataDeletionRequestService
      .createSelfRequest()
      .then((result) => {
        if (!result.success) {
          setDeletionRequestError(result.error.message);
          uiFeedback.showToast(result.error.message, 'error');
          return;
        }

        setDataDeletionRequests((current) => [
          result.data.request,
          ...current.filter((request) => request.id !== result.data.request.id),
        ]);
        uiFeedback.showToast(
          result.data.created
            ? 'Account closure request created.'
            : 'Account closure request is already pending.',
          result.data.created ? 'success' : 'warning',
        );
      })
      .catch((error: unknown) => {
        logger.error('Account closure request rejected', error);
        setDeletionRequestError('Account closure request was not created.');
        uiFeedback.showToast('Account closure request was not created. Try again.', 'error');
      })
      .finally(() => setDeletionRequestStatus('idle'));
  };

  const handleDeleteAccount = () => {
    logger.press('DeleteAccount');
    if (!apiClient.isMockMode) {
      void requestAccountClosure();
      return;
    }

    uiFeedback.alert('Request Account Closure', 'We will open an email to support.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Continue',
        style: 'destructive',
        onPress: () => handleRequestLifecycleSupport('close'),
      },
    ]);
  };

  const handleDeactivateAccount = () => {
    logger.press('DeactivateAccount');
    uiFeedback.alert('Request Account Pause', 'We will open an email to support.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Continue',
        onPress: () => handleRequestLifecycleSupport('pause'),
      },
    ]);
  };

  return {
    currentUser,
    editingPhone,
    phone: editingPhone ? phoneDraft : persistedPhone,
    setEditingPhone,
    setPhone: setPhoneDraft,
    handleSavePhone,
    handleSendPasswordReset,
    handleDeleteAccount,
    handleDeactivateAccount,
    accountClosureSubtitle,
    isAccountClosurePending: Boolean(pendingDataDeletionRequest),
    isAccountClosureBusy:
      deletionRequestStatus === 'loading' || deletionRequestStatus === 'submitting',
    savingPhone,
    sendingPasswordReset,
  };
}
