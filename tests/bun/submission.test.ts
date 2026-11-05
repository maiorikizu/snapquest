import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('the real scene mission can be won, paused, resumed and restarted', () => {
  const result = spawnSync(process.execPath.includes('bun') ? 'node' : process.execPath, ['scripts/desk-smoke.mjs'], { cwd: process.cwd(), encoding: 'utf8' });
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('"result": "PASS"');
  expect(result.stdout).toContain('boss defeated');
});

test('real photo uploads, validation, persisted arcade and SSE work', () => {
  const result = spawnSync('node', ['--test', 'apps/server/scripts/studio.test.mjs'], { cwd: process.cwd(), encoding: 'utf8' });
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('fail 0');
});

test('the deliverable has complete, syntactically valid standalone game code', async () => {
  const html = await readFile('deliverables/SnapQuest-System-Override.html', 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  expect(script).toBeDefined();
  expect(() => new vm.Script(script!)).not.toThrow();
  expect(html).toContain('SPEAKER PULSE');
});
