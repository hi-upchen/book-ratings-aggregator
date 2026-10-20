import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarize } from './summarize-report.mjs';

function spec(title, statuses, errorMessage) {
  return {
    title,
    tests: [
      {
        results: statuses.map((status) => ({
          status,
          error: status === 'failed' ? { message: errorMessage } : undefined,
        })),
      },
    ],
  };
}

test('lists only the failed spec, not one that passed on retry', () => {
  const report = {
    suites: [
      {
        specs: [
          spec('Kobo list page shows ratings', ['failed', 'failed'], 'no ratings drawn\nstack line'),
          spec('PChome list page shows ratings', ['failed', 'passed'], 'flaky'),
        ],
      },
    ],
  };
  const result = summarize(report);
  assert.equal(result.failed, true);
  assert.equal(result.text, '• Kobo list page shows ratings: no ratings drawn');
});

test('walks nested suites', () => {
  const report = {
    suites: [{ suites: [{ specs: [spec('Deep check', ['failed'], 'boom')] }] }],
  };
  assert.equal(summarize(report).text, '• Deep check: boom');
});

test('all passed with one skipped', () => {
  const specs = [];
  for (let i = 0; i < 8; i++) specs.push(spec('ok ' + i, ['passed']));
  specs.push(spec('skipped one', ['skipped']));
  const result = summarize({ suites: [{ specs }] });
  assert.equal(result.failed, false);
  assert.equal(result.text, 'all 9 checks passed (1 skipped)');
});

test('null report counts as a crash', () => {
  assert.deepEqual(summarize(null), {
    failed: true,
    text: 'monitor run crashed before writing its report',
  });
});

test('long error text is cut to 1500 characters', () => {
  const report = { suites: [{ specs: [spec('Big', ['failed'], 'x'.repeat(5000))] }] };
  const result = summarize(report);
  assert.equal(result.text.length, 1500);
});
