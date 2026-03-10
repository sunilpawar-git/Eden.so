/**
 * Structural test: FindSimilar feature removed (performance regression prevention)
 *
 * FindSimilarContext caused O(N) IdeaCard re-renders on every canvas mutation:
 *   1. useFindSimilar() subscribed to nodes via useCanvasStore((s) => s.nodes)
 *   2. Every nodes change triggered tokenizeRaw() on ALL N nodes synchronously
 *   3. Context value was unstable -> ALL IdeaCards re-rendered (React.memo bypassed)
 *   4. With 500 nodes, adding ONE node caused 500+ IdeaCard re-renders
 *
 * Resolution: Feature removed entirely. This test prevents re-introduction.
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';
import { SRC_DIR, getSourceFiles, rel, isTestFile } from './zustandSelectorPatterns';

describe('FindSimilar removal enforcement (prevents O(N) re-render regression)', () => {
    const allFiles = getSourceFiles(SRC_DIR);
    const productionFiles = allFiles.filter((f) => !isTestFile(rel(f)));

    it('no production file imports FindSimilarProvider', () => {
        const violations: string[] = [];
        for (const file of productionFiles) {
            const content = readFileSync(file, 'utf-8');
            if (content.includes('FindSimilarProvider')) {
                violations.push(rel(file));
            }
        }
        expect(
            violations,
            'FindSimilarProvider was removed to fix O(N) re-render cascade.\n' +
            `  Violations:\n${violations.map((v) => `    - ${v}`).join('\n')}`,
        ).toEqual([]);
    });

    it('no production file imports useFindSimilarContext', () => {
        const violations: string[] = [];
        for (const file of productionFiles) {
            const content = readFileSync(file, 'utf-8');
            if (content.includes('useFindSimilarContext')) {
                violations.push(rel(file));
            }
        }
        expect(
            violations,
            'useFindSimilarContext was removed to fix O(N) re-render cascade.\n' +
            `  Violations:\n${violations.map((v) => `    - ${v}`).join('\n')}`,
        ).toEqual([]);
    });

    it('no production file imports useFindSimilar hook', () => {
        const violations: string[] = [];
        for (const file of productionFiles) {
            const content = readFileSync(file, 'utf-8');
            if (/import\s+.*useFindSimilar/.test(content)) {
                violations.push(rel(file));
            }
        }
        expect(
            violations,
            'useFindSimilar was removed to fix O(N) re-render cascade.\n' +
            `  Violations:\n${violations.map((v) => `    - ${v}`).join('\n')}`,
        ).toEqual([]);
    });

    it('IdeaCard does not reference FindSimilar or SimilarResults', () => {
        const ideaCard = readFileSync(
            join(SRC_DIR, 'features/canvas/components/nodes/IdeaCard.tsx'),
            'utf-8',
        );
        expect(ideaCard).not.toContain('FindSimilar');
        expect(ideaCard).not.toContain('SimilarResults');
        expect(ideaCard).not.toContain('similarResults');
        expect(ideaCard).not.toContain('findSimilar');
        expect(ideaCard).not.toContain('clearSimilar');
    });

    it('findSimilar service file is deleted', () => {
        expect(existsSync(join(SRC_DIR, 'features/search/services/findSimilar.ts'))).toBe(false);
    });

    it('findSimilar service test file is deleted', () => {
        expect(existsSync(join(SRC_DIR, 'features/search/services/__tests__/findSimilar.test.ts'))).toBe(false);
    });
});
