/**
 * Structural test: All getDocs calls must use query() with limit().
 * Prevents unbounded collection reads that could cause performance issues.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const SRC_DIR = path.resolve(__dirname, '..');

function collectTsFiles(dir: string, files: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === '__tests__' || entry.name === 'test') continue;
            collectTsFiles(full, files);
        } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.includes('.test.')) {
            files.push(full);
        }
    }
    return files;
}

const RAW_GETDOCS_RE = /getDocs\s*\(\s*(?:get\w+Ref|collection|getSubcollectionRef|getKBCollectionRef)\s*\(/;

describe('Firestore query cap enforcement', () => {
    const files = collectTsFiles(SRC_DIR);

    it('no getDocs call without query()/limit() wrapper in service files', () => {
        const violations: string[] = [];

        for (const file of files) {
            const relative = path.relative(SRC_DIR, file);
            if (!relative.includes('/services/')) continue;

            const content = fs.readFileSync(file, 'utf-8');
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i]!;
                if (RAW_GETDOCS_RE.test(line)) {
                    violations.push(`${relative}:${i + 1}: ${line.trim()}`);
                }
            }
        }

        expect(violations).toEqual([]);
    });

    it('firestore.indexes.json exists', () => {
        const indexPath = path.resolve(__dirname, '..', '..', 'firestore.indexes.json');
        expect(fs.existsSync(indexPath)).toBe(true);
    });

    it('firebase.json references firestore indexes', () => {
        const fbJson = path.resolve(__dirname, '..', '..', 'firebase.json');
        const content = fs.readFileSync(fbJson, 'utf-8');
        expect(content).toContain('"indexes"');
    });
});
