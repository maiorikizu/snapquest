import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
export async function loadDeskRuntime() {
    const source = await readFile(new URL('../apps/web/src/runtime/desk-game.ts', import.meta.url), 'utf8');
    const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
    let callback, time = 1000;
    const gradient = { addColorStop() { } };
    const context = new Proxy({}, { get: (_t, p) => ['createLinearGradient', 'createRadialGradient'].includes(p) ? () => gradient : () => { }, set: () => true });
    const canvas = { width: 1280, height: 800, getContext: () => context, addEventListener() { }, removeEventListener() { }, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 800 }), focus() { } };
    const sandbox = { exports: {}, window: { addEventListener() { }, removeEventListener() { } }, requestAnimationFrame: fn => { callback = fn; return 1; }, cancelAnimationFrame() { }, Math, Set, console };
    vm.runInNewContext(js, sandbox);
    return { exports: sandbox.exports, canvas, frame: () => { time += 1000 / 60; callback(time); } };
}
export async function verifyDesk() {
    const { exports, canvas, frame } = await loadDeskRuntime();
    const handle = exports.createDeskGame(canvas, { title: 'System Override', scene: { theme: 'desktop' } });
    assert.equal(handle.getState().status, 'ready');
    handle.start();
    frame();
    handle.pause();
    const paused = handle.getState().seconds;
    for (let i = 0; i < 30; i++)
        frame();
    assert.equal(handle.getState().seconds, paused);
    handle.resume();
    handle.input('Space', true);
    const obstacles = [{ x: 85, y: 475, w: 295, h: 128 }, { x: 915, y: 490, w: 270, h: 138 }, { x: 535, y: 268, w: 137, h: 53 }, { x: 965, y: 298, w: 203, h: 52 }, { x: 516, y: 462, w: 48, h: 75 }, { x: 700, y: 588, w: 43, h: 108 }, { x: 872, y: 664, w: 10, h: 94 }, { x: 906, y: 681, w: 10, h: 77 }];
    const blocked = (x, y) => x < 30 || x > 1250 || y < 198 || y > 734 || obstacles.some(o => x > o.x - 20 && x < o.x + o.w + 20 && y > o.y - 20 && y < o.y + o.h + 20);
    function pathTo(tx, ty) {
        const start = handle.getState(), sx = Math.round(start.x / 20), sy = Math.round(start.y / 20), gx = Math.round(tx / 20), gy = Math.round(ty / 20);
        const queue = [[sx, sy]], parents = new Map([[`${sx},${sy}`, null]]);
        let found;
        for (let n = 0; n < queue.length; n++) {
            const p = queue[n];
            if (Math.abs(p[0] - gx) + Math.abs(p[1] - gy) <= 1) {
                found = p;
                break;
            }
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nx = p[0] + dx, ny = p[1] + dy, key = `${nx},${ny}`;
                if (!blocked(nx * 20, ny * 20) && !parents.has(key)) {
                    parents.set(key, p);
                    queue.push([nx, ny]);
                }
            }
        }
        assert.ok(found, `No route to ${tx},${ty}`);
        const points = [];
        while (found) {
            points.unshift([found[0] * 20, found[1] * 20]);
            found = parents.get(`${found[0]},${found[1]}`);
        }
        return points.slice(1);
    }
    function step() {
        const s = handle.getState();
        if (s.pulse === 0) {
            handle.input('KeyE', false);
            handle.input('KeyE', true);
        }
        frame();
        assert.notEqual(handle.getState().status, 'lost', `Player lost at ${JSON.stringify(handle.getState())}`);
    }
    function go(tx, ty) {
        for (const [px, py] of pathTo(tx, ty)) {
            for (let i = 0; i < 100; i++) {
                const s = handle.getState(), dx = px - s.x, dy = py - s.y;
                if (Math.abs(dx) < 6 && Math.abs(dy) < 6)
                    break;
                handle.input('KeyD', dx > 5);
                handle.input('KeyA', dx < -5);
                handle.input('KeyS', dy > 5);
                handle.input('KeyW', dy < -5);
                step();
            }
        }
        for (const k of ['KeyA', 'KeyD', 'KeyW', 'KeyS'])
            handle.input(k, false);
    }
    go(415, 690);
    go(450, 365);
    go(500, 290);
    go(785, 270);
    go(825, 565);
    go(1215, 700);
    go(1150, 700);
    go(1215, 700);
    go(1215, 390);
    go(800, 390);
    go(780, 640);
    assert.equal(handle.getState().recovered, 5, JSON.stringify(handle.getState()));
    handle.input('KeyE', false);
    handle.input('KeyE', true);
    assert.equal(handle.getState().firewall, false);
    go(800, 440);
    for (let i = 0; i < 2400 && handle.getState().status === 'playing'; i++)
        step();
    const result = handle.getState();
    assert.equal(result.status, 'won', JSON.stringify(result));
    handle.restart();
    assert.equal(handle.getState().health, 5);
    assert.equal(handle.getState().recovered, 0);
    handle.destroy();
    const html = exports.deskStandalone({ title: 'System Override', scene: { theme: 'desktop' } }), script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
    assert.ok(script);
    new vm.Script(script);
    console.log(JSON.stringify({ result: 'PASS', objective: 'recover 5 USB drives → remote firewall → boss defeated', seconds: Math.round(result.seconds), health: result.health, kills: result.kills, pauseResume: 'PASS', restart: 'PASS', offlineExport: 'PASS' }, null, 2));
    return result;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
    await verifyDesk();
