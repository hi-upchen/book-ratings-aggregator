import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const MAX_TEXT_LENGTH = 1500;

// Collects every spec from a Playwright JSON report, however deeply nested.
function collectSpecs(suite, specs) {
  for (const spec of suite.specs || []) specs.push(spec);
  for (const child of suite.suites || []) collectSpecs(child, specs);
  return specs;
}

// Returns the final result status of one spec. A pass on retry counts as a pass.
function finalStatus(spec) {
  const test = (spec.tests || [])[0];
  const results = (test && test.results) || [];
  const last = results[results.length - 1];
  return last ? last.status : 'failed';
}

function firstErrorLine(spec) {
  const results = ((spec.tests || [])[0] || {}).results || [];
  const last = results[results.length - 1] || {};
  const message = (last.error && last.error.message) || 'no error message';
  return String(message).split('\n')[0];
}

// Turns a Playwright JSON report into a failed flag and a short text.
// A null report means the run crashed before it wrote anything.
export function summarize(report) {
  if (!report) {
    return { failed: true, text: 'monitor run crashed before writing its report' };
  }
  const specs = [];
  for (const suite of report.suites || []) collectSpecs(suite, specs);

  const failures = [];
  let skipped = 0;
  for (const spec of specs) {
    const status = finalStatus(spec);
    if (status === 'skipped') skipped++;
    else if (status !== 'passed') failures.push('• ' + spec.title + ': ' + firstErrorLine(spec));
  }

  if (failures.length > 0) {
    return { failed: true, text: failures.join('\n').slice(0, MAX_TEXT_LENGTH) };
  }
  let text = 'all ' + specs.length + ' checks passed';
  if (skipped > 0) text += ' (' + skipped + ' skipped)';
  return { failed: false, text };
}

function readReport(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    return null;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { failed, text } = summarize(readReport(process.argv[2]));
  console.log(text);
  process.exit(failed ? 1 : 0);
}
