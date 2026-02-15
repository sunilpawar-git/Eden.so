/**
 * Structural test: No hardcoded secrets in source files
 *
 * Prevents accidental commit of API keys, tokens, passwords, or other
 * secrets directly in source code. Covers ALL src/ files.
 *
 * Allowlist: .env.example (template only, no real values)
 */
import { readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';
import { describe, it, expect } from 'vitest';

const SRC_DIR = join(process.cwd(), 'src');

/** Patterns that indicate hardcoded secrets */
const SECRET_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
    {
        name: 'Google API key (AIza...)',
        pattern: /AIza[0-9A-Za-z_-]{35}/,
    },
    {
        name: 'Firebase API key literal',
        pattern: /['"]AIza[0-9A-Za-z_-]{35}['"]/,
    },
    {
        name: 'Generic API key assignment',
        pattern: /(?:api[_-]?key|apiKey|API_KEY)\s*[:=]\s*['"][A-Za-z0-9_-]{20,}['"]/i,
    },
    {
        name: 'Authorization header with literal token',
        pattern: /['"]Bearer\s+[A-Za-z0-9_.-]{20,}['"]/,
    },
    {
        name: 'Private key literal',
        pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/,
    },
    {
        name: 'Firebase service account JSON',
        pattern: /"private_key_id"\s*:\s*"[a-f0-9]{40}"/,
    },
    {
        name: 'Password assignment with literal value',
        pattern: /(?:password|passwd|secret)\s*[:=]\s*['"][^'"]{8,}['"]/i,
    },
];

/** Directories and file patterns to skip */
const SKIP_DIRS = ['node_modules', 'dist', '.git'];

/** Files allowed to contain key-like patterns (no real values) */
const ALLOWLIST: string[] = [
    // Test files may contain mock tokens
];

function getSourceFiles(dir: string, results: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            if (SKIP_DIRS.includes(entry.name)) continue;
            getSourceFiles(full, results);
        } else if (/\.(ts|tsx|js|jsx|json)$/.test(entry.name)) {
            results.push(full);
        }
    }
    return results;
}

function rel(filePath: string): string {
    return relative(SRC_DIR, filePath);
}

describe('No hardcoded secrets in source code', () => {
    const files = getSourceFiles(SRC_DIR);

    it('should scan a meaningful number of source files', () => {
        expect(files.length).toBeGreaterThan(30);
    });

    it.each(SECRET_PATTERNS)(
        'no file contains $name',
        ({ pattern }) => {
            const violations: string[] = [];

            for (const file of files) {
                const relPath = rel(file);
                if (ALLOWLIST.includes(relPath)) continue;
                // Skip test files — they may have mock tokens
                if (relPath.includes('__tests__')) continue;

                const content = readFileSync(file, 'utf-8');
                if (pattern.test(content)) {
                    violations.push(relPath);
                }
            }

            expect(
                violations,
                `Files with potential hardcoded secrets:\n${violations.map((v) => `  - ${v}`).join('\n')}`
            ).toEqual([]);
        }
    );

    it('no source file sets VITE_ env vars to literal values', () => {
        const violations: string[] = [];
        // Matches: VITE_SOMETHING = "actual-value" (not process.env or import.meta)
        const pattern = /VITE_[A-Z_]+\s*=\s*['"][A-Za-z0-9_:/.@-]{15,}['"]/;

        for (const file of files) {
            const relPath = rel(file);
            if (relPath.includes('__tests__')) continue;

            const content = readFileSync(file, 'utf-8');
            if (pattern.test(content)) {
                violations.push(relPath);
            }
        }

        expect(
            violations,
            `Files assign literal values to VITE_ variables:\n${violations.map((v) => `  - ${v}`).join('\n')}`
        ).toEqual([]);
    });
});
