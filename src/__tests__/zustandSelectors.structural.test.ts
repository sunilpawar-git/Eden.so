/**
 * Structural test: Zustand store selector enforcement
 *
 * Prevents "Maximum update depth exceeded" errors by ensuring all Zustand
 * store hooks use selectors instead of subscribing to the entire store.
 *
 * Pattern definitions live in zustandSelectorPatterns.ts.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';
import {
    SRC_DIR,
    BARE_DESTRUCTURING_PATTERNS,
    CLOSURE_VARIABLE_PATTERNS,
    ACTION_SELECTOR_PATTERNS,
    ALLOWLIST,
    getSourceFiles,
    rel,
    isTestFile,
} from './zustandSelectorPatterns';

const files = getSourceFiles(SRC_DIR);

function scanForViolations(pattern: RegExp): string[] {
    const violations: string[] = [];
    for (const file of files) {
        const relPath = rel(file);
        if (ALLOWLIST.includes(relPath) || isTestFile(relPath)) continue;
        if (pattern.test(readFileSync(file, 'utf-8'))) violations.push(relPath);
    }
    return violations;
}

describe('Zustand selector enforcement', () => {
    it('should scan a meaningful number of source files', () => {
        expect(files.length).toBeGreaterThan(50);
    });

    it.each(BARE_DESTRUCTURING_PATTERNS)(
        'no file uses $name',
        ({ pattern }) => {
            expect(scanForViolations(pattern)).toEqual([]);
        },
    );

    it.each(CLOSURE_VARIABLE_PATTERNS)(
        'no file uses $name',
        ({ pattern }) => {
            expect(scanForViolations(pattern)).toEqual([]);
        },
    );

    it.each(ACTION_SELECTOR_PATTERNS)(
        'no file uses $name',
        ({ pattern }) => {
            expect(scanForViolations(pattern)).toEqual([]);
        },
    );
});

describe('per-node hook enforcement', () => {
    const PER_NODE_FILES = [
        'features/canvas/hooks/useIdeaCard.ts',
        'features/canvas/hooks/useNodeInput.ts',
        'features/canvas/hooks/useNodeResize.ts',
        'features/canvas/hooks/useFocusMode.ts',
    ];

    it.each(PER_NODE_FILES)(
        '%s must NOT contain useCanvasStore((s) => s.nodes)',
        (filePath) => {
            const content = readFileSync(join(SRC_DIR, filePath), 'utf-8');
            expect(
                /useCanvasStore\(\s*\(\s*\w+\s*\)\s*=>\s*\w+\.nodes\s*\)/.test(content),
            ).toBe(false);
        },
    );

    const PER_NODE_IMPORTS = [
        { file: 'features/canvas/hooks/useIdeaCard.ts', hook: 'useNodeData' },
        { file: 'features/canvas/hooks/useNodeResize.ts', hook: 'useNodeDimensions' },
        { file: 'features/canvas/hooks/useFocusMode.ts', hook: 'useNode' },
    ];

    it.each(PER_NODE_IMPORTS)('$file must import $hook', ({ file, hook }) => {
        expect(readFileSync(join(SRC_DIR, file), 'utf-8').includes(hook)).toBe(true);
    });
});

describe('canvas store structural invariants', () => {
    it('canvasStoreActions must not have nested set() calls', () => {
        const src = readFileSync(join(SRC_DIR, 'features/canvas/stores/canvasStoreActions.ts'), 'utf-8');
        const nestedSetPattern = /set\(\s*\([\s\S]*?\)\s*\);\s*\n\s*const\s+\w+\s*=\s*get\(\)/;
        expect(nestedSetPattern.test(src)).toBe(false);
    });

    it('ReactFlow useStore must use scalar selectors for transform (not array)', () => {
        const nonScalarPattern = /useStore\(\s*\(\s*\w+\s*\)\s*=>\s*\w+\.transform\s*\)/;
        expect(scanForViolations(nonScalarPattern)).toEqual([]);
    });

    it('branchFromNode must use addNodeAndEdge (not separate addNode + addEdge)', () => {
        const src = readFileSync(join(SRC_DIR, 'features/ai/hooks/useNodeGeneration.ts'), 'utf-8');
        expect(/\.addNode\([\s\S]*?\.addEdge\(/.test(src)).toBe(false);
    });
});
