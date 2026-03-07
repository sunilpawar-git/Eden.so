import { describe, test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const EXPORT_DIR = path.resolve(__dirname, '..');
const MAX_FILE_LINES = 300;

function readExportFiles(ext: string): Array<{ filepath: string; content: string }> {
    const results: Array<{ filepath: string; content: string }> = [];

    function walk(dir: string): void {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory() && entry.name !== '__tests__' && entry.name !== 'node_modules') {
                walk(full);
            } else if (entry.isFile() && entry.name.endsWith(ext) && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.test.tsx')) {
                results.push({ filepath: full, content: fs.readFileSync(full, 'utf-8') });
            }
        }
    }

    walk(EXPORT_DIR);
    return results;
}

describe('Export structural safety', () => {
    const sourceFiles = readExportFiles('.ts').concat(readExportFiles('.tsx'));
    const tsFiles = sourceFiles.filter((f) => !f.filepath.endsWith('.css'));

    test('markdownExporter uses only exportStrings — no hardcoded labels', () => {
        const file = sourceFiles.find((f) => f.filepath.includes('markdownExporter'));
        expect(file).toBeDefined();
        const labelMatches = file!.content.match(/['"][A-Z][a-z]+.*['"]/g) ?? [];
        const filteredLabels = labelMatches.filter(
            (m) => !m.includes('exportStrings') && !m.includes('import') && !m.includes('type')
        );
        expect(filteredLabels).toEqual([]);
    });

    test('polishService uses generateContent, not generateContentWithContext', () => {
        const file = sourceFiles.find((f) => f.filepath.includes('polishService'));
        expect(file).toBeDefined();
        expect(file!.content).toContain('generateContent');
        expect(file!.content).not.toContain('generateContentWithContext');
    });

    test('no any types in export feature', () => {
        for (const file of tsFiles) {
            const lines = file.content.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i] ?? '';
                if (line.includes(': any') || line.includes('<any>') || line.includes('as any')) {
                    throw new Error(`Found 'any' type in ${file.filepath}:${i + 1}: ${line.trim()}`);
                }
            }
        }
    });

    test('all export files under 300 lines', () => {
        for (const file of sourceFiles) {
            const lineCount = file.content.split('\n').length;
            if (lineCount > MAX_FILE_LINES) {
                throw new Error(`${file.filepath} has ${lineCount} lines (max ${MAX_FILE_LINES})`);
            }
        }
    });

    test('useExportDialog uses downloadAsFile shared utility (not inline blob)', () => {
        const file = sourceFiles.find((f) => f.filepath.includes('useExportDialog'));
        expect(file).toBeDefined();
        expect(file!.content).toContain('downloadAsFile');
        expect(file!.content).not.toContain('URL.createObjectURL');
        expect(file!.content).not.toContain('new Blob');
    });

    test('blob URL revocation present in downloadAsFile (setTimeout pattern)', () => {
        const downloadFile = fs.readFileSync(
            path.resolve(__dirname, '../../../shared/utils/fileDownload.ts'), 'utf-8'
        );
        expect(downloadFile).toContain('setTimeout');
        expect(downloadFile).toContain('revokeObjectURL');
    });

    test('no Zustand anti-patterns in export feature', () => {
        for (const file of tsFiles) {
            const lines = file.content.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i] ?? '';
                if (line.includes('useCanvasStore()') || line.includes('useToastStore()')) {
                    throw new Error(`Bare Zustand call in ${file.filepath}:${i + 1}: ${line.trim()}`);
                }
            }
        }
    });

    test('ExportDialog renders via createPortal', () => {
        const file = sourceFiles.find((f) => f.filepath.includes('ExportDialog.tsx'));
        expect(file).toBeDefined();
        expect(file!.content).toContain('createPortal');
    });

    test('toast calls use toast.success/toast.error helpers (not raw addToast)', () => {
        for (const file of tsFiles) {
            if (file.content.includes('addToast')) {
                throw new Error(`Raw addToast in ${file.filepath} — use toast.success/error helpers`);
            }
        }
    });
});
