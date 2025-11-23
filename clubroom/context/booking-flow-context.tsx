import React, { createContext, useContext, useMemo, useState } from 'react';
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

  const updateDraft = (patch: Partial<BookingDraft>) => {
    bookingService.updateDraft(patch);
    setDraft(bookingService.getDraft());
  };

  const value = useMemo(
    () => ({
      draft,
      updateDraft,
      reset: () => {
        bookingService.resetDraft();
        setDraft(bookingService.getDraft());
      },
      save: async () => {
        await bookingService.createFromDraft();
        setDraft(bookingService.getDraft());
      },
    }),
    [draft]
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
