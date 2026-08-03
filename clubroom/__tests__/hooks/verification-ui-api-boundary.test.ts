import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('verification UI API boundaries', () => {
  it('gates every verification route to coach accounts', () => {
    const layout = readProjectFile('app/verification/_layout.tsx');

    assert.match(layout, /RouteAccessGate/);
    assert.match(layout, /currentUser\?\.role === 'COACH'/);
    assert.match(layout, /Routes\.DEVELOPMENT_MY_PROGRESS/);
    assert.match(layout, /redirectHref=\{redirectHref\}/);
  });

  it('does not expose mock approval controls in verification screens', () => {
    const idScreen = readProjectFile('app/verification/id.tsx');
    const backgroundScreen = readProjectFile('app/verification/background.tsx');
    const insuranceScreen = readProjectFile('app/verification/insurance.tsx');
    const idHook = readProjectFile('hooks/use-id-verification.ts');
    const backgroundHook = readProjectFile('hooks/use-background-check.ts');
    const insuranceHook = readProjectFile('hooks/use-insurance-verification.ts');
    const verificationService = readProjectFile('services/verification-service.ts');

    for (const source of [
      idScreen,
      backgroundScreen,
      insuranceScreen,
      idHook,
      backgroundHook,
      insuranceHook,
      verificationService,
    ]) {
      assert.equal(source.includes('canUseMockApproval'), false);
      assert.equal(source.includes('handleMockApprove'), false);
      assert.equal(source.includes('mockApproveVerification'), false);
      assert.equal(source.includes('DEV ONLY'), false);
      assert.equal(source.includes('mockButton'), false);
    }
  });

  it('keeps live insurance submission on verification document authority', () => {
    const insuranceHook = readProjectFile('hooks/use-insurance-verification.ts');
    const insuranceScreen = readProjectFile('app/verification/insurance.tsx');

    assert.match(insuranceHook, /submitInsuranceVerification/);
    assert.match(insuranceScreen, /handleSubmit/);
    assert.equal(insuranceScreen.includes('Upload & Verify (DEV ONLY)'), false);
  });

  it('submits existing DBS evidence through verification document authority', () => {
    const backgroundHook = readProjectFile('hooks/use-background-check.ts');
    const backgroundScreen = readProjectFile('app/verification/background.tsx');
    const verificationService = readProjectFile('services/verification-service.ts');

    assert.equal(backgroundHook.includes('apiClient.isMockMode'), false);
    assert.equal(backgroundHook.includes('startBackgroundCheck'), false);
    assert.equal(verificationService.includes('startBackgroundCheck'), false);
    assert.equal(backgroundHook.includes('handleStartCheck'), false);
    assert.equal(backgroundScreen.includes('canStartBackgroundCheck'), false);
    assert.equal(backgroundScreen.includes('Start Background Check'), false);
    assert.equal(backgroundScreen.includes('(Mock)'), false);
    assert.match(backgroundHook, /submitBackgroundCheckVerification/);
    assert.match(verificationService, /submitVerificationDocument\(coachId, 'dbs'/);
  });

  it('uses one explicit verification evidence picker policy', () => {
    const pickerHooks = [
      'hooks/use-id-verification.ts',
      'hooks/use-background-check.ts',
      'hooks/use-insurance-verification.ts',
      'hooks/use-credentials.ts',
    ].map(readProjectFile);
    const visibleSurfaces = [
      'app/verification/id.tsx',
      'app/verification/background.tsx',
      'app/verification/insurance.tsx',
      'components/verification/credential-form.tsx',
    ].map(readProjectFile);

    for (const source of pickerHooks) {
      assert.match(source, /VERIFICATION_DOCUMENT_PICKER_TYPES/);
      assert.match(source, /validateVerificationDocumentSelection/);
      assert.equal(source.includes("'image/*'"), false);
    }
    for (const source of visibleSurfaces) {
      assert.match(source, /20 MB/);
    }
  });
});
