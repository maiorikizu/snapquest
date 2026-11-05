import '@testing-library/jest-dom/vitest';
if (typeof URL.createObjectURL !== 'function') {
    Object.defineProperty(URL, 'createObjectURL', { value: () => 'blob:mock', writable: true });
}
if (typeof URL.revokeObjectURL !== 'function') {
    Object.defineProperty(URL, 'revokeObjectURL', { value: () => { }, writable: true });
}
(globalThis as unknown as Record<string, unknown>).Image = class MockImage {
    naturalWidth = 1024;
    naturalHeight = 1024;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_url: string) {
        queueMicrotask(() => {
            if (this.onload !== null)
                this.onload();
        });
    }
    get src(): string {
        return '';
    }
};
