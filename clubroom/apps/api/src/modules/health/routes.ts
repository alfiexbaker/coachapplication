import type { FastifyPluginAsync } from 'fastify';
import { healthResponseSchema, readinessResponseSchema } from '@clubroom/shared-contracts';
import { captureMessage, withScope } from '@sentry/node';
import { buildReadinessReport } from '../../lib/ops-runtime.js';

const READINESS_ALERT_REPEAT_MS = 15 * 60 * 1000;

type ReadinessReport = Awaited<ReturnType<typeof buildReadinessReport>>;
type ReadinessAlert = ReadinessReport & { issueCodes: string[] };
type CaptureReadinessAlert = (alert: ReadinessAlert) => void;

function captureReadinessAlert(alert: ReadinessAlert): void {
  withScope((scope) => {
    scope.setTag('component', 'readiness');
    scope.setTag('readiness_status', alert.status);
    scope.setFingerprint(['clubroom-api-readiness', alert.status, ...alert.issueCodes]);
    scope.setExtras({ checks: alert.checks, issueCodes: alert.issueCodes });
    captureMessage(
      `Clubroom API readiness ${alert.status}: ${alert.issueCodes.join(', ')}`,
      alert.status === 'down' ? 'error' : 'warning',
    );
  });
}

export function createReadinessAlertReporter(
  capture: CaptureReadinessAlert = captureReadinessAlert,
  repeatMs = READINESS_ALERT_REPEAT_MS,
): (readiness: ReadinessReport, now?: number) => boolean {
  let lastSignature = '';
  let lastReportedAt = 0;

  return (readiness, now = Date.now()) => {
    if (readiness.status === 'ready') {
      lastSignature = '';
      lastReportedAt = 0;
      return false;
    }

    const issueCodes = [...new Set(readiness.issues.map((issue) => issue.code))].sort();
    const signature = `${readiness.status}:${issueCodes.join(',')}`;
    if (signature === lastSignature && now - lastReportedAt < repeatMs) {
      return false;
    }

    capture({ ...readiness, issueCodes });
    lastSignature = signature;
    lastReportedAt = now;
    return true;
  };
}

const reportReadinessAlert = createReadinessAlertReporter();

const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async (request, reply) => {
    const payload = healthResponseSchema.parse({
      status: 'ok',
      service: 'clubroom-api',
      timestamp: new Date().toISOString(),
      requestId: request.requestId,
    });

    return reply.send(payload);
  });

  app.get('/ready', async (request, reply) => {
    const readiness = await buildReadinessReport();
    reportReadinessAlert(readiness);
    const payload = readinessResponseSchema.parse({
      status: readiness.status,
      checks: readiness.checks,
      issues: readiness.issues,
      timestamp: new Date().toISOString(),
      requestId: request.requestId,
    });

    return reply.status(readiness.status === 'ready' ? 200 : 503).send(payload);
  });
};

export default healthRoutes;
