#!/usr/bin/env node

// Detect code changes for CI/CD pipeline
//
// Detects what types of files changed in the latest commit and outputs
// results for use in GitHub Actions workflow conditions.
//
// Diff strategy is selected by $GITHUB_EVENT_NAME:
// - pull_request: GitHub Actions checks out a synthetic merge commit, so
//   HEAD is the merge, HEAD^ is the base, HEAD^2 is the PR head. We
//   compare HEAD^2^ to HEAD^2 to get the per-commit diff of the PR head.
// - push (and everything else): HEAD is the real commit, including real
//   merge commits landed on main via "Merge pull request". We compare
//   HEAD^ to HEAD, which on a merge commit follows the first-parent line
//   and surfaces the full content brought into main by the merge.
//
// Counting parents on HEAD is intentionally NOT used to pick the diff
// strategy. Real merge commits exist on push events too, and treating
// them like pull_request synthetic merges caused issue #28 (Pages skipped
// after every "Merge pull request" landing on main).
//
// Excluded from code changes (don't require changesets):
// - Markdown files in any folder
// - .changeset/ folder (changeset metadata)
// - docs/ folder (documentation)
// - experiments/ folder (experimental scripts)
// - examples/ folder (example scripts)
//
// Outputs (written to GITHUB_OUTPUT):
//   mjs-changed, js-changed, package-changed, docs-changed,
//   html-changed, site-changed, pages-changed, links-changed,
//   workflow-changed, any-code-changed
//
// Verbose tracing: set CI_DETECT_VERBOSE=1 (or pass --verbose) to print
// the event metadata and chosen diff command alongside the change list,
// for after-the-fact diagnosis of misclassified runs.

import { execSync } from 'child_process';
import { appendFileSync } from 'fs';

const verbose =
  process.env.CI_DETECT_VERBOSE === '1' ||
  process.env.CI_DETECT_VERBOSE === 'true' ||
  process.argv.includes('--verbose');

function exec(command) {
  try {
    return execSync(command, { encoding: 'utf-8' }).trim();
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.message);
    return '';
  }
}

function setOutput(name, value) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    appendFileSync(outputFile, `${name}=${value}\n`);
  }
  console.log(`${name}=${value}`);
}

function parentCount() {
  return exec('git cat-file -p HEAD')
    .split('\n')
    .filter((line) => line.startsWith('parent ')).length;
}

function getChangedFiles() {
  const eventName = process.env.GITHUB_EVENT_NAME || '';
  const ref = process.env.GITHUB_REF || '';
  const parents = parentCount();

  if (verbose || !process.env.GITHUB_OUTPUT) {
    // Print event metadata to help diagnose misclassified runs without
    // having to re-run the workflow. Echoed unconditionally outside CI
    // so local invocations are also self-documenting.
    console.log(`Event: ${eventName || '(unset)'}`);
    console.log(`Ref:   ${ref || '(unset)'}`);
    console.log(`Parents on HEAD: ${parents}`);
  }

  if (eventName === 'pull_request' && parents > 1) {
    console.log('pull_request event with synthetic merge commit');
    console.log('Comparing HEAD^2^ to HEAD^2 (per-commit diff of PR head)');
    try {
      const output = exec('git diff --name-only HEAD^2^ HEAD^2');
      return output ? output.split('\n').filter(Boolean) : [];
    } catch {
      console.log(
        'HEAD^2^ not available (first commit in PR), listing files in HEAD^2'
      );
      const output = exec('git diff --name-only HEAD^ HEAD^2');
      return output ? output.split('\n').filter(Boolean) : [];
    }
  }

  console.log('Comparing HEAD^ to HEAD (first-parent diff)');
  try {
    const output = exec('git diff --name-only HEAD^ HEAD');
    return output ? output.split('\n').filter(Boolean) : [];
  } catch {
    console.log('HEAD^ not available, listing all files in HEAD');
    const output = exec('git ls-tree --name-only -r HEAD');
    return output ? output.split('\n').filter(Boolean) : [];
  }
}

function isExcludedFromCodeChanges(filePath) {
  if (filePath.endsWith('.md')) {
    return true;
  }

  const excludedFolders = ['.changeset/', 'docs/', 'experiments/', 'examples/'];

  for (const folder of excludedFolders) {
    if (filePath.startsWith(folder)) {
      return true;
    }
  }

  return false;
}

function detectChanges() {
  console.log('Detecting file changes for CI/CD...\n');

  const changedFiles = getChangedFiles();

  console.log('Changed files:');
  if (changedFiles.length === 0) {
    console.log('  (none)');
  } else {
    changedFiles.forEach((file) => console.log(`  ${file}`));
  }
  console.log('');

  const mjsChanged = changedFiles.some((file) => file.endsWith('.mjs'));
  setOutput('mjs-changed', mjsChanged ? 'true' : 'false');

  const jsChanged = changedFiles.some((file) => file.endsWith('.js'));
  setOutput('js-changed', jsChanged ? 'true' : 'false');

  const packageChanged = changedFiles.some((file) => file === 'package.json');
  setOutput('package-changed', packageChanged ? 'true' : 'false');

  const docsChanged = changedFiles.some((file) => file.endsWith('.md'));
  setOutput('docs-changed', docsChanged ? 'true' : 'false');

  const htmlChanged = changedFiles.some((file) => file.endsWith('.html'));
  setOutput('html-changed', htmlChanged ? 'true' : 'false');

  const siteChanged = changedFiles.some((file) => file.startsWith('site/'));
  setOutput('site-changed', siteChanged ? 'true' : 'false');

  const workflowChanged = changedFiles.some((file) =>
    file.startsWith('.github/workflows/')
  );
  setOutput('workflow-changed', workflowChanged ? 'true' : 'false');

  const pagesChanged = changedFiles.some(
    (file) =>
      file.startsWith('site/') ||
      file === 'scripts/build-site.mjs' ||
      file === 'scripts/test-pages-e2e.mjs' ||
      file === 'package.json' ||
      file === 'package-lock.json' ||
      file === '.github/workflows/js.yml'
  );
  setOutput('pages-changed', pagesChanged ? 'true' : 'false');

  const linksChanged = docsChanged || htmlChanged || workflowChanged;
  setOutput('links-changed', linksChanged ? 'true' : 'false');

  const codeChangedFiles = changedFiles.filter(
    (file) => !isExcludedFromCodeChanges(file)
  );

  console.log('\nFiles considered as code changes:');
  if (codeChangedFiles.length === 0) {
    console.log('  (none)');
  } else {
    codeChangedFiles.forEach((file) => console.log(`  ${file}`));
  }
  console.log('');

  const codePattern = /\.(mjs|js|json|yml|yaml)$|\.github\/workflows\//;
  const anyCodeChanged = codeChangedFiles.some((file) =>
    codePattern.test(file)
  );
  setOutput('any-code-changed', anyCodeChanged ? 'true' : 'false');

  console.log('\nChange detection completed.');
}

// Run the detection
detectChanges();
