import { describe, it, expect } from 'test-anywhere';

import {
  dispatchAndWatchWorkflow,
  extractRunIdFromText,
  pickWorkflowRun,
} from '../scripts/dispatch-and-watch-workflow.mjs';

function createSpawn(results) {
  const calls = [];

  return {
    calls,
    spawn(command, args, options) {
      calls.push({ args, command, options });
      const result = results.shift();

      if (!result) {
        throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
      }

      return result;
    },
  };
}

describe('dispatch-and-watch-workflow.mjs', () => {
  it('extracts a workflow run id from gh workflow run output', () => {
    expect(
      extractRunIdFromText(
        'https://github.com/konard/vk-bot-desktop/actions/runs/25636588014'
      )
    ).toBe('25636588014');
  });

  it('picks the newest workflow run for the requested target commit', () => {
    expect(
      pickWorkflowRun(
        [
          {
            createdAt: '2026-05-10T18:35:00Z',
            databaseId: 1,
            headSha: 'old',
          },
          {
            createdAt: '2026-05-10T18:37:00Z',
            databaseId: 2,
            headSha: 'target',
          },
        ],
        {
          matchHeadSha: 'target',
          notBefore: new Date('2026-05-10T18:36:00Z'),
        }
      )?.databaseId
    ).toBe(2);
  });

  it('watches the dispatched run and returns the downstream failure status', () => {
    const recorder = createSpawn([
      {
        status: 0,
        stderr: '',
        stdout:
          'https://github.com/konard/vk-bot-desktop/actions/runs/25636588014\n',
      },
      {
        status: 1,
        stderr: 'workflow failed',
        stdout: '',
      },
    ]);

    const result = dispatchAndWatchWorkflow({
      args: [
        '--repo',
        'konard/vk-bot-desktop',
        '--workflow',
        'electron-release.yml',
        '--ref',
        'main',
        '--field',
        'tag=v0.9.9',
        '--field',
        'target_sha=7c8093bdacb94446a744afe055212df020ffc21d',
        '--match-head-sha',
        '7c8093bdacb94446a744afe055212df020ffc21d',
      ],
      now: () => new Date('2026-05-10T18:36:56Z'),
      spawn: recorder.spawn,
    });

    expect(result).toBe(1);
    expect(recorder.calls).toEqual([
      {
        args: [
          'workflow',
          'run',
          'electron-release.yml',
          '--repo',
          'konard/vk-bot-desktop',
          '--ref',
          'main',
          '--field',
          'tag=v0.9.9',
          '--field',
          'target_sha=7c8093bdacb94446a744afe055212df020ffc21d',
        ],
        command: 'gh',
        options: {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      },
      {
        args: [
          'run',
          'watch',
          '25636588014',
          '--repo',
          'konard/vk-bot-desktop',
          '--compact',
          '--exit-status',
        ],
        command: 'gh',
        options: {
          encoding: 'utf8',
          stdio: 'inherit',
        },
      },
    ]);
  });
});

describe('dispatch-and-watch-workflow.mjs fallback polling', () => {
  it('finds the child run by head SHA when dispatch output has no run URL', () => {
    const recorder = createSpawn([
      {
        status: 0,
        stderr: '',
        stdout: '',
      },
      {
        status: 0,
        stderr: '',
        stdout: JSON.stringify([
          {
            createdAt: '2026-05-10T18:36:57Z',
            databaseId: 25636588014,
            headSha: '7c8093bdacb94446a744afe055212df020ffc21d',
            status: 'in_progress',
            url: 'https://github.com/konard/vk-bot-desktop/actions/runs/25636588014',
          },
        ]),
      },
      {
        status: 0,
        stderr: '',
        stdout: '',
      },
    ]);
    const messages = [];

    const result = dispatchAndWatchWorkflow({
      args: [
        '--repo',
        'konard/vk-bot-desktop',
        '--workflow',
        'electron-release.yml',
        '--ref',
        'main',
        '--field',
        'tag=v0.9.9',
        '--field',
        'target_sha=7c8093bdacb94446a744afe055212df020ffc21d',
        '--match-head-sha',
        '7c8093bdacb94446a744afe055212df020ffc21d',
      ],
      now: () => new Date('2026-05-10T18:36:56Z'),
      spawn: recorder.spawn,
      stdout: (message) => messages.push(message),
    });

    expect(result).toBe(0);
    expect(messages).toEqual([
      'Watching dispatched workflow run: https://github.com/konard/vk-bot-desktop/actions/runs/25636588014',
    ]);
    expect(recorder.calls[1]).toEqual({
      args: [
        'run',
        'list',
        '--repo',
        'konard/vk-bot-desktop',
        '--workflow',
        'electron-release.yml',
        '--event',
        'workflow_dispatch',
        '--limit',
        '20',
        '--json',
        'databaseId,headSha,status,createdAt,url',
      ],
      command: 'gh',
      options: {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    });
    expect(recorder.calls[2].args).toEqual([
      'run',
      'watch',
      '25636588014',
      '--repo',
      'konard/vk-bot-desktop',
      '--compact',
      '--exit-status',
    ]);
  });
});
