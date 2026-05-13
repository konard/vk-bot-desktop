import { describe, it, expect } from 'test-anywhere';
import { existsSync, readFileSync } from 'node:fs';

import { expectedDesktopReleaseAssetNames } from '../scripts/check-release-needed.mjs';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const releaseWorkflow = readWorkflow('.github/workflows/js.yml');
const electronWorkflow = releaseWorkflow;
const adhocSignScript = readWorkflow('scripts/adhoc-sign-mac.cjs');
const validateReleaseAssetsScript = readWorkflow(
  'scripts/validate-release-assets.mjs'
);
const windowsReleaseSmokeScriptPath =
  'scripts/smoke-test-windows-release-artifacts.ps1';
const windowsReleaseSmokeScript = existsSync(windowsReleaseSmokeScriptPath)
  ? readWorkflow(windowsReleaseSmokeScriptPath)
  : '';

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

describe('release workflow orchestration', () => {
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

  it('keeps desktop release jobs in the same workflow with an exact tag and commit', () => {
    const automaticRelease = workflowJob(releaseWorkflow, 'release');
    const instantRelease = workflowJob(releaseWorkflow, 'instant-release');

    for (const job of [automaticRelease, instantRelease]) {
      expect(job).toContain(
        'release-tag: ${{ steps.release_version.outputs.tag }}'
      );
      expect(job).toContain(
        'target-sha: ${{ steps.release_target.outputs.sha }}'
      );
      expect(job).not.toContain('dispatch-and-watch-workflow.mjs');
    }

    expect(releaseWorkflow).toContain('desktop-release-context:');
    expect(releaseWorkflow).toContain('desktop-build:');
    expect(releaseWorkflow).toContain('desktop-publish:');
    expect(releaseWorkflow).toContain(
      'ref: ${{ needs.desktop-release-context.outputs.target-sha }}'
    );
    expect(releaseWorkflow).not.toContain('--workflow electron-release.yml');
  });

  it('runs desktop jobs after optional release modes are skipped', () => {
    const desktopContext = workflowJob(
      releaseWorkflow,
      'desktop-release-context'
    );
    const desktopBuild = workflowJob(releaseWorkflow, 'desktop-build');
    const desktopPublish = workflowJob(releaseWorkflow, 'desktop-publish');

    expect(desktopContext).toContain('needs: [release, instant-release]');
    expect(desktopContext).toContain('always()');
    expect(desktopContext).toContain('!cancelled()');

    expect(desktopBuild).toContain('always()');
    expect(desktopBuild).toContain('!cancelled()');
    expect(desktopBuild).toContain(
      "needs.desktop-release-context.result == 'success'"
    );
    expect(desktopBuild).toContain(
      "needs.desktop-release-context.outputs.should-publish == 'true'"
    );

    expect(desktopPublish).toContain('always()');
    expect(desktopPublish).toContain('!cancelled()');
    expect(desktopPublish).toContain(
      "needs.desktop-release-context.result == 'success'"
    );
    expect(desktopPublish).toContain("needs.desktop-build.result == 'success'");
    expect(desktopPublish).toContain(
      "needs.desktop-release-context.outputs.should-publish == 'true'"
    );
  });
});

