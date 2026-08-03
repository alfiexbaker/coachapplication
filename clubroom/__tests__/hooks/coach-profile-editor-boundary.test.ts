import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('qualification editor exposes only fields that the profile API persists', () => {
  const source = readSource('components/profile/edit-certifications-section.tsx');
  const hookSource = readSource('hooks/use-edit-profile.ts');

  for (const misleadingToken of [
    'DateTimeField',
    'Credential URL',
    'Issue Date',
    'Expiry Date',
    "'Expired'",
    "'Valid'",
  ]) {
    assert.equal(
      source.includes(misleadingToken),
      false,
      `${misleadingToken} must not appear when the API stores only qualification labels`,
    );
  }

  assert.ok(source.includes('accessibilityLabel="Add qualification"'));
  assert.ok(source.includes('accessibilityLabel="Save qualification"'));
  assert.ok(
    hookSource.includes("setCertificationValidationMessage('Qualification name is required.')"),
  );
  assert.ok(hookSource.includes('if (qualification.length > 120)'));
  assert.equal(
    hookSource.includes('!certificationDraft.issueDate'),
    false,
    'a discarded issue date must not block a profile update',
  );
});

test('social editor has one website owner and rejects lookalike domains', () => {
  const source = readSource('components/profile/social-links-editor.tsx');
  const platformOrder = source.slice(
    source.indexOf('const PLATFORM_ORDER'),
    source.indexOf('const PLATFORM_PLACEHOLDERS'),
  );

  assert.equal(
    platformOrder.includes("'website'"),
    false,
    'the dedicated website field must not be duplicated in social links',
  );
  const validationSource = readSource('packages/shared-contracts/src/common/social-links.ts');
  assert.ok(validationSource.includes('hostname === domain || hostname.endsWith(`.${domain}`)'));
  assert.equal(validationSource.includes('hostname.toLowerCase().includes(domain)'), false);
  assert.ok(source.includes('accessibilityLabel={config.label}'));
  assert.ok(source.includes('accessibilityLabel={`Clear ${config.label}`}'));
  const hookSource = readSource('hooks/use-edit-profile.ts');
  assert.ok(hookSource.includes('profileLinksError === null'));
  assert.ok(hookSource.includes('withoutLegacySocialWebsite(values.socialLinks)'));
  assert.ok(readSource('apps/api/src/modules/coach-club/routes.ts').includes('profileLinkSchema'));
});

test('profile editor copy and control semantics stay direct', () => {
  const sources = [
    'components/profile/edit-specialties-section.tsx',
    'components/profile/edit-experience-section.tsx',
    'components/profile/edit-languages-section.tsx',
    'components/profile/edit-certifications-section.tsx',
    'components/profile/social-links-editor.tsx',
  ].map(readSource);
  const combined = sources.join('\n');

  for (const filler of [
    'Parents love to see',
    'build trust with parents',
    'feel confident you can welcome',
    'Set expectations for onboarding',
    'Help parents find and connect',
    'Curate the highlights',
  ]) {
    assert.equal(combined.includes(filler), false, `${filler} must remain deleted`);
  }

  assert.ok(combined.includes('accessibilityRole="checkbox"'));
  assert.ok(combined.includes('accessibilityRole="radio"'));
  assert.ok(combined.includes('accessibilityState={{ checked:'));
  assert.ok(combined.includes('minHeight: 44'));
  assert.equal(combined.includes('Quick add'), false);
  assert.equal(combined.includes('onQuickAdd'), false);

  const dateFieldSource = readSource('components/ui/primitives/DateTimeField.tsx');
  assert.ok(dateFieldSource.includes('accessibilityRole="button"'));
  assert.ok(
    dateFieldSource.includes('accessibilityLabel={label ?? placeholder ?? defaultPlaceholder}'),
  );
  assert.ok(dateFieldSource.includes('accessibilityState={{ disabled }}'));
});

test('coach editor leads with football work before contact details', () => {
  const screenSource = readSource('app/(tabs)/edit-profile.tsx');

  const focusIndex = screenSource.indexOf('<EditSpecialtiesSection');
  const pricingIndex = screenSource.indexOf('<EditPricingSection');
  const experienceIndex = screenSource.indexOf('<EditExperienceSection');
  const qualificationIndex = screenSource.indexOf('<EditCertificationsSection');
  const contactIndex = screenSource.indexOf('<EditContactInfo');

  assert.ok(focusIndex > 0);
  assert.ok(focusIndex < pricingIndex);
  assert.ok(pricingIndex < experienceIndex);
  assert.ok(experienceIndex < qualificationIndex);
  assert.ok(qualificationIndex < contactIndex);
});
