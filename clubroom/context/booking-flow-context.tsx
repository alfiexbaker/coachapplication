import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { bookingService, BookingDraft } from '@/services/booking-service';

interface BookingFlowContextValue {
  draft: BookingDraft;
  updateDraft: (patch: Partial<BookingDraft>) => void;
  reset: () => void;
  save: () => Promise<void>;
}

const BookingFlowContext = createContext<BookingFlowContextValue | undefined>(undefined);

export function BookingFlowProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<BookingDraft>(bookingService.getDraft());

  const updateDraft = useCallback((patch: Partial<BookingDraft>) => {
    const currentDraft = bookingService.getDraft();
    bookingService.updateDraft(patch);
    const nextDraft = bookingService.getDraft();

    if (nextDraft === currentDraft) {
      return;
    }

    setDraft(nextDraft);
  }, []);

  const reset = useCallback(() => {
    bookingService.resetDraft();
    setDraft(bookingService.getDraft());
  }, []);

  const save = useCallback(async () => {
    await bookingService.createFromDraft();
    setDraft(bookingService.getDraft());
  }, []);

  const value = useMemo(
    () => ({
      draft,
      updateDraft,
      reset,
      save,
    }),
    [draft, reset, save, updateDraft],
  );

  return <BookingFlowContext.Provider value={value}>{children}</BookingFlowContext.Provider>;
}

export function useBookingFlow() {
  const ctx = useContext(BookingFlowContext);

  if (!ctx) {
    throw new Error('useBookingFlow must be used inside BookingFlowProvider');
  }

  return ctx;
}
