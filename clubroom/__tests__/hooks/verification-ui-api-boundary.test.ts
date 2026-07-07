import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('verification UI API boundaries', () => {
  it('gates dev-only approval controls behind mock-mode capability flags', () => {
    const idScreen = readProjectFile('app/verification/id.tsx');
    const backgroundScreen = readProjectFile('app/verification/background.tsx');
    const insuranceScreen = readProjectFile('app/verification/insurance.tsx');

    assert.match(idScreen, /canUseMockApproval &&/);
    assert.match(backgroundScreen, /canUseMockApproval &&/);
    assert.match(insuranceScreen, /canUseMockApproval \?/);
    assert.equal(idScreen.includes('{__DEV__ &&'), false);
    assert.equal(backgroundScreen.includes('{__DEV__ &&'), false);
    assert.equal(insuranceScreen.includes('{__DEV__ &&'), false);
  });

  it('keeps live insurance submission on verification document authority', () => {
    const insuranceHook = readProjectFile('hooks/use-insurance-verification.ts');
    const insuranceScreen = readProjectFile('app/verification/insurance.tsx');

    assert.match(insuranceHook, /submitInsuranceVerification/);
    assert.match(insuranceHook, /apiClient\.isMockMode/);
    assert.match(insuranceScreen, /handleSubmit/);
    assert.equal(insuranceScreen.includes('Upload & Verify (DEV ONLY)'), false);
  });

  it('does not show the unsupported background-check start action in API mode', () => {
    const backgroundHook = readProjectFile('hooks/use-background-check.ts');
    const backgroundScreen = readProjectFile('app/verification/background.tsx');

    assert.match(backgroundHook, /canStartBackgroundCheck = apiClient\.isMockMode/);
    assert.match(backgroundScreen, /canStartBackgroundCheck \?/);
  });
});
