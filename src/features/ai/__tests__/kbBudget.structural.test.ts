/**
 * Structural Test — Ensures every AI hook passes a generation type to getKBContext
 * Prevents future hooks from using the default budget accidentally.
 *
 * Reads source files and asserts the getKBContext call includes a generation type arg.
 * Also scans the entire ai/ directory for single-argument getKBContext calls.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

/** Read a source file relative to project root */
function readSource(relativePath: string): string {
    return readFileSync(resolve(__dirname, '../../..', relativePath), 'utf-8');
}

/** Recursively collect all .ts files in a directory (excluding tests) */
function collectTsFiles(dir: string): string[] {
    const results: string[] = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
            if (entry !== '__tests__' && entry !== 'node_modules') {
                results.push(...collectTsFiles(full));
            }
        } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) {
            results.push(full);
        }
    }
    return results;
}

describe('KB Budget structural guard', () => {
    it('useNodeGeneration passes a generation type to getKBContext', () => {
        const source = readSource('features/ai/hooks/useNodeGeneration.ts');
        // Must call getKBContext with two arguments (prompt, generationType)
        expect(source).toMatch(/getKBContext\(\s*\w+\s*,\s*\w+\s*\)/);
    });

    it('useNodeTransformation passes transform generation type to getKBContext', () => {
        const source = readSource('features/ai/hooks/useNodeTransformation.ts');
        expect(source).toMatch(/getKBContext\([^)]+,\s*['"`]transform['"`]\s*\)/);
    });

    it('no AI source file calls getKBContext with only one argument', () => {
        const aiDir = resolve(__dirname, '..');
        const files = collectTsFiles(aiDir);
        const singleArgPattern = /getKBContext\(\s*\w+\s*\)/g;
        const twoArgPattern = /getKBContext\([^)]+,[^)]+\)/;

        for (const file of files) {
            const source = readFileSync(file, 'utf-8');
            const singleMatches = source.match(singleArgPattern);
            if (!singleMatches) continue;
            // Every getKBContext call must also match the two-arg pattern
            for (const match of singleMatches) {
                expect(
                    twoArgPattern.test(match),
                    `${file} has single-arg getKBContext call: ${match}`
                ).toBe(true);
            }
        }
    });
});
