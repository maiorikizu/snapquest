import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const children = [
    spawn(process.execPath, ['apps/server/scripts/studio.mjs'], { cwd: root, stdio: 'inherit' }),
    spawn(process.execPath, [resolve(root, 'apps/web/node_modules/vite/bin/vite.js')], { cwd: resolve(root, 'apps/web'), stdio: 'inherit' }),
];
let closing = false;
function close(code = 0) {
    if (closing)
        return;
    closing = true;
    for (const child of children)
        child.kill();
    process.exitCode = code;
}
for (const child of children)
    child.on('exit', (code) => close(code ?? 0));
process.on('SIGINT', () => close());
process.on('SIGTERM', () => close());
