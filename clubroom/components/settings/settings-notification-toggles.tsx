import React, { memo, useState, useCallback } from 'react';

import { SectionHeader } from '@/components/primitives/section-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Column } from '@/components/primitives/column';
import { SettingsToggleRow } from '@/components/settings/settings-row';
import { Spacing } from '@/constants/theme';

export const SettingsNotificationToggles = memo(function SettingsNotificationToggles() {
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [sessionReminders, setSessionReminders] = useState(true);
  const [messageNotifications, setMessageNotifications] = useState(true);

  const handlePushChange = useCallback((value: boolean) => setPushNotifications(value), []);
  const handleEmailChange = useCallback((value: boolean) => setEmailNotifications(value), []);
  const handleSessionChange = useCallback((value: boolean) => setSessionReminders(value), []);
  const handleMessageChange = useCallback((value: boolean) => setMessageNotifications(value), []);

  return (
    <Column gap="sm">
      <SectionHeader title="Notifications" subtitle="Control how we nudge you" />
      <SurfaceCard style={{ padding: 0, gap: 0 }}>
        <SettingsToggleRow
          icon="notifications"
          title="Push notifications"
          subtitle="Receive push notifications on this device"
          value={pushNotifications}
          onValueChange={handlePushChange}
        />
        <SettingsToggleRow
          icon="mail"
          title="Email notifications"
          subtitle="Receive updates via email"
          value={emailNotifications}
          onValueChange={handleEmailChange}
        />
        <SettingsToggleRow
          icon="calendar"
          title="Session reminders"
          subtitle="Get reminded before sessions start"
          value={sessionReminders}
          onValueChange={handleSessionChange}
        />
        <SettingsToggleRow
          icon="chatbubbles"
          title="Message notifications"
          subtitle="Alerts for new messages"
          value={messageNotifications}
          onValueChange={handleMessageChange}
        />
      </SurfaceCard>
    </Column>
  );
});
