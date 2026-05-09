import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildInstallScript,
  buildInstallPlan,
} from '../src/server/ssh-installer.js';

describe('buildInstallScript', () => {
  const baseOptions = {
    bundleArchiveBase64: 'BASE64DATAEXAMPLE',
    configLino: 'vk\n  token "abc"\n',
  };

  it('emits a docker isolation invocation', () => {
    const script = buildInstallScript({ ...baseOptions, isolation: 'docker' });
    assert.match(script, /^#!\/usr\/bin\/env bash/);
    assert.match(script, /set -euo pipefail/);
    assert.match(script, /\$ --isolated docker --image node:20 --/);
    assert.match(script, /node src\/bot\/runner\.js/);
  });

  it('emits a screen isolation invocation', () => {
    const script = buildInstallScript({ ...baseOptions, isolation: 'screen' });
    assert.match(script, /\$ --isolated screen --/);
  });

  it('throws when the bundle archive is missing', () => {
    assert.throws(() => buildInstallScript({}), /bundleArchiveBase64/);
  });

  it('throws on unknown isolation', () => {
    assert.throws(
      () => buildInstallScript({ ...baseOptions, isolation: 'lxc' }),
      /Unsupported isolation/
    );
  });

  it('escapes the remote dir', () => {
    const script = buildInstallScript({
      ...baseOptions,
      remoteDir: "~/dir with 'quote'",
    });
    assert.match(script, /mkdir -p '~\/dir with '\\''quote'\\'/);
  });
});

describe('buildInstallPlan', () => {
  it('returns plan metadata alongside the script', () => {
    const plan = buildInstallPlan({
      bundleArchiveBase64: 'BASE',
      configLino: '',
      isolation: 'screen',
    });
    assert.equal(plan.isolation, 'screen');
    assert.equal(plan.nodeVersion, '20');
    assert.match(plan.script, /isolated screen/);
  });
});
