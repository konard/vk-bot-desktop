#!/usr/bin/env node

/**
 * Dispatch a GitHub Actions workflow and wait for its result.
 *
 * `gh workflow run` only confirms that the dispatch event was accepted. This
 * script finds the child run and uses `gh run watch --exit-status` so the
 * caller fails when the dispatched workflow fails.
 */

import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const CAPTURE_OPTIONS = {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
};

const WATCH_OPTIONS = {
  encoding: 'utf8',
  stdio: 'inherit',
};

const DEFAULT_POLL_TIMEOUT_SECONDS = 120;
const POLL_INTERVAL_MS = 5000;
const CREATED_AT_CLOCK_SKEW_MS = 10_000;

export function extractRunIdFromText(text) {
  return String(text || '').match(/\/actions\/runs\/(\d+)\b/)?.[1];
}

function parseArgs(args) {
  const options = {
    fields: [],
    pollTimeoutSeconds: DEFAULT_POLL_TIMEOUT_SECONDS,
    ref: 'main',
  };

  for (let index = 0; index < args.length; index++) {
    const name = args[index];
    const value = args[index + 1];

    if (!name.startsWith('--')) {
      throw new Error(`Unexpected positional argument: ${name}`);
    }

    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${name}`);
    }

    index++;

    if (name === '--repo') {
      options.repository = value;
    } else if (name === '--workflow') {
      options.workflow = value;
    } else if (name === '--ref') {
      options.ref = value;
    } else if (name === '--field') {
      options.fields.push(value);
    } else if (name === '--match-head-sha') {
      options.matchHeadSha = value;
    } else if (name === '--poll-timeout-seconds') {
      options.pollTimeoutSeconds = Number(value);
    } else {
      throw new Error(`Unknown option: ${name}`);
    }
  }

  if (!options.repository) {
    throw new Error('--repo is required');
  }

  if (!options.workflow) {
    throw new Error('--workflow is required');
  }

  if (!Number.isFinite(options.pollTimeoutSeconds)) {
    throw new Error('--poll-timeout-seconds must be a number');
  }

  return options;
}

function getCreatedAtTime(run) {
  const time = new Date(run.createdAt).getTime();

  return Number.isFinite(time) ? time : 0;
}

export function pickWorkflowRun(runs, { matchHeadSha, notBefore } = {}) {
  const notBeforeTime = notBefore
    ? new Date(notBefore).getTime() - CREATED_AT_CLOCK_SKEW_MS
    : 0;

  return [...runs]
    .filter((run) => !matchHeadSha || run.headSha === matchHeadSha)
    .filter((run) => getCreatedAtTime(run) >= notBeforeTime)
    .sort((left, right) => getCreatedAtTime(right) - getCreatedAtTime(left))[0];
}

function formatProcessOutput(result) {
  return [result.stdout, result.stderr]
    .filter((output) => typeof output === 'string' && output.trim())
    .map((output) => output.trim())
    .join('\n');
}

function sleepMilliseconds(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function listWorkflowRuns({ repository, spawn, workflow, stderr, stdout }) {
  const result = spawn(
    'gh',
    [
      'run',
      'list',
      '--repo',
      repository,
      '--workflow',
      workflow,
      '--event',
      'workflow_dispatch',
      '--limit',
      '20',
      '--json',
      'databaseId,headSha,status,createdAt,url',
    ],
    CAPTURE_OPTIONS
  );

  if (result.error) {
    throw new Error(`gh run list failed to start: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const output = formatProcessOutput(result);
    if (output) {
      stderr(output);
    }
    throw new Error(`gh run list exited with status ${result.status}`);
  }

  try {
    return JSON.parse(result.stdout || '[]');
  } catch (error) {
    stdout(result.stdout || '');
    throw new Error(`Could not parse gh run list output: ${error.message}`);
  }
}

function findDispatchedRunId({
  matchHeadSha,
  notBefore,
  pollTimeoutSeconds,
  repository,
  sleep,
  spawn,
  stderr,
  stdout,
  workflow,
}) {
  const deadline = Date.now() + pollTimeoutSeconds * 1000;

  while (Date.now() <= deadline) {
    const runs = listWorkflowRuns({
      repository,
      spawn,
      workflow,
      stderr,
      stdout,
    });
    const run = pickWorkflowRun(runs, { matchHeadSha, notBefore });

    if (run?.databaseId) {
      stdout(`Watching dispatched workflow run: ${run.url || run.databaseId}`);
      return String(run.databaseId);
    }

    sleep(POLL_INTERVAL_MS);
  }

  const suffix = matchHeadSha ? ` at ${matchHeadSha}` : '';

  throw new Error(
    `Timed out waiting for ${workflow} workflow_dispatch run${suffix}`
  );
}

function runWorkflow({ fields, ref, repository, spawn, workflow }) {
  const args = [
    'workflow',
    'run',
    workflow,
    '--repo',
    repository,
    '--ref',
    ref,
  ];

  for (const field of fields) {
    args.push('--field', field);
  }

  return spawn('gh', args, CAPTURE_OPTIONS);
}

function watchRun({ repository, runId, spawn }) {
  return spawn(
    'gh',
    ['run', 'watch', runId, '--repo', repository, '--compact', '--exit-status'],
    WATCH_OPTIONS
  );
}

function getProcessStatus(result, commandName, stderr) {
  if (result.error) {
    stderr(`${commandName} failed to start: ${result.error.message}`);
    return 1;
  }

  return result.status ?? 1;
}

export function dispatchAndWatchWorkflow({
  args = process.argv.slice(2),
  now = () => new Date(),
  sleep = sleepMilliseconds,
  spawn = spawnSync,
  stderr = console.error,
  stdout = console.log,
} = {}) {
  try {
    const options = parseArgs(args);
    const notBefore = now();
    const dispatch = runWorkflow({ ...options, spawn });
    const output = formatProcessOutput(dispatch);

    if (output) {
      stdout(output);
    }

    const dispatchStatus = getProcessStatus(
      dispatch,
      'gh workflow run',
      stderr
    );

    if (dispatchStatus !== 0) {
      return dispatchStatus;
    }

    const runId =
      extractRunIdFromText(output) ||
      findDispatchedRunId({
        ...options,
        notBefore,
        sleep,
        spawn,
        stderr,
        stdout,
      });
    const watch = watchRun({ ...options, runId, spawn });

    return getProcessStatus(watch, 'gh run watch', stderr);
  } catch (error) {
    stderr(error.message);
    return 1;
  }
}

function isMainModule() {
  return (
    typeof process !== 'undefined' &&
    Boolean(process.argv?.[1]) &&
    import.meta.url === pathToFileURL(process.argv[1]).href
  );
}

if (isMainModule()) {
  process.exitCode = dispatchAndWatchWorkflow();
}
