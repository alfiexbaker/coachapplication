const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const {
  API_MODE_FALSE_SUCCESS_REGEX,
  SUPABASE_DATA_API_IMPORT_REGEX,
  SUPABASE_DATA_API_PATH_REGEX,
} = require('./api-boundary-audit');

function matches(regex, source) {
  regex.lastIndex = 0;
  return regex.test(source);
}

describe('API boundary audit', () => {
  it('rejects direct false-success no-ops only in API mode', () => {
    for (const source of [
      'if (!apiClient.isMockMode) { return ok(undefined); }',
      'if (!USE_MOCK) return ok(undefined);',
      'if (!isMockMode()) {\n  return ok(undefined);\n}',
    ]) {
      assert.equal(matches(API_MODE_FALSE_SUCCESS_REGEX, source), true);
    }
    assert.equal(
      matches(API_MODE_FALSE_SUCCESS_REGEX, 'if (USE_MOCK) return ok(undefined);'),
      false,
    );
  });

  it('rejects direct Supabase Data API clients but allows server database URLs', () => {
    assert.equal(matches(SUPABASE_DATA_API_IMPORT_REGEX, "from '@supabase/supabase-js'"), true);
    for (const source of [
      '`https://project.supabase.co/rest/v1/bookings`',
      "'https://project.supabase.co/graphql/v1'",
    ]) {
      assert.equal(matches(SUPABASE_DATA_API_PATH_REGEX, source), true);
    }
    assert.equal(
      matches(
        SUPABASE_DATA_API_PATH_REGEX,
        "const databaseUrl = 'postgresql://postgres:secret@db.project.supabase.co:5432/postgres';",
      ),
      false,
    );
  });
});
