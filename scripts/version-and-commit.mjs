#!/usr/bin/env bun

/**
 * Version packages and commit to main
 * Usage: node scripts/version-and-commit.mjs --mode <changeset|instant> [--bump-type <type>] [--description <desc>] [--js-root <path>]
 *   changeset: Run changeset version
 *   instant: Run instant version bump with bump_type (patch|minor|major) and optional description
 *
 * Configuration:
 * - CLI: --js-root <path> to explicitly set JavaScript root
 * - Environment: JS_ROOT=<path>
 *
 * Uses link-foundation libraries:
 * - use-m: Dynamic package loading without package.json dependencies
 * - command-stream: Modern shell command execution with streaming support
 * - lino-arguments: Unified configuration from CLI args, env vars, and .lenv files
 *
 * Addresses issues documented in:
 * - Issue #21: Supporting both single and multi-language repository structures
 * - Reference: link-assistant/agent PR #112 (--legacy-peer-deps fix)
 * - Reference: link-assistant/agent PR #114 (configurable package root)
 */

import { readFileSync, appendFileSync, readdirSync } from 'fs';

import {
  getJsRoot,
  getPackageJsonPath,
  getChangesetDir,
  needsCd,
  parseJsRootConfig,
} from './js-paths.mjs';

// Load use-m dynamically
const { use } = eval(
  await (await fetch('https://unpkg.com/use-m/use.js')).text()
);

// Import link-foundation libraries
const { $ } = await use('command-stream');
const { makeConfig } = await use('lino-arguments');

// Parse CLI arguments using lino-arguments
const config = makeConfig({
  yargs: ({ yargs, getenv }) =>
    yargs
      .option('mode', {
        type: 'string',
        default: getenv('MODE', 'changeset'),
        describe: 'Version mode: changeset or instant',
        choices: ['changeset', 'instant'],
      })
      .option('bump-type', {
        type: 'string',
        default: getenv('BUMP_TYPE', ''),
        describe: 'Version bump type for instant mode: major, minor, or patch',
      })
      .option('description', {
        type: 'string',
        default: getenv('DESCRIPTION', ''),
        describe: 'Description for instant version bump',
      })
      .option('js-root', {
        type: 'string',
        default: getenv('JS_ROOT', ''),
        describe:
          'JavaScript package root directory (auto-detected if not specified)',
      }),
});

const { mode, bumpType, description, jsRoot: jsRootArg } = config;

// Get JavaScript package root (auto-detect or use explicit config)
const jsRootConfig = jsRootArg || parseJsRootConfig();
const jsRoot = getJsRoot({ jsRoot: jsRootConfig, verbose: true });

// Debug: Log parsed configuration
console.log('Parsed configuration:', {
  mode,
  bumpType,
  description: description || '(none)',
  jsRoot,
});

// Detect if positional arguments were used (common mistake)
const args = process.argv.slice(2);
if (args.length > 0 && !args[0].startsWith('--')) {
  console.error('Error: Positional arguments detected!');
  console.error('Command line arguments:', args);
  console.error('');
  console.error(
    'This script requires named arguments (--mode, --bump-type, --description, --js-root).'
  );
  console.error('Usage:');
  console.error('  Changeset mode:');
  console.error(
    '    node scripts/version-and-commit.mjs --mode changeset [--js-root <path>]'
  );
  console.error('  Instant mode:');
  console.error(
    '    node scripts/version-and-commit.mjs --mode instant --bump-type <major|minor|patch> [--description <desc>] [--js-root <path>]'
  );
  console.error('');
  console.error('Examples:');
  console.error(
    '  node scripts/version-and-commit.mjs --mode instant --bump-type patch --description "Fix bug"'
  );
  console.error('  node scripts/version-and-commit.mjs --mode changeset');
  console.error(
    '  node scripts/version-and-commit.mjs --mode changeset --js-root js'
  );
  process.exit(1);
}

// Validation: Ensure mode is set correctly
if (mode !== 'changeset' && mode !== 'instant') {
  console.error(`Invalid mode: "${mode}". Expected "changeset" or "instant".`);
  console.error('Command line arguments:', process.argv.slice(2));
  process.exit(1);
}

// Validation: Ensure bump type is provided for instant mode
if (mode === 'instant' && !bumpType) {
  console.error('Error: --bump-type is required for instant mode');
  console.error(
    'Usage: node scripts/version-and-commit.mjs --mode instant --bump-type <major|minor|patch> [--description <desc>] [--js-root <path>]'
  );
  process.exit(1);
}

// Store the original working directory to restore after cd commands
// IMPORTANT: command-stream's cd is a virtual command that calls process.chdir()
const originalCwd = process.cwd();

// command-stream's `$` resolves the awaited promise even when the underlying
// process exits non-zero (see docs/case-studies/issue-53). Every git invocation
// here must check `result.code` explicitly, otherwise a rejected `git push`
// or failed `git rebase` is silently treated as success.
function assertOk(result, label) {
  if (result.code !== 0) {
    const detail = (result.stderr || result.stdout || '').toString().trim();
    const suffix = detail ? `:\n${detail}` : '';
    throw new Error(`${label} failed with exit code ${result.code}${suffix}`);
  }
  return result;
}

