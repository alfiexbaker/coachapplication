import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();
const readSource = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('child health authority boundary', () => {
  it('proves child-management authority before reading medical or emergency records', () => {
    for (const relativePath of ['hooks/use-medical-info.ts', 'hooks/use-emergency-contacts.ts']) {
      const source = readSource(relativePath);
      assert.match(source, /childService\.canManageChildProfile\(id, currentUser\)/);
      assert.ok(
        source.indexOf('childService.canManageChildProfile(id, currentUser)') <
          source.indexOf('safetyService.getEmergencyInfo(id)'),
      );
      assert.match(source, /serviceError\(\s*'UNAUTHORIZED'/);
    }

    const medicalScreen = readSource('app/child/[id]/medical.tsx');
    const emergencyScreen = readSource('app/child/[id]/emergency.tsx');
    assert.match(medicalScreen, /onRetry=\{accessDenied \? undefined : retry\}/);
    assert.match(emergencyScreen, /onRetry=\{accessDenied \? undefined : retry\}/);
    assert.match(
      emergencyScreen,
      /status === 'success' && !showForm && !editingContact && contacts\.length > 0/,
    );
  });

  it('defaults mock child-management access to the signed-in actor’s child links', () => {
    const source = readSource('services/child-service.ts');
    assert.match(
      source,
      /mockManager\?\.children\?\.some\(\(child\) => child\.childId === childId\)/,
    );
  });

  it('keeps health screen cache entries and mutations scoped to the current actor', () => {
    const medical = readSource('hooks/use-medical-info.ts');
    const emergency = readSource('hooks/use-emergency-contacts.ts');

    for (const source of [medical, emergency]) {
      assert.match(
        source,
        /dataKey: id\s+\? `child-(?:medical|emergency):\$\{currentUser\?\.id \?\? 'anonymous'\}:\$\{id\}`/,
      );
    }

    assert.match(medical, /if \(!\(await canManageMedicalInfo\(\)\)\) return;/);
    assert.match(emergency, /if \(!\(await canManageEmergencyContacts\(\)\)\) return;/);

    const screen = readSource('hooks/use-screen.ts');
    assert.match(
      screen,
      /isTruthfulScreenStatus\(currentStatus\) &&\s+\(requestedDataKey === null \|\| resolvedDataKeyRef\.current === requestedDataKey\)/,
    );
  });
});
