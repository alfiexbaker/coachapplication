import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('API-mode child bookings use backend DBS status before allowing child bookings', () => {
  const bookingCrudSource = readSource('services/booking/booking-crud-service.ts');
  const verificationServiceSource = readSource('services/verification-service.ts');
  const runtimeModesSource = readSource('docs/architecture/runtime-modes.md');
  const serviceOwnershipSource = readSource('docs/architecture/service-ownership-map.md');
  const dbsGateBlock = bookingCrudSource.match(
    /private async validateDbsGate\([\s\S]*?const verificationResult = await verificationService\.getStatus\(coachId\);/,
  );

  assert.ok(dbsGateBlock, 'expected validateDbsGate to call verificationService.getStatus');
  assert.ok(
    !dbsGateBlock[0].includes('STORAGE_KEYS.VERIFICATION'),
    'booking gate must not read local verification storage directly',
  );
  assert.match(
    verificationServiceSource,
    /\/v1\/coaches\/\$\{encodeURIComponent\(coachId\)\}\/verification-status/,
    'API-mode verification reads must call the explicit /v1 coach verification status route',
  );
  assert.match(
    verificationServiceSource,
    /if \(!apiClient\.isMockMode\)[\s\S]*?apiFetch<ApiCoachVerificationStatusResponse>/,
    'verification service must branch to API fetch before local mock storage',
  );
  assert.ok(
    runtimeModesSource.includes('Coach verification status reads now use `/v1/coaches/:coachId/verification-status`'),
    'runtime modes doc should record backend DBS status authority',
  );
  assert.ok(
    serviceOwnershipSource.includes('Child/guardian booking DBS gates call this backend status route'),
    'service ownership doc should record booking CRUD safety ownership',
  );
});
