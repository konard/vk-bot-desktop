import { describe, it, expect } from 'test-anywhere';
import { readFileSync } from 'node:fs';

const releaseWorkflow = readWorkflow('.github/workflows/release.yml');
const electronWorkflow = readWorkflow('.github/workflows/electron-release.yml');

function readWorkflow(filePath) {
  return readFileSync(filePath, 'utf8').replaceAll('\r\n', '\n');
}

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

describe('desktop release workflow', () => {
  it('does not publish packages to npm from release jobs', () => {
    const automaticRelease = workflowJob(releaseWorkflow, 'release');
    const instantRelease = workflowJob(releaseWorkflow, 'instant-release');
    const releaseJobs = `${automaticRelease}\n${instantRelease}`;

    expect(releaseJobs).not.toContain('Publish to npm');
    expect(releaseJobs).not.toContain('publish-to-npm.mjs');
    expect(releaseJobs).not.toContain('setup-npm.mjs');
    expect(releaseJobs).not.toContain('registry-url:');
    expect(releaseJobs).not.toContain('id-token: write');
  });

  it('dispatches the Electron release workflow with an exact tag and commit', () => {
    const automaticRelease = workflowJob(releaseWorkflow, 'release');
    const instantRelease = workflowJob(releaseWorkflow, 'instant-release');

    for (const job of [automaticRelease, instantRelease]) {
      expect(job).toContain('actions: write');
      expect(job).toContain('gh workflow run electron-release.yml');
      expect(job).toContain(
        '--field tag="${{ steps.release_version.outputs.tag }}"'
      );
      expect(job).toContain(
        '--field target_sha="${{ steps.release_target.outputs.sha }}"'
      );
    }
  });

  it('builds desktop artifacts for Linux, macOS, and Windows releases', () => {
    expect(electronWorkflow).toContain('os: ubuntu-latest');
    expect(electronWorkflow).toContain('os: macos-latest');
    expect(electronWorkflow).toContain('os: windows-latest');
    expect(electronWorkflow).toContain('npx electron-builder --linux');
    expect(electronWorkflow).toContain('npx electron-builder --mac');
    expect(electronWorkflow).toContain('npx electron-builder --win');
    expect(electronWorkflow).toContain('release/SHA256SUMS-*.txt');
    expect(electronWorkflow).toContain('release/provenance-*.txt');
    expect(electronWorkflow).toContain('dist/BUILD-PROVENANCE.txt');
    expect(electronWorkflow).toContain('gh release upload "$TAG" dist/*');
  });
});
