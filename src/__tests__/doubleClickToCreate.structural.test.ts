/**
 * Structural test — CanvasView must wire up the double-click-to-create feature.
 *
 * Three things must ALL be present for double-click / double-tap creation to work:
 *
 *  1. zoomOnDoubleClick={false} on <ReactFlow>       — stops ReactFlow from consuming the event
 *  2. useDoubleClickToCreate() called in CanvasView  — hook that provides the handlers
 *  3. onDoubleClick={…} on the container <div>       — mouse double-click wiring
 *  4. onTouchEnd={…}    on the container <div>       — mobile double-tap wiring
 *
 * Tests 1 & 2 are independent; tests 3 & 4 are the ones most likely to be
 * accidentally dropped during a refactor (as happened in a2ce568 where
 * CanvasViewInner was restructured and the handler attributes could have
 * been silently lost).
 *
 * Users can still zoom via pinch, scroll-wheel, or the ZoomControls toolbar.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const SRC = join(__dirname, '..');

describe('CanvasView double-click-to-create structural', () => {
    const canvasViewSrc = readFileSync(
        join(SRC, 'features/canvas/components/CanvasView.tsx'), 'utf-8',
    );

    // ── ReactFlow prop ────────────────────────────────────────────────────────

    it('sets zoomOnDoubleClick={false} on ReactFlow', () => {
        expect(canvasViewSrc).toContain('zoomOnDoubleClick={false}');
    });

    it('does NOT enable zoomOnDoubleClick anywhere', () => {
        // Ensure no conflicting zoomOnDoubleClick={true} exists
        expect(canvasViewSrc).not.toContain('zoomOnDoubleClick={true}');
        expect(canvasViewSrc).not.toMatch(/zoomOnDoubleClick=\{(?!false)/);
    });

    // ── Hook wiring ───────────────────────────────────────────────────────────

    it('imports and calls useDoubleClickToCreate', () => {
        expect(canvasViewSrc).toContain("import { useDoubleClickToCreate }");
        expect(canvasViewSrc).toContain('useDoubleClickToCreate()');
    });

    // ── Container event attributes ────────────────────────────────────────────
    // These are the attributes most at risk of being dropped in a refactor.
    // Without them the feature is silently dead even though the hook exists.

    it('wires onDoubleClick handler to the canvas container (mouse support)', () => {
        expect(canvasViewSrc).toMatch(/onDoubleClick=\{paneHandlers\.onDoubleClick\}/);
    });

    it('wires onTouchEnd handler to the canvas container (mobile double-tap support)', () => {
        expect(canvasViewSrc).toMatch(/onTouchEnd=\{paneHandlers\.onTouchEnd\}/);
    });
});
