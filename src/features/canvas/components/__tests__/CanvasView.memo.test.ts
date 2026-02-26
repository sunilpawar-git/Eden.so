/**
 * CanvasView React.memo Structural Test
 * Verifies CanvasView is wrapped in React.memo to prevent
 * parent-triggered re-renders from AuthenticatedApp.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

describe('CanvasView React.memo', () => {
    const src = readFileSync(
        resolve(__dirname, '../CanvasView.tsx'),
        'utf-8'
    );

    it('imports memo from React', () => {
        expect(src).toMatch(/import\s+\{[^}]*\bmemo\b[^}]*\}\s+from\s+['"]react['"]/);
    });

    it('exports a memo-wrapped component', () => {
        expect(src).toMatch(/export\s+(const|function)\s+CanvasView\s*=\s*memo\(/);
    });

    it('does not accept any props (zero-prop component)', () => {
        const hasPropsInterface = /interface\s+CanvasViewProps/.test(src);
        const hasPropsType = /type\s+CanvasViewProps/.test(src);
        expect(hasPropsInterface || hasPropsType).toBe(false);
    });

    it('does NOT select store action functions via selectors (prevents unstable refs)', () => {
        const actionNames = [
            'addNode', 'updateNodeDimensions', 'updateNodePosition',
            'updateNodeContent', 'deleteNode', 'setNodes', 'clearCanvas',
            'addEdge', 'deleteEdge', 'arrangeNodes', 'startEditing', 'stopEditing',
        ];
        for (const name of actionNames) {
            const pattern = new RegExp(`useCanvasStore\\(\\s*\\(s\\)\\s*=>\\s*s\\.${name}\\s*\\)`);
            expect(src, `action "${name}" must not be selected via selector`).not.toMatch(pattern);
        }
    });

    it('uses getState() for store actions inside callbacks', () => {
        expect(src).toMatch(/useCanvasStore\.getState\(\)/);
    });

    it('onNodesChange only processes dimension changes when resizing is true', () => {
        expect(src).toMatch(/change\.type\s*===\s*'dimensions'\s*&&\s*change\.dimensions\s*&&\s*change\.resizing/);
    });

    it('cleanupDataShells runs in useEffect, not useMemo', () => {
        expect(src).toMatch(/cleanupDataShells/);
        expect(src).toMatch(/useEffect\(/);
        const useMemoBlock = src.match(/useMemo\([\s\S]*?\)\s*;/g) ?? [];
        for (const block of useMemoBlock) {
            expect(block).not.toContain('cleanupDataShells');
        }
    });
});
