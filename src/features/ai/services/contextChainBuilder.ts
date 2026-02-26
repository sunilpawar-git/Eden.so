/**
 * Builds a context chain from upstream canvas nodes for AI generation.
 * Pure function - no store or side-effect dependencies.
 */
import type { CanvasNode } from '@/features/canvas/types/node';

/**
 * Converts upstream nodes (closest-first) into an ordered array of context strings
 * for the AI prompt. Nodes without meaningful content are filtered out.
 */
export function buildContextChain(upstreamNodes: CanvasNode[]): string[] {
    return upstreamNodes
        .reverse()
        .filter((n) => {
            const d = n.data;
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-deprecated -- intentional: empty string fallback + legacy field
            return !!(d.heading?.trim() || d.prompt || d.output);
        })
        .map((n) => {
            const d = n.data;
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- intentional: empty string fallback
            const heading = d.heading?.trim() || '';
            // eslint-disable-next-line @typescript-eslint/no-deprecated -- legacy field access for backward compat
            const content = d.output ?? d.prompt ?? '';
            if (heading && content) return `${heading}\n\n${content}`;
            return content || heading;
        });
}