/**
 * Append to GitHub Actions output file
 * @param {string} key
 * @param {string} value
 */
function setOutput(key, value) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    appendFileSync(outputFile, `${key}=${value}\n`);
  }
}

/**
 * Count changeset files (excluding README.md)
 */
function countChangesets() {
  try {
    const changesetDir = getChangesetDir({ jsRoot });
    const files = readdirSync(changesetDir);
    return files.filter((f) => f.endsWith('.md') && f !== 'README.md').length;
  } catch {
    return 0;
  }
}

/**
 * Get package version
 * @param {string} source - 'local' or 'remote'
 */
async function getVersion(source = 'local') {
  const packageJsonPath = getPackageJsonPath({ jsRoot });
  if (source === 'remote') {
    const result = assertOk(
      await $`git show origin/main:${packageJsonPath}`.run({ capture: true }),
      `git show origin/main:${packageJsonPath}`
    );
    return JSON.parse(result.stdout).version;
  }
  return JSON.parse(readFileSync(packageJsonPath, 'utf8')).version;
}

/**
 * Stash any uncommitted changes (including untracked files) before a rebase so
 * `npm install` lockfile drift does not abort the rebase with "cannot rebase:
 * You have unstaged changes."  Returns the stash entry id, or null if there
 * was nothing to stash.
 */
async function stashLocalChanges(label) {
  const result = assertOk(
    await $`git stash push --include-untracked -m ${label}`.run({
      capture: true,
    }),
    'git stash push'
  );
  // Newer git: "No local changes to save".  Older git: similar wording.
  if (result.stdout.includes('No local changes to save')) {
    return null;
  }
  return label;
}

async function popStash(label) {
  // `stash pop` by index 0 is what we created.  Use the label to assert it is
  // still ours before popping (a concurrent stash inside this run would
  // surface as a different label and we want to fail loudly).
  const listResult = assertOk(
    await $`git stash list`.run({ capture: true }),
    'git stash list'
  );
  if (!listResult.stdout.includes(label)) {
    throw new Error(
      `Expected stash entry "${label}" not found before pop. Aborting to avoid corrupting state.\nStash list:\n${listResult.stdout}`
    );
  }
  assertOk(await $`git stash pop`.run({ capture: true }), 'git stash pop');
}

/**
 * Attempt to push `main`, retrying on non-fast-forward rejections by
 * re-fetching, re-rebasing, and re-pushing.  This handles the race where
 * another job pushes to `main` between our last fetch and our push.
 *
 * Returns the locally-committed SHA that is now on `origin/main` (verified by
 * `git rev-parse`).  Throws on persistent failure.
 */
async function pushWithRetry({ maxAttempts = 3 } = {}) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const pushResult = await $`git push origin HEAD:main`.run({
      capture: true,
    });

    if (pushResult.code === 0) {
      // Verify the push actually landed.  This catches the historical bug
      // where git printed "non-fast-forward" to stderr but exit code lookups
      // were skipped — defence in depth even though we now check `code`.
      assertOk(
        await $`git fetch origin main`.run({ capture: true }),
        'git fetch origin main (post-push verify)'
      );
      const localHead = assertOk(
        await $`git rev-parse HEAD`.run({ capture: true }),
        'git rev-parse HEAD'
      ).stdout.trim();
      const remoteHead = assertOk(
        await $`git rev-parse origin/main`.run({ capture: true }),
        'git rev-parse origin/main'
      ).stdout.trim();
      if (localHead !== remoteHead) {
        throw new Error(
          `git push exited 0 but origin/main (${remoteHead}) does not match local HEAD (${localHead}). Refusing to declare success.`
        );
      }
      return localHead;
    }

    const errorText = (pushResult.stderr || pushResult.stdout || '').toString();
    const isNonFastForward = /non-fast-forward|rejected|\[rejected\]/.test(
      errorText
    );

    if (!isNonFastForward || attempt === maxAttempts) {
      throw new Error(
        `git push origin HEAD:main failed (attempt ${attempt}/${maxAttempts}) with exit code ${pushResult.code}:\n${errorText.trim()}`
      );
    }

    console.log(
      `Push rejected as non-fast-forward (attempt ${attempt}/${maxAttempts}). Re-fetching and rebasing before retry...`
    );

    assertOk(
      await $`git fetch origin main`.run({ capture: true }),
      'git fetch origin main (retry)'
    );

    const stashLabel = `version-and-commit-retry-${Date.now()}-${attempt}`;
    const stash = await stashLocalChanges(stashLabel);
    try {
      assertOk(
        await $`git rebase origin/main`.run({ capture: true }),
        'git rebase origin/main (retry)'
      );
    } finally {
      if (stash) {
        await popStash(stash);
      }
    }
  }

  // Unreachable — the loop either returns or throws — but keeps the type
  // checker / linter happy.
  throw new Error('pushWithRetry exhausted attempts without returning');
}

