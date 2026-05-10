import { describe, it, expect } from 'test-anywhere';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
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

function workflowStep(workflow, stepName) {
  return workflow.match(
    new RegExp(`- name: ${stepName}[\\s\\S]*?(?=\\n {6}- name:)`)
  )?.[0];
}

describe('release workflow dispatch', () => {
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
});

describe('desktop release workflow', () => {
  it('builds desktop artifacts for Linux, macOS, and Windows releases', () => {
    expect(electronWorkflow).toContain('os: ubuntu-latest');
    expect(electronWorkflow).toContain('os: macos-latest');
    expect(electronWorkflow).toContain('os: windows-latest');
    expect(electronWorkflow).toContain('npx electron-builder --linux');
    expect(electronWorkflow).toContain(
      'npx electron-builder --mac --x64 --arm64'
    );
    expect(electronWorkflow).toContain('npx electron-builder --win');
    expect(electronWorkflow).toContain('release/SHA256SUMS-*.txt');
    expect(electronWorkflow).toContain('release/provenance-*.txt');
    expect(electronWorkflow).toContain('dist/BUILD-PROVENANCE.txt');
    expect(electronWorkflow).toContain('gh release upload "$TAG" dist/*');
  });

  it('uses stable artifact names for latest download links', () => {
    const build = packageJson.build;

    expect(Object.hasOwn(build, 'tar')).toBe(false);
    expect(build.linux.artifactName).toBe('vk-bot-desktop-linux-x64.${ext}');
    expect(build.appImage.artifactName).toBe(
      'vk-bot-desktop-linux-x64.AppImage'
    );
    expect(build.deb.artifactName).toBe('vk-bot-desktop-linux-x64.deb');
    expect(build.dmg.artifactName).toBe('vk-bot-desktop-macos-${arch}.dmg');
    expect(build.mac.artifactName).toBe('vk-bot-desktop-macos-${arch}.${ext}');
    expect(build.nsis.artifactName).toBe(
      'vk-bot-desktop-windows-installer-${arch}.${ext}'
    );
    expect(build.portable.artifactName).toBe(
      'vk-bot-desktop-windows-portable-${arch}.${ext}'
    );
    expect(electronWorkflow).toContain('Validate stable release asset names');
    expect(electronWorkflow).toContain('vk-bot-desktop-linux-x64.AppImage');
    expect(electronWorkflow).toContain('vk-bot-desktop-linux-x64.deb');
    expect(electronWorkflow).toContain('vk-bot-desktop-linux-x64.tar.gz');
  });

  it('signs, notarizes, and assesses macOS artifacts instead of publishing unsigned DMGs', () => {
    const macBuildStep = workflowStep(
      electronWorkflow,
      'Build Electron artifacts \\(macOS\\)'
    );
    const macSmokeStep = workflowStep(
      electronWorkflow,
      'Smoke test macOS release artifacts'
    );

    expect(macBuildStep).not.toContain('CSC_IDENTITY_AUTO_DISCOVERY:');
    expect(macBuildStep).toContain('CSC_LINK: ${{ secrets.MAC_CSC_LINK }}');
    expect(macBuildStep).toContain(
      'CSC_KEY_PASSWORD: ${{ secrets.MAC_CSC_KEY_PASSWORD }}'
    );
    expect(macBuildStep).toContain(
      'APPLE_API_KEY: ${{ secrets.APPLE_API_KEY }}'
    );
    expect(macBuildStep).toContain(
      'APPLE_API_KEY_ID: ${{ secrets.APPLE_API_KEY_ID }}'
    );
    expect(macBuildStep).toContain(
      'APPLE_API_ISSUER: ${{ secrets.APPLE_API_ISSUER }}'
    );
    expect(macBuildStep).toContain(
      'DEBUG: electron-builder,electron-notarize*'
    );
    expect(packageJson.build?.mac?.hardenedRuntime).toBe(true);
    expect(packageJson.build?.mac?.notarize).toBe(true);
    expect(packageJson.build?.mac?.entitlements).toBe(
      'build/entitlements.mac.plist'
    );
    expect(macSmokeStep).toContain('hdiutil attach');
    expect(macSmokeStep).toContain('codesign --verify --deep --strict');
    expect(macSmokeStep).toContain('spctl --assess --type execute');
    expect(macSmokeStep).toContain('xcrun stapler validate');
  });

  it('skips macOS artifacts without signing secrets instead of blocking Linux and Windows releases', () => {
    const macSecretsStep = workflowStep(
      electronWorkflow,
      'Check macOS signing secrets'
    );
    const macBuildStep = workflowStep(
      electronWorkflow,
      'Build Electron artifacts \\(macOS\\)'
    );
    const macSmokeStep = workflowStep(
      electronWorkflow,
      'Smoke test macOS release artifacts'
    );

    expect(macSecretsStep).toContain('id: mac_secrets');
    expect(macSecretsStep).toContain('has_secrets=false');
    expect(macSecretsStep).toContain(
      '::warning::Missing required macOS signing/notarization secrets'
    );
    expect(macSecretsStep).not.toContain('exit 1');
    expect(electronWorkflow).not.toContain(
      '::error::Missing required macOS signing/notarization secrets'
    );
    expect(macBuildStep).toContain(
      "steps.mac_secrets.outputs.has_secrets == 'true'"
    );
    expect(macSmokeStep).toContain(
      "steps.mac_secrets.outputs.has_secrets == 'true'"
    );
    expect(electronWorkflow).toContain('if-no-files-found: ignore');
  });

  it('smoke-tests platform installers after building and before uploading', () => {
    const linuxSmokeIndex = electronWorkflow.indexOf(
      '- name: Smoke test Linux release artifacts'
    );
    const macSmokeIndex = electronWorkflow.indexOf(
      '- name: Smoke test macOS release artifacts'
    );
    const windowsSmokeIndex = electronWorkflow.indexOf(
      '- name: Smoke test Windows release artifacts'
    );
    const uploadIndex = electronWorkflow.indexOf('- name: Upload artifacts');

    expect(linuxSmokeIndex).toBeGreaterThan(-1);
    expect(macSmokeIndex).toBeGreaterThan(-1);
    expect(windowsSmokeIndex).toBeGreaterThan(-1);
    expect(linuxSmokeIndex).toBeLessThan(uploadIndex);
    expect(macSmokeIndex).toBeLessThan(uploadIndex);
    expect(windowsSmokeIndex).toBeLessThan(uploadIndex);
    expect(electronWorkflow).toContain('dpkg-deb --contents');
    expect(electronWorkflow).toContain('--appimage-extract');
    expect(electronWorkflow).toContain('Start-Process -FilePath');
    expect(electronWorkflow).toContain('/S');
    expect(electronWorkflow).toContain('/D=');
  });

  it('configures a Linux maintainer for deb artifacts', () => {
    expect(packageJson.build?.linux?.maintainer).toMatch(
      /^.+ <[^@\s]+@[^@\s]+\.[^@\s]+>$/
    );
  });

  it('hashes Linux and macOS artifacts without splitting filenames on spaces', () => {
    const checksumStep = electronWorkflow.match(
      /- name: Compute SHA256 sums \(Linux\/macOS\)[\s\S]*?(?=\n {6}- name:)/
    )?.[0];

    expect(checksumStep).toContain('while IFS= read -r file');
    expect(checksumStep).toContain('shasum -a 256 "$file"');
    expect(checksumStep).not.toContain('shasum -a 256 $(ls');
  });
});
