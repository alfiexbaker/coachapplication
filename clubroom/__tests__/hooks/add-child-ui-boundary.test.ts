import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();
const readSource = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('add-child UI boundary', () => {
  it('uses one compact registration header and a semantic progress indicator', () => {
    const modal = readSource('app/(modal)/add-child.tsx');

    assert.match(modal, /title=\{STEP_TITLES\[c\.currentStep\]\}/);
    assert.match(modal, /accessibilityRole="progressbar"/);
    assert.match(modal, /requestAnimationFrame/);
    assert.match(modal, /label=\{c\.saving \? 'Adding child…' : 'Add child'\}/);
    assert.doesNotMatch(modal, /centerTitle|stepDot|Step Indicator|Ionicons/);
  });

  it('keeps choices semantic and removes the oversized photo treatment', () => {
    const sections = readSource('components/family/add-child-basic-step-sections.tsx');
    const styles = readSource('components/family/add-child-basic-step-styles.ts');

    assert.match(sections, /accessibilityRole="radio"/);
    assert.match(
      sections,
      /accessibilityLabel=\{photoUri \? 'Change player photo' : 'Add player photo'\}/,
    );
    assert.match(sections, /accessibilityLabel="Done selecting date of birth"/);
    assert.match(styles, /width: 48/);
    assert.doesNotMatch(styles, /width: 100|photoEditBadge|borderRadius: Radii\.pill/);
    assert.doesNotMatch(sections, /PositionOptionGrid|POSITION_OPTIONS_WITH_ROTATE/);
  });

  it('uses direct trust copy, native switching and a working adjustment cancel action', () => {
    const hook = readSource('hooks/use-add-child.ts');
    const support = readSource('components/family/medical-special-needs-form.tsx');
    const supportStep = readSource('components/family/add-child-medical-step.tsx');
    const supportSections = readSource('components/family/medical-special-needs-form-sections.tsx');
    const safety = readSource('components/family/add-child-emergency-step.tsx');

    assert.match(support, /Coaches can see this only when assigned to/);
    assert.doesNotMatch(support, /SurfaceCard|best experience/);
    assert.match(supportSections, /const cancelAdd = \(\) => \{\s+onCancelSpecialNeed\(\);/);
    assert.match(
      supportSections,
      /onPress=\{cancelAdd\}[\s\S]{0,160}accessibilityLabel="Cancel adjustment"/,
    );
    assert.doesNotMatch(supportStep, /MedicalTagListForm|variant:/);
    assert.match(safety, /\bSwitch\b/);
    assert.match(safety, /only when assigned to this player/);
    assert.doesNotMatch(safety, /SurfaceCard|toggleKnob|shield-checkmark/);
    assert.match(hook, /const photoConsent = false/);
    assert.match(hook, /const videoConsent = false/);
    assert.match(hook, /useState\(false\);\n\n  const stepIndex/);
  });

  it('does not retain the unreachable duplicate consent step', () => {
    assert.equal(
      fs.existsSync(path.join(root, 'components/family/add-child-emergency-step-sections.tsx')),
      false,
    );
  });
});