describe('desktop release workflow', () => {
  it('builds desktop artifacts for Linux, macOS, and Windows releases', () => {
    expect(electronWorkflow).toContain('os: ubuntu-latest');
    expect(electronWorkflow).toContain('os: ubuntu-24.04-arm');
    expect(electronWorkflow).toContain('os: macos-latest');
    expect(electronWorkflow).toContain('os: windows-latest');
    expect(electronWorkflow).toContain('os: windows-11-arm');
    expect(electronWorkflow).toContain(
      'npx electron-builder --linux --${{ matrix.arch }}'
    );
    expect(electronWorkflow).toContain(
      'npx electron-builder --mac --x64 --arm64'
    );
    expect(electronWorkflow).toContain(
      'npx electron-builder --win --${{ matrix.arch }}'
    );
    expect(electronWorkflow).toContain('release/SHA256SUMS-*.txt');
    expect(electronWorkflow).toContain('release/provenance-*.txt');
    expect(electronWorkflow).toContain('dist/BUILD-PROVENANCE.txt');
    expect(electronWorkflow).toContain('actions/attest@v4');
    expect(electronWorkflow).toContain('gh release upload "$TAG" dist/*');
    expect(electronWorkflow).toContain('Verify published release asset links');
    expect(electronWorkflow).toContain('gh release view "$TAG" --json assets');
    expect(electronWorkflow).toContain('--write-out');
    expect(electronWorkflow).toContain('--range 0-0');
    expect(electronWorkflow).toContain('--retry-all-errors');
    expect(electronWorkflow).not.toContain('--head');
  });

  it('uses versioned artifact names for release download links', () => {
    const build = packageJson.build;
    const validateStep = workflowStep(
      electronWorkflow,
      'Validate versioned release asset names'
    );
    const expectedAssetNames = expectedDesktopReleaseAssetNames('${VERSION}');

    expect(Object.hasOwn(build, 'tar')).toBe(false);
    expect(build.linux.artifactName).toBe(
      'vk-bot-desktop-linux-${arch}-${version}.${ext}'
    );
    expect(build.appImage.artifactName).toBe(
      'vk-bot-desktop-linux-${arch}-${version}.AppImage'
    );
    expect(build.deb.artifactName).toBe(
      'vk-bot-desktop-linux-${arch}-${version}.deb'
    );
    expect(build.dmg.artifactName).toBe(
      'vk-bot-desktop-macos-${arch}-${version}.dmg'
    );
    expect(build.mac.artifactName).toBe(
      'vk-bot-desktop-macos-${arch}-${version}.${ext}'
    );
    expect(build.nsis.artifactName).toBe(
      'vk-bot-desktop-windows-installer-${arch}-${version}.${ext}'
    );
    expect(build.portable.artifactName).toBe(
      'vk-bot-desktop-windows-portable-${arch}-${version}.${ext}'
    );
    expect(electronWorkflow).toContain(
      'Validate versioned release asset names'
    );
    expect(validateReleaseAssetsScript).toContain(
      'expectedDesktopReleaseAssetNames'
    );
    expect(expectedAssetNames).toContain(
      'vk-bot-desktop-macos-arm64-${VERSION}.dmg'
    );
    expect(expectedAssetNames).toContain(
      'vk-bot-desktop-macos-x64-${VERSION}.zip'
    );
    expect(expectedAssetNames).toContain(
      'vk-bot-desktop-linux-arm64-${VERSION}.AppImage'
    );
    expect(expectedAssetNames).toContain(
      'vk-bot-desktop-linux-x64-${VERSION}.tar.gz'
    );
    expect(expectedAssetNames).toContain(
      'vk-bot-desktop-windows-installer-arm64-${VERSION}.exe'
    );
    expect(expectedAssetNames).toContain(
      'vk-bot-desktop-windows-portable-x64-${VERSION}.exe'
    );
    expect(validateStep).toContain(
      'node scripts/validate-release-assets.mjs --dist dist --tag "${{ needs.desktop-release-context.outputs.release-tag }}"'
    );
    expect(validateStep).not.toContain("require('./package.json').version");
  });

  it('uses system FPM for native Linux arm64 Debian builds', () => {
    const installFpmStep = workflowStep(
      electronWorkflow,
      'Install system FPM \\(Linux arm64\\)'
    );
    const linuxBuildStep = workflowStep(
      electronWorkflow,
      'Build Electron artifacts \\(Linux\\)'
    );

    expect(electronWorkflow).toContain('os: ubuntu-24.04-arm');
    expect(installFpmStep).toContain(
      "matrix.platform == 'linux' && matrix.arch == 'arm64'"
    );
    expect(installFpmStep).toContain(
      'sudo apt-get install -y ruby ruby-dev build-essential'
    );
    expect(installFpmStep).toContain('sudo gem install --no-document fpm');
    expect(linuxBuildStep).toContain('export USE_SYSTEM_FPM=true');
  });

  it('normalizes Linux artifact architecture names before validation', () => {
    const normalizeStep = workflowStep(
      electronWorkflow,
      'Normalize Linux release artifact names'
    );
    const normalizeIndex = electronWorkflow.indexOf(
      '- name: Normalize Linux release artifact names'
    );
    const linuxSmokeIndex = electronWorkflow.indexOf(
      '- name: Smoke test Linux release artifacts'
    );

    expect(normalizeIndex).toBeGreaterThan(-1);
    expect(normalizeIndex).toBeLessThan(linuxSmokeIndex);
    expect(normalizeStep).toContain(
      'vk-bot-desktop-linux-x86_64-${VERSION}.AppImage'
    );
    expect(normalizeStep).toContain(
      'vk-bot-desktop-linux-amd64-${VERSION}.deb'
    );
    expect(normalizeStep).toContain(
      'vk-bot-desktop-linux-x64-${VERSION}.AppImage'
    );
    expect(normalizeStep).toContain('vk-bot-desktop-linux-x64-${VERSION}.deb');
  });
});