async function runVersionBump() {
  if (mode === 'instant') {
    console.log('Running instant version bump...');
    // Rely on command-stream's auto-quoting for proper argument handling.
    if (description) {
      assertOk(
        await $`node scripts/instant-version-bump.mjs --bump-type ${bumpType} --description ${description} --js-root ${jsRoot}`.run(
          { capture: true }
        ),
        'instant-version-bump.mjs'
      );
    } else {
      assertOk(
        await $`node scripts/instant-version-bump.mjs --bump-type ${bumpType} --js-root ${jsRoot}`.run(
          { capture: true }
        ),
        'instant-version-bump.mjs'
      );
    }
    return;
  }

  console.log('Running changeset version...');
  // command-stream's `cd` is a virtual command that calls process.chdir(),
  // so we restore the cwd afterwards.
  if (needsCd({ jsRoot })) {
    assertOk(
      await $`cd ${jsRoot} && npm run changeset:version`.run({
        capture: true,
      }),
      'npm run changeset:version'
    );
    process.chdir(originalCwd);
  } else {
    assertOk(
      await $`npm run changeset:version`.run({ capture: true }),
      'npm run changeset:version'
    );
  }
}

async function main() {
  try {
    // Configure git
    assertOk(
      await $`git config user.name "github-actions[bot]"`.run({
        capture: true,
      }),
      'git config user.name'
    );
    assertOk(
      await $`git config user.email "github-actions[bot]@users.noreply.github.com"`.run(
        { capture: true }
      ),
      'git config user.email'
    );

    // Check if remote main has advanced (handles re-runs after partial success)
    console.log('Checking for remote changes...');
    assertOk(
      await $`git fetch origin main`.run({ capture: true }),
      'git fetch origin main'
    );

    const localHead = assertOk(
      await $`git rev-parse HEAD`.run({ capture: true }),
      'git rev-parse HEAD'
    ).stdout.trim();

    const remoteHead = assertOk(
      await $`git rev-parse origin/main`.run({ capture: true }),
      'git rev-parse origin/main'
    ).stdout.trim();

    if (localHead !== remoteHead) {
      console.log(
        `Remote main has advanced (local: ${localHead}, remote: ${remoteHead})`
      );
      console.log('This may indicate a previous attempt partially succeeded.');

      // Check if the remote version is already the expected bump
      const remoteVersion = await getVersion('remote');
      console.log(`Remote version: ${remoteVersion}`);

      // Check if there are changesets to process
      const changesetCount = countChangesets();

      if (changesetCount === 0) {
        console.log('No changesets to process and remote has advanced.');
        console.log(
          'Assuming version bump was already completed in a previous attempt.'
        );
        setOutput('version_committed', 'false');
        setOutput('already_released', 'true');
        setOutput('new_version', remoteVersion);
        setOutput('committed_sha', remoteHead);
        return;
      } else {
        console.log('Rebasing on remote main to incorporate changes...');
        // `npm install` (run in the prior workflow step) can rewrite
        // `package-lock.json`, leaving the working tree dirty.  Without this
        // stash, `git rebase` aborts with "cannot rebase: You have unstaged
        // changes." (see docs/case-studies/issue-53).
        const stashLabel = `version-and-commit-initial-${Date.now()}`;
        const stash = await stashLocalChanges(stashLabel);
        try {
          assertOk(
            await $`git rebase origin/main`.run({ capture: true }),
            'git rebase origin/main'
          );
        } finally {
          if (stash) {
            await popStash(stash);
          }
        }
      }
    }

    // Get current version before bump
    const oldVersion = await getVersion();
    console.log(`Current version: ${oldVersion}`);

    await runVersionBump();

    // Get new version after bump
    const newVersion = await getVersion();
    console.log(`New version: ${newVersion}`);
    setOutput('new_version', newVersion);

    // Check if there are changes to commit
    const statusResult = assertOk(
      await $`git status --porcelain`.run({ capture: true }),
      'git status --porcelain'
    );
    const status = statusResult.stdout.trim();

    if (status) {
      console.log('Changes detected, committing...');

      // Stage all changes (package.json, package-lock.json, CHANGELOG.md, deleted changesets)
      assertOk(await $`git add -A`.run({ capture: true }), 'git add -A');

      // Commit with version number as message
      const commitMessage = newVersion;
      const escapedMessage = commitMessage.replace(/"/g, '\\"');
      assertOk(
        await $`git commit -m "${escapedMessage}"`.run({ capture: true }),
        'git commit'
      );

      // Push to main with retry on non-fast-forward.  Throws if the push
      // ultimately fails, so a rejected push always becomes a job failure
      // rather than a false-positive success (issue #53).
      const committedSha = await pushWithRetry();

      console.log(
        `\u2705 Version bump ${newVersion} committed and pushed to main as ${committedSha}`
      );
      setOutput('version_committed', 'true');
      setOutput('committed_sha', committedSha);
    } else {
      console.log('No changes to commit');
      setOutput('version_committed', 'false');
      setOutput('committed_sha', localHead);
    }
  } catch (error) {
    // Restore cwd on error
    process.chdir(originalCwd);
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
