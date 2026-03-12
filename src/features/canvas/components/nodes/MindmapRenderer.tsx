/**
 * MindmapRenderer — Renders markdown as an interactive SVG mindmap.
 *
 * Uses markmap-lib (markdown → tree) and markmap-view (tree → SVG).
 * The underlying data.output remains markdown — this component only
 * changes the visual rendering, not the data format.
 *
 * Pointer isolation: onPointerDown / onWheel stopPropagation prevents
 * the mindmap's pan/zoom from bubbling to ReactFlow's canvas handlers.
 *
 * @see contentMode.ts — SSOT for when this renderer is active
 */
import { useEffect, useRef, useCallback } from 'react';
import { Transformer } from 'markmap-lib';
import { Markmap } from 'markmap-view';
import { strings } from '@/shared/localization/strings';
import { captureError } from '@/shared/services/sentryService';
import { sanitizeMarkdown } from '@/shared/utils/sanitize';
import styles from './MindmapRenderer.module.css';

// ── Props ────────────────────────────────────────────────────────────

export interface MindmapRendererProps {
    /** Markdown content to visualize as a mindmap */
    markdown: string;
}

// ── Singleton transformer (stateless, expensive to create) ───────────

const transformer = new Transformer();

/** Silently capture markmap rendering errors without crashing the UI */
function catchRenderError(error: unknown): void {
    captureError(error instanceof Error ? error : new Error(String(error)));
}

// ── Component ────────────────────────────────────────────────────────

export function MindmapRenderer({ markdown }: MindmapRendererProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const markmapRef = useRef<Markmap | null>(null);

    // Pointer isolation — prevent ReactFlow canvas pan/zoom hijack
    const stopPropagation = useCallback((e: React.SyntheticEvent) => {
        e.stopPropagation();
    }, []);

    // Initialize markmap instance once on mount
    useEffect(() => {
        if (!svgRef.current) return;
        markmapRef.current = Markmap.create(svgRef.current, {
            autoFit: true,
            duration: 250,
        });
        return () => {
            markmapRef.current?.destroy();
            markmapRef.current = null;
        };
    }, []);

    // Update data when markdown changes
    useEffect(() => {
        if (!markmapRef.current) return;
        const raw = markdown.trim() || `# ${strings.canvas.mindmap.emptyFallback}`;
        const input = sanitizeMarkdown(raw);
        const { root } = transformer.transform(input);
        const mm = markmapRef.current;
        void mm.setData(root).then(() => mm.fit().catch(catchRenderError)).catch(catchRenderError);
    }, [markdown]);

    // Re-fit on container resize (node resize handles, collapse toggle)
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() => {
            void markmapRef.current?.fit().catch(catchRenderError);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    return (
        <div
            ref={containerRef}
            className={styles.container}
            data-testid="mindmap-renderer"
            aria-label={strings.canvas.mindmap.ariaLabel}
            onPointerDown={stopPropagation}
            onWheel={stopPropagation}
        >
            <svg ref={svgRef} className={styles.svg} />
        </div>
    );
}
