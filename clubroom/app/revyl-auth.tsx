import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorState, LoadingState } from '@/components/ui/screen-states';
import { nativeAudit, api, isDevelopment, isTestRuntime } from '@/constants/config';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/useTheme';
import { Routes } from '@/navigation/routes';
import { buildDemoRoleEntries } from '@/utils/demo-role-entry';
import { evaluateRevylAuthBypassUrl } from '@/utils/revyl-auth-bypass';

function singleParam(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export default function RevylAuthBackstop() {
  const { colors } = useTheme();
  const { availableUsers, login } = useAuth();
  const params = useLocalSearchParams<{
    token?: string | string[];
    role?: string | string[];
    redirect?: string | string[];
  }>();
  const handledUrl = useRef<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const isAuditRuntime = isTestRuntime || nativeAudit.testMode;
  const rawUrl = (() => {
    const query = new URLSearchParams();
    const token = singleParam(params.token);
    const role = singleParam(params.role);
    const redirect = singleParam(params.redirect);
    if (token) query.set('token', token);
    if (role) query.set('role', role);
    if (redirect) query.set('redirect', redirect);
    return `clubroom://revyl-auth?${query.toString()}`;
  })();

  useEffect(() => {
    if (!isAuditRuntime) {
      router.replace(Routes.ROOT);
      return;
    }
    if (handledUrl.current === rawUrl) return;
    handledUrl.current = rawUrl;
    let active = true;

    const handoff = async () => {
      const decision = evaluateRevylAuthBypassUrl(rawUrl, {
        isDevelopmentEnvironment: isDevelopment,
        isTestRuntime,
        isNativeAuditTestMode: nativeAudit.testMode,
        useMock: api.useMock,
        enabled: nativeAudit.authBypassEnabled,
        token: nativeAudit.authBypassToken,
      });
      if (decision.kind !== 'accepted') {
        if (active) {
          setFailure(decision.kind === 'rejected' ? decision.message : 'Native audit link was ignored.');
        }
        return;
      }

      const entry = buildDemoRoleEntries(availableUsers).find((item) => item.id === decision.entryId);
      if (!entry) {
        setFailure('Native audit user is unavailable.');
        return;
      }

      const loggedIn = await login(entry.username, entry.password);
      if (!active) return;
      if (!loggedIn) {
        setFailure('Native audit user is unavailable.');
        return;
      }

      router.replace(decision.route);
    };

    void handoff();
    return () => {
      active = false;
    };
  }, [availableUsers, isAuditRuntime, login, rawUrl]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      {failure ? (
        <ErrorState title="Native audit sign-in unavailable" message={failure} />
      ) : (
        <LoadingState variant="detail" />
      )}
    </SafeAreaView>
  );
}
