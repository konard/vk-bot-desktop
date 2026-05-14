import { describe, it, expect } from 'test-anywhere';
import { readFileSync } from 'node:fs';

const jsWorkflow = readWorkflow('.github/workflows/js.yml');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

function readWorkflow(filePath) {
  return readFileSync(filePath, 'utf8').replaceAll('\r\n', '\n');
}

function normalizeNewlines(text) {
  return text.replaceAll('\r\n', '\n');
}

function listWorkflowJobs(workflow) {
  const normalizedWorkflow = normalizeNewlines(workflow);
  const jobsStart = normalizedWorkflow.indexOf('\njobs:\n');
  const jobsBody = jobsStart === -1 ? '' : normalizedWorkflow.slice(jobsStart);
  const matches = jobsBody.matchAll(/^[ ]{2}([a-zA-Z0-9_-]+):\s*$/gm);

  return Array.from(matches, (match) => match[1]);
}

function getJobBlock(workflow, jobName) {
  const lines = normalizeNewlines(workflow).split('\n');
  const jobHeader = `  ${jobName}:`;
  const start = lines.findIndex((line) => line === jobHeader);

  if (start === -1) {
    return '';
  }

  const end = lines.findIndex(
    (line, index) => index > start && /^[ ]{2}[a-zA-Z0-9_-]+:\s*$/.test(line)
  );

  return lines.slice(start, end === -1 ? lines.length : end).join('\n');
}

function getTimeoutMinutes(workflow, jobName) {
  const block = getJobBlock(workflow, jobName);
  const timeout = block.match(/^[ ]{4}timeout-minutes:\s*(\d+)\s*$/m);

  return timeout ? Number(timeout[1]) : undefined;
}

describe('CI timeout policy', () => {
  it('sets timeout-minutes for every JavaScript workflow job', () => {
    const expectedTimeouts = {
      'detect-changes': 5,
      'test-compilation': 5,
      'check-file-line-limits': 5,
      'version-check': 5,
      'changeset-check': 10,
      lint: 10,
      test: 10,
      'validate-docs': 5,
      release: 90,
      'instant-release': 90,
      'changeset-pr': 10,
      'link-checker': 10,
      'preview-regen': 20,
      'pages-build': 10,
      'pages-deploy': 10,
      'desktop-release-context': 5,
      'desktop-build': 45,
      'desktop-publish': 10,
    };

    expect(listWorkflowJobs(jsWorkflow).sort()).toEqual(
      Object.keys(expectedTimeouts).sort()
    );

    for (const [jobName, timeout] of Object.entries(expectedTimeouts)) {
      expect(getTimeoutMinutes(jsWorkflow, jobName)).toBe(timeout);
    }
  });

  it('parses workflow files checked out with Windows line endings', () => {
    const crlfWorkflow = [
      'name: CRLF fixture',
      '',
      'jobs:',
      '  first-job:',
      '    timeout-minutes: 5',
      '  second-job:',
      '    timeout-minutes: 10',
      '',
    ].join('\r\n');

    expect(listWorkflowJobs(crlfWorkflow)).toEqual(['first-job', 'second-job']);
    expect(getTimeoutMinutes(crlfWorkflow, 'second-job')).toBe(10);
  });

  it('caps individual Node.js and Bun tests at 30 seconds', () => {
    expect(packageJson.scripts.test).toBe(
      'node --test --test-timeout=30000 tests/*.test.js'
    );
    expect(jsWorkflow).toContain('run: bun test --timeout 30000');
  });
});
