/**
 * Document Agent Structural Test — enforces no hardcoded user-facing strings
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join, relative } from 'path';

const FEATURE_ROOT = join(__dirname, '..');
const EXCLUDED_DIRS = ['__tests__', 'strings'];
const EXCLUDED_FILES = ['documentAgentPrompts.ts', 'crossReferenceService.ts', 'aggregationService.ts'];

function collectSourceFiles(dir: string): string[] {
    const files: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (EXCLUDED_DIRS.includes(entry.name)) continue;
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...collectSourceFiles(fullPath));
        } else if (entry.name.endsWith('.ts') && !EXCLUDED_FILES.includes(entry.name)) {
            files.push(fullPath);
        }
    }
    return files;
}

function rel(path: string): string {
    return relative(FEATURE_ROOT, path);
}

describe('documentAgent structural: no hardcoded user-facing strings', () => {
    const sourceFiles = collectSourceFiles(FEATURE_ROOT);

    it('services and hooks contain no quoted strings > 3 words (except imports/types)', () => {
        const violations: string[] = [];

        for (const file of sourceFiles) {
            const content = readFileSync(file, 'utf-8');
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i] ?? '';
                if (line.trimStart().startsWith('import ')) continue;
                if (line.trimStart().startsWith('export type')) continue;
                if (line.trimStart().startsWith('export interface')) continue;
                if (line.trimStart().startsWith('//')) continue;
                if (line.trimStart().startsWith('*')) continue;

                const stringMatches = [...line.matchAll(/['"`]([^'"`]{15,})['"`]/g)];
                for (const match of stringMatches) {
                    const str = match[1] ?? '';
                    const wordCount = str.split(/\s+/).filter(Boolean).length;
                    if (wordCount > 3 && !str.startsWith('@/') && !str.startsWith('strings.')) {
                        violations.push(`${rel(file)}:${i + 1} → "${str.slice(0, 50)}..."`);
                    }
                }
            }
        }

        expect(
            violations,
            `Hardcoded strings found. Use strings.documentAgent.* instead:\n${violations.join('\n')}`,
        ).toEqual([]);
    });

    it('no "any" types in source files', () => {
        const violations: string[] = [];

        for (const file of sourceFiles) {
            const content = readFileSync(file, 'utf-8');
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i] ?? '';
                if (line.trimStart().startsWith('//')) continue;
                if (/:\s*any\b/.test(line) || /as\s+any\b/.test(line)) {
                    violations.push(`${rel(file)}:${i + 1}`);
                }
            }
        }

        expect(
            violations,
            `"any" types found:\n${violations.join('\n')}`,
        ).toEqual([]);
    });

    it('no useEffect in useDocumentAgent.ts', () => {
        const hookFile = sourceFiles.find((f) => f.endsWith('useDocumentAgent.ts'));
        if (!hookFile) return;

        const content = readFileSync(hookFile, 'utf-8');
        expect(content).not.toContain('useEffect');
    });

    it('no bare Zustand destructuring in hook files', () => {
        const violations: string[] = [];
        const hookFiles = sourceFiles.filter((f) => f.includes('/hooks/'));

        for (const file of hookFiles) {
            const content = readFileSync(file, 'utf-8');
            if (/const\s*\{[^}]+\}\s*=\s*use\w+Store\(\)/.test(content)) {
                violations.push(rel(file));
            }
        }

        expect(violations, `Bare Zustand destructuring found:\n${violations.join('\n')}`).toEqual([]);
    });

    it('expandInsightService uses single setState pattern (no cascade)', () => {
        const expandFile = sourceFiles.find((f) => f.endsWith('expandInsightService.ts'));
        if (!expandFile) return;

        const content = readFileSync(expandFile, 'utf-8');
        const codeLines = content.split('\n').filter(
            (l) => !l.trimStart().startsWith('//') && !l.trimStart().startsWith('*'),
        ).join('\n');
        expect(codeLines).not.toContain('setState');
        expect(codeLines).not.toContain('useCanvasStore');
    });

    it('fan layout function is under 50 lines', () => {
        const expandFile = sourceFiles.find((f) => f.endsWith('expandInsightService.ts'));
        if (!expandFile) return;

        const content = readFileSync(expandFile, 'utf-8');
        const fnMatch = /export function expandInsightToNodes[\s\S]*?^}/m.exec(content);

        if (fnMatch) {
            const lineCount = fnMatch[0].split('\n').length;
            expect(lineCount).toBeLessThanOrEqual(50);
        }
    });

    it('no hex/rgb color literals in service files', () => {
        const violations: string[] = [];

        for (const file of sourceFiles) {
            if (!file.includes('/services/')) continue;
            const content = readFileSync(file, 'utf-8');
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i] ?? '';
                if (line.trimStart().startsWith('//')) continue;
                if (/#[0-9a-fA-F]{3,8}\b/.test(line) || /rgb[a]?\(/.test(line)) {
                    violations.push(`${rel(file)}:${i + 1}`);
                }
            }
        }

        expect(violations, `Color literals found:\n${violations.join('\n')}`).toEqual([]);
    });

    it('useOfflineQueue does not create global stores', () => {
        const queueFile = sourceFiles.find((f) => f.endsWith('useOfflineQueue.ts'));
        if (!queueFile) return;

        const content = readFileSync(queueFile, 'utf-8');
        expect(content).not.toContain('create(');
        expect(content).not.toContain('zustand');
    });

    it('useOfflineQueue cleans up event listeners', () => {
        const queueFile = sourceFiles.find((f) => f.endsWith('useOfflineQueue.ts'));
        if (!queueFile) return;

        const content = readFileSync(queueFile, 'utf-8');
        expect(content).toContain('removeEventListener');
    });

    it('extractionCacheService is pure (no store imports)', () => {
        const cacheFile = sourceFiles.find((f) => f.endsWith('extractionCacheService.ts'));
        if (!cacheFile) return;

        const content = readFileSync(cacheFile, 'utf-8');
        expect(content).not.toContain('Store');
        expect(content).not.toContain('setState');
    });
});
