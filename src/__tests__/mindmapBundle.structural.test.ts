/**
 * Structural test — Mindmap bundle isolation
 *
 * Validates that the MindmapRenderer is imported via dynamic import
 * (React.lazy) in production code paths to keep markmap-lib + markmap-view
 * out of the initial bundle. Also verifies MindmapRenderer module structure.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC_ROOT = resolve(__dirname, '..');

describe('Mindmap bundle isolation', () => {
    it('IdeaCardContentSection uses lazy import for MindmapRenderer', () => {
        const content = readFileSync(
            resolve(SRC_ROOT, 'features/canvas/components/nodes/IdeaCardContentSection.tsx'),
            'utf-8',
        );
        // Should have a React.lazy or lazy() call for MindmapRenderer
        expect(content).toMatch(/lazy\s*\(\s*\(\)\s*=>\s*import\s*\(/);
    });

    it('IdeaCardContentSection wraps lazy component in Suspense', () => {
        const content = readFileSync(
            resolve(SRC_ROOT, 'features/canvas/components/nodes/IdeaCardContentSection.tsx'),
            'utf-8',
        );
        expect(content).toContain('Suspense');
    });

    it('MindmapRenderer exports a named export (not default)', () => {
        const content = readFileSync(
            resolve(SRC_ROOT, 'features/canvas/components/nodes/MindmapRenderer.tsx'),
            'utf-8',
        );
        // Should be a named export (export function or export const with React.memo)
        expect(content).toMatch(/export\s+(?:function|const)\s+MindmapRenderer/);
        // Should NOT have a default export
        expect(content).not.toMatch(/export\s+default/);
    });

    it('MindmapRenderer does not re-export from barrel index', () => {
        // Ensure markmap packages are not eagerly pulled in via a barrel file
        const nodesDir = resolve(SRC_ROOT, 'features/canvas/components/nodes');
        let hasBarrel = false;
        try {
            const barrelContent = readFileSync(resolve(nodesDir, 'index.ts'), 'utf-8');
            hasBarrel = barrelContent.includes('MindmapRenderer');
        } catch {
            // No barrel file exists — that's fine
        }
        expect(hasBarrel).toBe(false);
    });
});
