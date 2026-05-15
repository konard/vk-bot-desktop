import { describe, it, expect } from 'test-anywhere';
import { readFileSync } from 'node:fs';

// Regression tests for docs/case-studies/issue-53.
//
// The failing run 25892544573 of `js.yml` showed that:
//
//   1. `scripts/version-and-commit.mjs` used `await $`...`` from command-stream
//      without inspecting `result.code`, so a rejected `git push` (non
//      fast-forward) silently reported success.
//   2. The release workflow then derived its release SHA from
//      `git rev-parse origin/main`, which had been moved forward by a
//      concurrent `preview-regen` push to a non-release commit. The desktop
//      build picked that SHA and produced artifacts named after the old
//      version (0.11.0) while desktop-publish demanded the new tag (0.12.0).
//   3. `preview-regen` ran in the same workflow run as `release` with no
//      `needs:` link, so the two jobs raced to push to main.
//
// These tests verify that the script and workflow keep the guards that
// prevent the failure from recurring.
function readText(filePath) {
  return readFileSync(filePath, 'utf8').replaceAll('\r\n', '\n');
}

const versionScript = readText('scripts/version-and-commit.mjs');
const releaseWorkflow = readText('.github/workflows/js.yml');

function workflowJob(workflow, jobName) {
  const lines = workflow.split('\n');
  const start = lines.findIndex((line) => line === `  ${jobName}:`);

  if (start === -1) {
    return '';
  }

  let end = lines.length;

  for (let index = start + 1; index < lines.length; index++) {
    if (/^ {2}[a-zA-Z0-9_-]+:\s*$/.test(lines[index])) {
      end = index;
      break;
    }
  }

  return lines.slice(start, end).join('\n');
}

describe('version-and-commit guards (issue #53)', () => {
  it('checks the exit code of every awaited command-stream invocation', () => {
    // Strip out the helper definitions and their bodies, where bare
    // `await $`...`` patterns are expected to live (assertOk is the wrapper
    // applied by every other call site).
    const lines = versionScript.split('\n');
    const unguarded = [];

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      // Skip the assertOk / stash / push helper definitions; their bodies
      // contain the only allowed bare `await $\`` lines.
      if (
        /^(?:function assertOk|async function stashLocalChanges|async function popStash|async function pushWithRetry)/.test(
          line
        )
      ) {
        // Skip until the matching closing brace at column 0.
        index += 1;
        while (index < lines.length && lines[index] !== '}') {
          index += 1;
        }
        continue;
      }

      if (
        /await \$`/.test(line) &&
        !/assertOk\s*\(/.test(line) &&
        !/await \$`.*`\.run/.test(lines[index + 1] ?? '') === false
      ) {
        // The previous condition is overly conservative — fall through to the
        // real check below.
      }

      if (/await \$`/.test(line) && !line.includes('assertOk')) {
        // Allow multi-line invocations where assertOk wraps the awaited
        // expression on the preceding line.
        const previous = lines[index - 1] ?? '';
        if (!previous.includes('assertOk')) {
          unguarded.push(`${index + 1}: ${line}`);
        }
      }
    }

    expect(unguarded).toEqual([]);
  });

  it('exposes an assertOk helper that throws on non-zero exit', () => {
    expect(versionScript).toContain('function assertOk(result, label)');
    expect(versionScript).toContain('if (result.code !== 0)');
    expect(versionScript).toContain('throw new Error(');
  });

  it('retries the push on non-fast-forward rejections', () => {
    expect(versionScript).toContain('async function pushWithRetry');
    expect(versionScript).toContain('git push origin HEAD:main');
    expect(versionScript).toMatch(/non-fast-forward|\\[rejected\\]/);
    expect(versionScript).toContain('git rebase origin/main');
  });

  it('verifies origin/main matches HEAD after a successful push', () => {
    expect(versionScript).toContain('git rev-parse origin/main');
    expect(versionScript).toContain('Refusing to declare success');
  });

  it('stashes uncommitted changes before rebasing', () => {
    expect(versionScript).toContain('git stash push --include-untracked');
    expect(versionScript).toContain('git stash pop');
  });

  it('emits committed_sha output for downstream jobs', () => {
    // All three terminal branches of main() must write committed_sha so the
    // workflow can pin downstream desktop jobs to the exact release commit.
    const occurrences =
      versionScript.match(/setOutput\('committed_sha'/g) || [];
    expect(occurrences.length).toBeGreaterThanOrEqual(3);
  });
});

describe('release workflow consumes committed_sha (issue #53)', () => {
  it('uses committed_sha in the release.release_target step', () => {
    const release = workflowJob(releaseWorkflow, 'release');
    expect(release).toContain(
      'COMMITTED_SHA: ${{ steps.version.outputs.committed_sha }}'
    );
    expect(release).toContain('SHA="$COMMITTED_SHA"');
  });

  it('uses committed_sha in the instant-release.release_target step', () => {
    const instant = workflowJob(releaseWorkflow, 'instant-release');
    expect(instant).toContain(
      'COMMITTED_SHA: ${{ steps.version.outputs.committed_sha }}'
    );
    expect(instant).toContain('SHA="$COMMITTED_SHA"');
  });

  it('orders preview-regen after release and instant-release jobs', () => {
    const preview = workflowJob(releaseWorkflow, 'preview-regen');
    expect(preview).toContain('needs: [release, instant-release]');
    // Cancelled runs must still abort, but skipped upstream jobs must not.
    expect(preview).toContain('!cancelled()');
    expect(preview).toContain("needs.release.result != 'failure'");
    expect(preview).toContain("needs.instant-release.result != 'failure'");
  });
});
