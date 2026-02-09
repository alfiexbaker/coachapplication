import { useState, useCallback } from 'react';

import { useTheme } from '@/hooks/useTheme';

import {
  OnWaitlistCard,
  WaitlistOptionsCard,
  JoinWaitlistButton,
} from './waitlist-button-sections';

interface WaitlistButtonProps {
  isOnWaitlist: boolean;
  position?: number;
  totalWaiting?: number;
  autoBook?: boolean;
  onJoinWaitlist: (autoBook: boolean) => Promise<void>;
  onLeaveWaitlist: () => Promise<void>;
  onToggleAutoBook?: (enabled: boolean) => Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
}

export function WaitlistButton({
  isOnWaitlist,
  position,
  totalWaiting,
  autoBook = false,
  onJoinWaitlist,
  onLeaveWaitlist,
  onToggleAutoBook,
  loading = false,
  disabled = false,
  compact = false,
}: WaitlistButtonProps) {
  const { colors: palette } = useTheme();
  const [showOptions, setShowOptions] = useState(false);
  const [localAutoBook, setLocalAutoBook] = useState(autoBook);
  const [actionLoading, setActionLoading] = useState(false);

  const isLoading = loading || actionLoading;

  const handleJoin = useCallback(async () => {
    setActionLoading(true);
    try {
      await onJoinWaitlist(localAutoBook);
    } finally {
      setActionLoading(false);
      setShowOptions(false);
    }
  }, [onJoinWaitlist, localAutoBook]);

  const handleLeave = useCallback(async () => {
    setActionLoading(true);
    try {
      await onLeaveWaitlist();
    } finally {
      setActionLoading(false);
    }
  }, [onLeaveWaitlist]);

  const handleToggleAutoBook = useCallback(
    async (value: boolean) => {
      setLocalAutoBook(value);
      if (isOnWaitlist && onToggleAutoBook) {
        try {
          await onToggleAutoBook(value);
        } catch {
          setLocalAutoBook(!value);
        }
      }
    },
    [isOnWaitlist, onToggleAutoBook],
  );

  const handleShowOptions = useCallback(() => setShowOptions(true), []);
  const handleCancelOptions = useCallback(() => setShowOptions(false), []);

  if (isOnWaitlist) {
    return (
      <OnWaitlistCard
        position={position}
        totalWaiting={totalWaiting}
        compact={compact}
        localAutoBook={localAutoBook}
        onToggleAutoBook={onToggleAutoBook ? handleToggleAutoBook : undefined}
        onLeave={handleLeave}
        isLoading={isLoading}
        disabled={disabled}
        showAutoBookToggle={!!onToggleAutoBook}
        palette={palette}
      />
    );
  }

  if (showOptions) {
    return (
      <WaitlistOptionsCard
        localAutoBook={localAutoBook}
        onToggleAutoBook={handleToggleAutoBook}
        onCancel={handleCancelOptions}
        onConfirm={handleJoin}
        isLoading={isLoading}
        palette={palette}
      />
    );
  }

  return (
    <JoinWaitlistButton
      onPress={handleShowOptions}
      isLoading={isLoading}
      disabled={disabled}
      compact={compact}
      totalWaiting={totalWaiting}
      palette={palette}
    />
  );
}
