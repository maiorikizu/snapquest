import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
export interface Finding {
    file: string;
    line: number;
    pattern: string;
    preview: string;
}
export interface ScanPattern {
    name: string;
    re: RegExp;
    valueGroup?: 1;
}
const PLACEHOLDER = /^(your[-_]|changeme|example|placeholder|dummy|fake|sample|test[-_]|xxxx|redacted|<|\$\{)/i;
export const PATTERNS: ScanPattern[] = [
    { name: 'aws-access-key-id', re: /\bAKIA[0-9A-Z]{16}\b/ },
    {
        name: 'pem-private-key',
        re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY(?: BLOCK)?-----/,
    },
    { name: 'stripe-secret-key', re: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{8,}\b/ },
    { name: 'bearer-token-literal', re: /\bBearer\s+[A-Za-z0-9._-]{20,}/ },
    {
        name: 'secret-assignment',
        re: /\b(?:api[_-]?key|apikey|secret[_-]?key|client[_-]?secret|access[_-]?token|auth[_-]?token|password|passwd)\b\s*[:=]\s*['"`]([^'"`\s]{16,})['"`]/i,
        valueGroup: 1,
    },
];
export function redact(s: string): string {
    return s.length <= 4 ? '****' : `${s.slice(0, 4)}…(${s.length} chars)`;
}
export function scanText(text: string, file = '<text>'): Finding[] {
    const findings: Finding[] = [];
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        for (const p of PATTERNS) {
            const m = p.re.exec(line);
            if (!m)
                continue;
            const candidate = p.valueGroup ? (m[1] ?? m[0]) : m[0];
            if (PLACEHOLDER.test(candidate))
                continue;
            findings.push({ file, line: i + 1, pattern: p.name, preview: redact(candidate) });
        }
    }
    return findings;
}
const SKIP_DIRS = new Set(['node_modules', '.git', 'coverage', 'dist', '.turbo', '.unlazy']);
const SKIP_EXTS = new Set([
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
    '.gif',
    '.ico',
    '.mp3',
    '.ogg',
    '.wav',
    '.woff',
    '.woff2',
    '.ttf',
    '.otf',
    '.wasm',
    '.zip',
    '.pdf',
]);
const ALLOWLIST = [
    /(^|[\\/])__tests__[\\/]/,
    /\.test\.ts$/,
    /(^|[\\/])\.env\.example$/,
    /(^|[\\/]|\.)pnpm-lock\.yaml$/,
    /(^|[\\/])secret-scan\.ts$/,
];
function isAllowed(rel: string): boolean {
    const norm = rel.split(sep).join('/');
    return ALLOWLIST.some((re) => re.test(norm) || re.test(rel));
}
function walk(dir: string, root: string, out: string[]): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            if (!SKIP_DIRS.has(entry.name))
                walk(full, root, out);
            continue;
        }
        const rel = relative(root, full);
        if (isAllowed(rel))
            continue;
        const dot = entry.name.lastIndexOf('.');
        const ext = dot >= 0 ? entry.name.slice(dot).toLowerCase() : '';
        if (SKIP_EXTS.has(ext))
            continue;
        out.push(full);
    }
}
function collectExplicit(target: string, out: string[]): void {
    const st = statSync(target);
    if (st.isFile()) {
        out.push(target);
        return;
    }
    for (const entry of readdirSync(target, { withFileTypes: true })) {
        const full = join(target, entry.name);
        if (entry.isDirectory())
            collectExplicit(full, out);
        else
            out.push(full);
    }
}
function main(argv: string[]): void {
    const root = process.cwd();
    const files: string[] = [];
    const explicit = argv.slice(2);
    if (explicit.length > 0) {
        for (const t of explicit)
            collectExplicit(join(root, t), files);
    }
    else {
        walk(root, root, files);
    }
    let count = 0;
    for (const f of files) {
        let text: string;
        try {
            text = readFileSync(f, 'utf8');
        }
        catch {
            continue;
        }
        if (text.includes('\u0000'))
            continue;
        for (const finding of scanText(text, relative(root, f) || f)) {
            count++;
            console.error(`SECRET-SCAN ${finding.file}:${finding.line} [${finding.pattern}] ${finding.preview}`);
        }
    }
    if (count > 0) {
        console.error(`secret-scan: ${count} finding(s) across ${files.length} file(s) — FAILED`);
        process.exit(1);
    }
    console.log(`secret-scan: clean (${files.length} file(s) scanned)`);
}
if (process.argv[1] &&
    import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g, '/')}`).href) {
    main(process.argv);
}
