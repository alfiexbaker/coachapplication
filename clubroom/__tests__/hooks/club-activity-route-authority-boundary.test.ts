import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'app/club/[id]/activity/[activityId].tsx'), 'utf8');

test('club activity redirect is bound to the current actor and truthful response frame', () => {
  assert.equal(source.includes("import { useCallback, useEffect } from 'react';"), false);
  assert.ok(source.includes("import { useAuth } from '@/hooks/use-auth';"));
  assert.ok(source.includes('const { currentUser } = useAuth();'));
  assert.ok(
    source.includes(
      'deps: [clubId, clubIdParam.valid, activityId, activityIdParam.valid, currentUser?.id]',
    ),
  );
  assert.ok(
    source.includes(
      "dataKey: `club-activity:${currentUser?.id ?? 'anonymous'}:${clubId || 'missing'}:${activityId || 'missing'}`",
    ),
  );
  assert.ok(
    source.includes("if (!hasRequestedTruthfulFrame || status !== 'success' || !activity)"),
  );
});
