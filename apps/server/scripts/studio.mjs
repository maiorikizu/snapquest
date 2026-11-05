import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, readdir } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import sharp from 'sharp';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../..');
const GAME_VERSION = 'system-override-private-v3';
export const DESK_REGIONS = [
    { label: 'Laptop', box: [0.035, 0.61, 0.42, 0.225] },
    { label: 'Mouse', box: [0.452, 0.615, 0.063, 0.08] },
    { label: 'Power brick', box: [0.433, 0.501, 0.129, 0.066] },
    { label: 'Speaker', box: [0.662, 0.573, 0.224, 0.109] },
    { label: 'Charging dock', box: [0.479, 0.714, 0.053, 0.065] },
    { label: 'Remote', box: [0.562, 0.695, 0.048, 0.101] },
    { label: 'Silver laptop', box: [0.605, 0.722, 0.374, 0.097] },
    { label: 'Adapter', box: [0.603, 0.619, 0.099, 0.109] },
];
export function makeLevel(regions, seed) {
    const heights = [530, 455, 510, 415, 495, 430, 490, 405];
    const platforms = regions.slice(0, 8).map((region, i) => ({
        x: 180 + i * 290, y: heights[i], w: 218, h: 32, region: i,
        label: region.label,
    }));
    return {
        version: 1, seed, width: 2700, height: 720, floor: 620,
        spawn: { x: 70, y: 620 }, platforms,
        collectibles: platforms.map((p, i) => ({ id: i, x: p.x + p.w / 2, y: p.y - 46 })),
        hazards: [{ x: 1000, min: 850, max: 1200 }, { x: 1850, min: 1720, max: 2050 }],
        goal: { x: 2570, y: 620 },
        physics: { gravity: 1700, jumpVelocity: -660, speed: 330, doubleJump: true },
    };
}
async function imageRegions(bytes) {
    const { data, info } = await sharp(bytes).resize(120, 90, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const candidates = [];
    for (let row = 0; row < 3; row++)
        for (let col = 0; col < 4; col++) {
            let sum = 0, sumSq = 0, n = 0;
            for (let y = row * 30; y < (row + 1) * 30; y++)
                for (let x = col * 30; x < (col + 1) * 30; x++) {
                    const offset = (y * info.width + x) * info.channels;
                    const value = (data[offset] + data[offset + 1] + data[offset + 2]) / 3;
                    sum += value;
                    sumSq += value * value;
                    n++;
                }
            candidates.push({ score: sumSq / n - (sum / n) ** 2, box: [col / 4, row / 3, 1 / 4, 1 / 3] });
        }
    return candidates.sort((a, b) => b.score - a.score).slice(0, 8)
        .map((candidate, i) => ({ label: `Photo region ${String(i + 1).padStart(2, '0')}`, box: candidate.box }));
}
export async function buildStudio(options = {}) {
    const dataDir = resolve(options.dataDir ?? join(ROOT, '.data/studio'));
    const webDir = resolve(options.webDir ?? join(ROOT, 'apps/web/dist'));
    await mkdir(dataDir, { recursive: true });
    const app = Fastify({ logger: options.logger ?? true, bodyLimit: 12 * 1024 * 1024 });
    await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 2 } });
    const jobs = new Map();
    const streams = new Map();
    const pending = [];
    let active = 0;
    const ok = (data) => ({ data });
    const jobPath = (id, filename = 'job.json') => join(dataDir, id, filename);
    const save = async (job) => {
        const target = jobPath(job.jobId);
        await writeFile(`${target}.tmp`, JSON.stringify(job, null, 2));
        await rename(`${target}.tmp`, target);
    };
    const publicJob = (job) => ({
        jobId: job.jobId, gameId: job.jobId, status: job.status,
        createdAt: job.createdAt, updatedAt: job.updatedAt,
        stageTimingsMs: job.stageTimingsMs, errorCode: job.errorCode,
        preview: job.game?.regions ? { imageWidth: 1, imageHeight: 1,
            segments: job.game.regions.map((r) => ({ label: r.label, confidence: 1,
                polygon: [[r.box[0], r.box[1]], [r.box[0] + r.box[2], r.box[1]],
                    [r.box[0] + r.box[2], r.box[1] + r.box[3]], [r.box[0], r.box[1] + r.box[3]]] })),
            droppedCount: 0, truncated: false } : null,
    });
    const broadcast = (job) => {
        for (const raw of streams.get(job.jobId) ?? []) {
            raw.write(`event: transition\ndata: ${JSON.stringify(publicJob(job))}\n\n`);
            if (job.status === 'playable' || job.status === 'failed')
                raw.end();
        }
    };
    async function stage(job, status) {
        job.status = status;
        job.updatedAt = new Date().toISOString();
        await save(job);
        broadcast(job);
    }
    async function generate(job) {
        try {
            let start = performance.now();
            await stage(job, 'segmenting');
            const photo = await readFile(jobPath(job.jobId, 'photo.jpg'));
            const regions = await imageRegions(photo);
            job.stageTimingsMs.segmenting = Math.round(performance.now() - start);
            start = performance.now();
            await stage(job, 'designing');
            const seed = Number.parseInt(job.photoHash.slice(0, 8), 16);
            const level = makeLevel(regions, seed);
            job.stageTimingsMs.designing = Math.round(performance.now() - start);
            start = performance.now();
            await stage(job, 'painting');
            const sprites = [];
            job.stageTimingsMs.painting = Math.round(performance.now() - start);
            start = performance.now();
            await stage(job, 'building');
            const palette = await sharp(photo).stats();
            const tint = palette.channels.slice(0, 3).map((c) => Math.round(c.mean));
            job.game = {
                id: job.jobId, title: 'System Override',
                subtitle: 'Your everyday objects. An unlikely arsenal. One desk to save.',
                family: 'action-adventure', createdAt: job.createdAt, seed, regions, sprites, level, tint,
                version: GAME_VERSION,
                scene: { theme: 'desktop', source: job.isSample ? 'curated-object-roles' : 'visual-regions-with-desk-template',
                    premise: 'The Shadow Laptop has corrupted the desktop network. Recover the USB data, use the remote to disable its firewall, then purge the terminal.',
                    objects: [
                        { source: 'Laptop', role: 'home-terminal', art: 'laptop', mechanic: 'The cursor hero escapes from the home laptop.' },
                        { source: 'Silver laptop', role: 'shadow-terminal', art: 'laptop', mechanic: 'Shielded boss; unlock with the remote, then shoot to reboot.' },
                        { source: 'Power brick', role: 'repair-station', art: 'charger', mechanic: 'Approach to restore two health points.' },
                        { source: 'Speaker', role: 'sonic-weapon', art: 'speaker', mechanic: 'E releases a radial blast that clears cable bugs and hostile packets.' },
                        { source: 'Remote', role: 'firewall-switch', art: 'remote', mechanic: 'After collecting data, approach and press E to expose the boss.' },
                        { source: 'Cables', role: 'pursuing-enemies', art: 'cable-snake', mechanic: 'Cable bugs chase the player and drain power on contact.' },
                        { source: 'Pens', role: 'barriers', art: 'pen', mechanic: 'Physical obstacles in the route around the desk.' },
                        { source: 'USB drive', role: 'recovery-data', art: 'usb', mechanic: 'Recover five data drives scattered around the objects.' },
                    ] },
                photoUrl: '',
                segmentationMode: job.isSample ? 'curated-regions' : 'image-regions',
                generationMs: 0,
            };
            job.stageTimingsMs.building = Math.round(performance.now() - start);
            job.game.generationMs = Object.values(job.stageTimingsMs).reduce((a, b) => a + b, 0);
            await stage(job, 'playable');
        }
        catch (error) {
            app.log.error(error, 'Generation failed');
            job.errorCode = 'generation_failed';
            await stage(job, 'failed');
        }
    }
    function pump() {
        while (active < 2 && pending.length) {
            const job = pending.shift();
            active++;
            void generate(job).finally(() => { active--; pump(); });
        }
    }
    for (const entry of await readdir(dataDir, { withFileTypes: true })) {
        if (!entry.isDirectory() || !/^job_[a-f0-9]{32}$/.test(entry.name))
            continue;
        try {
            const job = JSON.parse(await readFile(jobPath(entry.name), 'utf8'));
            jobs.set(job.jobId, job);
            if (!['playable', 'failed'].includes(job.status) || job.game?.version !== GAME_VERSION)
                pending.push(job);
        }
        catch { }
    }
    const archiveGame = JSON.parse(await readFile(join(ROOT, 'apps/server/data/archive-game.json'), 'utf8'));
    const localSettings = JSON.parse(await readFile(join(dataDir, 'settings.json'), 'utf8').catch(() => '{}'));
    if (!localSettings.hideArchive) jobs.set(archiveGame.id, {jobId: archiveGame.id, status: 'playable', createdAt: archiveGame.createdAt, updatedAt: archiveGame.createdAt, stageTimingsMs: {}, game: archiveGame});
    pump();
    async function enqueue(bytes, key, isSample = false) {
        const hash = createHash('sha256').update(bytes).digest('hex');
        if (key)
            for (const job of jobs.values())
                if (job.key === key) {
                    if (job.photoHash !== hash)
                        throw Object.assign(new Error('This upload key belongs to another photo.'), { statusCode: 409 });
                    return job;
                }
        const cached = [...jobs.values()].find((job) => job.photoHash === hash && job.status === 'playable' && job.isSample === isSample && job.game?.version === GAME_VERSION);
        if (cached)
            return cached;
        const photo = await sharp(bytes, { limitInputPixels: 40000000 }).rotate()
            .resize(1600, 1200, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
        const job = { jobId: `job_${randomUUID().replaceAll('-', '')}`, photoHash: hash,
            key, isSample, status: 'queued', stageTimingsMs: {},
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        await mkdir(dirname(jobPath(job.jobId)), { recursive: true });
        await writeFile(jobPath(job.jobId, 'photo.jpg'), photo);
        await save(job);
        jobs.set(job.jobId, job);
        pending.push(job);
        pump();
        return job;
    }
    const requireJob = (id) => {
        const job = jobs.get(id);
        if (!job)
            throw Object.assign(new Error('This world could not be found. Create a new game from the studio.'), { statusCode: 404 });
        return job;
    };
    app.setErrorHandler((error, _req, reply) => {
        const status = error.statusCode ?? 400;
        reply.code(status).send({ error: { code: status === 413 ? 'payload_too_large' : 'validation_error',
                message: status >= 500 ? 'Something went wrong. Please try again.' : error.message } });
    });
    app.addHook('onRequest', async (req, reply) => {
        const origin = req.headers.origin;
        if (origin && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
            return reply.code(403).send({ error: { code: 'forbidden', message: 'The local studio accepts local requests only.' } });
        }
    });
    app.get('/health', async () => ({ status: 'ok', mode: 'local-studio', modelsRequired: false }));
    app.post('/jobs', async (req, reply) => {
        const key = req.headers['idempotency-key'];
        if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{8,64}$/.test(key))
            throw new Error('A valid upload key is required.');
        let bytes, consent;
        for await (const part of req.parts()) {
            if (part.type === 'file') {
                if (part.fieldname !== 'photo')
                    throw new Error('Choose a photo to upload.');
                bytes = await part.toBuffer();
            }
            else if (part.fieldname === 'consent')
                consent = part.value;
        }
        if (consent !== 'agree-processing-v1')
            throw new Error('Please allow local photo processing to create your game.');
        if (!bytes?.length)
            throw new Error('Choose a JPEG, PNG or WebP photo.');
        const meta = await sharp(bytes, { limitInputPixels: 40000000 }).metadata();
        if (!['jpeg', 'png', 'webp'].includes(meta.format) || meta.width < 128 || meta.height < 128)
            throw new Error('Use a JPEG, PNG or WebP photo at least 128 × 128 pixels.');
        const job = await enqueue(bytes, key, false);
        reply.code(201);
        return ok({ jobId: job.jobId, created: true });
    });
    app.get('/jobs/:id', async (req) => ok(publicJob(requireJob(req.params.id))));
    app.get('/jobs/:id/events', async (req, reply) => {
        const job = requireJob(req.params.id);
        reply.hijack();
        const raw = reply.raw;
        raw.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive', 'x-accel-buffering': 'no' });
        raw.write(`event: snapshot\ndata: ${JSON.stringify(publicJob(job))}\n\n`);
        if (['playable', 'failed'].includes(job.status)) {
            raw.end();
            return;
        }
        if (!streams.has(job.jobId))
            streams.set(job.jobId, new Set());
        streams.get(job.jobId).add(raw);
        const heartbeat = setInterval(() => raw.write(': heartbeat\n\n'), 15000);
        raw.on('close', () => { clearInterval(heartbeat); streams.get(job.jobId)?.delete(raw); });
    });
    app.get('/games', async () => ok([...jobs.values()].filter((job) => job.status === 'playable')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((job) => job.game)));
    app.get('/games/:id', async (req) => {
        const job = requireJob(req.params.id);
        if (!job.game)
            throw Object.assign(new Error('Your world is still being built.'), { statusCode: 409 });
        return ok(job.game);
    });
    app.get('/games/:id/photo', async (req, reply) => {
        const job = requireJob(req.params.id);
        reply.type('image/jpeg').header('cache-control', 'private, max-age=3600');
        return readFile(jobPath(job.jobId, 'photo.jpg'));
    });
    app.setNotFoundHandler(async (req, reply) => {
        const path = decodeURIComponent(req.url.split('?')[0]);
        if (/^\/(jobs|games|demo|health)(\/|$)/.test(path))
            return reply.code(404).send({ error: { message: 'Endpoint not found.' } });
        const target = resolve(webDir, `.${path}`);
        if (target !== webDir && !target.startsWith(`${webDir}${sep}`))
            return reply.code(403).send({ error: { message: 'Invalid path.' } });
        const mime = { '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.html': 'text/html' };
        try {
            const bytes = await readFile(target);
            return reply.type(mime[extname(target)] ?? 'application/octet-stream').send(bytes);
        }
        catch {
            if (extname(path))
                return reply.code(404).send({ error: { message: 'File not found.' } });
            try {
                return reply.type('text/html').send(await readFile(join(webDir, 'index.html')));
            }
            catch {
                return reply.code(503).send({ error: { message: 'Build the frontend with pnpm build, or open http://localhost:5173 during development.' } });
            }
        }
    });
    app.addHook('onClose', async () => {
        for (const values of streams.values())
            for (const raw of values)
                raw.end();
    });
    return app;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const app = await buildStudio();
    await app.listen({ port: Number(process.env.STUDIO_PORT ?? 3010), host: '127.0.0.1' });
    const close = async () => { await app.close(); process.exit(0); };
    process.once('SIGINT', close);
    process.once('SIGTERM', close);
}
