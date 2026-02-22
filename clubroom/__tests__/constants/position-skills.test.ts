import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  computeFourCorners,
  getParentGroup,
  getSkillsForPosition,
  mapSkillToCorner,
} from '@/constants/position-skills';

describe('position-skills constants', () => {
  it('returns 9 skills per position (4 universal + 5 positional)', () => {
    const gkSkills = getSkillsForPosition('GK');
    const defSkills = getSkillsForPosition('DEF');
    const midSkills = getSkillsForPosition('MID');
    const attSkills = getSkillsForPosition('ATT');

    assert.equal(gkSkills.length, 9);
    assert.equal(defSkills.length, 9);
    assert.equal(midSkills.length, 9);
    assert.equal(attSkills.length, 9);

    assert.ok(gkSkills.includes('Work Rate'));
    assert.ok(defSkills.includes('Coachability'));
    assert.ok(midSkills.includes('Communication'));
    assert.ok(attSkills.includes('Attitude'));
  });

  it('maps skills to four corners correctly', () => {
    assert.equal(mapSkillToCorner('Work Rate'), 'physical');
    assert.equal(mapSkillToCorner('Attitude'), 'psychological');
    assert.equal(mapSkillToCorner('Coachability'), 'psychological');
    assert.equal(mapSkillToCorner('Communication'), 'social');
    assert.equal(mapSkillToCorner('Finishing'), 'technical');
  });

  it('computes four-corner averages from session ratings', () => {
    const corners = computeFourCorners([
      { skill: 'Work Rate', rating: 4, label: 'Excellent', trend: 'consistent' },
      { skill: 'Attitude', rating: 3, label: 'Very Good', trend: 'consistent' },
      { skill: 'Communication', rating: 5, label: 'Exceptional', trend: 'consistent' },
      { skill: 'Coachability', rating: 5, label: 'Exceptional', trend: 'consistent' },
      { skill: 'Passing', rating: 4, label: 'Excellent', trend: 'improving' },
      { skill: 'Ball Carrying', rating: 3, label: 'Very Good', trend: 'consistent' },
      { skill: 'Game Vision', rating: 4, label: 'Excellent', trend: 'consistent' },
      { skill: 'Pressing & Defending', rating: 4, label: 'Excellent', trend: 'consistent' },
      { skill: 'Tempo & Control', rating: 5, label: 'Exceptional', trend: 'improving' },
    ]);

    assert.equal(corners.technical, 4);
    assert.equal(corners.physical, 4);
    assert.equal(corners.psychological, 4);
    assert.equal(corners.social, 5);
  });

  it('maps skills to parent groups', () => {
    assert.equal(getParentGroup('Dribbling & Skills'), 'Ball Skills');
    assert.equal(getParentGroup('Finishing'), 'Attacking');
    assert.equal(getParentGroup('1v1 Defending'), 'Defending');
    assert.equal(getParentGroup('Game Vision'), 'Game Sense');
    assert.equal(getParentGroup('Coachability'), 'Character');
  });
});