describe('desktop release workflow macOS signing', () => {
  it('keeps signed and notarized macOS publishing when Apple secrets are configured', () => {
    const macSignedBuildStep = workflowStep(
      electronWorkflow,
      'Build Electron artifacts \\(macOS signed\\)'
    );
    const macSmokeStep = workflowStep(
      electronWorkflow,
      'Smoke test macOS release artifacts'
    );

    expect(macSignedBuildStep).not.toContain('CSC_IDENTITY_AUTO_DISCOVERY:');
    expect(macSignedBuildStep).toContain(
      'CSC_LINK: ${{ secrets.MAC_CSC_LINK }}'
    );
    expect(macSignedBuildStep).toContain(
      'CSC_KEY_PASSWORD: ${{ secrets.MAC_CSC_KEY_PASSWORD }}'
    );
    expect(macSignedBuildStep).toContain(
      'APPLE_API_KEY: ${{ secrets.APPLE_API_KEY }}'
    );
    expect(macSignedBuildStep).toContain(
      'APPLE_API_KEY_ID: ${{ secrets.APPLE_API_KEY_ID }}'
    );
    expect(macSignedBuildStep).toContain(
      'APPLE_API_ISSUER: ${{ secrets.APPLE_API_ISSUER }}'
    );
    expect(macSignedBuildStep).toContain(
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

  it('builds ad-hoc signed macOS artifacts without Apple secrets', () => {
    const macSecretsStep = workflowStep(
      electronWorkflow,
      'Check macOS signing secrets'
    );
    const macSignedBuildStep = workflowStep(
      electronWorkflow,
      'Build Electron artifacts \\(macOS signed\\)'
    );
    const macAdhocBuildStep = workflowStep(
      electronWorkflow,
      'Build Electron artifacts \\(macOS ad-hoc\\)'
    );
    const macSmokeStep = workflowStep(
      electronWorkflow,
      'Smoke test macOS release artifacts'
    );

    expect(macSecretsStep).toContain('id: mac_secrets');
    expect(macSecretsStep).toContain('has_secrets=false');
    expect(macSecretsStep).toContain('mode=adhoc');
    expect(macSecretsStep).toContain(
      '::warning::Missing required macOS signing/notarization secrets'
    );
    expect(macSecretsStep).toContain(
      'Building ad-hoc signed macOS artifacts without notarization'
    );
    expect(macSecretsStep).not.toContain('exit 1');
    expect(electronWorkflow).not.toContain(
      '::error::Missing required macOS signing/notarization secrets'
    );
    expect(macSignedBuildStep).toContain(
      "steps.mac_secrets.outputs.has_secrets == 'true'"
    );
    expect(macAdhocBuildStep).toContain(
      "steps.mac_secrets.outputs.has_secrets != 'true'"
    );
    expect(macAdhocBuildStep).toContain("CSC_IDENTITY_AUTO_DISCOVERY: 'false'");
    expect(macAdhocBuildStep).toContain("MACOS_ADHOC_SIGN: '1'");
    expect(macAdhocBuildStep).toContain('-c.mac.notarize=false');
    expect(macAdhocBuildStep).toContain(
      '-c.mac.sign=./scripts/adhoc-sign-mac.cjs'
    );
    expect(adhocSignScript).toContain('@electron/osx-sign');
    expect(adhocSignScript).toContain("identity: '-'");
    expect(adhocSignScript).toContain('identityValidation: false');
    expect(adhocSignScript).toContain("timestamp: 'none'");
    expect(macSmokeStep).toContain(
      'MACOS_BUILD_MODE: ${{ steps.mac_secrets.outputs.mode }}'
    );
    expect(macSmokeStep).toContain('Signature=adhoc');
    expect(macSmokeStep).not.toContain(
      "if: matrix.os == 'macos-latest' && steps.mac_secrets.outputs.has_secrets == 'true'"
    );
    expect(electronWorkflow).toContain('if-no-files-found: ignore');
  });
});

describe('desktop release workflow smoke tests', () => {
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
    expect(
      workflowStep(electronWorkflow, 'Smoke test Windows release artifacts')
    ).toContain('scripts/smoke-test-windows-release-artifacts.ps1');
    expect(
      workflowStep(electronWorkflow, 'Smoke test Windows release artifacts')
    ).toContain("-Arch '${{ matrix.arch }}'");
    expect(electronWorkflow).toContain('dpkg-deb --contents');
    expect(electronWorkflow).toContain('--appimage-extract');
    expect(windowsReleaseSmokeScript).toContain('Start-Process -FilePath');
    expect(windowsReleaseSmokeScript).toContain('/S');
    expect(windowsReleaseSmokeScript).toContain('/D=');
    expect(packageJson.build.nsis.runAfterFinish).toBe(false);
  });

  it('does not execute the NSIS installer on Windows ARM64 hosted runners', () => {
    const arm64GuardIndex = windowsReleaseSmokeScript.indexOf(
      "if ($Arch -eq 'arm64') {"
    );
    const installerRunIndex = windowsReleaseSmokeScript.indexOf(
      'Start-Process -FilePath'
    );
    const arm64Guard = windowsReleaseSmokeScript.slice(
      arm64GuardIndex,
      installerRunIndex
    );

    expect(windowsReleaseSmokeScript).toContain(
      "[ValidateSet('x64', 'arm64')]"
    );
    expect(windowsReleaseSmokeScript).toContain('win-arm64-unpacked');
    expect(arm64GuardIndex).toBeGreaterThan(-1);
    expect(installerRunIndex).toBeGreaterThan(arm64GuardIndex);
    expect(arm64Guard).toContain('0xC0000005');
    expect(arm64Guard).toContain('7z');
    expect(arm64Guard).toContain('exit 0');
    expect(arm64Guard).not.toContain('Start-Process -FilePath');
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
