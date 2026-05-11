import { describe, it, expect } from 'test-anywhere';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  readFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';

// Tests for scripts/detect-code-changes.mjs.
//
// Regression coverage for issue #28: when a "Merge pull request" commit
// lands on main, the script must NOT take the pull_request synthetic-merge
// diff branch. Doing so silently dropped site changes from the diff and
// caused Build Pages site / Deploy Pages site to be skipped on main pushes.

const scriptPath = fileURLToPath(
  new URL('../scripts/detect-code-changes.mjs', import.meta.url)
);

const isDenoRuntime = typeof Deno !== 'undefined';
const canRunGitFixtures =
  !isDenoRuntime &&
  typeof process !== 'undefined' &&
  process.platform !== 'win32';

function git(cwd, args, extraEnv) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'Test',
      GIT_AUTHOR_EMAIL: 'test@example.com',
      GIT_COMMITTER_NAME: 'Test',
      GIT_COMMITTER_EMAIL: 'test@example.com',
      ...(extraEnv || {}),
    },
  });
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(' ')} failed in ${cwd}:\n${result.stdout}\n${result.stderr}`
    );
  }
  return result.stdout.trim();
}

function initRepo() {
  const root = mkdtempSync(path.join(tmpdir(), 'detect-changes-'));
  git(root, ['init', '-q', '-b', 'main']);
  git(root, ['config', 'commit.gpgsign', 'false']);
  return root;
}

function writeFile(root, relPath, contents) {
  const abs = path.join(root, relPath);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, contents);
}

function commit(root, files, message) {
  for (const [relPath, contents] of Object.entries(files)) {
    writeFile(root, relPath, contents);
  }
  git(root, ['add', '-A']);
  git(root, ['commit', '-q', '-m', message]);
  return git(root, ['rev-parse', 'HEAD']);
}

function runDetect(root, env) {
  const outputFile = path.join(root, 'gh-output');
  writeFileSync(outputFile, '');
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      GITHUB_OUTPUT: outputFile,
      CI_DETECT_VERBOSE: '1',
      ...(env || {}),
    },
  });
  if (result.status !== 0) {
    throw new Error(
      `detect-code-changes failed (status ${result.status}):\n${result.stdout}\n${result.stderr}`
    );
  }
  const outputs = {};
  for (const line of readFileSync(outputFile, 'utf8').split('\n')) {
    if (!line) {
      continue;
    }
    const idx = line.indexOf('=');
    outputs[line.slice(0, idx)] = line.slice(idx + 1);
  }
  return { stdout: result.stdout, outputs };
}

describe('detect-code-changes.mjs', () => {
  if (!canRunGitFixtures) {
    it.skip?.('skipped on Deno or Windows runner');
    return;
  }

  it('treats a push of a real merge commit on main with first-parent diff', () => {
    const root = initRepo();
    try {
      // Base commit on main.
      commit(root, { 'README.md': 'initial\n' }, 'initial');

      // Feature branch with site changes.
      git(root, ['checkout', '-q', '-b', 'feature']);
      commit(
        root,
        {
          'site/App.jsx': 'export default function App() { return null; }\n',
        },
        'feat: site change'
      );

      // Back to main and create a non-fast-forward merge commit.
      git(root, ['checkout', '-q', 'main']);
      git(root, [
        'merge',
        '--no-ff',
        '-q',
        '-m',
        'Merge pull request #99 from feature',
        'feature',
      ]);

      const { stdout, outputs } = runDetect(root, {
        GITHUB_EVENT_NAME: 'push',
        GITHUB_REF: 'refs/heads/main',
      });

      // The merge brought in site/App.jsx via the first-parent diff,
      // so pages-changed must be true.
      expect(outputs['pages-changed']).toBe('true');
      expect(outputs['site-changed']).toBe('true');
      expect(stdout).toContain('Comparing HEAD^ to HEAD (first-parent diff)');
      expect(stdout).not.toContain(
        'pull_request event with synthetic merge commit'
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('uses HEAD^2 diff for pull_request synthetic merge commits', () => {
    const root = initRepo();
    try {
      // Base.
      commit(root, { 'README.md': 'initial\n' }, 'initial');

      // Feature branch with one PR-head commit.
      git(root, ['checkout', '-q', '-b', 'feature']);
      commit(root, { 'site/styles.css': 'body {}\n' }, 'feat: PR head commit');
      const prHead = git(root, ['rev-parse', 'HEAD']);

      // Synthetic merge commit: GitHub Actions checks out a merge of
      // base into PR head. We emulate that locally.
      git(root, ['checkout', '-q', 'main']);
      git(root, [
        'merge',
        '--no-ff',
        '-q',
        '-m',
        'Merge pull request synthetic',
        prHead,
      ]);

      const { stdout, outputs } = runDetect(root, {
        GITHUB_EVENT_NAME: 'pull_request',
        GITHUB_REF: 'refs/pull/99/merge',
      });

      expect(outputs['pages-changed']).toBe('true');
      expect(stdout).toContain(
        'pull_request event with synthetic merge commit'
      );
      expect(stdout).toContain(
        'Comparing HEAD^2^ to HEAD^2 (per-commit diff of PR head)'
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('uses HEAD^..HEAD on a plain non-merge push commit', () => {
    const root = initRepo();
    try {
      commit(root, { 'README.md': 'initial\n' }, 'initial');
      commit(root, { 'tests/foo.test.js': '// noop\n' }, 'test: add test');

      const { stdout, outputs } = runDetect(root, {
        GITHUB_EVENT_NAME: 'push',
        GITHUB_REF: 'refs/heads/main',
      });

      expect(outputs['js-changed']).toBe('true');
      expect(outputs['pages-changed']).toBe('false');
      expect(stdout).toContain('Comparing HEAD^ to HEAD (first-parent diff)');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('regression: issue #28 - "Merge pull request" of a non-site PR on main does not classify as pull_request', () => {
    // This is the exact failure shape from run 25656741546: a real merge
    // commit lands on main via the "Merge pull request" button, and the
    // PR head touched only non-site files (e.g. a test). The script must
    // not silently take the HEAD^2^..HEAD^2 path, and pages-changed
    // depends only on whether the merge introduced site files. For a
    // pure test-only merge, pages-changed stays false; for the bug to
    // be caught, the verbose log must show the push branch was chosen.
    const root = initRepo();
    try {
      commit(root, { 'README.md': 'initial\n' }, 'initial');

      git(root, ['checkout', '-q', '-b', 'issue-26']);
      commit(
        root,
        { 'tests/oauth-callback.test.js': '// repro for issue 28\n' },
        'test: only test file'
      );

      git(root, ['checkout', '-q', 'main']);
      git(root, [
        'merge',
        '--no-ff',
        '-q',
        '-m',
        'Merge pull request #27 from issue-26',
        'issue-26',
      ]);

      const { stdout, outputs } = runDetect(root, {
        GITHUB_EVENT_NAME: 'push',
        GITHUB_REF: 'refs/heads/main',
      });

      expect(outputs['js-changed']).toBe('true');
      expect(outputs['pages-changed']).toBe('false');
      expect(stdout).toContain('Comparing HEAD^ to HEAD (first-parent diff)');
      expect(stdout).not.toContain(
        'pull_request event with synthetic merge commit'
      );
      // Verbose tracing requested by issue #28 ("add debug output that
      // will allow us to find root cause on next iteration").
      expect(stdout).toContain('Event: push');
      expect(stdout).toContain('Ref:   refs/heads/main');
      expect(stdout).toContain('Parents on HEAD: 2');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
