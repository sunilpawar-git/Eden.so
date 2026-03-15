/**
 * Structural test: No raw console.* in production code.
 * All logging should go through @/shared/services/logger.
 *
 * Allowed exceptions:
 * - logger.ts itself (the wrapper must call console.*)
 * - sentryService.ts (bootstraps before logger is available, guarded by eslint-disable)
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const SRC_DIR = path.resolve(__dirname, '..');

const ALLOWED_FILES = new Set([
    'shared/services/logger.ts',
    'shared/services/sentryService.ts',
]);

const CONSOLE_PATTERN = /\bconsole\.(log|error|warn|info|debug)\b/;

function collectTsFiles(dir: string, files: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === '__tests__' || entry.name === 'test') continue;
            collectTsFiles(full, files);
        } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.includes('.test.') && !entry.name.includes('.structural.')) {
            files.push(full);
        }
    }
    return files;
}

describe('No raw console.* in production code', () => {
    const files = collectTsFiles(SRC_DIR);

    it('should find production source files to scan', () => {
        expect(files.length).toBeGreaterThan(0);
    });

    it('should not have console.log/error/warn/info outside logger.ts', () => {
        const violations: string[] = [];

        for (const file of files) {
            const relative = path.relative(SRC_DIR, file);
            if (ALLOWED_FILES.has(relative)) continue;

            const content = fs.readFileSync(file, 'utf-8');
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i]!;
                // Skip eslint-disable comments
                if (line.includes('eslint-disable')) continue;
                // Skip commented-out lines
                if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) continue;

                if (CONSOLE_PATTERN.test(line)) {
                    violations.push(`${relative}:${i + 1}: ${line.trim()}`);
                }
            }
        }

        expect(violations).toEqual([]);
    });
});
